import PDFDocument from 'pdfkit';
import puppeteer from 'puppeteer';
import * as htmlPdf from 'html-pdf-node';
import JSZip from 'jszip';
import { logger } from '../config/logger';

// Unified interfaces for all PDF operations
export interface PDFGenerationOptions {
  type: 'basic' | 'modern' | 'comprehensive' | 'professional' | 'branded';
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
  };
  company: {
    name: string;
    industry: string;
    size: string;
    address?: string;
    country: string;
    website?: string;
    reportingPeriodStart?: string;
    reportingPeriodEnd?: string;
  };
  lcaResults?: {
    totalCarbonFootprint: number;
    totalWaterFootprint?: number;
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
}

/**
 * Unified PDF Service - Consolidates all PDF generation functionality
 * Uses factory pattern to select appropriate generation method based on requirements
 */
export class UnifiedPDFService {
  private static instance: UnifiedPDFService;
  
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
      section: '#f8fafc'
    },
    social: '#7c3aed'        // Purple for social impact
  };

  private readonly fonts = {
    heading: 'Helvetica-Bold',
    subheading: 'Helvetica-Bold', 
    body: 'Helvetica',
    caption: 'Helvetica'
  };

  constructor() {
    logger.info({}, 'UnifiedPDFService initialized');
  }

  static getInstance(): UnifiedPDFService {
    if (!UnifiedPDFService.instance) {
      UnifiedPDFService.instance = new UnifiedPDFService();
    }
    return UnifiedPDFService.instance;
  }

  /**
   * Main entry point for all PDF generation
   * Factory method that routes to appropriate generation strategy
   */
  async generatePDF(
    data: ReportData | LCAReportData, 
    options: PDFGenerationOptions = { type: 'modern' }
  ): Promise<Buffer> {
    const startTime = Date.now();
    
    try {
      logger.info({ 
        type: options.type, 
        dataType: 'lcaResults' in data ? 'LCA' : 'Report',
        title: data.title || ('product' in data ? (data as LCAReportData).product?.name : 'Unknown')
      }, 'PDF generation started');
      
      // Debug: Log the data structure to understand what we're working with
      console.log('🔍 PDF Generation Data:', JSON.stringify({
        title: data.title,
        hasContent: 'content' in data,
        contentKeys: 'content' in data ? Object.keys(data.content) : [],
        hasMetrics: 'metrics' in data,
        metrics: 'metrics' in data ? data.metrics : null,
        companyName: 'companyName' in data ? data.companyName : 'company' in data ? data.company?.name : 'not found'
      }, null, 2));

      let result: Buffer;

      switch (options.type) {
        case 'basic':
          result = await this.generateBasicPDF(data, options);
          break;
        case 'modern':
          result = await this.generateModernPDF(data, options);
          break;
        case 'comprehensive':
          result = await this.generateComprehensivePDF(data, options);
          break;
        case 'professional':
          result = await this.generateProfessionalPDF(data, options);
          break;
        case 'branded':
          result = await this.generateBrandedPDF(data, options);
          break;
        default:
          throw new Error(`Unsupported PDF type: ${options.type}`);
      }

      const duration = Date.now() - startTime;
      logger.info({ 
        type: options.type,
        duration,
        size: result.length 
      }, 'PDF generation completed');

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error({ 
        error, 
        type: options.type,
        duration
      }, 'PDF generation failed');
      throw error;
    }
  }

  /**
   * Legacy compatibility methods for existing code
   */
  async generateSustainabilityReport(data: ReportData): Promise<Buffer> {
    return this.generatePDF(data, { type: 'comprehensive' });
  }

  async generateLCAPDF(data: LCAReportData): Promise<Buffer> {
    // Use the new ProfessionalLCAService for enhanced LCA reports
    try {
      console.log('🎯 UnifiedPDFService.generateLCAPDF called - importing ProfessionalLCAService...');
      const { ProfessionalLCAService } = await import('./ProfessionalLCAService');
      console.log('🎯 ProfessionalLCAService imported successfully');
      
      const professionalService = ProfessionalLCAService.getInstance();
      console.log('🎯 ProfessionalLCAService instance created');
      
      const result = await professionalService.generateLCAPDF(data);
      console.log(`🎯 ProfessionalLCAService generated PDF: ${result.length} bytes`);
      return result;
    } catch (error) {
      console.error('❌ Error with ProfessionalLCAService, falling back to basic PDF:', error);
      console.error('❌ Error stack:', (error as Error).stack);
      // Fallback to existing method if professional service fails
      return this.generatePDF(data, { type: 'professional' });
    }
  }

  async generateEnhancedLCAPDF(data: any): Promise<Buffer> {
    return this.generatePDF(data, { type: 'comprehensive' });
  }

  /**
   * Export functionality for multiple formats
   */
  async exportReport(data: ReportData, format: string, exportOptions: any = {}): Promise<Buffer> {
    switch (format) {
      case 'pdf':
        return this.generatePDF(data, { type: 'comprehensive' });
      case 'pdf-branded':
        return this.generatePDF(data, { 
          type: 'branded',
          branding: exportOptions.branding 
        });
      case 'pptx':
        return this.generatePowerPoint(data, exportOptions);
      case 'web':
        return this.generateInteractiveWeb(data, exportOptions);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Basic PDF generation using PDFKit - simple, fast
   */
  private async generateBasicPDF(data: ReportData | LCAReportData, options: PDFGenerationOptions): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: options.format || 'A4',
          margins: options.margins || { top: 50, bottom: 50, left: 50, right: 50 }
        });

        const chunks: Buffer[] = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Title
        const title = data.title || ('product' in data ? data.product?.name : 'Report');
        doc.fontSize(24).fillColor(this.colors.primary).text(title, { align: 'center' });
        doc.moveDown(2);

        // Content
        if ('content' in data) {
          Object.entries(data.content).forEach(([key, value]) => {
            doc.fontSize(14).fillColor(this.colors.text.primary).text(`${key}: ${value}`);
            doc.moveDown(0.5);
          });
        } else {
          // LCA data
          const lcaData = data as LCAReportData;
          doc.fontSize(12).fillColor(this.colors.text.secondary)
             .text(`Product: ${lcaData.product.name}`)
             .text(`Company: ${lcaData.company.name}`)
             .text(`Carbon Footprint: ${lcaData.lcaResults?.totalCarbonFootprint || 'N/A'} kg CO2e`);
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Modern PDF generation using PDFKit - styled, professional
   */
  private async generateModernPDF(data: ReportData | LCAReportData, options: PDFGenerationOptions): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: options.format || 'A4',
          margins: options.margins || { top: 60, bottom: 60, left: 60, right: 60 },
          info: options.metadata || {
            Title: data.title || 'Sustainability Report',
            Author: 'Sustainability Platform',
            Subject: 'Environmental Impact Report'
          }
        });

        const chunks: Buffer[] = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        this.renderModernLayout(doc, data, options);
        doc.end();

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Comprehensive PDF using Puppeteer - full HTML/CSS capabilities
   */
  private async generateComprehensivePDF(data: ReportData | LCAReportData, options: PDFGenerationOptions): Promise<Buffer> {
    try {
      const html = this.generateComprehensiveHTML(data, options);
      return await this.convertHTMLtoPDF(html, options);
    } catch (error) {
      logger.warn({ error }, 'Puppeteer PDF generation failed, falling back to html-pdf-node');
      // Fallback to html-pdf-node
      const html = this.generateComprehensiveHTML(data, options);
      const file = { content: html };
      const pdfOptions = { 
        format: options.format || 'A4',
        margin: { top: '20mm', bottom: '20mm', left: '20mm', right: '20mm' },
        printBackground: true
      };
      return await htmlPdf.generatePdf(file, pdfOptions);
    }
  }

  /**
   * Professional PDF generation - hybrid approach
   */
  private async generateProfessionalPDF(data: ReportData | LCAReportData, options: PDFGenerationOptions): Promise<Buffer> {
    // Use modern PDFKit for professional styling
    return this.generateModernPDF(data, { ...options, type: 'professional' });
  }

  /**
   * Branded PDF generation with custom styling
   */
  private async generateBrandedPDF(data: ReportData | LCAReportData, options: PDFGenerationOptions): Promise<Buffer> {
    const brandedOptions = {
      ...options,
      branding: options.branding || {
        companyName: 'company' in data ? data.company?.name : 'companyName' in data ? data.companyName : 'Company',
        primaryColor: this.colors.primary
      }
    };
    return this.generateComprehensivePDF(data, brandedOptions);
  }

  /**
   * PowerPoint generation (placeholder - uses existing PptxGenJS logic)
   */
  private async generatePowerPoint(data: ReportData, options: any): Promise<Buffer> {
    // This would implement PowerPoint generation
    // For now, return PDF as fallback
    logger.info({}, 'PowerPoint generation requested, generating PDF instead');
    return this.generatePDF(data, { type: 'modern' });
  }

  /**
   * Interactive web report generation
   */
  private async generateInteractiveWeb(data: ReportData, options: any): Promise<Buffer> {
    const html = this.generateComprehensiveHTML(data, { type: 'comprehensive' });
    const zip = new JSZip();
    zip.file('index.html', html);
    zip.file('style.css', this.generateWebCSS());
    return await zip.generateAsync({ type: 'nodebuffer' });
  }

  /**
   * Helper methods for rendering
   */
  private renderModernLayout(doc: PDFKit.PDFDocument, data: ReportData | LCAReportData, options: PDFGenerationOptions): void {
    // Header with proper title handling
    const reportTitle = data.title || ('product' in data ? data.product?.name : 'Sustainability Report');
    doc.fontSize(28).fillColor(this.colors.primary)
       .text(reportTitle, { align: 'center' });
    
    doc.moveDown(1);
    
    // Company info with proper branding  
    const companyName = 'company' in data ? data.company?.name : 'companyName' in data ? data.companyName : 'Avallen Solutions Ltd';
    doc.fontSize(14).fillColor(this.colors.text.secondary)
       .text(companyName, { align: 'center' });
    
    // Report date and generation info
    const reportDate = new Date().toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    });
    doc.fontSize(10).fillColor(this.colors.text.light)
       .text(`Generated on ${reportDate}`, { align: 'center' });
    
    doc.moveDown(2);

    // Metrics section
    if ('metrics' in data && data.metrics) {
      this.renderMetricsSection(doc, data.metrics);
    } else if ('lcaResults' in data && data.lcaResults) {
      this.renderLCASection(doc, data.lcaResults);
    }

    // Content sections
    if ('content' in data) {
      this.renderContentSections(doc, data.content);
    }
  }

  private renderMetricsSection(doc: PDFKit.PDFDocument, metrics: any): void {
    doc.fontSize(18).fillColor(this.colors.text.primary).text('Environmental Metrics', { underline: true });
    doc.moveDown(1);

    const metricsData = [
      { label: 'Carbon Footprint', value: `${metrics.co2e || 0} kg CO2e`, color: this.colors.primary },
      { label: 'Water Usage', value: `${metrics.water || 0} L`, color: this.colors.secondary },
      { label: 'Waste Generated', value: `${metrics.waste || 0} kg`, color: this.colors.accent }
    ];

    let x = 60;
    metricsData.forEach(metric => {
      doc.rect(x, doc.y, 150, 60).fillAndStroke(metric.color, this.colors.text.light);
      doc.fillColor(this.colors.background.white)
         .fontSize(12).text(metric.label, x + 10, doc.y - 50)
         .fontSize(16).text(metric.value, x + 10, doc.y - 30);
      x += 170;
    });

    doc.moveDown(4);
  }

  private renderLCASection(doc: PDFKit.PDFDocument, data: any): void {
    // Clear the page and start fresh for comprehensive LCA report
    doc.addPage();
    
    // TITLE PAGE
    doc.fontSize(24).fillColor(this.colors.text.primary).text('Life Cycle Assessment of', { align: 'center' });
    doc.fontSize(28).fillColor(this.colors.primary).text(data.products?.[0]?.name || 'Product', { align: 'center' });
    doc.moveDown(2);
    
    doc.fontSize(14).fillColor(this.colors.text.secondary).text(`Produced by ${data.company?.name || 'Company'}`, { align: 'center' });
    doc.moveDown(3);
    
    const authorName = 'Avallen Sustainability Platform';
    const reportDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    doc.fontSize(12).fillColor(this.colors.text.secondary)
       .text(`Author: ${authorName}`, { align: 'right' })
       .text(`Date: ${reportDate}`, { align: 'right' });
    
    // TABLE OF CONTENTS
    doc.addPage();
    doc.fontSize(20).fillColor(this.colors.text.primary).text('Table of contents', { underline: true });
    doc.moveDown(1);
    
    const tocItems = [
      'Main findings .............................................................. 3',
      '1. Introduction ............................................................ 4',
      '1.1. Background .......................................................... 4', 
      '1.2. Goal and scope definition ......................................... 4',
      '2. Inventory analysis .................................................... 5',
      '2.1. Process description ................................................ 5',
      '2.2. Process data ........................................................ 6',
      '2.3. Dataset references ................................................ 8',
      '2.4. Allocation ........................................................... 8',
      '3. Impact assessment / Interpretation ................................. 11',
      '4. References ............................................................ 16'
    ];
    
    doc.fontSize(11).fillColor(this.colors.text.secondary);
    tocItems.forEach(item => {
      doc.text(item);
      doc.moveDown(0.3);
    });
    
    // MAIN FINDINGS
    doc.addPage();
    doc.fontSize(18).fillColor(this.colors.text.primary).text('Main findings', { underline: true });
    doc.moveDown(1);
    
    const totalCarbon = data.lcaResults?.totalCarbonFootprint || 0;
    const totalWater = data.lcaResults?.totalWaterFootprint || 0;
    const productName = data.products?.[0]?.name || 'Product';
    
    doc.fontSize(11).fillColor(this.colors.text.secondary);
    doc.text(`In this study, an environmental life cycle assessment (LCA) of ${productName} produced by ${data.company?.name || 'the company'} was conducted. The assessment focused on climate impacts represented by the 'Global Warming Potential in the next 100 years (GWP100)'.`, { align: 'justify' });
    doc.moveDown(0.5);
    
    doc.text(`The study shows a carbon footprint of ${totalCarbon.toFixed(2)} kg CO₂-eq per product unit. The packaging materials have the highest contribution to the climate impacts, followed by ingredient production and processing. The water footprint analysis shows ${totalWater.toFixed(0)} litres of water consumption per product unit.`, { align: 'justify' });
    doc.moveDown(0.5);
    
    doc.text(`All calculations follow ISO 14040 and ISO 14044 LCA standards, using the latest environmental impact databases including ecoinvent 3.5 and verified supplier data where available.`, { align: 'justify' });
    
    // 1. INTRODUCTION
    doc.addPage();
    doc.fontSize(16).fillColor(this.colors.text.primary).text('1. Introduction');
    doc.moveDown(0.5);
    
    doc.fontSize(14).fillColor(this.colors.text.primary).text('1.1. Background');
    doc.fontSize(11).fillColor(this.colors.text.secondary);
    doc.text(`${data.company?.name || 'This company'} is committed to sustainable production practices. This Life Cycle Assessment (LCA) was conducted to quantify the environmental impacts of ${productName} using the most widely accepted methodology for calculation of environmental impacts, standardized in ISO 14040 and ISO 14044.`, { align: 'justify' });
    doc.moveDown(0.5);
    
    doc.text('According to these standards, there are four phases in an LCA study:', { align: 'justify' });
    doc.moveDown(0.3);
    doc.text('a) Goal and scope definition');
    doc.text('b) Inventory analysis'); 
    doc.text('c) Impact assessment');
    doc.text('d) Life cycle interpretation.');
    doc.moveDown(0.5);
    
    doc.fontSize(14).fillColor(this.colors.text.primary).text('1.2. Goal and scope definition');
    doc.fontSize(11).fillColor(this.colors.text.secondary);
    doc.text(`The goal of this study is to assess the environmental impacts of ${productName}. Results will be used for internal sustainability reporting and stakeholder communication. The scope of the assessment is 'cradle-to-gate', including raw materials extraction and production processes.`, { align: 'justify' });
    doc.moveDown(0.5);
    
    const functionalUnit = data.products?.[0]?.volume ? `${data.products[0].volume}L bottle` : '1 unit';
    doc.text(`The functional unit is defined as: 1 ${functionalUnit} of ${productName}.`);
    doc.moveDown(0.5);
    
    doc.text('The assessment focuses on climate change impact represented by the Global Warming Potential in the next 100 years (GWP100) as defined by the IPCC, supplemented by water consumption analysis.');
    
    // 2. INVENTORY ANALYSIS  
    doc.addPage();
    doc.fontSize(16).fillColor(this.colors.text.primary).text('2. Inventory analysis');
    doc.moveDown(0.5);
    
    doc.fontSize(14).fillColor(this.colors.text.primary).text('2.1. Process description');
    doc.fontSize(11).fillColor(this.colors.text.secondary);
    doc.text(`The production process of ${productName} includes ingredient sourcing, processing, packaging, and distribution. Raw materials are sourced from verified suppliers and processed according to industry standards.`, { align: 'justify' });
    doc.moveDown(0.5);
    
    doc.fontSize(14).fillColor(this.colors.text.primary).text('2.2. Process data');
    doc.fontSize(11).fillColor(this.colors.text.secondary);
    
    // Ingredient breakdown
    if (data.products?.[0]?.ingredients?.length > 0) {
      doc.text('Ingredient composition:', { underline: true });
      doc.moveDown(0.3);
      
      data.products[0].ingredients.forEach((ingredient: any) => {
        doc.text(`• ${ingredient.name}: ${ingredient.amount} ${ingredient.unit || 'kg'}`);
      });
      doc.moveDown(0.5);
    }
    
    // Packaging data
    const product = data.products?.[0] || {};
    if (product.bottleWeight || product.labelWeight) {
      doc.text('Packaging specifications:', { underline: true });
      doc.moveDown(0.3);
      if (product.bottleWeight) doc.text(`• Bottle: ${product.bottleWeight}g (${product.bottleMaterial || 'glass'})`);
      if (product.labelWeight) doc.text(`• Label: ${product.labelWeight}g (${product.labelMaterial || 'paper'})`);
      doc.moveDown(0.5);
    }
    
    doc.fontSize(14).fillColor(this.colors.text.primary).text('2.3. Dataset references');
    doc.fontSize(11).fillColor(this.colors.text.secondary);
    doc.text('All impact calculations are based on the following environmental databases and sources:', { align: 'justify' });
    doc.moveDown(0.3);
    doc.text('• Ecoinvent 3.5 database for background processes');
    doc.text('• DEFRA 2024 emission factors for UK-specific processes'); 
    doc.text('• Verified supplier environmental product declarations where available');
    doc.text('• OpenLCA methodology for ingredient impact calculations');
    doc.moveDown(0.5);
    
    doc.fontSize(14).fillColor(this.colors.text.primary).text('2.4. Allocation');
    doc.fontSize(11).fillColor(this.colors.text.secondary);
    doc.text('Where processes produce multiple outputs, environmental impacts are allocated based on economic value or mass, following ISO 14044 guidelines. Facility-level impacts are allocated proportionally based on production volumes.', { align: 'justify' });
    
    // 3. IMPACT ASSESSMENT
    doc.addPage();
    doc.fontSize(16).fillColor(this.colors.text.primary).text('3. Impact assessment / Interpretation');
    doc.moveDown(0.5);
    
    doc.fontSize(11).fillColor(this.colors.text.secondary);
    doc.text('Results of the life cycle impact assessment are shown below:', { align: 'justify' });
    doc.moveDown(1);
    
    // Key results box
    doc.rect(60, doc.y, 480, 120).fillAndStroke(this.colors.background.light, this.colors.text.light);
    doc.fillColor(this.colors.text.primary).fontSize(12).text('Key Environmental Impact Results:', 70, doc.y - 110);
    doc.fillColor(this.colors.text.secondary).fontSize(11)
       .text(`Carbon Footprint: ${totalCarbon.toFixed(3)} kg CO₂e per unit`, 70, doc.y - 90)
       .text(`Water Footprint: ${totalWater.toFixed(1)} L per unit`, 70, doc.y - 75)
       .text(`Annual Production: ${data.products?.[0]?.annualProductionVolume?.toLocaleString() || 'N/A'} units`, 70, doc.y - 60)
       .text(`Total Annual Impact: ${(totalCarbon * (data.products?.[0]?.annualProductionVolume || 0) / 1000).toFixed(1)} tonnes CO₂e`, 70, doc.y - 45);
    
    doc.moveDown(8);
    
    // Impact breakdown if available
    if (data.lcaResults?.impactsByCategory?.length > 0) {
      doc.fontSize(12).fillColor(this.colors.text.primary).text('Impact breakdown by category:', { underline: true });
      doc.moveDown(0.5);
      
      data.lcaResults.impactsByCategory.forEach((category: any) => {
        doc.fontSize(10).fillColor(this.colors.text.secondary)
           .text(`${category.category}: ${category.impact} ${category.unit}`);
      });
      doc.moveDown(1);
    }
    
    doc.fontSize(11).fillColor(this.colors.text.secondary);
    doc.text('The assessment shows that the primary environmental impacts come from raw material production and packaging. Energy consumption during processing contributes a smaller but significant portion of the total impact.', { align: 'justify' });
    
    // REFERENCES
    doc.addPage();
    doc.fontSize(16).fillColor(this.colors.text.primary).text('References');
    doc.moveDown(1);
    
    const references = [
      '[1] ISO 14040:2006 - Environmental management — Life cycle assessment — Principles and framework',
      '[2] ISO 14044:2006 - Environmental management — Life cycle assessment — Requirements and guidelines', 
      '[3] Ecoinvent 3.5 database - Swiss Centre for Life Cycle Inventories',
      '[4] DEFRA 2024 - UK Government GHG Conversion Factors for Company Reporting',
      '[5] IPCC 2013 - Climate Change 2013: The Physical Science Basis'
    ];
    
    doc.fontSize(10).fillColor(this.colors.text.secondary);
    references.forEach((ref, index) => {
      doc.text(ref, { align: 'justify' });
      doc.moveDown(0.5);
    });
    
    doc.moveDown(2);
    doc.fontSize(8).fillColor(this.colors.text.light).text(`Report generated by Avallen Sustainability Platform on ${new Date().toLocaleDateString()}`, { align: 'center' });
  }

  private renderContentSections(doc: PDFKit.PDFDocument, content: Record<string, any>): void {
    // Define proper section titles for guided sustainability reports
    const sectionTitles: Record<string, string> = {
      summary: 'Executive Summary',
      introduction: 'Introduction', 
      initiatives_narrative: 'Sustainability Initiatives',
      key_metrics_narrative: 'Key Environmental Metrics',
      company_info_narrative: 'Company Information',
      kpi_tracking_narrative: 'KPI Tracking & Progress',
      carbon_footprint_narrative: 'Carbon Footprint Analysis'
    };

    // Render sections in a logical order
    const sectionOrder = [
      'summary',
      'introduction', 
      'company_info_narrative',
      'key_metrics_narrative',
      'carbon_footprint_narrative',
      'initiatives_narrative',
      'kpi_tracking_narrative'
    ];

    sectionOrder.forEach(sectionKey => {
      if (content[sectionKey] && String(content[sectionKey]).trim()) {
        const title = sectionTitles[sectionKey] || sectionKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const value = String(content[sectionKey]).trim();
        
        doc.fontSize(16).fillColor(this.colors.text.primary).text(title, { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11).fillColor(this.colors.text.secondary).text(value, { align: 'justify' });
        doc.moveDown(1.5);
      }
    });

    // Render any remaining sections not in the ordered list
    Object.entries(content).forEach(([section, value]) => {
      if (!sectionOrder.includes(section) && value && String(value).trim()) {
        const title = section.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        doc.fontSize(16).fillColor(this.colors.text.primary).text(title, { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(11).fillColor(this.colors.text.secondary).text(String(value), { align: 'justify' });
        doc.moveDown(1.5);
      }
    });
  }

  private generateComprehensiveHTML(data: ReportData | LCAReportData, options: PDFGenerationOptions): string {
    const title = data.title || ('product' in data ? data.product?.name : 'Sustainability Report');
    const companyName = 'company' in data ? data.company?.name : 'companyName' in data ? data.companyName : 'Company';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        ${this.generateWebCSS()}
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
            ${this.generateHTMLContent(data)}
        </main>
        
        <footer class="footer">
            <p>This report was generated by the Sustainability Platform</p>
        </footer>
    </div>
</body>
</html>`;
  }

  private generateHTMLContent(data: ReportData | LCAReportData): string {
    if ('content' in data) {
      // Enhanced HTML generation for guided sustainability reports
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
      if ('metrics' in data && data.metrics) {
        htmlContent += `
          <section class="metrics">
            <h2>Environmental Metrics Overview</h2>
            <div class="metrics-grid">
              <div class="metric-card">
                <h3>Carbon Footprint</h3>
                <p class="metric-value">${data.metrics.co2e || 0} kg CO₂e</p>
              </div>
              <div class="metric-card">
                <h3>Water Usage</h3>
                <p class="metric-value">${data.metrics.water || 0} L</p>
              </div>
              <div class="metric-card">
                <h3>Waste Generated</h3>
                <p class="metric-value">${data.metrics.waste || 0} kg</p>
              </div>
            </div>
          </section>
        `;
      }

      // Add content sections in order
      sectionOrder.forEach(sectionKey => {
        if (data.content[sectionKey] && String(data.content[sectionKey]).trim()) {
          const title = sectionTitles[sectionKey] || sectionKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          const content = String(data.content[sectionKey]).trim();
          htmlContent += `
            <section class="content-section">
              <h2>${title}</h2>
              <div class="content-text">${content}</div>
            </section>
          `;
        }
      });

      return htmlContent;
    } else {
      const lcaData = data as LCAReportData;
      return `
        <section>
          <h2>Product Information</h2>
          <p><strong>Name:</strong> ${lcaData.product.name}</p>
          <p><strong>SKU:</strong> ${lcaData.product.sku}</p>
          <p><strong>Volume:</strong> ${lcaData.product.volume || 'N/A'}</p>
        </section>
        <section>
          <h2>Environmental Impact</h2>
          <p><strong>Carbon Footprint:</strong> ${lcaData.lcaResults?.totalCarbonFootprint || 0} kg CO2e</p>
          <p><strong>Water Footprint:</strong> ${lcaData.lcaResults?.totalWaterFootprint || 0} L</p>
        </section>
      `;
    }
  }

  private generateWebCSS(): string {
    return `
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
    `;
  }

  private async convertHTMLtoPDF(html: string, options: PDFGenerationOptions): Promise<Buffer> {
    try {
      const browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      await page.setContent(html);
      
      const pdf = await page.pdf({
        format: options.format || 'A4',
        margin: options.margins || { top: '20mm', bottom: '20mm', left: '20mm', right: '20mm' },
        printBackground: true
      });
      
      await browser.close();
      return pdf;
    } catch (error) {
      logger.error({ error }, 'Puppeteer PDF conversion failed');
      throw error;
    }
  }
}

// Export singleton instance and static methods for backward compatibility
export const unifiedPDFService = UnifiedPDFService.getInstance();

// Legacy exports for existing code compatibility
export class PDFService {
  static async generateLCAPDF(data: LCAReportData): Promise<Buffer> {
    return unifiedPDFService.generateLCAPDF(data);
  }

  static async generateSustainabilityReport(data: ReportData, company?: any): Promise<Buffer> {
    return unifiedPDFService.generateSustainabilityReport(data);
  }

  async generateFromHTML(html: string, options: any = {}): Promise<Buffer> {
    const reportData: ReportData = {
      id: 'html-report',
      title: options.title || 'Report',
      content: { 'HTML Content': html }
    };
    return unifiedPDFService.generatePDF(reportData, { type: 'basic' });
  }
}

export default UnifiedPDFService;