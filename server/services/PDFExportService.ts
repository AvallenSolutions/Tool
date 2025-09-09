import puppeteer, { Browser, Page } from 'puppeteer';
import { logger } from '../config/logger';
import path from 'path';
import fs from 'fs/promises';

export interface PDFExportOptions {
  reportType: string;
  company: any;
  metricsData: any;
  templateOptions: any;
  blocks?: any[];
}

export class PDFExportService {
  private static browser: Browser | null = null;

  /**
   * Initialize Puppeteer browser instance (reused for performance)
   */
  private static async getBrowser(): Promise<Browser> {
    if (!PDFExportService.browser) {
      PDFExportService.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920x1080'
        ]
      });
      
      logger.info({}, 'PDF Service: Puppeteer browser initialized');
    }
    return PDFExportService.browser;
  }

  /**
   * Generate HTML content for the report
   */
  private static generateReportHTML(options: PDFExportOptions): string {
    const { reportType, company, metricsData, templateOptions, blocks } = options;
    
    const title = templateOptions.customTitle || `${reportType.toUpperCase()} Report - ${company.companyName}`;
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long', 
      day: 'numeric'
    });

    // Generate content based on blocks or default structure
    let contentSections = '';
    
    if (blocks && blocks.length > 0) {
      contentSections = blocks.map(block => PDFExportService.generateBlockHTML(block, metricsData)).join('\n');
    } else {
      // Default report structure if no blocks provided
      contentSections = `
        <div class="section">
          <h2>Executive Summary</h2>
          <p>This sustainability report provides a comprehensive overview of ${company.companyName}'s environmental performance and sustainability initiatives.</p>
        </div>
        
        <div class="section">
          <h2>Key Metrics</h2>
          <div class="metrics-grid">
            <div class="metric-card">
              <h3>Total Products Analyzed</h3>
              <div class="metric-value">${metricsData.products.length}</div>
            </div>
            <div class="metric-card">
              <h3>KPIs Tracked</h3>
              <div class="metric-value">${metricsData.kpis.length}</div>
            </div>
            <div class="metric-card">
              <h3>Reporting Period</h3>
              <div class="metric-value">${new Date(metricsData.timeRange.startDate).getFullYear()}</div>
            </div>
          </div>
        </div>
      `;
    }

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Inter', sans-serif;
            line-height: 1.6;
            color: #374151;
            background: white;
          }
          
          .container {
            max-width: 210mm;
            margin: 0 auto;
            padding: 20mm;
            min-height: 297mm;
          }
          
          .header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 30px;
            border-bottom: 3px solid;
            border-image: linear-gradient(135deg, #22c55e, #3b82f6) 1;
          }
          
          .header h1 {
            font-size: 2.5rem;
            font-weight: 700;
            background: linear-gradient(135deg, #22c55e, #3b82f6);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 10px;
          }
          
          .header .company-name {
            font-size: 1.5rem;
            color: #6b7280;
            margin-bottom: 5px;
          }
          
          .header .date {
            font-size: 1rem;
            color: #9ca3af;
          }
          
          .section {
            margin-bottom: 40px;
            page-break-inside: avoid;
          }
          
          .section h2 {
            font-size: 1.8rem;
            font-weight: 600;
            color: #22c55e;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e5e7eb;
          }
          
          .section h3 {
            font-size: 1.3rem;
            font-weight: 500;
            color: #374151;
            margin-bottom: 15px;
          }
          
          .section p {
            margin-bottom: 15px;
            text-align: justify;
          }
          
          .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 30px 0;
          }
          
          .metric-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
          }
          
          .metric-card h3 {
            font-size: 0.9rem;
            font-weight: 500;
            color: #64748b;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          
          .metric-value {
            font-size: 2rem;
            font-weight: 700;
            color: #22c55e;
          }
          
          .metric-unit {
            font-size: 0.8rem;
            color: #64748b;
            margin-top: 4px;
          }
          
          .chart-placeholder {
            background: #f1f5f9;
            border: 2px dashed #cbd5e1;
            border-radius: 8px;
            height: 300px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #64748b;
            font-style: italic;
            margin: 20px 0;
          }
          
          .footer {
            margin-top: 60px;
            padding-top: 30px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #9ca3af;
            font-size: 0.9rem;
          }
          
          .page-break {
            page-break-before: always;
          }
          
          @media print {
            .container {
              margin: 0;
              padding: 15mm;
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
            <h1>${title}</h1>
            <div class="company-name">${company.companyName}</div>
            <div class="date">Generated on ${currentDate}</div>
          </div>
          
          ${contentSections}
          
          <div class="footer">
            <p>This report was generated using the Drinks Sustainability Platform</p>
            <p>Generated on ${new Date().toISOString()}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate HTML for a specific block type
   */
  private static generateBlockHTML(block: any, metricsData: any): string {
    switch (block.type) {
      case 'title':
        return `
          <div class="section">
            <h1 style="text-align: center; font-size: 2rem; margin-bottom: 10px;">${block.content?.title || 'Title'}</h1>
            ${block.content?.subtitle ? `<p style="text-align: center; color: #6b7280; font-size: 1.2rem;">${block.content.subtitle}</p>` : ''}
          </div>
        `;
      
      case 'metrics':
        const metrics = block.content?.metrics || [
          { label: 'Total Products', value: metricsData.products.length, unit: 'products' },
          { label: 'KPIs Tracked', value: metricsData.kpis.length, unit: 'KPIs' }
        ];
        
        return `
          <div class="section">
            <h2>Key Sustainability Metrics</h2>
            <div class="metrics-grid">
              ${metrics.map(metric => `
                <div class="metric-card">
                  <h3>${metric.label}</h3>
                  <div class="metric-value">${metric.value}</div>
                  <div class="metric-unit">${metric.unit}</div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      
      case 'chart':
        return `
          <div class="section">
            <h2>${block.content?.title || 'Chart'}</h2>
            <div class="chart-placeholder">
              Chart visualization would appear here
            </div>
          </div>
        `;
      
      case 'text':
        return `
          <div class="section">
            <div>${block.content?.content || block.content?.text || 'Text content'}</div>
          </div>
        `;
      
      case 'editable_text':
        const text = block.content?.text || 'Text content';
        const formatting = block.content?.formatting || {};
        
        // Build style string based on formatting options
        let styles = [];
        
        // Font size
        switch (formatting.fontSize) {
          case 'small':
            styles.push('font-size: 0.875rem');
            break;
          case 'large':
            styles.push('font-size: 1.125rem');
            break;
          default:
            styles.push('font-size: 1rem');
        }
        
        // Text alignment
        switch (formatting.alignment) {
          case 'center':
            styles.push('text-align: center');
            break;
          case 'right':
            styles.push('text-align: right');
            break;
          case 'justify':
            styles.push('text-align: justify');
            break;
          default:
            styles.push('text-align: left');
        }
        
        // Font style
        switch (formatting.style) {
          case 'bold':
            styles.push('font-weight: bold');
            break;
          case 'italic':
            styles.push('font-style: italic');
            break;
          default:
            styles.push('font-weight: normal');
            styles.push('font-style: normal');
        }
        
        const styleString = styles.join('; ');
        
        return `
          <div class="section">
            <div style="${styleString}; margin-bottom: 15px; line-height: 1.6;">${text}</div>
          </div>
        `;
      
      default:
        return `
          <div class="section">
            <h2>${block.title || 'Content Block'}</h2>
            <p>Content for ${block.type} block</p>
          </div>
        `;
    }
  }

  /**
   * Generate PDF from options
   */
  static async generatePDF(options: PDFExportOptions): Promise<{ filePath: string; filename: string }> {
    const browser = await PDFExportService.getBrowser();
    const page = await browser.newPage();
    
    try {
      logger.info({ reportType: options.reportType }, 'PDF Service: Starting PDF generation');
      
      // Set viewport for consistent rendering
      await page.setViewport({ width: 1920, height: 1080 });
      
      // Generate HTML content
      const htmlContent = PDFExportService.generateReportHTML(options);
      
      // Set content and wait for resources to load
      await page.setContent(htmlContent, { 
        waitUntil: ['networkidle0', 'domcontentloaded'],
        timeout: 30000 
      });
      
      // Generate unique filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `sustainability-report-${timestamp}.pdf`;
      const filePath = path.join(process.cwd(), 'temp', filename);
      
      // Ensure temp directory exists
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      
      // Generate PDF with professional options
      await page.pdf({
        path: filePath,
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm', 
          bottom: '20mm',
          left: '15mm'
        },
        displayHeaderFooter: true,
        headerTemplate: '<div></div>',
        footerTemplate: `
          <div style="font-size: 10px; color: #666; width: 100%; text-align: center; margin: 0 15mm;">
            <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
          </div>
        `
      });
      
      logger.info({ 
        filename, 
        filePath,
        company: options.company.companyName 
      }, 'PDF Service: PDF generated successfully');
      
      return { filePath, filename };
      
    } catch (error) {
      logger.error({ 
        error: error instanceof Error ? error.message : String(error),
        reportType: options.reportType 
      }, 'PDF Service: Error generating PDF');
      throw error;
    } finally {
      await page.close();
    }
  }

  /**
   * Clean up browser instance
   */
  static async cleanup(): Promise<void> {
    if (PDFExportService.browser) {
      await PDFExportService.browser.close();
      PDFExportService.browser = null;
      logger.info({}, 'PDF Service: Browser cleanup completed');
    }
  }
}