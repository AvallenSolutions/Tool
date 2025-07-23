/**
 * Admin API Routes for Supplier Network Management
 * Phase 2: Admin Dashboard Implementation
 */

import { Router } from 'express';
import { eq, desc, and, or, count } from 'drizzle-orm';
import { db } from '../db';
import { verifiedSuppliers, supplierProducts, users } from '@shared/schema';

const router = Router();

/**
 * GET /api/admin/suppliers
 * Get all suppliers for admin dashboard
 */
router.get('/suppliers', async (req: any, res) => {
  try {
    // Check authentication
    if (!req.user?.claims?.sub) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // TODO: Add admin role check when role system is implemented
    
    const suppliers = await db
      .select({
        id: verifiedSuppliers.id,
        supplierName: verifiedSuppliers.supplierName,
        supplierCategory: verifiedSuppliers.supplierCategory,
        website: verifiedSuppliers.website,
        contactEmail: verifiedSuppliers.contactEmail,
        description: verifiedSuppliers.description,
        location: verifiedSuppliers.location,
        addressStreet: verifiedSuppliers.addressStreet,
        addressCity: verifiedSuppliers.addressCity,
        addressCountry: verifiedSuppliers.addressCountry,
        latitude: verifiedSuppliers.latitude,
        longitude: verifiedSuppliers.longitude,
        verificationStatus: verifiedSuppliers.verificationStatus,
        submittedBy: verifiedSuppliers.submittedBy,
        submittedByUserId: verifiedSuppliers.submittedByUserId,
        submittedByCompanyId: verifiedSuppliers.submittedByCompanyId,
        isVerified: verifiedSuppliers.isVerified,
        verifiedBy: verifiedSuppliers.verifiedBy,
        verifiedAt: verifiedSuppliers.verifiedAt,
        createdAt: verifiedSuppliers.createdAt,
      })
      .from(verifiedSuppliers)
      .orderBy(desc(verifiedSuppliers.createdAt));

    res.json(suppliers);
    
  } catch (error) {
    console.error('❌ Error fetching suppliers for admin:', error);
    res.status(500).json({
      message: 'Failed to fetch suppliers',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/admin/supplier-products
 * Get all supplier products for admin dashboard
 */
router.get('/supplier-products', async (req: any, res) => {
  try {
    // Check authentication
    if (!req.user?.claims?.sub) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // TODO: Add admin role check when role system is implemented
    
    const products = await db
      .select({
        id: supplierProducts.id,
        supplierId: supplierProducts.supplierId,
        productName: supplierProducts.productName,
        productDescription: supplierProducts.productDescription,
        sku: supplierProducts.sku,
        productAttributes: supplierProducts.productAttributes,
        hasPrecalculatedLca: supplierProducts.hasPrecalculatedLca,
        lcaDataJson: supplierProducts.lcaDataJson,
        submittedBy: supplierProducts.submittedBy,
        submittedByUserId: supplierProducts.submittedByUserId,
        submittedByCompanyId: supplierProducts.submittedByCompanyId,
        submissionStatus: supplierProducts.submissionStatus,
        isVerified: supplierProducts.isVerified,
        verifiedBy: supplierProducts.verifiedBy,
        verifiedAt: supplierProducts.verifiedAt,
        createdAt: supplierProducts.createdAt,
        // Join supplier information
        supplierName: verifiedSuppliers.supplierName,
        supplierCategory: verifiedSuppliers.supplierCategory,
      })
      .from(supplierProducts)
      .innerJoin(verifiedSuppliers, eq(supplierProducts.supplierId, verifiedSuppliers.id))
      .orderBy(desc(supplierProducts.createdAt));

    res.json(products);
    
  } catch (error) {
    console.error('❌ Error fetching supplier products for admin:', error);
    res.status(500).json({
      message: 'Failed to fetch supplier products',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/admin/suppliers/:id/verify
 * Approve or reject a supplier
 */
router.post('/suppliers/:id/verify', async (req: any, res) => {
  try {
    // Check authentication
    if (!req.user?.claims?.sub) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // TODO: Add admin role check when role system is implemented
    
    const supplierId = parseInt(req.params.id);
    const { action } = req.body; // 'approve' or 'reject'
    
    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action. Must be "approve" or "reject"' });
    }

    if (action === 'approve') {
      // Update supplier to verified status
      const [updatedSupplier] = await db
        .update(verifiedSuppliers)
        .set({
          verificationStatus: 'verified',
          isVerified: true,
          verifiedBy: req.user.claims.sub,
          verifiedAt: new Date(),
        })
        .where(eq(verifiedSuppliers.id, supplierId))
        .returning();

      if (!updatedSupplier) {
        return res.status(404).json({ message: 'Supplier not found' });
      }

      // Also verify all products from this supplier if they were pending
      await db
        .update(supplierProducts)
        .set({
          submissionStatus: 'approved',
          isVerified: true,
          verifiedBy: req.user.claims.sub,
          verifiedAt: new Date(),
        })
        .where(and(
          eq(supplierProducts.supplierId, supplierId),
          eq(supplierProducts.submissionStatus, 'pending')
        ));

      res.json({
        message: 'Supplier approved and added to verified network',
        supplier: updatedSupplier,
      });
      
    } else if (action === 'reject') {
      // For rejection, we might want to soft delete or mark as rejected
      // For now, we'll update the verification status
      const [updatedSupplier] = await db
        .update(verifiedSuppliers)
        .set({
          verificationStatus: 'client_provided', // Demote to client-provided status
          isVerified: false,
          verifiedBy: req.user.claims.sub,
          verifiedAt: new Date(),
        })
        .where(eq(verifiedSuppliers.id, supplierId))
        .returning();

      if (!updatedSupplier) {
        return res.status(404).json({ message: 'Supplier not found' });
      }

      // Also reject products from this supplier
      await db
        .update(supplierProducts)
        .set({
          submissionStatus: 'rejected',
          isVerified: false,
          verifiedBy: req.user.claims.sub,
          verifiedAt: new Date(),
        })
        .where(and(
          eq(supplierProducts.supplierId, supplierId),
          eq(supplierProducts.submissionStatus, 'pending')
        ));

      res.json({
        message: 'Supplier rejected and moved to client-provided status',
        supplier: updatedSupplier,
      });
    }
    
  } catch (error) {
    console.error('❌ Error verifying supplier:', error);
    res.status(500).json({
      message: 'Failed to verify supplier',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/admin/stats
 * Get dashboard statistics for admin
 */
router.get('/stats', async (req: any, res) => {
  try {
    // Check authentication
    if (!req.user?.claims?.sub) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // TODO: Add admin role check when role system is implemented
    
    // Get supplier counts by status
    const supplierStats = await db
      .select({
        verificationStatus: verifiedSuppliers.verificationStatus,
        count: count(),
      })
      .from(verifiedSuppliers)
      .groupBy(verifiedSuppliers.verificationStatus);

    // Get product counts
    const productStats = await db
      .select({
        total: count(),
      })
      .from(supplierProducts);

    // Get products with LCA data
    const lcaProductStats = await db
      .select({
        withLca: count(),
      })
      .from(supplierProducts)
      .where(eq(supplierProducts.hasPrecalculatedLca, true));

    // Format the response
    const stats = {
      suppliers: {
        verified: supplierStats.find(s => s.verificationStatus === 'verified')?.count || 0,
        pending_review: supplierStats.find(s => s.verificationStatus === 'pending_review')?.count || 0,
        client_provided: supplierStats.find(s => s.verificationStatus === 'client_provided')?.count || 0,
        total: supplierStats.reduce((sum, s) => sum + Number(s.count), 0),
      },
      products: {
        total: Number(productStats[0]?.total || 0),
        withLca: Number(lcaProductStats[0]?.withLca || 0),
      },
    };

    res.json(stats);
    
  } catch (error) {
    console.error('❌ Error fetching admin stats:', error);
    res.status(500).json({
      message: 'Failed to fetch statistics',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/admin/suppliers/:id
 * Delete a supplier (admin only)
 */
router.delete('/suppliers/:id', async (req: any, res) => {
  try {
    // Check authentication
    if (!req.user?.claims?.sub) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // TODO: Add admin role check when role system is implemented
    
    const supplierId = parseInt(req.params.id);
    
    // First delete all products from this supplier
    await db
      .delete(supplierProducts)
      .where(eq(supplierProducts.supplierId, supplierId));
    
    // Then delete the supplier
    const [deletedSupplier] = await db
      .delete(verifiedSuppliers)
      .where(eq(verifiedSuppliers.id, supplierId))
      .returning();

    if (!deletedSupplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    res.json({
      message: 'Supplier and all associated products deleted successfully',
      supplier: deletedSupplier,
    });
    
  } catch (error) {
    console.error('❌ Error deleting supplier:', error);
    res.status(500).json({
      message: 'Failed to delete supplier',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;