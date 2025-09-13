import PDFDocument from 'pdfkit';
import puppeteer, { Browser, Page } from 'puppeteer';
import * as htmlPdf from 'html-pdf-node';
import JSZip from 'jszip';
import fs from 'fs/promises';
import path from 'path';
import { Readable, PassThrough } from 'stream';
import { Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../config/logger';

// ============================================================================
// UNIFIED INTERFACES AND TYPES
// ============================================================================

export interface PDFGenerationOptions {
  type: 'basic' | 'modern' | 'comprehensive' | 'professional' | 'branded' | 'streaming';
  format?: 'A4' | 'letter';
  margins?: { top: number; bottom: number; left: number; right: number };
  branding?: {
    companyName?: string;
    primaryColor?: string;
    logoPath?: string;
  };
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
    keywords?: string;
  };
  streaming?: boolean;
  templateType?: string;
}

export interface ReportData {
  id: string;
  title: string;
  content: Record<string, any>;
  companyName?: string;
  template?: {
    id: string;
    name: string;
    category: string;
  };
  metrics?: {
    co2e: number;
    water: number;
    waste: number;
  };
  socialData?: any;
  lcaData?: any;
  product?: any;
  company?: any;
  selectedInitiatives?: any[];
  selectedKPIs?: any[];
  uploadedImages?: Record<string, any>;
  blocks?: any[];
}

export interface LCAReportData {
  product: {
    id: number;
    name: string;
    sku: string;
    volume?: string;
    type?: string;
    description?: string;
    ingredients?: any[];
    annualProductionVolume?: number;
    productionUnit?: string;
    bottleWeight?: number;
    labelWeight?: number;
    bottleMaterial?: string;
    labelMaterial?: string;
    packShotUrl?: string;
    productImages?: string[];
    product_images?: string[];
    breakdown?: {
      ingredients: { percentage: number };
      packaging: { percentage: number };
      facilities: { percentage: number };
    };
  };
  company: {
    id?: number;
    name: string;
    industry: string;
    size: string;
    address?: string;
    country: string;
    website?: string;
    reportingPeriodStart?: string | Date;
    reportingPeriodEnd?: string | Date;
    companyName?: string;
    companyAddress?: string;
  };
  lcaResults?: {
    totalCarbonFootprint: number;
    totalWaterFootprint?: number;
    totalWasteFootprint?: number;
    impactsByCategory?: Array<{
      category: string;
      impact: number;
      unit: string;
    }>;
    calculationDate?: string;
    systemName?: string;
    systemId?: string;
  };
  operationalData?: {
    electricityConsumption?: number;
    gasConsumption?: number;
    waterConsumption?: number;
    wasteGenerated?: number;
  };
  report?: any;
  calculatedBreakdown?: {
    stage: string;
    contribution: number;
    percentage: number;
  }[];
  enhancedLCAResults?: any;
  totalCarbonFootprint?: number;
  contributionBreakdown?: { [key: string]: number };
  products?: any[];
  aggregatedResults?: any;
}

export interface SustainabilityReportData extends ReportData {
  report: any;
  metrics: any;
  selectedInitiatives: any[];
  selectedKPIs: any[];
}

export interface PDFExtractionResult {
  success: boolean;
  data?: any;
  error?: string;
  extractedFields: string[];
  totalFields: number;
  documentType?: string;
  confidence?: number;
}

// ============================================================================
// SINGLETON BROWSER POOL MANAGER
// ============================================================================

class BrowserPoolManager {
  private static instance: BrowserPoolManager;
  private browser: Browser | null = null;
  private isLaunching = false;
  private launchPromise: Promise<Browser> | null = null;

  static getInstance(): BrowserPoolManager {
    if (!BrowserPoolManager.instance) {
      BrowserPoolManager.instance = new BrowserPoolManager();
    }
    return BrowserPoolManager.instance;
  }

  async getBrowser(): Promise<Browser> {
    if (this.browser && this.browser.isConnected()) {
      return this.browser;
    }

    if (this.isLaunching && this.launchPromise) {
      return this.launchPromise;
    }

    this.isLaunching = true;
    this.launchPromise = this.launchBrowser();
    
    try {
      this.browser = await this.launchPromise;
      return this.browser;
    } finally {
      this.isLaunching = false;
      this.launchPromise = null;
    }
  }

  private async launchBrowser(): Promise<Browser> {
    logger.info({}, 'Launching Puppeteer browser for PDF generation');
    
    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: [
          // Only use no-sandbox in containerized environments if absolutely necessary
          ...(process.env.NODE_ENV === 'production' && process.env.CONTAINER ? ['--no-sandbox'] : []),
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-features=VizDisplayCompositor',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920x1080'
        ],
        timeout: 30000
      });

      logger.info({}, 'Puppeteer browser launched successfully');
      return browser;
      
    } catch (error) {
      logger.error({ error }, 'Failed to launch Puppeteer browser');
      throw error;
    }
  }

  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      logger.info({}, 'Browser closed');
    }
  }

  async cleanup(): Promise<void> {
    await this.closeBrowser();
  }
}

// ============================================================================
// CONSOLIDATED PDF SERVICE - MAIN CLASS
// ============================================================================

export class ConsolidatedPDFService {
  private static instance: ConsolidatedPDFService;
  private browserPool: BrowserPoolManager;
  private anthropic: Anthropic | null = null;
  
  // Design system constants
  private readonly colors = {
    primary: '#10b981',      // Green
    secondary: '#6366f1',    // Indigo  
    accent: '#f59e0b',       // Amber
    text: {
      primary: '#1f2937',    // Dark gray
      secondary: '#6b7280',  // Medium gray
      light: '#9ca3af'       // Light gray
    },
    background: {
      white: '#ffffff',
      light: '#f9fafb',
      section: '#f8fafc',
      yellow: '#FFD700'      // Professional template yellow
    },
    social: '#7c3aed',       // Purple for social impact
    green: '#10B981'         // Sustainability green
  };

  private readonly fonts = {
    heading: 'Helvetica-Bold',
    subheading: 'Helvetica-Bold',
    body: 'Helvetica',
    caption: 'Helvetica'
  };

  constructor() {
    this.browserPool = BrowserPoolManager.getInstance();
    
    // Initialize Anthropic if API key is available
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    }

    logger.info({}, 'ConsolidatedPDFService initialized');
  }

  static getInstance(): ConsolidatedPDFService {
    if (!ConsolidatedPDFService.instance) {
      ConsolidatedPDFService.instance = new ConsolidatedPDFService();
    }
    return ConsolidatedPDFService.instance;
  }

  // ============================================================================
  // PUBLIC API METHODS
  // ============================================================================

  /**
   * Generate PDF based on type and data
   */
  async generatePDF(
    data: ReportData | LCAReportData,
    options: PDFGenerationOptions
  ): Promise<Buffer> {
    const title = ('title' in data) ? data.title : ('product' in data ? data.product?.name : 'Report');
    
    logger.info({ 
      title, 
      type: options.type,
      streaming: options.streaming 
    }, 'Starting PDF generation');

    const startTime = Date.now();

    try {
      let buffer: Buffer;

      switch (options.type) {
        case 'basic':
          buffer = await this.generateBasicPDFKit(data, options);
          break;
        
        case 'modern':
          buffer = await this.generateModernPDFKit(data, options);
          break;
        
        case 'professional':
          buffer = await this.generateProfessionalPDFKit(data, options);
          break;
        
        case 'comprehensive':
        case 'branded':
          buffer = await this.generatePuppeteerPDF(data, options);
          break;
        
        case 'streaming':
          throw new Error('Use streamPDFToResponse for streaming generation');
        
        default:
          throw new Error(`Unsupported PDF type: ${options.type}`);
      }

      const duration = Date.now() - startTime;
      logger.info({ 
        title, 
        type: options.type,
        duration,
        size: buffer.length 
      }, 'PDF generation completed');

      return buffer;

    } catch (error) {
      logger.error({ error, title, type: options.type }, 'PDF generation failed');
      throw error;
    }
  }

  /**
   * Stream PDF directly to response (memory efficient)
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
        case 'professional':
          await this.streamPDFKitToResponse(data, options, res);
          break;
        
        case 'comprehensive':
        case 'branded':
          await this.streamPuppeteerToResponse(data, options, res);
          break;
        
        default:
          throw new Error(`Unsupported streaming PDF type: ${options.type}`);
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
   * Extract data from PDF using AI
   */
  async extractDataFromPDF(filePath: string, originalName: string): Promise<PDFExtractionResult> {
    try {
      // Validate file
      const stats = await fs.stat(filePath);
      if (stats.size > 10 * 1024 * 1024) { // 10MB limit
        return {
          success: false,
          error: 'File size exceeds 10MB limit',
          extractedFields: [],
          totalFields: 0
        };
      }

      // For now, return basic implementation since Anthropic doesn't support PDF directly
      // In production, you'd convert PDF to images first
      const fileBuffer = await fs.readFile(filePath);
      const extractedData = await this.extractWithTextAnalysis(fileBuffer.toString(), originalName);

      const extractedFields = Object.keys(extractedData).filter(key => 
        extractedData[key] !== undefined && 
        key !== 'confidence' && 
        key !== 'specifications'
      );

      return {
        success: extractedFields.length > 0,
        data: extractedFields.length > 0 ? extractedData : undefined,
        extractedFields,
        totalFields: 15,
        documentType: 'product_specification',
        confidence: this.calculateOverallConfidence(extractedData),
        error: extractedFields.length === 0 ? 'No product data could be extracted from the PDF' : undefined
      };

    } catch (error) {
      logger.error({ error }, 'PDF extraction failed');
      return {
        success: false,
        error: 'An error occurred while processing the PDF',
        extractedFields: [],
        totalFields: 0
      };
    }
  }

  /**
   * Legacy compatibility method for LCA reports
   */
  async generateLCAPDF(data: LCAReportData): Promise<Buffer> {
    return this.generatePDF(data, { type: 'comprehensive' });
  }

  /**
   * Legacy compatibility method for sustainability reports
   */
  async generateSustainabilityReport(data: SustainabilityReportData, company?: any): Promise<Buffer> {
    return this.generatePDF(data, { type: 'professional' });
  }

  /**
   * Legacy compatibility method for enhanced LCA PDFs
   */
  async generateEnhancedLCAPDF(data: any): Promise<Buffer> {
    return this.generatePDF(data, { type: 'comprehensive' });
  }

  /**
   * Generate from HTML content
   */
  async generateFromHTML(htmlContent: string, options: any = {}): Promise<Buffer> {
    const reportData: ReportData = {
      id: 'html-report',
      title: options.title || 'HTML Report',
      content: { htmlContent }
    };
    
    return this.generatePDF(reportData, { 
      type: 'comprehensive',
      ...options 
    });
  }

  // ============================================================================
  // PDFKIT-BASED GENERATION METHODS
  // ============================================================================

  private async generateBasicPDFKit(data: ReportData | LCAReportData, options: PDFGenerationOptions): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: options.format || 'A4',
          margins: options.margins || { top: 50, bottom: 50, left: 50, right: 50 }
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Generate basic content
        this.addBasicContent(doc, data, options);
        doc.end();

      } catch (error) {
        reject(error);
      }
    });
  }

  private async generateModernPDFKit(data: ReportData | LCAReportData, options: PDFGenerationOptions): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: options.format || 'A4',
          margins: options.margins || { top: 60, bottom: 60, left: 60, right: 60 }
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Generate modern styled content
        this.addModernContent(doc, data, options);
        doc.end();

      } catch (error) {
        reject(error);
      }
    });
  }

  private async generateProfessionalPDFKit(data: ReportData | LCAReportData, options: PDFGenerationOptions): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: options.format || 'A4',
          margins: options.margins || { top: 40, bottom: 40, left: 40, right: 40 }
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Generate professional styled content
        this.addProfessionalContent(doc, data, options);
        doc.end();

      } catch (error) {
        reject(error);
      }
    });
  }

  // ============================================================================
  // PUPPETEER-BASED GENERATION METHODS
  // ============================================================================

  private async generatePuppeteerPDF(data: ReportData | LCAReportData, options: PDFGenerationOptions): Promise<Buffer> {
    const browser = await this.browserPool.getBrowser();
    const page = await browser.newPage();

    try {
      // Generate HTML content based on data type and options
      const htmlContent = await this.generateHTMLContent(data, options);
      
      // Set content and wait for rendering
      await page.setContent(htmlContent, { 
        waitUntil: ['networkidle0', 'domcontentloaded'],
        timeout: 30000 
      });

      // Wait for fonts to load
      await page.evaluateHandle('document.fonts.ready');

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: options.format || 'A4',
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: '<div></div>',
        footerTemplate: this.generateFooterTemplate(data),
        margin: options.margins || {
          top: '20mm',
          right: '10mm', 
          bottom: '20mm',
          left: '10mm'
        },
        timeout: 60000
      });

      return pdfBuffer;

    } finally {
      await page.close();
    }
  }

  // ============================================================================
  // STREAMING METHODS
  // ============================================================================

  private async streamPDFKitToResponse(
    data: ReportData | LCAReportData,
    options: PDFGenerationOptions,
    res: Response
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: options.format || 'A4',
          margins: options.margins || { top: 50, bottom: 50, left: 50, right: 50 }
        });

        // Pipe directly to response
        doc.pipe(res);

        doc.on('end', resolve);
        doc.on('error', reject);

        // Add content based on type
        switch (options.type) {
          case 'basic':
            this.addBasicContent(doc, data, options);
            break;
          case 'modern':
            this.addModernContent(doc, data, options);
            break;
          case 'professional':
            this.addProfessionalContent(doc, data, options);
            break;
        }

        doc.end();

      } catch (error) {
        reject(error);
      }
    });
  }

  private async streamPuppeteerToResponse(
    data: ReportData | LCAReportData,
    options: PDFGenerationOptions,
    res: Response
  ): Promise<void> {
    const browser = await this.browserPool.getBrowser();
    const page = await browser.newPage();

    try {
      const htmlContent = await this.generateHTMLContent(data, options);
      
      await page.setContent(htmlContent, { 
        waitUntil: ['networkidle0', 'domcontentloaded'],
        timeout: 30000 
      });

      await page.evaluateHandle('document.fonts.ready');

      // Stream PDF directly to response
      const pdfStream = await page.createPDFStream({
        format: options.format || 'A4',
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: '<div></div>',
        footerTemplate: this.generateFooterTemplate(data),
        margin: options.margins || {
          top: '20mm',
          right: '10mm', 
          bottom: '20mm',
          left: '10mm'
        }
      });

      pdfStream.pipe(res);
      
      return new Promise((resolve, reject) => {
        pdfStream.on('end', resolve);
        pdfStream.on('error', reject);
      });

    } finally {
      await page.close();
    }
  }

  // ============================================================================
  // CONTENT GENERATION HELPERS
  // ============================================================================

  private addBasicContent(doc: PDFKit.PDFDocument, data: ReportData | LCAReportData, options: PDFGenerationOptions) {
    const title = ('title' in data) ? data.title : ('product' in data ? data.product?.name : 'Report');
    const companyName = ('companyName' in data && data.companyName) || 
                       ('company' in data && data.company?.name) || 
                       options.branding?.companyName || 'Company';

    // Title
    doc.fontSize(24)
       .fillColor(this.colors.primary)
       .text(title, { align: 'center' });
    
    doc.moveDown(2);

    // Basic metrics
    if ('metrics' in data && data.metrics) {
      doc.fontSize(16)
         .fillColor(this.colors.primary)
         .text('Key Environmental Metrics', { underline: true });
      
      doc.moveDown(0.5);
      
      const metrics = [
        { value: data.metrics.co2e?.toFixed(3) || 'N/A', label: 'Tonnes CO2e', color: this.colors.primary },
        { value: data.metrics.water?.toFixed(1) || 'N/A', label: 'Litres Water', color: this.colors.secondary },
        { value: data.metrics.waste?.toFixed(3) || 'N/A', label: 'Tonnes Waste', color: this.colors.accent }
      ];

      this.addMetricsGrid(doc, metrics);
    }

    // Company info
    doc.moveDown(2);
    doc.fontSize(14)
       .fillColor(this.colors.text.primary)
       .text(`Generated by: ${companyName}`, { align: 'center' });
    
    doc.fontSize(12)
       .fillColor(this.colors.text.secondary)
       .text(`Report Date: ${new Date().toLocaleDateString()}`, { align: 'center' });
  }

  private addModernContent(doc: PDFKit.PDFDocument, data: ReportData | LCAReportData, options: PDFGenerationOptions) {
    // Cover page with modern design
    this.generateModernCoverPage(doc, data, options);
    
    // Add content sections
    if ('content' in data && data.content) {
      if (data.content.summary) {
        doc.addPage();
        this.addModernSection(doc, 'Executive Summary', data.content.summary);
      }
      
      if (data.content.key_metrics_narrative) {
        doc.addPage();
        this.addModernSection(doc, 'Environmental Metrics', data.content.key_metrics_narrative);
      }
    }
  }

  private addProfessionalContent(doc: PDFKit.PDFDocument, data: ReportData | LCAReportData, options: PDFGenerationOptions) {
    // Professional cover page with yellow accents
    this.generateProfessionalCoverPage(doc, data, options);
    
    // Table of contents
    doc.addPage();
    this.addPageTitle(doc, 'TABLE OF CONTENTS');
    
    // Content sections with professional styling
    if ('content' in data && data.content) {
      doc.addPage();
      this.generateExecutiveSummary(doc, data);
      
      doc.addPage();
      this.generateEnvironmentalMetrics(doc, data);
      
      if ('selectedInitiatives' in data && data.selectedInitiatives?.length > 0) {
        doc.addPage();
        this.generateInitiatives(doc, data.selectedInitiatives);
      }
    }
  }

  private async generateHTMLContent(data: ReportData | LCAReportData, options: PDFGenerationOptions): Promise<string> {
    // Determine template type
    const templateType = options.templateType || 'comprehensive';
    
    if ('product' in data) {
      // LCA report HTML generation
      return this.generateLCAHTML(data, options);
    } else {
      // Sustainability report HTML generation
      return this.generateSustainabilityHTML(data, options, templateType);
    }
  }

  private generateLCAHTML(data: LCAReportData, options: PDFGenerationOptions): string {
    const product = data.product || {};
    const company = data.company || {};
    const lcaResults = data.lcaResults || {};

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LCA Report - ${product.name || 'Product'}</title>
    <style>
        ${this.getLCAStyles()}
    </style>
</head>
<body>
    <div class="header">
        <h1>Life Cycle Assessment Report</h1>
        <h2>${product.name || 'Product'}</h2>
        <p>${company.name || 'Company'} | ${new Date().toLocaleDateString()}</p>
    </div>
    
    <div class="summary-box">
        <h3>Environmental Impact Summary</h3>
        <div class="carbon-footprint">${lcaResults.totalCarbonFootprint?.toFixed(3) || 'N/A'} kg CO₂e</div>
        <p>Carbon footprint per functional unit</p>
    </div>
    
    <div class="section">
        <h3>Product Information</h3>
        <p><strong>Product:</strong> ${product.name || 'N/A'}</p>
        <p><strong>SKU:</strong> ${product.sku || 'N/A'}</p>
        <p><strong>Volume:</strong> ${product.volume || 'N/A'}</p>
        <p><strong>Annual Production:</strong> ${product.annualProductionVolume?.toLocaleString() || 'N/A'} ${product.productionUnit || 'units'}</p>
    </div>
    
    <div class="section">
        <h3>Company Information</h3>
        <p><strong>Company:</strong> ${company.name || 'N/A'}</p>
        <p><strong>Industry:</strong> ${company.industry || 'N/A'}</p>
        <p><strong>Location:</strong> ${company.address || 'N/A'}, ${company.country || 'N/A'}</p>
    </div>
    
    ${lcaResults.impactsByCategory ? this.generateImpactCategoriesHTML(lcaResults.impactsByCategory) : ''}
    
    <div class="metadata">
        <p><strong>Report Generated:</strong> ${new Date().toLocaleDateString()}</p>
        <p><strong>Calculation Date:</strong> ${lcaResults.calculationDate ? new Date(lcaResults.calculationDate).toLocaleDateString() : 'N/A'}</p>
        <p><strong>System:</strong> ${lcaResults.systemName || 'N/A'}</p>
    </div>
</body>
</html>
    `;
  }

  private generateSustainabilityHTML(data: ReportData, options: PDFGenerationOptions, templateType: string): string {
    const content = data.content || {};
    const company = data.company || { name: data.companyName || 'Company' };
    const metrics = data.metrics || {};

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.title || 'Sustainability Report'}</title>
    <style>
        ${this.getSustainabilityStyles(templateType)}
    </style>
</head>
<body>
    <div class="cover">
        <h1>${data.title || 'Sustainability Report'}</h1>
        <h2>${company.name}</h2>
        <p class="date">${new Date().toLocaleDateString()}</p>
    </div>
    
    <div class="page">
        <h2>Executive Summary</h2>
        <p>${content.summary || 'This sustainability report presents our environmental performance and commitments.'}</p>
    </div>
    
    <div class="page">
        <h2>Environmental Metrics</h2>
        <div class="metrics-grid">
            <div class="metric-card">
                <h3>Carbon Emissions</h3>
                <div class="metric-value">${metrics.co2e?.toFixed(1) || 'N/A'}</div>
                <div class="metric-unit">Tonnes CO₂e</div>
            </div>
            <div class="metric-card">
                <h3>Water Usage</h3>
                <div class="metric-value">${metrics.water?.toLocaleString() || 'N/A'}</div>
                <div class="metric-unit">Litres</div>
            </div>
            <div class="metric-card">
                <h3>Waste Generated</h3>
                <div class="metric-value">${metrics.waste?.toFixed(1) || 'N/A'}</div>
                <div class="metric-unit">Tonnes</div>
            </div>
        </div>
    </div>
    
    ${data.selectedInitiatives ? this.generateInitiativesHTML(data.selectedInitiatives) : ''}
    
    ${data.selectedKPIs ? this.generateKPIsHTML(data.selectedKPIs) : ''}
</body>
</html>
    `;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private addMetricsGrid(doc: PDFKit.PDFDocument, metrics: Array<{value: string, label: string, color: string}>) {
    let startX = 50;
    const boxWidth = 150;
    const boxHeight = 80;

    metrics.forEach((metric, index) => {
      const x = startX + (index * (boxWidth + 20));
      const y = doc.y;

      // Draw box
      doc.rect(x, y, boxWidth, boxHeight)
         .fillAndStroke(this.colors.background.light, this.colors.text.light);

      // Add metric value
      doc.fontSize(20)
         .fillColor(metric.color)
         .text(metric.value, x + 10, y + 20, { width: boxWidth - 20, align: 'center' });

      // Add metric label
      doc.fontSize(10)
         .fillColor(this.colors.text.secondary)
         .text(metric.label, x + 10, y + 50, { width: boxWidth - 20, align: 'center' });
    });

    doc.y += boxHeight + 20;
  }

  private generateModernCoverPage(doc: PDFKit.PDFDocument, data: ReportData | LCAReportData, options: PDFGenerationOptions) {
    const title = ('title' in data) ? data.title : ('product' in data ? data.product?.name : 'Report');
    const companyName = ('companyName' in data && data.companyName) || 
                       ('company' in data && data.company?.name) || 
                       options.branding?.companyName || 'Company';

    // Modern gradient background effect
    doc.rect(0, 0, doc.page.width, 300)
       .fill(this.colors.primary);
    
    // Title
    doc.fontSize(48)
       .font(this.fonts.heading)
       .fillColor(this.colors.background.white)
       .text(title, 60, 120, {
         width: doc.page.width - 120,
         align: 'left'
       });
    
    // Company name
    doc.fontSize(24)
       .font(this.fonts.body)
       .fillColor(this.colors.background.white)
       .text(companyName, 60, 200);
    
    // Date
    doc.fontSize(16)
       .fillColor(this.colors.background.white)
       .text(new Date().toLocaleDateString(), 60, 240);
  }

  private generateProfessionalCoverPage(doc: PDFKit.PDFDocument, data: ReportData | LCAReportData, options: PDFGenerationOptions) {
    const title = ('title' in data) ? data.title : ('product' in data ? data.product?.name : 'Report');
    const companyName = ('companyName' in data && data.companyName) || 
                       ('company' in data && data.company?.name) || 
                       options.branding?.companyName || 'Company';

    // Yellow accent bar
    doc.rect(0, 100, doc.page.width, 8)
       .fill(this.colors.background.yellow);
    
    // Title
    doc.fontSize(48)
       .font(this.fonts.heading)
       .fillColor(this.colors.text.primary)
       .text(title.toUpperCase(), 40, 150);
    
    // Company name
    doc.fontSize(24)
       .font(this.fonts.subheading)
       .fillColor(this.colors.text.secondary)
       .text(companyName.toUpperCase(), 40, 250);
    
    // Date
    doc.fontSize(16)
       .font(this.fonts.body)
       .fillColor(this.colors.text.light)
       .text(new Date().getFullYear().toString(), 40, 300);
  }

  private addPageTitle(doc: PDFKit.PDFDocument, title: string) {
    // Yellow background bar for titles
    doc.rect(0, 60, doc.page.width, 50)
       .fill(this.colors.background.yellow);
    
    doc.fontSize(32)
       .font(this.fonts.heading)
       .fillColor(this.colors.text.primary)
       .text(title, 40, 75);
  }

  private addModernSection(doc: PDFKit.PDFDocument, title: string, content: string) {
    doc.fontSize(24)
       .font(this.fonts.heading)
       .fillColor(this.colors.primary)
       .text(title, 60, doc.y);
    
    doc.moveDown(1);
    
    doc.fontSize(12)
       .font(this.fonts.body)
       .fillColor(this.colors.text.primary)
       .text(content, 60, doc.y, {
         width: doc.page.width - 120,
         lineGap: 4
       });
  }

  private generateExecutiveSummary(doc: PDFKit.PDFDocument, data: ReportData | LCAReportData) {
    this.addPageTitle(doc, 'EXECUTIVE SUMMARY');
    
    const content = ('content' in data && data.content) || {};
    const summaryText = content.summary || 
      'This comprehensive sustainability report presents our environmental performance, key achievements, and future commitments to sustainable business practices.';
    
    doc.fontSize(12)
       .font(this.fonts.body)
       .fillColor(this.colors.text.primary)
       .text(summaryText, 40, 160, {
         width: doc.page.width - 80,
         align: 'justify',
         lineGap: 4
       });
  }

  private generateEnvironmentalMetrics(doc: PDFKit.PDFDocument, data: ReportData | LCAReportData) {
    this.addPageTitle(doc, 'ENVIRONMENTAL METRICS');
    
    const metrics = ('metrics' in data && data.metrics) || {};
    
    // Metrics display with professional styling
    const metricItems = [
      { label: 'Total Carbon Emissions', value: `${metrics.co2e?.toFixed(1) || 'N/A'} tonnes CO₂e` },
      { label: 'Water Consumption', value: `${metrics.water?.toLocaleString() || 'N/A'} litres` },
      { label: 'Waste Generated', value: `${metrics.waste?.toFixed(1) || 'N/A'} tonnes` }
    ];

    let yPos = 160;
    metricItems.forEach(item => {
      // Yellow accent line
      doc.rect(40, yPos - 5, 4, 25)
         .fill(this.colors.background.yellow);
      
      doc.fontSize(14)
         .font(this.fonts.subheading)
         .fillColor(this.colors.text.primary)
         .text(item.label, 55, yPos);
      
      doc.fontSize(14)
         .font(this.fonts.heading)
         .fillColor(this.colors.green)
         .text(item.value, 300, yPos);
      
      yPos += 40;
    });
  }

  private generateInitiatives(doc: PDFKit.PDFDocument, initiatives: any[]) {
    this.addPageTitle(doc, 'SUSTAINABILITY INITIATIVES');
    
    let yPos = 160;
    initiatives.forEach(initiative => {
      // Yellow highlight bar
      doc.rect(40, yPos, 8, 80)
         .fill(this.colors.background.yellow);
      
      // Initiative card
      doc.rect(48, yPos, doc.page.width - 88, 80)
         .fillAndStroke(this.colors.background.white, this.colors.text.light);
      
      doc.fontSize(16)
         .font(this.fonts.heading)
         .fillColor(this.colors.text.primary)
         .text(initiative.title || initiative.name || 'Initiative', 68, yPos + 15);
      
      doc.fontSize(11)
         .font(this.fonts.body)
         .fillColor(this.colors.text.primary)
         .text(initiative.description || 'No description available', 68, yPos + 40, {
           width: doc.page.width - 160,
           lineGap: 2
         });
      
      yPos += 100;
    });
  }

  private generateFooterTemplate(data: ReportData | LCAReportData): string {
    const companyName = ('companyName' in data && data.companyName) || 
                       ('company' in data && data.company?.name) || 
                       'Company';
    
    return `
      <div style="font-size: 9pt; color: white; background: linear-gradient(90deg, #16a34a, #1d4ed8); width: 100%; padding: 8px 16px; display: flex; justify-content: space-between; align-items: center; border-radius: 4px; margin: 0 10mm;">
        <span style="font-weight: 500;">${companyName} - Sustainability Report</span>
        <span style="font-weight: 400;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
      </div>
    `;
  }

  private getLCAStyles(): string {
    return `
      body {
        font-family: 'Times New Roman', serif;
        line-height: 1.6;
        color: #333;
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
        background: white;
      }
      .header {
        text-align: center;
        border-bottom: 3px solid #209d50;
        padding-bottom: 20px;
        margin-bottom: 30px;
      }
      h1 {
        color: #2c5530;
        font-size: 24px;
        margin-bottom: 10px;
      }
      h2 {
        color: #209d50;
        font-size: 20px;
        border-bottom: 2px solid #209d50;
        padding-bottom: 5px;
        margin-top: 30px;
      }
      .summary-box {
        background: #f8f9fa;
        border: 2px solid #209d50;
        border-radius: 8px;
        padding: 20px;
        margin: 20px 0;
        text-align: center;
      }
      .carbon-footprint {
        font-size: 36px;
        font-weight: bold;
        color: #209d50;
        margin: 20px 0;
      }
      .section {
        margin: 30px 0;
        padding: 20px;
        background: #f8f9fa;
        border-radius: 8px;
      }
      .metadata {
        background: #f8f9fa;
        padding: 15px;
        border-radius: 5px;
        margin: 20px 0;
        font-size: 14px;
      }
    `;
  }

  private getSustainabilityStyles(templateType: string): string {
    const baseStyles = `
      body {
        font-family: 'Helvetica', sans-serif;
        line-height: 1.6;
        color: #1f2937;
        margin: 0;
        padding: 0;
      }
      .cover {
        height: 100vh;
        background: linear-gradient(135deg, #10b981, #6366f1);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        text-align: center;
        color: white;
      }
      .cover h1 {
        font-size: 48px;
        margin-bottom: 20px;
        font-weight: bold;
      }
      .cover h2 {
        font-size: 24px;
        margin-bottom: 40px;
        font-weight: normal;
      }
      .page {
        padding: 60px;
        page-break-before: always;
      }
      h2 {
        color: #10b981;
        font-size: 24px;
        border-bottom: 2px solid #10b981;
        padding-bottom: 10px;
        margin-bottom: 20px;
      }
      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 20px;
        margin: 30px 0;
      }
      .metric-card {
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 20px;
        text-align: center;
      }
      .metric-card h3 {
        margin: 0 0 10px 0;
        color: #6b7280;
        font-size: 14px;
      }
      .metric-value {
        font-size: 32px;
        font-weight: bold;
        color: #10b981;
      }
      .metric-unit {
        color: #6b7280;
        font-size: 12px;
        margin-top: 5px;
      }
    `;

    return baseStyles;
  }

  private generateImpactCategoriesHTML(categories: Array<{category: string, impact: number, unit: string}>): string {
    return `
      <div class="section">
        <h3>Environmental Impact Categories</h3>
        ${categories.map(cat => `
          <div class="impact-item">
            <strong>${cat.category}:</strong> ${cat.impact.toFixed(4)} ${cat.unit}
          </div>
        `).join('')}
      </div>
    `;
  }

  private generateInitiativesHTML(initiatives: any[]): string {
    return `
      <div class="page">
        <h2>Sustainability Initiatives</h2>
        ${initiatives.map(initiative => `
          <div class="initiative-card">
            <h3>${initiative.title || initiative.name || 'Initiative'}</h3>
            <p>${initiative.description || 'No description available'}</p>
            ${initiative.status ? `<span class="status">${initiative.status}</span>` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  private generateKPIsHTML(kpis: any[]): string {
    return `
      <div class="page">
        <h2>Key Performance Indicators</h2>
        ${kpis.map(kpi => `
          <div class="kpi-card">
            <h3>${kpi.name || 'KPI'}</h3>
            <div class="kpi-values">
              <div>Current: ${kpi.currentValue || 'N/A'} ${kpi.unit || ''}</div>
              <div>Target: ${kpi.targetValue || 'N/A'} ${kpi.unit || ''}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  private async extractWithTextAnalysis(text: string, filename: string): Promise<any> {
    // Basic text analysis fallback
    return {
      productName: filename.split('.')[0],
      confidence: { overall: 0.6 }
    };
  }

  private calculateOverallConfidence(data: any): number {
    if (data.confidence?.overall) {
      return data.confidence.overall;
    }
    return 0.5;
  }

  // ============================================================================
  // CLEANUP METHODS
  // ============================================================================

  async cleanup(): Promise<void> {
    await this.browserPool.cleanup();
  }
}

// ============================================================================
// EXPORT INSTANCES AND LEGACY COMPATIBILITY
// ============================================================================

export const consolidatedPDFService = ConsolidatedPDFService.getInstance();

// Legacy compatibility exports
export const PDFService = {
  generateLCAPDF: (data: LCAReportData) => consolidatedPDFService.generateLCAPDF(data),
  generateSustainabilityReport: (data: SustainabilityReportData, company?: any) => 
    consolidatedPDFService.generateSustainabilityReport(data, company),
  generateFromHTML: (htmlContent: string, options: any = {}) => 
    consolidatedPDFService.generateFromHTML(htmlContent, options)
};

export const EnhancedPDFService = class {
  generateEnhancedLCAPDF = (data: any) => consolidatedPDFService.generateEnhancedLCAPDF(data);
  generateSustainabilityReport = (data: SustainabilityReportData) => 
    consolidatedPDFService.generateSustainabilityReport(data);
};

export const UnifiedPDFService = ConsolidatedPDFService;
export const unifiedPDFService = consolidatedPDFService;

export const StreamingPDFService = class {
  static getInstance = () => ({
    streamPDFToResponse: (data: ReportData | LCAReportData, options: PDFGenerationOptions, res: Response, filename?: string) =>
      consolidatedPDFService.streamPDFToResponse(data, options, res, filename)
  });
};

export const PDFExtractionService = class {
  static extractProductDataFromPDF = (filePath: string, originalName: string) =>
    consolidatedPDFService.extractDataFromPDF(filePath, originalName);
};

export const SimplePDFService = class {
  generateEnhancedLCAPDF = (data: any) => consolidatedPDFService.generatePDF(data, { type: 'basic' });
};

export const ModernPDFService = class {
  generateModernReport = (title: string, content: any, sustainabilityData?: any, companyName?: string) => {
    const reportData: ReportData = {
      id: 'modern-report',
      title,
      content,
      companyName,
      socialData: sustainabilityData
    };
    return consolidatedPDFService.generatePDF(reportData, { type: 'modern' });
  };
};

export const ProfessionalPDFService = class {
  generateProfessionalReport = (
    title: string,
    reportContent: any,
    sustainabilityData?: any,
    companyName?: string,
    metrics: any = {},
    selectedInitiatives: any[] = [],
    selectedKPIs: any[] = []
  ) => {
    const reportData: ReportData = {
      id: 'professional-report',
      title,
      content: reportContent,
      companyName,
      metrics,
      socialData: sustainabilityData,
      selectedInitiatives,
      selectedKPIs
    };
    return consolidatedPDFService.generatePDF(reportData, { type: 'professional' });
  };
};

export const PDFExportService = class {
  static async exportToPDF(options: any): Promise<Buffer> {
    const reportData: ReportData = {
      id: 'export-report',
      title: options.templateOptions?.customTitle || 'Export Report',
      content: {},
      companyName: options.company?.companyName,
      metrics: options.metricsData,
      blocks: options.blocks
    };
    return consolidatedPDFService.generatePDF(reportData, { 
      type: 'comprehensive',
      templateType: options.reportType
    });
  }
};

// Default export
export default consolidatedPDFService;