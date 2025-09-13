import { Router } from 'express';
import { z } from 'zod';
import { isAuthenticated } from '../../replitAuth';
import { storage as dbStorage } from '../../storage';
import { logger } from '../../config/logger';
import { TimeSeriesEngine } from '../../services/TimeSeriesEngine';
import { consolidatedPDFService } from '../../services/ConsolidatedPDFService';
import { PowerPointExportService } from '../../services/PowerPointExportService';
import { createReadStream } from 'fs';
import fs from 'fs/promises';
import path from 'path';

const router = Router();

// Validation schema for report export configuration
const reportExportSchema = z.object({
  reportType: z.enum(['sustainability', 'carbon-focused', 'compliance', 'stakeholder']),
  exportFormat: z.enum(['pdf', 'powerpoint', 'web']),
  templateOptions: z.object({
    includeMetrics: z.boolean().default(true),
    includeCharts: z.boolean().default(true),
    includeBranding: z.boolean().default(true),
    customTitle: z.string().optional()
  }).default({}),
  dataSelections: z.object({
    timeRange: z.object({
      startDate: z.string(),
      endDate: z.string()
    }),
    includeKPIs: z.array(z.string()).default([]),
    includeProducts: z.array(z.number()).default([]),
    includeSuppliers: z.array(z.string()).default([])
  }).default({
    timeRange: {
      startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString()
    }
  }),
  blocks: z.array(z.object({
    id: z.string(),
    type: z.string(),
    title: z.string(),
    content: z.any(),
    order: z.number(),
    isVisible: z.boolean()
  })).optional()
});

type ReportExportRequest = z.infer<typeof reportExportSchema>;

/**
 * POST /api/report/export
 * 
 * New Report Builder export endpoint
 * Replaces the broken guided report system with a clean, modular approach
 */
router.post('/export', isAuthenticated, async (req, res) => {
  try {
    const user = req.user as any;
    const userId = user?.claims?.sub;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Validate request payload
    const validationResult = reportExportSchema.safeParse(req.body);
    if (!validationResult.success) {
      logger.warn({
        userId,
        validationErrors: validationResult.error.errors
      }, 'Invalid report export request');
      
      return res.status(400).json({ 
        error: 'Invalid request data',
        details: validationResult.error.errors
      });
    }

    const config: ReportExportRequest = validationResult.data;
    
    logger.info({
      userId,
      reportType: config.reportType,
      exportFormat: config.exportFormat
    }, 'Report Builder export request received');

    // Get user's company
    const company = await dbStorage.getCompanyByOwner(userId);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Fetch metrics data based on selections
    const metricsData = await fetchMetricsData(company.id, config.dataSelections);
    
    // Generate report based on format
    const reportResult = await generateReport(config, company, metricsData);
    
    logger.info({
      userId,
      companyId: company.id,
      reportType: config.reportType,
      exportFormat: config.exportFormat,
      success: true
    }, 'Report Builder export completed successfully');

    res.json({
      success: true,
      data: reportResult,
      metadata: {
        reportType: config.reportType,
        exportFormat: config.exportFormat,
        generatedAt: new Date().toISOString(),
        company: {
          id: company.id,
          name: company.companyName
        }
      }
    });

  } catch (error) {
    logger.error({
      userId: req.user?.claims?.sub,
      error: error instanceof Error ? error.message : String(error)
    }, 'Error in Report Builder export');
    
    res.status(500).json({ 
      error: 'Failed to generate report',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Fetch comprehensive data for PDF generation - SAME as Preview components
 */
async function fetchMetricsData(companyId: number, dataSelections: ReportExportRequest['dataSelections']) {
  try {
    const { startDate, endDate } = dataSelections.timeRange;
    
    // Fetch basic company data
    const company = await dbStorage.getCompanyById(companyId);
    
    // Fetch selected products data
    const productsData = dataSelections.includeProducts.length > 0 
      ? await Promise.all(
          dataSelections.includeProducts.map(id => dbStorage.getProductById(id))
        )
      : await dbStorage.getProductsByCompany(companyId);

    // Fetch KPI data for selected time range using TimeSeriesEngine
    const timeSeriesEngine = new TimeSeriesEngine();
    const kpiData = await timeSeriesEngine.getKPIHistoryForDateRange(
      companyId,
      new Date(startDate),
      new Date(endDate)
    );

    // ===== FETCH ALL PREVIEW COMPONENT DATA SOURCES =====
    
    // CompanyStoryPreview data - fetch from API endpoint
    let companyStory = null;
    try {
      const companyStoryResponse = await fetch(`http://localhost:5000/api/company/story`);
      if (companyStoryResponse.ok) {
        companyStory = await companyStoryResponse.json();
      }
    } catch (e) {
      logger.warn({ companyId, error: e }, 'Failed to fetch company story');
    }
    
    // MetricsSummaryPreview & CarbonFootprintPreview data sources
    const [dashboardMetrics, comprehensiveFootprint, carbonCalculatorTotal, scope3Data] = await Promise.allSettled([
      fetch(`http://localhost:5000/api/dashboard/metrics`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`http://localhost:5000/api/company/footprint/comprehensive`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`http://localhost:5000/api/carbon-calculator-total`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`http://localhost:5000/api/company/footprint/scope3/automated`).then(r => r.ok ? r.json() : null).catch(() => null)
    ]);
    
    // WaterFootprintPreview data sources
    const [monthlyDataSummary, waterFootprint] = await Promise.allSettled([
      fetch(`http://localhost:5000/api/monthly-data-summary`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`http://localhost:5000/api/company/water-footprint`).then(r => r.ok ? r.json() : null).catch(() => null)
    ]);
    
    // KPIProgressPreview data source
    const [enhancedKpis] = await Promise.allSettled([
      fetch(`http://localhost:5000/api/enhanced-kpis/dashboard`).then(r => r.ok ? r.json() : null).catch(() => null)
    ]);
    
    // InitiativesPreview data source - SMART Goals
    const [smartGoals] = await Promise.allSettled([
      fetch(`http://localhost:5000/api/smart-goals`).then(r => r.ok ? r.json() : null).catch(() => null)
    ]);

    // Extract values from Promise.allSettled results
    const getSettledValue = (result: any) => result.status === 'fulfilled' ? result.value : null;

    return {
      // Basic data
      company,
      products: productsData.filter(p => p !== null),
      kpis: kpiData,
      timeRange: { startDate, endDate },
      
      // Preview component data sources
      companyStory,
      dashboardMetrics: getSettledValue(dashboardMetrics),
      comprehensiveFootprint: getSettledValue(comprehensiveFootprint),
      carbonCalculatorTotal: getSettledValue(carbonCalculatorTotal),
      scope3Data: getSettledValue(scope3Data),
      monthlyDataSummary: getSettledValue(monthlyDataSummary),
      waterFootprint: getSettledValue(waterFootprint),
      enhancedKpis: getSettledValue(enhancedKpis),
      smartGoals: getSettledValue(smartGoals)
    };
    
  } catch (error) {
    logger.error({ companyId, error }, 'Error fetching comprehensive metrics data');
    throw new Error('Failed to fetch comprehensive metrics data');
  }
}

/**
 * Generate report in specified format using export services
 */
async function generateReport(
  config: ReportExportRequest, 
  company: any, 
  metricsData: any
) {
  logger.info({ 
    exportFormat: config.exportFormat,
    reportType: config.reportType,
    companyId: company.id 
  }, 'Report generation started');

  const exportOptions = {
    reportType: config.reportType,
    company,
    metricsData,
    templateOptions: config.templateOptions,
    blocks: config.blocks // Blocks from frontend Report Builder
  };

  switch (config.exportFormat) {
    case 'pdf':
      try {
        logger.info({ 
          exportOptions: {
            reportType: exportOptions.reportType,
            companyName: exportOptions.company?.companyName,
            blocksCount: exportOptions.blocks?.length,
            hasMetricsData: !!exportOptions.metricsData
          }
        }, 'About to call ConsolidatedPDFService.generatePDF');
        
        // Use the consolidated PDF service for report generation
        const reportData = {
          id: `export-${Date.now()}`,
          title: config.templateOptions.customTitle || `${config.reportType.toUpperCase()} Report`,
          content: {},
          companyName: company.companyName,
          metrics: metricsData,
          blocks: config.blocks
        };
        
        const pdfBuffer = await consolidatedPDFService.generatePDF(reportData, {
          type: 'comprehensive',
          templateType: config.reportType
        });
        
        // Save to file system
        const fs = await import('fs');
        const path = await import('path');
        const filename = `report_${Date.now()}.pdf`;
        const filePath = path.join(process.cwd(), 'generated_reports', filename);
        
        // Ensure directory exists
        const reportsDir = path.dirname(filePath);
        if (!fs.existsSync(reportsDir)) {
          fs.mkdirSync(reportsDir, { recursive: true });
        }
        
        fs.writeFileSync(filePath, pdfBuffer);
        
        const pdfResult = { filename, filePath };
        
        logger.info({ pdfResult }, 'ConsolidatedPDFService.generatePDF completed successfully');
        
        // Auto-save PDF to reports database
        try {
          const reportData = {
            title: config.templateOptions.customTitle || `${config.reportType.toUpperCase()} Report`,
            blocks: config.blocks,
            templateOptions: config.templateOptions,
            generatedAt: new Date().toISOString(),
            exportFormat: 'pdf'
          };
          
          const newReport = await dbStorage.createReport({
            companyId: company.id,
            reportType: config.reportType,
            status: 'completed',
            pdfFilePath: pdfResult.filePath,
            totalCarbonFootprint: metricsData.totalCO2e || 0,
            totalWaterUsage: metricsData.totalWater || 0,
            totalWasteGenerated: metricsData.totalWaste || 0,
            reportData: reportData,
            reportingPeriodStart: new Date(config.dataSelections.timeRange.startDate),
            reportingPeriodEnd: new Date(config.dataSelections.timeRange.endDate)
          });
          
          logger.info({ 
            reportId: newReport.id, 
            companyId: company.id, 
            reportType: config.reportType 
          }, 'PDF report auto-saved to database');
          
        } catch (saveError) {
          logger.warn({ error: saveError }, 'Failed to auto-save PDF to database, but PDF generation succeeded');
        }
        
        return {
          type: 'pdf',
          downloadUrl: `/api/report/download/${pdfResult.filename}`,
          filename: pdfResult.filename,
          filePath: pdfResult.filePath,
          content: {
            title: config.templateOptions.customTitle || `${config.reportType.toUpperCase()} Report`,
            company: company.companyName,
            generatedAt: new Date().toISOString()
          }
        };
      } catch (error) {
        logger.error({ error }, 'PDF generation failed');
        throw new Error('Failed to generate PDF report');
      }
      
    case 'powerpoint':
      try {
        const pptxResult = await PowerPointExportService.generatePowerPoint(exportOptions);
        return {
          type: 'powerpoint',
          downloadUrl: `/api/report/download/${pptxResult.filename}`,
          filename: pptxResult.filename,
          filePath: pptxResult.filePath,
          content: {
            title: config.templateOptions.customTitle || `${config.reportType.toUpperCase()} Report`,
            company: company.companyName,
            generatedAt: new Date().toISOString()
          }
        };
      } catch (error) {
        logger.error({ error }, 'PowerPoint generation failed');
        throw new Error('Failed to generate PowerPoint report');
      }
      
    case 'web':
      const reportContent = {
        title: config.templateOptions.customTitle || `${config.reportType.toUpperCase()} Report - ${company.companyName}`,
        generatedAt: new Date().toISOString(),
        reportType: config.reportType,
        exportFormat: config.exportFormat,
        company: {
          name: company.companyName,
          id: company.id
        },
        metrics: {
          totalProducts: metricsData.products.length,
          totalKPIs: metricsData.kpis.length,
          timeRange: metricsData.timeRange
        },
        blocks: (config as any).blocks
      };
      
      return {
        type: 'web',
        content: reportContent,
        html: generateWebReport(reportContent)
      };
      
    default:
      throw new Error(`Unsupported export format: ${config.exportFormat}`);
  }
}

/**
 * Generate basic HTML for web report format
 */
function generateWebReport(content: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${content.title}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { border-bottom: 2px solid #22c55e; padding-bottom: 20px; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric { background: #f8fafc; padding: 20px; border-radius: 8px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${content.title}</h1>
        <p>Generated for ${content.company.name} on ${new Date(content.generatedAt).toLocaleDateString()}</p>
      </div>
      <div class="metrics">
        <div class="metric">
          <h3>Products Analyzed</h3>
          <p>${content.metrics.totalProducts}</p>
        </div>
        <div class="metric">
          <h3>KPIs Tracked</h3>
          <p>${content.metrics.totalKPIs}</p>
        </div>
        <div class="metric">
          <h3>Report Type</h3>
          <p>${content.reportType.toUpperCase()}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Download generated report file
 */
router.get('/download/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Security: Validate filename to prevent directory traversal
    if (!filename || !/^[a-zA-Z0-9\-_\.]+$/.test(filename)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid filename' 
      });
    }
    
    const filePath = path.join(process.cwd(), 'temp', filename);
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ 
        success: false, 
        error: 'File not found' 
      });
    }
    
    // Set appropriate headers based on file type
    const ext = path.extname(filename).toLowerCase();
    let contentType = 'application/octet-stream';
    let downloadName = filename;
    
    if (ext === '.pdf') {
      contentType = 'application/pdf';
    } else if (ext === '.pptx') {
      contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    }
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.setHeader('Expires', '-1');
    res.setHeader('Pragma', 'no-cache');
    
    // Stream the file
    const fileStream = createReadStream(filePath);
    fileStream.pipe(res);
    
    // Clean up file after sending (with delay to ensure download completes)
    fileStream.on('end', () => {
      setTimeout(async () => {
        try {
          await fs.unlink(filePath);
          logger.info({ filename, filePath }, 'Report file cleaned up after download');
        } catch (error) {
          logger.warn({ filename, error }, 'Failed to clean up report file');
        }
      }, 5000); // 5 second delay
    });
    
    logger.info({ 
      filename, 
      contentType,
      userAgent: req.get('User-Agent') 
    }, 'Report file download started');
    
  } catch (error) {
    logger.error({ error, filename: req.params.filename }, 'Error downloading report file');
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
});

export default router;