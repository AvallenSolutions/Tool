import { Router, Request, Response } from 'express';
import { db } from '../db';
import { users, companies, reports, verifiedSuppliers, supplierProducts } from '@shared/schema';
import { requireAdminRole, type AdminRequest } from '../middleware/adminAuth';
import { eq, count, gte, desc, and, lt } from 'drizzle-orm';

const router = Router();

// Apply admin authentication to all routes
router.use(requireAdminRole);

/**
 * GET /api/admin/analytics
 * Returns platform analytics and key metrics
 */
router.get('/analytics', async (req: AdminRequest, res: Response) => {
  try {
    console.log('Admin analytics endpoint called');
    // Calculate date ranges for growth calculations
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    // Get user metrics
    const [totalUsers] = await db
      .select({ count: count() })
      .from(users);

    const [newUsersLast30Days] = await db
      .select({ count: count() })
      .from(users)
      .where(gte(users.createdAt, thirtyDaysAgo));

    const [newUsersPrevious30Days] = await db
      .select({ count: count() })
      .from(users)
      .where(and(
        gte(users.createdAt, sixtyDaysAgo),
        lt(users.createdAt, thirtyDaysAgo)
      ));

    // Calculate user growth percentage
    const userGrowthPercentage = newUsersPrevious30Days.count > 0 
      ? ((newUsersLast30Days.count - newUsersPrevious30Days.count) / newUsersPrevious30Days.count) * 100
      : newUsersLast30Days.count > 0 ? 100 : 0;

    // Get supplier metrics
    const [totalSuppliers] = await db
      .select({ count: count() })
      .from(verifiedSuppliers);

    const [newSuppliersLast30Days] = await db
      .select({ count: count() })
      .from(verifiedSuppliers)
      .where(gte(verifiedSuppliers.createdAt, thirtyDaysAgo));

    const [newSuppliersPrevious30Days] = await db
      .select({ count: count() })
      .from(verifiedSuppliers)
      .where(and(
        gte(verifiedSuppliers.createdAt, sixtyDaysAgo),
        lt(verifiedSuppliers.createdAt, thirtyDaysAgo)
      ));

    // Calculate supplier growth percentage
    const supplierGrowthPercentage = newSuppliersPrevious30Days.count > 0 
      ? ((newSuppliersLast30Days.count - newSuppliersPrevious30Days.count) / newSuppliersPrevious30Days.count) * 100
      : newSuppliersLast30Days.count > 0 ? 100 : 0;

    // Get ACTUAL pending items for action items
    const [pendingSuppliersCount] = await db
      .select({ count: count() })
      .from(verifiedSuppliers)
      .where(eq(verifiedSuppliers.verificationStatus, 'pending_review'));

    const [pendingProductsCount] = await db
      .select({ count: count() })
      .from(supplierProducts)
      .where(eq(supplierProducts.isVerified, false));

    // Get pending LCA reviews
    const [pendingReviews] = await db
      .select({ count: count() })
      .from(reports)
      .where(eq(reports.status, 'pending_review'));

    // Get total companies
    const [totalCompanies] = await db
      .select({ count: count() })
      .from(companies);

    const response = {
      totalUsers: totalUsers.count,
      newUserCount: newUsersLast30Days.count,
      userGrowthPercentage: Math.round(userGrowthPercentage * 100) / 100,
      totalSuppliers: totalSuppliers.count,
      newSupplierCount: newSuppliersLast30Days.count,
      supplierGrowthPercentage: Math.round(supplierGrowthPercentage * 100) / 100,
      totalCompanies: totalCompanies.count,
      pendingLcaReviews: pendingReviews.count,
      // Action Items data
      pendingSuppliersCount: pendingSuppliersCount.count,
      pendingProductsCount: pendingProductsCount.count,
      lastUpdated: new Date().toISOString()
    };
    
    console.log('Analytics response data:', JSON.stringify(response, null, 2));
    console.log('Total suppliers count from query:', totalSuppliers.count);
    
    res.json(response);

  } catch (error) {
    console.error('Admin analytics error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch analytics data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/suppliers
 * Returns all suppliers with their verification status
 */
/**
 * GET /api/admin/products/pending
 * Returns products that need verification
 */
router.get('/products/pending', async (req: AdminRequest, res: Response) => {
  try {
    console.log('Admin pending products endpoint called');
    
    // Get all products that are not verified
    const pendingProducts = await db
      .select({
        id: supplierProducts.id,
        productName: supplierProducts.productName,
        productDescription: supplierProducts.productDescription,
        supplierId: supplierProducts.supplierId,
        sku: supplierProducts.sku,
        isVerified: supplierProducts.isVerified,
        hasPrecalculatedLca: supplierProducts.hasPrecalculatedLca,
        submissionStatus: supplierProducts.submissionStatus,
        createdAt: supplierProducts.createdAt,
        submittedBy: supplierProducts.submittedBy,
        supplierName: verifiedSuppliers.supplierName,
      })
      .from(supplierProducts)
      .leftJoin(verifiedSuppliers, eq(supplierProducts.supplierId, verifiedSuppliers.id))
      .where(eq(supplierProducts.isVerified, false))
      .orderBy(desc(supplierProducts.createdAt));

    res.json(pendingProducts);
  } catch (error) {
    console.error('Admin pending products error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch pending products',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/admin/products/:id/approve
 * Approve a product submission
 */
router.post('/products/:id/approve', async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;
    console.log(`Admin approving product: ${id}`);
    
    const [updatedProduct] = await db
      .update(supplierProducts)
      .set({ 
        isVerified: true,
        verifiedBy: req.adminUser?.id || '41152482',
        verifiedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(supplierProducts.id, id))
      .returning();

    if (!updatedProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ message: 'Product approved successfully', product: updatedProduct });
  } catch (error) {
    console.error('Admin product approval error:', error);
    res.status(500).json({ 
      error: 'Failed to approve product',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/admin/products/:id/reject
 * Reject a product submission
 */
router.post('/products/:id/reject', async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;
    console.log(`Admin rejecting product: ${id}`);
    
    // For now, we'll delete rejected products. In a real app, you might want to keep them with a 'rejected' status
    const [deletedProduct] = await db
      .delete(supplierProducts)
      .where(eq(supplierProducts.id, id))
      .returning();

    if (!deletedProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ message: 'Product rejected and removed successfully' });
  } catch (error) {
    console.error('Admin product rejection error:', error);
    res.status(500).json({ 
      error: 'Failed to reject product',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/suppliers', async (req: AdminRequest, res: Response) => {
  try {
    console.log('Admin suppliers endpoint called');
    const suppliersWithSubmitter = await db
      .select({
        id: verifiedSuppliers.id,
        supplierName: verifiedSuppliers.supplierName,
        supplierCategory: verifiedSuppliers.supplierCategory,
        verificationStatus: verifiedSuppliers.verificationStatus,
        website: verifiedSuppliers.website,
        contactEmail: verifiedSuppliers.contactEmail,
        description: verifiedSuppliers.description,
        location: verifiedSuppliers.location,
        addressCountry: verifiedSuppliers.addressCountry,
        logoUrl: verifiedSuppliers.logoUrl,
        submittedBy: verifiedSuppliers.submittedBy,
        submittedByUserId: verifiedSuppliers.submittedByUserId,
        submittedByCompanyId: verifiedSuppliers.submittedByCompanyId,
        createdAt: verifiedSuppliers.createdAt,
        updatedAt: verifiedSuppliers.updatedAt,
        // Submitter details (only when submitted by a specific user)
        submitterEmail: users.email,
        submitterName: users.firstName,
        // Company details if submitted by company
        companyName: companies.name
      })
      .from(verifiedSuppliers)
      .leftJoin(users, eq(verifiedSuppliers.submittedByUserId, users.id))
      .leftJoin(companies, eq(verifiedSuppliers.submittedByCompanyId, companies.id))
      .orderBy(desc(verifiedSuppliers.createdAt));

    res.json({
      success: true,
      data: suppliersWithSubmitter
    });

  } catch (error) {
    console.error('Admin suppliers list error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch suppliers data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/suppliers/:supplierId
 * Returns detailed information for a specific supplier
 */
router.get('/suppliers/:supplierId', async (req: AdminRequest, res: Response) => {
  try {
    const { supplierId } = req.params;
    console.log('Admin supplier detail endpoint called for ID:', supplierId);
    
    const [supplier] = await db
      .select({
        id: verifiedSuppliers.id,
        supplierName: verifiedSuppliers.supplierName,
        supplierCategory: verifiedSuppliers.supplierCategory,
        verificationStatus: verifiedSuppliers.verificationStatus,
        website: verifiedSuppliers.website,
        contactEmail: verifiedSuppliers.contactEmail,
        description: verifiedSuppliers.description,
        location: verifiedSuppliers.location,
        addressStreet: verifiedSuppliers.addressStreet,
        addressCity: verifiedSuppliers.addressCity,
        addressPostalCode: verifiedSuppliers.addressPostalCode,
        addressCountry: verifiedSuppliers.addressCountry,
        logoUrl: verifiedSuppliers.logoUrl,
        submittedBy: verifiedSuppliers.submittedBy,
        submittedByUserId: verifiedSuppliers.submittedByUserId,
        submittedByCompanyId: verifiedSuppliers.submittedByCompanyId,
        createdAt: verifiedSuppliers.createdAt,
        updatedAt: verifiedSuppliers.updatedAt,
        verifiedBy: verifiedSuppliers.verifiedBy,
        verifiedAt: verifiedSuppliers.verifiedAt,
        // Submitter details (only when submitted by a specific user)
        submitterEmail: users.email,
        submitterName: users.firstName,
        // Company details if submitted by company
        companyName: companies.name
      })
      .from(verifiedSuppliers)
      .leftJoin(users, eq(verifiedSuppliers.submittedByUserId, users.id))
      .leftJoin(companies, eq(verifiedSuppliers.submittedByCompanyId, companies.id))
      .where(eq(verifiedSuppliers.id, supplierId));

    if (!supplier) {
      return res.status(404).json({
        success: false,
        error: 'Supplier not found',
        message: `No supplier found with ID ${supplierId}`
      });
    }

    res.json({
      success: true,
      data: supplier
    });

  } catch (error) {
    console.error('Admin supplier detail error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch supplier details',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/admin/suppliers/:supplierId
 * Updates supplier information
 */
router.put('/suppliers/:supplierId', async (req: AdminRequest, res: Response) => {
  try {
    const { supplierId } = req.params;
    const updateData = {
      supplierName: req.body.supplierName,
      supplierCategory: req.body.supplierCategory,
      verificationStatus: req.body.verificationStatus,
      website: req.body.website || null,
      contactEmail: req.body.contactEmail || null,
      description: req.body.description || null,
      addressStreet: req.body.addressStreet || null,
      addressCity: req.body.addressCity || null,
      addressPostalCode: req.body.addressPostalCode || null,
      addressCountry: req.body.addressCountry || null,
      logoUrl: req.body.logoUrl || null,
      updatedAt: new Date()
    };

    console.log('Raw request body for supplier update:', req.body);
    console.log('Update data prepared:', updateData);

    const [updatedSupplier] = await db
      .update(verifiedSuppliers)
      .set(updateData)
      .where(eq(verifiedSuppliers.id, supplierId))
      .returning();

    if (!updatedSupplier) {
      return res.status(404).json({
        success: false,
        error: 'Supplier not found',
        message: `No supplier found with ID ${supplierId}`
      });
    }

    res.json({
      success: true,
      message: 'Supplier updated successfully',
      data: updatedSupplier
    });

  } catch (error) {
    console.error('Admin supplier update error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update supplier',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/admin/suppliers/:supplierId
 * Deletes a supplier and all associated products
 */
router.delete('/suppliers/:supplierId', async (req: AdminRequest, res: Response) => {
  try {
    const { supplierId } = req.params;
    console.log(`Admin deleting supplier: ${supplierId}`);

    // First, check if supplier exists
    const existingSupplier = await db
      .select()
      .from(verifiedSuppliers)
      .where(eq(verifiedSuppliers.id, supplierId))
      .limit(1);

    if (existingSupplier.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Supplier not found',
        message: `No supplier found with ID ${supplierId}`
      });
    }

    // Delete all products associated with this supplier first
    const deletedProducts = await db
      .delete(supplierProducts)
      .where(eq(supplierProducts.supplierId, supplierId))
      .returning();

    console.log(`Deleted ${deletedProducts.length} products for supplier ${supplierId}`);

    // Now delete the supplier
    const [deletedSupplier] = await db
      .delete(verifiedSuppliers)
      .where(eq(verifiedSuppliers.id, supplierId))
      .returning();

    res.json({
      success: true,
      message: `Supplier deleted successfully (${deletedProducts.length} associated products also removed)`,
      data: {
        supplier: deletedSupplier,
        deletedProductsCount: deletedProducts.length
      }
    });

  } catch (error) {
    console.error('Admin supplier delete error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete supplier',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/admin/suppliers/:supplierId/verify
 * Updates a supplier's verification status to 'verified'
 */
router.put('/suppliers/:supplierId/verify', async (req: AdminRequest, res: Response) => {
  try {
    const { supplierId } = req.params;
    const adminUserId = req.adminUser?.id || '41152482'; // Use existing user ID in development

    // Update supplier verification status
    const [updatedSupplier] = await db
      .update(verifiedSuppliers)
      .set({
        verificationStatus: 'verified',
        verifiedBy: adminUserId,
        verifiedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(verifiedSuppliers.id, supplierId))
      .returning();

    if (!updatedSupplier) {
      return res.status(404).json({
        error: 'Supplier not found',
        message: `No supplier found with ID ${supplierId}`
      });
    }

    res.json({
      success: true,
      message: 'Supplier verified successfully',
      supplier: updatedSupplier
    });

  } catch (error) {
    console.error('Admin supplier verification error:', error);
    res.status(500).json({ 
      error: 'Failed to verify supplier',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/reports/pending
 * Returns all reports with status 'pending_review'
 */
router.get('/reports/pending', async (req: AdminRequest, res: Response) => {
  try {
    const pendingReports = await db
      .select({
        id: reports.id,
        companyId: reports.companyId,
        reportType: reports.reportType,
        status: reports.status,
        totalCarbonFootprint: reports.totalCarbonFootprint,
        createdAt: reports.createdAt,
        updatedAt: reports.updatedAt,
        // Company details
        companyName: companies.name,
        companyOwner: users.email
      })
      .from(reports)
      .leftJoin(companies, eq(reports.companyId, companies.id))
      .leftJoin(users, eq(companies.ownerId, users.id))
      .where(eq(reports.status, 'pending_review'))
      .orderBy(desc(reports.createdAt));

    res.json(pendingReports);

  } catch (error) {
    console.error('Admin pending reports error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch pending reports',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/admin/reports/:reportId/approve
 * Updates a report's status to 'approved'
 */
router.put('/reports/:reportId/approve', async (req: AdminRequest, res: Response) => {
  try {
    const { reportId } = req.params;
    const adminUserId = req.adminUser?.id || '41152482'; // Use existing user ID in development

    // Update report status
    const [updatedReport] = await db
      .update(reports)
      .set({
        status: 'approved',
        approvedBy: adminUserId,
        approvedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(reports.id, parseInt(reportId)))
      .returning();

    if (!updatedReport) {
      return res.status(404).json({
        error: 'Report not found',
        message: `No report found with ID ${reportId}`
      });
    }

    res.json({
      success: true,
      message: 'Report approved successfully',
      report: updatedReport
    });

  } catch (error) {
    console.error('Admin report approval error:', error);
    res.status(500).json({ 
      error: 'Failed to approve report',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/admin/suppliers/:supplierId
 * Updates a supplier's information
 */
router.put('/suppliers/:supplierId', async (req: AdminRequest, res: Response) => {
  try {
    const { supplierId } = req.params;
    
    console.log('Raw request body:', JSON.stringify(req.body, null, 2));
    
    // Clean the request body and ensure proper date handling
    const { images, createdAt, updatedAt, id, submittedBy, companyName, ...cleanData } = req.body;
    
    // Only include valid supplier fields that can be updated
    const updateData: any = {
      updatedAt: new Date()
    };

    // Only add fields that are present and valid - don't convert empty strings to null for required fields
    if (cleanData.supplierName && typeof cleanData.supplierName === 'string') {
      updateData.supplierName = cleanData.supplierName;
    }
    if (cleanData.supplierCategory && typeof cleanData.supplierCategory === 'string') {
      updateData.supplierCategory = cleanData.supplierCategory;
    }
    if (cleanData.website !== undefined) {
      updateData.website = cleanData.website === '' ? null : cleanData.website;
    }
    if (cleanData.contactEmail !== undefined) {
      updateData.contactEmail = cleanData.contactEmail === '' ? null : cleanData.contactEmail;
    }
    if (cleanData.description !== undefined) {
      updateData.description = cleanData.description === '' ? null : cleanData.description;
    }
    if (cleanData.location !== undefined) {
      updateData.location = cleanData.location === '' ? null : cleanData.location;
    }
    if (cleanData.addressStreet !== undefined) {
      updateData.addressStreet = cleanData.addressStreet === '' ? null : cleanData.addressStreet;
    }
    if (cleanData.addressCity !== undefined) {
      updateData.addressCity = cleanData.addressCity === '' ? null : cleanData.addressCity;
    }
    if (cleanData.addressPostalCode !== undefined) {
      updateData.addressPostalCode = cleanData.addressPostalCode === '' ? null : cleanData.addressPostalCode;
    }
    if (cleanData.addressCountry !== undefined) {
      updateData.addressCountry = cleanData.addressCountry === '' ? null : cleanData.addressCountry;
    }
    if (cleanData.logoUrl !== undefined) {
      updateData.logoUrl = cleanData.logoUrl || null;
    }
    if (cleanData.verificationStatus && typeof cleanData.verificationStatus === 'string') {
      updateData.verificationStatus = cleanData.verificationStatus;
    }

    console.log('Cleaned update data:', JSON.stringify(updateData, null, 2));

    const [updatedSupplier] = await db
      .update(verifiedSuppliers)
      .set(updateData)
      .where(eq(verifiedSuppliers.id, supplierId))
      .returning();

    if (!updatedSupplier) {
      return res.status(404).json({
        error: 'Supplier not found',
        message: `No supplier found with ID ${supplierId}`
      });
    }

    res.json({
      success: true,
      message: 'Supplier updated successfully',
      supplier: updatedSupplier
    });

  } catch (error) {
    console.error('Admin supplier update error:', error);
    res.status(500).json({ 
      error: 'Failed to update supplier',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/admin/suppliers/:supplierId
 * Deletes a supplier and all associated products
 */
router.delete('/suppliers/:supplierId', async (req: AdminRequest, res: Response) => {
  try {
    const { supplierId } = req.params;
    // First delete all associated supplier products
    await db
      .delete(supplierProducts)
      .where(eq(supplierProducts.supplierId, supplierId));

    // Then delete the supplier
    const [deletedSupplier] = await db
      .delete(verifiedSuppliers)
      .where(eq(verifiedSuppliers.id, supplierId))
      .returning();

    if (!deletedSupplier) {
      return res.status(404).json({
        error: 'Supplier not found',
        message: `No supplier found with ID ${supplierId}`
      });
    }

    res.json({
      success: true,
      message: 'Supplier and all associated products deleted successfully',
      supplier: deletedSupplier
    });

  } catch (error) {
    console.error('Admin supplier delete error:', error);
    res.status(500).json({ 
      error: 'Failed to delete supplier',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as adminRouter };