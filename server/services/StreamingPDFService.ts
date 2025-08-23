import { Readable, PassThrough } from 'stream';
import { Response } from 'express';
import PDFDocument from 'pdfkit';
import { logger } from '../config/logger';
import { browserPoolService } from './BrowserPoolService';
import type { ReportData, LCAReportData, PDFGenerationOptions } from './UnifiedPDFService';

/**
 * Streaming PDF Service - Streams PDF output directly to response
 * Eliminates large Buffer memory usage and improves performance
 */
export class StreamingPDFService {
  private static instance: StreamingPDFService;

  static getInstance(): StreamingPDFService {
    if (!StreamingPDFService.instance) {
      StreamingPDFService.instance = new StreamingPDFService();
    }
    return StreamingPDFService.instance;
  }

  /**
   * Stream PDF directly to HTTP response
   */
  async streamPDFToResponse(
    data: ReportData | LCAReportData, 
    options: PDFGenerationOptions,
    res: Response,
    filename?: string
  ): Promise<void> {
    const title = ('title' in data) ? data.title : ('product' in data ? data.product?.name : 'Report');
    const safeFilename = filename || `${title.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`;

    // Set response headers for PDF streaming
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-PDF-Generation-Method', 'streaming');

    try {
      logger.info({ 
        title, 
        type: options.type,
        streaming: true 
      }, 'Starting streaming PDF generation');

      const startTime = Date.now();

      switch (options.type) {
        case 'basic':
        case 'modern':
          await this.streamPDFKitPDF(data, options, res);
          break;
        
        case 'comprehensive':
        case 'professional':
        case 'branded':
          await this.streamPuppeteerPDF(data, options, res);
          break;
        
        default:
          throw new Error(`Unsupported PDF type: ${options.type}`);
      }

      const duration = Date.now() - startTime;
      logger.info({ 
        title, 
        type: options.type,
        duration,
        streaming: true 
      }, 'Streaming PDF generation completed');

    } catch (error) {
      logger.error({ error, title, type: options.type }, 'Streaming PDF generation failed');
      
      if (!res.headersSent) {
        res.status(500).json({ 
          error: 'PDF generation failed',
          message: error.message 
        });
      }
      throw error;
    }
  }

  /**
   * Stream PDF using PDFKit directly to response
   */
  private async streamPDFKitPDF(
    data: ReportData | LCAReportData,
    options: PDFGenerationOptions,
    res: Response
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          margin: 50,
          size: options.format || 'A4',
          ...options.margins && {
            margins: options.margins
          }
        });

        // Pipe directly to response
        doc.pipe(res);

        // Handle stream events
        doc.on('error', (error) => {
          logger.error({ error }, 'PDFKit stream error');
          reject(error);
        });

        res.on('error', (error) => {
          logger.error({ error }, 'Response stream error');
          reject(error);
        });

        res.on('close', () => {
          logger.debug({}, 'PDF response stream closed');
        });

        // Generate content
        this.generatePDFKitContent(doc, data, options);

        // Finalize the document
        doc.end();

        // Wait for the document to finish
        doc.on('end', () => {
          resolve();
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Stream PDF using Puppeteer with browser pool
   */
  private async streamPuppeteerPDF(
    data: ReportData | LCAReportData,
    options: PDFGenerationOptions,
    res: Response
  ): Promise<void> {
    let pageId: string | undefined;

    try {
      // Get page from browser pool
      const { page, pageId: pid } = await browserPoolService.getPage();
      pageId = pid;

      // Generate HTML content
      const htmlContent = this.generateHTMLContent(data, options);

      // Set content
      await page.setContent(htmlContent, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      // Configure PDF options
      const pdfOptions = {
        format: options.format || 'A4' as const,
        margin: options.margins || { top: '1in', bottom: '1in', left: '1in', right: '1in' },
        printBackground: true,
        preferCSSPageSize: true,
        ...options.puppeteerOptions
      };

      // Generate PDF and pipe to response
      const pdfStream = await page.createPDFStream(pdfOptions);
      
      // Pipe the PDF stream directly to the response
      pdfStream.pipe(res);

      // Wait for stream to complete
      await new Promise<void>((resolve, reject) => {
        pdfStream.on('end', resolve);
        pdfStream.on('error', reject);
        res.on('error', reject);
      });

    } catch (error) {
      logger.error({ error }, 'Puppeteer streaming PDF generation failed');
      throw error;
    } finally {
      // Always release the page back to the pool
      if (pageId) {
        await browserPoolService.releasePage(pageId);
      }
    }
  }

  /**
   * Create readable stream from buffer data (utility method)
   */
  createBufferStream(buffer: Buffer): Readable {
    const stream = new PassThrough();
    stream.end(buffer);
    return stream;
  }

  /**
   * Stream file from file system path
   */
  async streamFileToResponse(filePath: string, res: Response, filename?: string): Promise<void> {
    const fs = await import('fs');
    const path = await import('path');

    const stats = await fs.promises.stat(filePath);
    const safeFilename = filename || path.basename(filePath);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);

    const readStream = fs.createReadStream(filePath);
    
    readStream.on('error', (error) => {
      logger.error({ error, filePath }, 'File stream error');
      if (!res.headersSent) {
        res.status(500).json({ error: 'File streaming failed' });
      }
    });

    readStream.pipe(res);
  }

  /**
   * Create memory-efficient PDF stream from large data
   */
  async createDataStream(data: any[], processor: (item: any) => Promise<Buffer>): Promise<Readable> {
    const stream = new PassThrough();

    // Process data in chunks to avoid memory issues
    const processChunk = async () => {
      try {
        for (const item of data) {
          const buffer = await processor(item);
          if (!stream.write(buffer)) {
            // Wait for drain if buffer is full
            await new Promise(resolve => stream.once('drain', resolve));
          }
        }
        stream.end();
      } catch (error) {
        stream.destroy(error);
      }
    };

    // Start processing asynchronously
    setImmediate(processChunk);

    return stream;
  }

  /**
   * Generate PDFKit content for different data types
   */
  private generatePDFKitContent(doc: PDFDocument, data: ReportData | LCAReportData, options: PDFGenerationOptions): void {
    const title = ('title' in data) ? data.title : ('product' in data ? data.product?.name : 'Report');

    // Header
    doc.fontSize(20).text(title, { align: 'center' });
    doc.moveDown();

    // Company branding if provided
    if (options.branding?.companyName) {
      doc.fontSize(14).text(`Prepared for: ${options.branding.companyName}`, { align: 'center' });
      doc.moveDown();
    }

    // Content generation based on data type
    if ('content' in data) {
      // ReportData content
      this.generateReportContent(doc, data);
    } else if ('lcaResults' in data) {
      // LCAReportData content
      this.generateLCAContent(doc, data);
    }

    // Footer
    doc.fontSize(8)
       .text(`Generated on ${new Date().toLocaleDateString()}`, 50, doc.page.height - 50);
  }

  private generateReportContent(doc: PDFDocument, data: ReportData): void {
    if (data.content) {
      Object.entries(data.content).forEach(([section, content]) => {
        doc.fontSize(16).text(section, { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(12).text(content);
        doc.moveDown();
      });
    }

    if (data.metrics) {
      doc.fontSize(16).text('Key Metrics', { underline: true });
      doc.moveDown(0.5);
      
      if (data.metrics.co2e) {
        doc.fontSize(12).text(`Carbon Footprint: ${data.metrics.co2e} kg CO2e`);
      }
      if (data.metrics.water) {
        doc.fontSize(12).text(`Water Usage: ${data.metrics.water} L`);
      }
      if (data.metrics.waste) {
        doc.fontSize(12).text(`Waste Generated: ${data.metrics.waste} kg`);
      }
    }
  }

  private generateLCAContent(doc: PDFDocument, data: LCAReportData): void {
    // Product Information
    doc.fontSize(16).text('Product Information', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Product: ${data.product.name}`);
    if (data.product.sku) doc.text(`SKU: ${data.product.sku}`);
    if (data.product.volume) doc.text(`Volume: ${data.product.volume}`);
    doc.moveDown();

    // Company Information
    doc.fontSize(16).text('Company Information', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Company: ${data.company.name}`);
    if (data.company.industry) doc.text(`Industry: ${data.company.industry}`);
    if (data.company.country) doc.text(`Country: ${data.company.country}`);
    doc.moveDown();

    // LCA Results
    doc.fontSize(16).text('LCA Results', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Total Carbon Footprint: ${data.lcaResults.totalCarbonFootprint} kg CO2e`);
    if (data.lcaResults.totalWaterFootprint) {
      doc.text(`Total Water Footprint: ${data.lcaResults.totalWaterFootprint} L`);
    }

    if (data.lcaResults.impactsByCategory) {
      doc.moveDown();
      doc.fontSize(14).text('Impact Categories:', { underline: true });
      doc.moveDown(0.5);
      
      data.lcaResults.impactsByCategory.forEach(category => {
        doc.fontSize(12).text(`${category.category}: ${category.impact} ${category.unit}`);
      });
    }
  }

  /**
   * Generate HTML content for Puppeteer rendering
   */
  private generateHTMLContent(data: ReportData | LCAReportData, options: PDFGenerationOptions): string {
    const title = ('title' in data) ? data.title : ('product' in data ? data.product?.name : 'Report');
    const brandingStyle = options.branding?.primaryColor ? 
      `<style>:root { --primary-color: ${options.branding.primaryColor}; }</style>` : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        ${brandingStyle}
        <style>
          body { 
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; 
            line-height: 1.6; 
            margin: 0; 
            padding: 20px;
            color: #333;
          }
          .header { 
            text-align: center; 
            border-bottom: 2px solid var(--primary-color, #10b981);
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header h1 { 
            color: var(--primary-color, #10b981); 
            margin: 0;
            font-size: 28px;
          }
          .section { 
            margin: 20px 0; 
            page-break-inside: avoid;
          }
          .section h2 { 
            color: var(--primary-color, #10b981); 
            border-bottom: 1px solid #eee;
            padding-bottom: 5px;
          }
          .metrics { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
            gap: 20px; 
            margin: 20px 0;
          }
          .metric-card { 
            border: 1px solid #eee; 
            padding: 15px; 
            border-radius: 8px;
            background: #f9f9f9;
          }
          .metric-value { 
            font-size: 24px; 
            font-weight: bold; 
            color: var(--primary-color, #10b981);
          }
          .footer { 
            margin-top: 50px; 
            text-align: center; 
            font-size: 12px; 
            color: #666;
            border-top: 1px solid #eee;
            padding-top: 20px;
          }
          @media print {
            body { margin: 0; }
            .page-break { page-break-before: always; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${title}</h1>
          ${options.branding?.companyName ? `<p>Prepared for: ${options.branding.companyName}</p>` : ''}
        </div>
        
        ${this.generateHTMLBody(data)}
        
        <div class="footer">
          <p>Generated on ${new Date().toLocaleDateString()} using Avallen Sustainability Platform</p>
        </div>
      </body>
      </html>
    `;
  }

  private generateHTMLBody(data: ReportData | LCAReportData): string {
    if ('content' in data) {
      return this.generateReportHTML(data);
    } else if ('lcaResults' in data) {
      return this.generateLCAHTML(data);
    }
    return '<div class="section"><p>No content available</p></div>';
  }

  private generateReportHTML(data: ReportData): string {
    let html = '';

    if (data.content) {
      Object.entries(data.content).forEach(([section, content]) => {
        html += `
          <div class="section">
            <h2>${section}</h2>
            <p>${content}</p>
          </div>
        `;
      });
    }

    if (data.metrics) {
      html += `
        <div class="section">
          <h2>Key Metrics</h2>
          <div class="metrics">
            ${data.metrics.co2e ? `
              <div class="metric-card">
                <div>Carbon Footprint</div>
                <div class="metric-value">${data.metrics.co2e} kg CO2e</div>
              </div>
            ` : ''}
            ${data.metrics.water ? `
              <div class="metric-card">
                <div>Water Usage</div>
                <div class="metric-value">${data.metrics.water} L</div>
              </div>
            ` : ''}
            ${data.metrics.waste ? `
              <div class="metric-card">
                <div>Waste Generated</div>
                <div class="metric-value">${data.metrics.waste} kg</div>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }

    return html;
  }

  private generateLCAHTML(data: LCAReportData): string {
    return `
      <div class="section">
        <h2>Product Information</h2>
        <p><strong>Product:</strong> ${data.product.name}</p>
        ${data.product.sku ? `<p><strong>SKU:</strong> ${data.product.sku}</p>` : ''}
        ${data.product.volume ? `<p><strong>Volume:</strong> ${data.product.volume}</p>` : ''}
      </div>

      <div class="section">
        <h2>Company Information</h2>
        <p><strong>Company:</strong> ${data.company.name}</p>
        ${data.company.industry ? `<p><strong>Industry:</strong> ${data.company.industry}</p>` : ''}
        ${data.company.country ? `<p><strong>Country:</strong> ${data.company.country}</p>` : ''}
      </div>

      <div class="section">
        <h2>LCA Results</h2>
        <div class="metrics">
          <div class="metric-card">
            <div>Total Carbon Footprint</div>
            <div class="metric-value">${data.lcaResults.totalCarbonFootprint} kg CO2e</div>
          </div>
          ${data.lcaResults.totalWaterFootprint ? `
            <div class="metric-card">
              <div>Total Water Footprint</div>
              <div class="metric-value">${data.lcaResults.totalWaterFootprint} L</div>
            </div>
          ` : ''}
        </div>

        ${data.lcaResults.impactsByCategory ? `
          <div class="section">
            <h3>Impact Categories</h3>
            ${data.lcaResults.impactsByCategory.map(category => `
              <p><strong>${category.category}:</strong> ${category.impact} ${category.unit}</p>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }
}

// Export singleton instance
export const streamingPDFService = StreamingPDFService.getInstance();

export default StreamingPDFService;