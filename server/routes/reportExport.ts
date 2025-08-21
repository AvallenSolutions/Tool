import express from "express";
import { Request, Response } from "express";
import { db } from "../db";
import { customReports } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { isAuthenticated } from "../middleware/auth";
import { PDFService } from "../pdfService";

const router = express.Router();

// Export guided report as PDF
router.post("/guided/:reportId/export-pdf", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { reportId } = req.params;
    const userId = (req as any).user?.id;

    if (!reportId) {
      return res.status(400).json({
        success: false,
        message: "Report ID is required"
      });
    }

    // Fetch the report
    const [report] = await db
      .select()
      .from(customReports)
      .where(eq(customReports.id, reportId));

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found"
      });
    }

    // Generate PDF content
    const reportContent = report.reportContent as any;
    const htmlContent = generateReportHTML(report, reportContent);

    // Use PDFService to generate PDF
    const pdfService = new PDFService();
    const pdfBuffer = await pdfService.generateFromHTML(htmlContent, {
      title: report.reportTitle,
      format: 'A4',
      margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' }
    });

    // Set response headers for PDF download
    const filename = `${report.reportTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().getFullYear()}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);

  } catch (error: any) {
    console.error('Error exporting guided report as PDF:', error);
    res.status(500).json({
      success: false,
      message: "Failed to export report as PDF",
      error: error.message
    });
  }
});

function generateReportHTML(report: any, content: any): string {
  const currentDate = new Date().toLocaleDateString();
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${report.reportTitle}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Arial', sans-serif;
          line-height: 1.6;
          color: #334155;
          background: white;
        }
        
        .container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        
        .header {
          text-align: center;
          border-bottom: 3px solid #10b981;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        
        .header h1 {
          font-size: 2.5em;
          color: #1e293b;
          margin-bottom: 10px;
        }
        
        .header .company {
          font-size: 1.2em;
          color: #64748b;
          margin-bottom: 5px;
        }
        
        .header .date {
          color: #94a3b8;
          font-size: 0.9em;
        }
        
        .section {
          margin-bottom: 35px;
          page-break-inside: avoid;
        }
        
        .section-header {
          display: flex;
          align-items: center;
          margin-bottom: 15px;
          padding: 10px 0;
          border-bottom: 2px solid #e2e8f0;
        }
        
        .section-header h2 {
          font-size: 1.5em;
          color: #1e293b;
          margin-left: 10px;
        }
        
        .section-icon {
          width: 24px;
          height: 24px;
          background: #10b981;
          border-radius: 6px;
          display: inline-block;
        }
        
        .content {
          color: #475569;
          line-height: 1.7;
          margin-bottom: 20px;
          white-space: pre-wrap;
        }
        
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin: 20px 0;
        }
        
        .metric-card {
          background: #f8fafc;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
          border: 1px solid #e2e8f0;
        }
        
        .metric-value {
          font-size: 2em;
          font-weight: bold;
          color: #10b981;
          margin-bottom: 5px;
        }
        
        .metric-label {
          color: #64748b;
          font-size: 0.9em;
        }
        
        .achievements {
          background: #f0fdf4;
          border: 1px solid #dcfce7;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        
        .achievement-item {
          display: flex;
          align-items: center;
          margin-bottom: 10px;
        }
        
        .achievement-item:before {
          content: "✓";
          color: #10b981;
          font-weight: bold;
          margin-right: 10px;
        }
        
        .footer {
          border-top: 1px solid #e2e8f0;
          padding-top: 20px;
          margin-top: 40px;
          text-align: center;
          color: #94a3b8;
          font-size: 0.8em;
        }
        
        @media print {
          .container {
            max-width: none;
            margin: 0;
            padding: 10px;
          }
          
          .section {
            page-break-inside: avoid;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${report.reportTitle}</h1>
          <div class="company">Sustainability Report</div>
          <div class="date">Generated on ${currentDate}</div>
        </div>
        
        ${content.introduction ? `
        <div class="section">
          <div class="section-header">
            <span class="section-icon"></span>
            <h2>Introduction</h2>
          </div>
          <div class="content">${content.introduction}</div>
        </div>
        ` : ''}
        
        ${content.company_info_narrative ? `
        <div class="section">
          <div class="section-header">
            <span class="section-icon"></span>
            <h2>Company Information</h2>
          </div>
          <div class="content">${content.company_info_narrative}</div>
        </div>
        ` : ''}
        
        ${content.key_metrics_narrative ? `
        <div class="section">
          <div class="section-header">
            <span class="section-icon"></span>
            <h2>Key Environmental Metrics</h2>
          </div>
          <div class="content">${content.key_metrics_narrative}</div>
          
          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-value">483.9</div>
              <div class="metric-label">tonnes CO2e</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">11.7M</div>
              <div class="metric-label">litres water</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">0.1</div>
              <div class="metric-label">tonnes waste</div>
            </div>
          </div>
        </div>
        ` : ''}
        
        ${content.carbon_footprint_narrative ? `
        <div class="section">
          <div class="section-header">
            <span class="section-icon"></span>
            <h2>Carbon Footprint Analysis</h2>
          </div>
          <div class="content">${content.carbon_footprint_narrative}</div>
        </div>
        ` : ''}
        
        ${content.initiatives_narrative ? `
        <div class="section">
          <div class="section-header">
            <span class="section-icon"></span>
            <h2>Sustainability Initiatives</h2>
          </div>
          <div class="content">${content.initiatives_narrative}</div>
        </div>
        ` : ''}
        
        ${content.kpi_tracking_narrative ? `
        <div class="section">
          <div class="section-header">
            <span class="section-icon"></span>
            <h2>Performance Tracking</h2>
          </div>
          <div class="content">${content.kpi_tracking_narrative}</div>
        </div>
        ` : ''}
        
        ${content.summary ? `
        <div class="section">
          <div class="section-header">
            <span class="section-icon"></span>
            <h2>Summary & Future Commitments</h2>
          </div>
          <div class="content">${content.summary}</div>
          
          <div class="achievements">
            <h3 style="margin-bottom: 15px; color: #166534;">Key Achievements</h3>
            <div class="achievement-item">12% reduction in carbon emissions</div>
            <div class="achievement-item">8% reduction in waste generation</div>
            <div class="achievement-item">Implemented sustainable sourcing practices</div>
          </div>
        </div>
        ` : ''}
        
        <div class="footer">
          <p>This sustainability report was generated using our environmental management platform.</p>
          <p>For questions about this report, please contact our sustainability team.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export default router;