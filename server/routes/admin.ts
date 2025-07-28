import { Router } from 'express';
import { db } from '../db';
import { users, companies, reports, verifiedSuppliers, supplierProducts } from '@shared/schema';
import { requireAdminRole, type AdminRequest } from '../middleware/adminAuth';
import { eq, count, gte, desc, and } from 'drizzle-orm';

const router = Router();

// TEMPORARY: Disable admin middleware for development
// TODO: Re-enable for production
// router.use(requireAdminRole);

/**
 * GET /api/admin/analytics
 * Returns platform analytics and key metrics
 */
router.get('/analytics', async (req: AdminRequest, res) => {
  try {
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
        gte(thirtyDaysAgo, users.createdAt)
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
        gte(thirtyDaysAgo, verifiedSuppliers.createdAt)
      ));

    // Calculate supplier growth percentage
    const supplierGrowthPercentage = newSuppliersPrevious30Days.count > 0 
      ? ((newSuppliersLast30Days.count - newSuppliersPrevious30Days.count) / newSuppliersPrevious30Days.count) * 100
      : newSuppliersLast30Days.count > 0 ? 100 : 0;

    // Get pending LCA reviews
    const [pendingReviews] = await db
      .select({ count: count() })
      .from(reports)
      .where(eq(reports.status, 'pending_review'));

    // Get total companies
    const [totalCompanies] = await db
      .select({ count: count() })
      .from(companies);

    res.json({
      totalUsers: totalUsers.count,
      newUserCount: newUsersLast30Days.count,
      userGrowthPercentage: Math.round(userGrowthPercentage * 100) / 100,
      totalSuppliers: totalSuppliers.count,
      newSupplierCount: newSuppliersLast30Days.count,
      supplierGrowthPercentage: Math.round(supplierGrowthPercentage * 100) / 100,
      totalCompanies: totalCompanies.count,
      pendingLcaReviews: pendingReviews.count,
      lastUpdated: new Date().toISOString()
    });

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
router.get('/suppliers', async (req: AdminRequest, res) => {
  try {
    const suppliersWithSubmitter = await db
      .select({
        id: verifiedSuppliers.id,
        supplierName: verifiedSuppliers.supplierName,
        supplierCategory: verifiedSuppliers.supplierCategory,
        verificationStatus: verifiedSuppliers.verificationStatus,
        website: verifiedSuppliers.website,
        contactEmail: verifiedSuppliers.contactEmail,
        description: verifiedSuppliers.description,
        addressCountry: verifiedSuppliers.addressCountry,
        submittedBy: verifiedSuppliers.submittedBy,
        submittedByCompanyId: verifiedSuppliers.submittedByCompanyId,
        createdAt: verifiedSuppliers.createdAt,
        // Submitter details
        submitterEmail: users.email,
        submitterName: users.firstName,
        // Company details if submitted by company
        companyName: companies.name
      })
      .from(verifiedSuppliers)
      .leftJoin(users, eq(verifiedSuppliers.submittedBy, users.id))
      .leftJoin(companies, eq(verifiedSuppliers.submittedByCompanyId, companies.id))
      .orderBy(desc(verifiedSuppliers.createdAt));

    res.json(suppliersWithSubmitter);

  } catch (error) {
    console.error('Admin suppliers list error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch suppliers data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/admin/suppliers/:supplierId/verify
 * Updates a supplier's verification status to 'verified'
 */
router.put('/suppliers/:supplierId/verify', async (req: AdminRequest, res) => {
  try {
    const { supplierId } = req.params;
    const adminUserId = req.adminUser?.id || 'dev-user';

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
router.get('/reports/pending', async (req: AdminRequest, res) => {
  try {
    const pendingReports = await db
      .select({
        id: reports.id,
        companyId: reports.companyId,
        productName: reports.productName,
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
router.put('/reports/:reportId/approve', async (req: AdminRequest, res) => {
  try {
    const { reportId } = req.params;
    const adminUserId = req.adminUser?.id || 'dev-user';

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

export { router as adminRouter };