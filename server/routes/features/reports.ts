import { Router } from 'express';
import { isAuthenticated } from '../../replitAuth';
import { storage as dbStorage } from '../../storage';
import { reports, insertReportSchema, customReports } from '@shared/schema';
import { db } from '../../db';
import { eq, desc } from 'drizzle-orm';
import { logger, logDatabase } from '../../config/logger';
import { unifiedPDFService } from '../../services/UnifiedPDFService';
import * as htmlPdf from 'html-pdf-node';

const router = Router();

// Generate HTML for guided sustainability reports
function generateGuidedReportHTML(reportData: any): string {
  const title = reportData.title || 'Sustainability Report';
  const companyName = reportData.companyName || reportData.company?.name || 'Company';
  const metrics = reportData.metrics || {};
  const content = reportData.content || {};

  const sectionTitles: Record<string, string> = {
    summary: 'Executive Summary',
    introduction: 'Introduction', 
    initiatives_narrative: 'Sustainability Initiatives',
    key_metrics_narrative: 'Key Environmental Metrics',
    company_info_narrative: 'Company Information',
    kpi_tracking_narrative: 'KPI Tracking & Progress',
    carbon_footprint_narrative: 'Carbon Footprint Analysis'
  };

  const sectionOrder = [
    'summary', 'introduction', 'company_info_narrative',
    'key_metrics_narrative', 'carbon_footprint_narrative',
    'initiatives_narrative', 'kpi_tracking_narrative'
  ];

  let htmlContent = '';

  // Add metrics section if available
  htmlContent += `
    <section class="metrics">
      <h2>Environmental Metrics Overview</h2>
      <div class="metrics-grid">
        <div class="metric-card">
          <h3>Carbon Footprint</h3>
          <p class="metric-value">${metrics.co2e || 0} kg CO₂e</p>
        </div>
        <div class="metric-card">
          <h3>Water Usage</h3>
          <p class="metric-value">${metrics.water || 0} L</p>
        </div>
        <div class="metric-card">
          <h3>Waste Generated</h3>
          <p class="metric-value">${metrics.waste || 0} kg</p>
        </div>
      </div>
    </section>
  `;

  // Add content sections in order
  sectionOrder.forEach(sectionKey => {
    if (content[sectionKey] && String(content[sectionKey]).trim()) {
      const sectionTitle = sectionTitles[sectionKey] || sectionKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      const sectionContent = String(content[sectionKey]).trim();
      htmlContent += `
        <section class="content-section">
          <h2>${sectionTitle}</h2>
          <div class="content-text">${sectionContent}</div>
        </section>
      `;
    }
  });

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
      * { box-sizing: border-box; }
      body { 
        font-family: 'Helvetica', 'Arial', sans-serif; 
        line-height: 1.6; 
        color: #1f2937; 
        margin: 0; 
        padding: 20px; 
        background: white;
      }
      .container { max-width: 800px; margin: 0 auto; background: white; }
      .header { 
        text-align: center; 
        border-bottom: 3px solid #10b981; 
        padding-bottom: 30px; 
        margin-bottom: 40px; 
      }
      h1 { 
        color: #10b981; 
        font-size: 2.8em; 
        margin: 0; 
        font-weight: bold; 
        margin-bottom: 10px;
      }
      .company { 
        font-size: 1.4em; 
        color: #4f46e5; 
        margin: 15px 0; 
        font-weight: 600;
      }
      .date { color: #6b7280; font-size: 1em; }
      
      .metrics {
        background: #f8fafc;
        padding: 25px;
        border-radius: 8px;
        margin: 30px 0;
        border: 1px solid #e2e8f0;
      }
      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 20px;
        margin-top: 20px;
      }
      .metric-card {
        background: white;
        padding: 20px;
        border-radius: 6px;
        text-align: center;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        border: 1px solid #e5e7eb;
      }
      .metric-card h3 {
        color: #374151;
        font-size: 0.9em;
        margin: 0 0 10px 0;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-weight: 600;
      }
      .metric-value {
        font-size: 1.8em;
        font-weight: bold;
        color: #10b981;
        margin: 0;
      }
      
      .content-section { 
        margin: 40px 0; 
        page-break-inside: avoid;
      }
      h2 { 
        color: #1f2937; 
        border-bottom: 2px solid #10b981; 
        padding-bottom: 12px; 
        font-size: 1.5em;
        margin: 0 0 20px 0;
        font-weight: bold;
      }
      .content-text {
        color: #374151;
        font-size: 1.1em;
        line-height: 1.7;
        text-align: justify;
        margin-top: 15px;
      }
      
      .footer { 
        text-align: center; 
        margin-top: 60px; 
        padding-top: 30px; 
        border-top: 2px solid #e5e7eb; 
        color: #6b7280;
        font-size: 0.9em;
      }
      
      @media print {
        body { background: white !important; }
        .container { box-shadow: none !important; }
      }
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>${title}</h1>
            <p class="company">${companyName}</p>
            <p class="date">Generated on ${new Date().toLocaleDateString()}</p>
        </header>
        
        <main class="content">
            ${htmlContent}
        </main>
        
        <footer class="footer">
            <p>This report was generated by the Avallen Sustainability Platform</p>
        </footer>
    </div>
</body>
</html>`;
}

// POST /api/reports/guided/:reportId/export - Export guided report
router.post('/guided/:reportId/export', isAuthenticated, async (req: any, res: any) => {
  try {
    const { reportId } = req.params;
    const { format = 'pdf' } = req.body;
    const userId = req.user?.claims?.sub || req.user?.id;
    
    if (!reportId) {
      return res.status(400).json({ error: 'Report ID is required' });
    }
    
    // Get user's company
    const userCompany = await dbStorage.getCompanyByOwner(userId);
    if (!userCompany) {
      return res.status(404).json({ error: 'User company not found' });
    }
    
    // Get report data from customReports table
    const [reportData] = await db
      .select()
      .from(customReports)
      .where(eq(customReports.id, reportId));
    
    if (!reportData) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    // Transform database row to ReportData interface format
    const transformedReportData = {
      id: reportData.id,
      title: reportData.reportTitle,
      content: reportData.reportContent || {},
      companyName: userCompany.name,
      template: {
        id: reportData.reportType,
        name: 'Guided Sustainability Report',
        category: 'sustainability'
      },
      metrics: {
        co2e: 0, // Will fetch actual data below
        water: 0,
        waste: 0
      },
      company: {
        name: userCompany.name,
        industry: userCompany.industry || 'Manufacturing',
        country: userCompany.country || 'UK'
      }
    };
    
    // Fetch actual company metrics for the report
    try {
      const sustainabilityData = await dbStorage.getCompanySustainabilityData(userCompany.id);
      if (sustainabilityData) {
        transformedReportData.metrics = {
          co2e: sustainabilityData.totalCO2e || 0,
          water: sustainabilityData.totalWaterUsage || 0, 
          waste: sustainabilityData.totalWasteGenerated || 0
        };
      }
    } catch (error) {
      console.warn('Could not fetch company metrics for PDF:', error);
    }
    
    let filename: string;
    let buffer: Buffer;
    let contentType: string;
    
    if (format === 'pdf') {
      console.log('🚀 Using direct html-pdf-node for guided reports...');
      
      // Generate HTML directly
      const html = generateGuidedReportHTML(transformedReportData);
      console.log('📝 Generated HTML length:', html.length);
      
      // Use html-pdf-node directly
      const file = { content: html };
      const pdfOptions = { 
        format: 'A4',
        margin: { top: '20mm', bottom: '20mm', left: '20mm', right: '20mm' },
        printBackground: true,
        displayHeaderFooter: false
      };
      
      buffer = await htmlPdf.generatePdf(file, pdfOptions);
      console.log('✅ Direct PDF generated successfully, size:', buffer.length, 'bytes');
      
      filename = `${reportData.reportTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().getFullYear()}.pdf`;
      contentType = 'application/pdf';
    } else if (format === 'pptx') {
      buffer = await unifiedPDFService.exportReport(transformedReportData, 'pptx');
      filename = `${reportData.reportTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().getFullYear()}.pptx`;
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
    console.error('Export error details:', error);
    logger.error({ 
      error, 
      route: '/api/reports/guided/:reportId/export',
      reportId: req.params.reportId 
    }, 'Failed to export report');
    res.status(500).json({ 
      error: 'Failed to export report',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/reports/guided/:reportId/export-pdf - Export guided report as PDF
router.post('/guided/:reportId/export-pdf', isAuthenticated, async (req: any, res: any) => {
  try {
    const { reportId } = req.params;
    const userId = req.user?.claims?.sub || req.user?.id;
    
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

// GET /api/reports/guided/:reportId/images - Get uploaded images for a guided report
router.get('/guided/:reportId/images', isAuthenticated, async (req: any, res: any) => {
  try {
    const { reportId } = req.params;
    const userId = req.user?.claims?.sub || req.user?.id;
    
    if (!reportId) {
      return res.status(400).json({ error: 'Report ID is required' });
    }
    
    // Get user's company
    const userCompany = await dbStorage.getCompanyByOwner(userId);
    if (!userCompany) {
      return res.status(404).json({ error: 'User company not found' });
    }
    
    // Get report data
    const [report] = await db.select()
      .from(customReports)
      .where(eq(customReports.id, reportId))
      .limit(1);
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    // Verify user has access to this report
    if (report.companyId !== userCompany.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json({ uploadedImages: report.uploadedImages || {} });
    logDatabase('SELECT', 'customReports', undefined, { reportId, companyId: userCompany.id });
    
  } catch (error) {
    logger.error({ error, route: '/api/reports/guided/:reportId/images', reportId: req.params.reportId }, 'Failed to fetch report images');
    res.status(500).json({ error: 'Failed to fetch report images' });
  }
});

// PUT /api/reports/guided/:reportId/images - Add image to report section
router.put('/guided/:reportId/images', isAuthenticated, async (req: any, res: any) => {
  try {
    const { reportId } = req.params;
    const { sectionId, imageUrl } = req.body;
    const userId = req.user?.claims?.sub || req.user?.id;
    
    if (!reportId || !sectionId || !imageUrl) {
      return res.status(400).json({ error: 'Report ID, section ID, and image URL are required' });
    }
    
    // Get user's company
    const userCompany = await dbStorage.getCompanyByOwner(userId);
    if (!userCompany) {
      return res.status(404).json({ error: 'User company not found' });
    }
    
    // Get current report data
    const [report] = await db.select()
      .from(customReports)
      .where(eq(customReports.id, reportId))
      .limit(1);
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    // Verify user has access to this report
    if (report.companyId !== userCompany.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Update uploaded images
    const currentImages = report.uploadedImages || {};
    const sectionImages = currentImages[sectionId] || [];
    
    // Add new image if not already present
    if (!sectionImages.includes(imageUrl)) {
      sectionImages.push(imageUrl);
      currentImages[sectionId] = sectionImages;
      
      await db.update(customReports)
        .set({ 
          uploadedImages: currentImages,
          updatedAt: new Date()
        })
        .where(eq(customReports.id, reportId));
    }
    
    res.json({ success: true, uploadedImages: currentImages });
    logDatabase('UPDATE', 'customReports', undefined, { reportId, sectionId, companyId: userCompany.id });
    
  } catch (error) {
    logger.error({ error, route: '/api/reports/guided/:reportId/images', reportId: req.params.reportId }, 'Failed to add image to report');
    res.status(500).json({ error: 'Failed to add image to report' });
  }
});

// DELETE /api/reports/guided/:reportId/images - Remove image from report section
router.delete('/guided/:reportId/images', isAuthenticated, async (req: any, res: any) => {
  try {
    const { reportId } = req.params;
    const { sectionId, imageUrl } = req.body;
    const userId = req.user?.claims?.sub || req.user?.id;
    
    if (!reportId || !sectionId || !imageUrl) {
      return res.status(400).json({ error: 'Report ID, section ID, and image URL are required' });
    }
    
    // Get user's company
    const userCompany = await dbStorage.getCompanyByOwner(userId);
    if (!userCompany) {
      return res.status(404).json({ error: 'User company not found' });
    }
    
    // Get current report data
    const [report] = await db.select()
      .from(customReports)
      .where(eq(customReports.id, reportId))
      .limit(1);
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    // Verify user has access to this report
    if (report.companyId !== userCompany.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Update uploaded images - remove the specified image
    const currentImages = report.uploadedImages || {};
    const sectionImages = currentImages[sectionId] || [];
    
    // Remove image from section
    const updatedSectionImages = sectionImages.filter((url: string) => url !== imageUrl);
    
    if (updatedSectionImages.length === 0) {
      // Remove the section if no images left
      delete currentImages[sectionId];
    } else {
      currentImages[sectionId] = updatedSectionImages;
    }
    
    await db.update(customReports)
      .set({ 
        uploadedImages: currentImages,
        updatedAt: new Date()
      })
      .where(eq(customReports.id, reportId));
    
    res.json({ success: true, uploadedImages: currentImages });
    logDatabase('UPDATE', 'customReports', undefined, { reportId, sectionId, companyId: userCompany.id, action: 'remove_image' });
    
  } catch (error) {
    logger.error({ error, route: '/api/reports/guided/:reportId/images', reportId: req.params.reportId }, 'Failed to remove image from report');
    res.status(500).json({ error: 'Failed to remove image from report' });
  }
});

export default router;