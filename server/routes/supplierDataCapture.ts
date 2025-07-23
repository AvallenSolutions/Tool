/**
 * API Routes for Supplier Data Capture Workflows
 */

import { Router } from 'express';
import { z } from 'zod';
import { supplierDataCaptureService, type SupplierSubmissionData } from '../services/supplierDataCapture';
import { dbStorage } from '../storage';

const router = Router();

// Validation schemas
const supplierSubmissionSchema = z.object({
  supplierName: z.string().min(1, 'Supplier name is required'),
  supplierCategory: z.string().min(1, 'Supplier category is required'),
  website: z.string().url().optional().or(z.literal('')),
  contactEmail: z.string().email().optional().or(z.literal('')),
  description: z.string().optional(),
  
  // Address information
  addressStreet: z.string().optional(),
  addressCity: z.string().optional(),
  addressPostalCode: z.string().optional(),
  addressCountry: z.string().optional(),
  
  // Products data
  products: z.array(z.object({
    productName: z.string().min(1, 'Product name is required'),
    productDescription: z.string().optional(),
    sku: z.string().optional(),
    productAttributes: z.any().optional(),
    hasPrecalculatedLca: z.boolean().optional(),
    lcaDataJson: z.any().optional(),
  })).optional(),
});

/**
 * POST /api/supplier-data-capture/admin
 * Workflow 1: Admin submits verified supplier data
 */
router.post('/admin', async (req: any, res) => {
  try {
    // Check if user is authenticated and has admin privileges
    if (!req.user?.claims?.sub) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // TODO: Add admin role check when role system is implemented
    // For now, all authenticated users can submit as admin
    
    // Validate request body
    const validationResult = supplierSubmissionSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        message: 'Invalid supplier data',
        errors: validationResult.error.issues,
      });
    }
    
    const supplierData: SupplierSubmissionData = validationResult.data;
    
    // Submit via admin workflow
    const result = await supplierDataCaptureService.submitAdminSupplier(
      supplierData,
      req.user.claims.sub
    );
    
    res.status(201).json({
      message: 'Supplier successfully added to verified network',
      supplier: result.supplier,
      products: result.products,
    });
    
  } catch (error) {
    console.error('❌ Admin supplier submission error:', error);
    res.status(500).json({
      message: 'Failed to submit supplier data',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/supplier-data-capture/supplier
 * Workflow 2: Supplier submits their own data
 */
router.post('/supplier', async (req: any, res) => {
  try {
    // Check authentication
    if (!req.user?.claims?.sub) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Validate request body
    const validationResult = supplierSubmissionSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        message: 'Invalid supplier data',
        errors: validationResult.error.issues,
      });
    }
    
    const supplierData: SupplierSubmissionData = validationResult.data;
    
    // Submit via supplier workflow
    const result = await supplierDataCaptureService.submitSupplierSelfData(
      supplierData,
      req.user.claims.sub
    );
    
    res.status(201).json({
      message: 'Supplier data submitted for review',
      supplier: result.supplier,
      products: result.products,
      note: 'Your submission is pending admin review and will be available in the network once approved.',
    });
    
  } catch (error) {
    console.error('❌ Supplier self-submission error:', error);
    res.status(500).json({
      message: 'Failed to submit supplier data',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/supplier-data-capture/client
 * Workflow 3: Client submits supplier data for their own use
 */
router.post('/client', async (req: any, res) => {
  try {
    // Check authentication
    if (!req.user?.claims?.sub) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Get user's company from storage
    const company = await dbStorage.getCompanyByOwner(req.user.claims.sub);
    if (!company) {
      return res.status(400).json({ message: 'User must be associated with a company' });
    }
    
    // Validate request body
    const validationResult = supplierSubmissionSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        message: 'Invalid supplier data',
        errors: validationResult.error.issues,
      });
    }
    
    const supplierData: SupplierSubmissionData = validationResult.data;
    
    // Submit via client workflow
    const result = await supplierDataCaptureService.submitClientSupplierData(
      supplierData,
      req.user.claims.sub,
      company.id
    );
    
    res.status(201).json({
      message: 'Supplier data added to your company network',
      supplier: result.supplier,
      products: result.products,
      note: 'This supplier is now available for your LCA calculations. Admin team has been notified for potential global verification.',
    });
    
  } catch (error) {
    console.error('❌ Client supplier submission error:', error);
    res.status(500).json({
      message: 'Failed to submit supplier data',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/supplier-data-capture/suppliers
 * Get suppliers visible to the authenticated user's company
 */
router.get('/suppliers', async (req: any, res) => {
  try {
    // Check authentication
    if (!req.user?.claims?.sub) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Get user's company
    const company = await dbStorage.getCompanyByOwner(req.user.claims.sub);
    if (!company) {
      return res.status(400).json({ message: 'User must be associated with a company' });
    }
    
    const suppliers = await supplierDataCaptureService.getSuppliersForCompany(company.id);
    
    res.json(suppliers);
    
  } catch (error) {
    console.error('❌ Error fetching suppliers:', error);
    res.status(500).json({
      message: 'Failed to fetch suppliers',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/supplier-data-capture/products
 * Get supplier products visible to the authenticated user's company
 */
router.get('/products', async (req: any, res) => {
  try {
    // Check authentication
    if (!req.user?.claims?.sub) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // Get user's company
    const company = await dbStorage.getCompanyByOwner(req.user.claims.sub);
    if (!company) {
      return res.status(400).json({ message: 'User must be associated with a company' });
    }
    
    const category = req.query.category as string | undefined;
    
    const products = await supplierDataCaptureService.getSupplierProductsForCompany(
      company.id,
      category
    );
    
    res.json(products);
    
  } catch (error) {
    console.error('❌ Error fetching supplier products:', error);
    res.status(500).json({
      message: 'Failed to fetch supplier products',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;