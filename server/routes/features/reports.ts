import { Router } from 'express';
import { isAuthenticated } from '../../replitAuth';
import { storage as dbStorage } from '../../storage';
import { reports, insertReportSchema } from '@shared/schema';
import { db } from '../../db';
import { eq, desc } from 'drizzle-orm';
import { logger, logDatabase } from '../../config/logger';
import { unifiedPDFService } from '../../services/UnifiedPDFService';

const router = Router();

// POST /api/reports/guided/:reportId/export - Export guided report
router.post('/guided/:reportId/export', isAuthenticated, async (req: any, res: any) => {
  try {
    const { reportId } = req.params;
    const { format = 'pdf' } = req.body;
    const userId = req.user?.id;
    
    if (!reportId) {
      return res.status(400).json({ error: 'Report ID is required' });
    }
    
    // Get user's company
    const userCompany = await dbStorage.getCompanyByOwner(userId);
    if (!userCompany) {
      return res.status(404).json({ error: 'User company not found' });
    }
    
    // Get report data
    const reportData = await dbStorage.getReportById(parseInt(reportId));
    if (!reportData) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    let filename: string;
    let buffer: Buffer;
    let contentType: string;
    
    if (format === 'pdf') {
      buffer = await unifiedPDFService.exportReport(reportData, 'pdf');
      filename = `${reportData.report.reportTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().getFullYear()}.pdf`;
      contentType = 'application/pdf';
    } else if (format === 'pptx') {
      buffer = await unifiedPDFService.exportReport(reportData, 'pptx');
      filename = `${reportData.report.reportTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().getFullYear()}.pptx`;
      contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    } else {
      return res.status(400).json({ error: 'Unsupported format. Use pdf or pptx' });
    }
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    
    res.send(buffer);
    
    logger.info({ 
      reportId, 
      format, 
      userId, 
      companyId: userCompany.id,
      filename 
    }, 'Report exported successfully');
    
  } catch (error) {
    logger.error({ 
      error, 
      route: '/api/reports/guided/:reportId/export',
      reportId: req.params.reportId 
    }, 'Failed to export report');
    res.status(500).json({ error: 'Failed to export report' });
  }
});

// POST /api/reports/guided/:reportId/export-pdf - Export guided report as PDF
router.post('/guided/:reportId/export-pdf', isAuthenticated, async (req: any, res: any) => {
  try {
    const { reportId } = req.params;
    const userId = req.user?.id;
    
    if (!reportId) {
      return res.status(400).json({ error: 'Report ID is required' });
    }
    
    // Get user's company
    const userCompany = await dbStorage.getCompanyByOwner(userId);
    if (!userCompany) {
      return res.status(404).json({ error: 'User company not found' });
    }
    
    // Get report data
    const reportData = await dbStorage.getReportById(parseInt(reportId));
    if (!reportData) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    // Generate PDF using enhanced PDFGenerator for sustainability reports
    console.log('🌱 Generating sustainability report PDF with PDFGenerator...');
    
    // Import PDFGenerator
    const { PDFGenerator } = await import('../../report-generation/pdfGenerator.js');
    const pdfGenerator = new PDFGenerator();
    
    // Prepare data for PDF generation
    const sustainabilityReportData = {
      report: {
        reportTitle: reportData.reportTitle || 'Sustainability Report',
        reportType: reportData.reportType || 'comprehensive'
      },
      content: {
        introduction: reportData.introduction || '',
        company_info_narrative: reportData.companyInfoNarrative || '',
        key_metrics_narrative: reportData.keyMetricsNarrative || '',
        carbon_footprint_narrative: reportData.carbonFootprintNarrative || '',
        initiatives_narrative: reportData.initiativesNarrative || '',
        kpi_tracking_narrative: reportData.kpiTrackingNarrative || '',
        social_impact_narrative: reportData.socialImpactNarrative || '',
        summary: reportData.summary || ''
      },
      company: userCompany || {},
      metrics: {
        // Pull metrics from existing dashboard APIs - will use real data
        totalCO2Emissions: reportData.totalCO2Emissions || 0,
        totalWaterUsage: reportData.totalWaterUsage || 0,
        totalWasteGenerated: reportData.totalWasteGenerated || 0,
        scope1Emissions: reportData.scope1Emissions || 0,
        scope2Emissions: reportData.scope2Emissions || 0,
        scope3Emissions: reportData.scope3Emissions || 0
      },
      selectedInitiatives: reportData.selectedInitiatives || [],
      selectedKPIs: reportData.selectedKPIs || [],
      uploadedImages: {} // Future Phase 3 implementation
    };
    
    const buffer = await pdfGenerator.generateSustainabilityPDF(reportData.reportType || 'comprehensive', sustainabilityReportData);
    const filename = `sustainability_report_${reportId}_${Date.now()}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    
    res.send(buffer);
    
    logger.info({ 
      reportId, 
      userId, 
      companyId: userCompany.id,
      filename 
    }, 'PDF report exported successfully');
    
  } catch (error) {
    logger.error({ 
      error, 
      route: '/api/reports/guided/:reportId/export-pdf',
      reportId: req.params.reportId 
    }, 'Failed to export PDF report');
    res.status(500).json({ error: 'Failed to export PDF report' });
  }
});

// GET /api/reports - Get all reports for user's company
router.get('/', isAuthenticated, async (req: any, res: any) => {
  try {
    const userId = req.user?.claims?.sub || req.user?.id; // Support both formats
    const userCompany = await dbStorage.getCompanyByOwner(userId);
    
    if (!userCompany) {
      return res.status(404).json({ error: 'User company not found' });
    }
    
    const companyReports = await db.select()
      .from(reports)
      .where(eq(reports.companyId, userCompany.id))
      .orderBy(desc(reports.createdAt));
    
    res.json(companyReports);
    logDatabase('SELECT', 'reports', undefined, { companyId: userCompany.id, count: companyReports.length });
    
  } catch (error) {
    logger.error({ error, route: '/api/reports' }, 'Failed to fetch reports');
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// POST /api/reports - Create new report
router.post('/', isAuthenticated, async (req: any, res: any) => {
  try {
    const userId = req.user?.claims?.sub || req.user?.id; // Support both formats
    const reportData = req.body;
    
    const userCompany = await dbStorage.getCompanyByOwner(userId);
    if (!userCompany) {
      return res.status(404).json({ error: 'User company not found' });
    }
    
    const newReport = await db.insert(reports)
      .values({
        ...reportData,
        companyId: userCompany.id,
        createdById: userId
      })
      .returning();
    
    res.status(201).json(newReport[0]);
    logDatabase('INSERT', 'reports', undefined, { companyId: userCompany.id, reportType: reportData.type });
    
  } catch (error) {
    logger.error({ error, route: '/api/reports' }, 'Failed to create report');
    res.status(500).json({ error: 'Failed to create report' });
  }
});

// GET /api/reports/:id - Get specific report
router.get('/:id', isAuthenticated, async (req: any, res: any) => {
  try {
    const reportId = parseInt(req.params.id);
    const userId = req.user?.id;
    
    const userCompany = await dbStorage.getCompanyByOwner(userId);
    if (!userCompany) {
      return res.status(404).json({ error: 'User company not found' });
    }
    
    const report = await db.select()
      .from(reports)
      .where(eq(reports.id, reportId))
      .limit(1);
    
    if (!report || report.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    // Verify user has access to this report
    if (report[0].companyId !== userCompany.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(report[0]);
    logDatabase('SELECT', 'reports', undefined, { reportId, companyId: userCompany.id });
    
  } catch (error) {
    logger.error({ error, route: '/api/reports/:id', reportId: req.params.id }, 'Failed to fetch report');
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

// DELETE /api/reports/:id - Delete a specific report
router.delete('/:id', isAuthenticated, async (req: any, res: any) => {
  try {
    const userId = req.user?.claims?.sub || req.user?.id;
    const reportId = parseInt(req.params.id);
    
    if (!reportId || isNaN(reportId)) {
      return res.status(400).json({ error: 'Invalid report ID' });
    }
    
    const userCompany = await dbStorage.getCompanyByOwner(userId);
    if (!userCompany) {
      return res.status(404).json({ error: 'User company not found' });
    }
    
    // Verify the report belongs to the user's company
    const [existingReport] = await db.select()
      .from(reports)
      .where(eq(reports.id, reportId))
      .limit(1);
    
    if (!existingReport) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    if (existingReport.companyId !== userCompany.id) {
      return res.status(403).json({ error: 'Unauthorized to delete this report' });
    }
    
    // Delete the report
    await db.delete(reports)
      .where(eq(reports.id, reportId));
    
    res.json({ success: true, message: 'Report deleted successfully' });
    logDatabase('DELETE', 'reports', undefined, { reportId, companyId: userCompany.id });
    
  } catch (error) {
    logger.error({ error, route: '/api/reports/:id', reportId: req.params.id }, 'Failed to delete report');
    res.status(500).json({ error: 'Failed to delete report' });
  }
});

export default router;