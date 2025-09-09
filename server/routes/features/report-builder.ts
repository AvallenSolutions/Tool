import { Router } from 'express';
import { z } from 'zod';
import { isAuthenticated } from '../../replitAuth';
import { storage as dbStorage } from '../../storage';
import { logger } from '../../config/logger';
import { TimeSeriesEngine } from '../../services/TimeSeriesEngine';

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
  })
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
 * Fetch metrics data based on user selections
 */
async function fetchMetricsData(companyId: number, dataSelections: ReportExportRequest['dataSelections']) {
  try {
    const { startDate, endDate } = dataSelections.timeRange;
    
    // Fetch company data
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

    return {
      company,
      products: productsData.filter(p => p !== null),
      kpis: kpiData,
      timeRange: { startDate, endDate }
    };
    
  } catch (error) {
    logger.error({ companyId, error }, 'Error fetching metrics data');
    throw new Error('Failed to fetch metrics data');
  }
}

/**
 * Generate report in specified format
 */
async function generateReport(
  config: ReportExportRequest, 
  company: any, 
  metricsData: any
) {
  // This will be implemented with Puppeteer/pptxgenjs in the next phase
  // For now, return a placeholder response
  
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
    }
  };

  switch (config.exportFormat) {
    case 'pdf':
      return {
        type: 'pdf',
        downloadUrl: '/api/report/download/placeholder.pdf', // Will be implemented
        content: reportContent
      };
      
    case 'powerpoint':
      return {
        type: 'powerpoint', 
        downloadUrl: '/api/report/download/placeholder.pptx', // Will be implemented
        content: reportContent
      };
      
    case 'web':
      return {
        type: 'web',
        content: reportContent,
        html: generateWebReport(reportContent) // Basic HTML for web format
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

export default router;