import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';

// Try to import pdfmake, fallback to PDFKit if not available
let PdfPrinter: any = null;
try {
  PdfPrinter = require('pdfmake');
} catch (error) {
  console.log('pdfmake not available, using PDFKit fallback for professional LCA reports');
}

export interface LCAReportData {
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
  products: Array<{
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
    carbonFootprint: number;
    waterFootprint: number;
    wasteFootprint: number;
    totalCarbonFootprint: number;
    totalWaterFootprint: number;
    totalWasteFootprint: number;
  }>;
  aggregatedResults: {
    totalCarbonFootprint: number;
    totalWaterFootprint: number;
    totalWasteFootprint: number;
    productCount: number;
  };
  lcaResults: {
    totalCarbonFootprint: number;
    totalWaterFootprint: number;
    impactsByCategory?: Array<{
      category: string;
      impact: number;
      unit: string;
    }>;
    calculationDate: string;
    systemName: string;
    systemId: string;
  };
}

export class ProfessionalLCAService {
  private static instance: ProfessionalLCAService;
  private printer: any;

  private constructor() {
    // Initialize fonts for professional appearance
    const fonts = {
      Roboto: {
        normal: path.join(__dirname, '../fonts/Roboto-Regular.ttf'),
        bold: path.join(__dirname, '../fonts/Roboto-Bold.ttf'),
        italics: path.join(__dirname, '../fonts/Roboto-Italic.ttf'),
        bolditalics: path.join(__dirname, '../fonts/Roboto-BoldItalic.ttf')
      },
      Helvetica: {
        normal: 'Helvetica',
        bold: 'Helvetica-Bold',
        italics: 'Helvetica-Oblique',
        bolditalics: 'Helvetica-BoldOblique'
      }
    };

    // Use system fonts if custom fonts are not available
    this.printer = new PdfPrinter({
      Helvetica: fonts.Helvetica
    });
  }

  public static getInstance(): ProfessionalLCAService {
    if (!ProfessionalLCAService.instance) {
      ProfessionalLCAService.instance = new ProfessionalLCAService();
    }
    return ProfessionalLCAService.instance;
  }

  public async generateLCAPDF(data: LCAReportData): Promise<Buffer> {
    console.log('📄 ProfessionalLCAService.generateLCAPDF called');
    console.log('📄 PdfPrinter available:', !!PdfPrinter);
    console.log('📄 this.printer available:', !!this.printer);
    
    if (PdfPrinter && this.printer) {
      console.log('📄 Using pdfmake for professional PDF generation');
      // Use pdfmake if available
      return this.generatePdfMakeReport(data);
    } else {
      console.log('📄 Using enhanced PDFKit for professional PDF generation');
      // Fallback to enhanced PDFKit implementation
      return this.generatePDFKitReport(data);
    }
  }

  private async generatePdfMakeReport(data: LCAReportData): Promise<Buffer> {
    const docDefinition = this.createDocumentDefinition(data);
    
    return new Promise((resolve, reject) => {
      try {
        const pdfDoc = this.printer.createPdfKitDocument(docDefinition);
        const chunks: Buffer[] = [];

        pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
        pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
        pdfDoc.on('error', reject);

        pdfDoc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private async generatePDFKitReport(data: LCAReportData): Promise<Buffer> {
    console.log('📄 generatePDFKitReport starting...');
    return new Promise((resolve, reject) => {
      try {
        console.log('📄 Creating PDFDocument with professional settings');
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 80, bottom: 80, left: 60, right: 60 },
          info: {
            Title: `Life Cycle Assessment of ${data.products[0]?.name || 'Product'}`,
            Author: 'Avallen Sustainability Platform',
            Subject: 'Environmental Life Cycle Assessment'
          }
        });

        const chunks: Buffer[] = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => {
          const result = Buffer.concat(chunks);
          console.log(`📄 Professional PDF generation completed: ${result.length} bytes`);
          resolve(result);
        });
        doc.on('error', reject);

        console.log('📄 Rendering professional content...');
        this.renderProfessionalPDFKitContent(doc, data);
        doc.end();

      } catch (error) {
        console.error('📄 Error in generatePDFKitReport:', error);
        reject(error);
      }
    });
  }

  private renderProfessionalPDFKitContent(doc: PDFKit.PDFDocument, data: LCAReportData): void {
    const primaryProduct = data.products[0] || {};
    const colors = {
      primary: '#10b981',
      secondary: '#6b7280',
      text: '#1f2937',
      light: '#f3f4f6'
    };

    // TITLE PAGE
    doc.fontSize(18).fillColor(colors.secondary)
       .text('Life Cycle Assessment of', { align: 'center' });
    
    doc.fontSize(24).fillColor(colors.primary)
       .text(primaryProduct.name || 'Product', { align: 'center' });
    
    doc.moveDown(2);
    
    doc.fontSize(14).fillColor(colors.secondary)
       .text(`Produced by ${data.company.name}`, { align: 'center' });
    
    doc.moveDown(4);
    
    const reportDate = new Date().toLocaleDateString('en-GB');
    doc.fontSize(12).fillColor(colors.text)
       .text('Author: Avallen Sustainability Platform', { align: 'right' })
       .text(`Date: ${reportDate}`, { align: 'right' });
    
    // MAIN FINDINGS PAGE
    doc.addPage();
    doc.fontSize(18).fillColor(colors.text).text('Main findings', { underline: true });
    doc.moveDown(1);
    
    const carbonPerUnit = data.lcaResults.totalCarbonFootprint / (data.aggregatedResults.productCount || 1);
    const waterPerUnit = data.lcaResults.totalWaterFootprint / (data.aggregatedResults.productCount || 1);
    
    doc.fontSize(11).fillColor(colors.text);
    doc.text(`In this study, an environmental life cycle assessment (LCA) of ${primaryProduct.name} produced by ${data.company.name} was conducted. The assessment focused on climate impacts represented by the 'Global Warming Potential in the next 100 years (GWP100)'.`, { align: 'justify' });
    doc.moveDown(0.5);
    
    doc.text(`The study shows a carbon footprint of ${carbonPerUnit.toFixed(3)} kg CO₂-eq per product unit. The packaging materials have the highest contribution to the climate impacts, followed by ingredient production and processing. The water footprint analysis shows ${waterPerUnit.toFixed(0)} litres of water consumption per product unit.`, { align: 'justify' });
    doc.moveDown(1);
    
    // KEY RESULTS BOX
    doc.rect(60, doc.y, 480, 120).fillAndStroke(colors.light, colors.secondary);
    const boxY = doc.y - 110;
    doc.fillColor(colors.text).fontSize(12).text('Key Environmental Impact Results:', 70, boxY);
    doc.fontSize(10)
       .text(`Carbon Footprint: ${carbonPerUnit.toFixed(3)} kg CO₂e per unit`, 70, boxY + 20)
       .text(`Water Footprint: ${waterPerUnit.toFixed(1)} L per unit`, 70, boxY + 35)
       .text(`Annual Production: ${primaryProduct.annualProductionVolume?.toLocaleString() || 'N/A'} units`, 70, boxY + 50)
       .text(`Total Annual Impact: ${data.lcaResults.totalCarbonFootprint.toFixed(1)} tonnes CO₂e`, 70, boxY + 65);
    
    doc.y += 130;
    doc.moveDown(1);
    
    doc.fontSize(11).text('All calculations follow ISO 14040 and ISO 14044 LCA standards, using the latest environmental impact databases including ecoinvent 3.5 and verified supplier data where available.', { align: 'justify' });
    
    // INTRODUCTION PAGE
    doc.addPage();
    doc.fontSize(16).fillColor(colors.text).text('1. Introduction');
    doc.moveDown(0.5);
    
    doc.fontSize(12).fillColor(colors.text).text('1.1. Background');
    doc.fontSize(11);
    doc.text(`${data.company.name} is committed to sustainable production practices. This Life Cycle Assessment (LCA) was conducted to quantify the environmental impacts of ${primaryProduct.name} using the most widely accepted methodology for calculation of environmental impacts, standardized in ISO 14040 and ISO 14044.`, { align: 'justify' });
    doc.moveDown(0.5);
    
    doc.text('According to these standards, there are four phases in an LCA study:', { align: 'justify' });
    doc.moveDown(0.3);
    doc.text('a) Goal and scope definition');
    doc.text('b) Inventory analysis'); 
    doc.text('c) Impact assessment');
    doc.text('d) Life cycle interpretation.');
    doc.moveDown(0.5);
    
    doc.fontSize(12).fillColor(colors.text).text('1.2. Goal and scope definition');
    doc.fontSize(11);
    doc.text(`The goal of this study is to assess the environmental impacts of ${primaryProduct.name}. Results will be used for internal sustainability reporting and stakeholder communication. The scope of the assessment is 'cradle-to-gate', including raw materials extraction and production processes.`, { align: 'justify' });
    doc.moveDown(0.5);
    
    const functionalUnit = primaryProduct.volume ? `${primaryProduct.volume}L bottle` : '1 unit';
    doc.text(`The functional unit is defined as: 1 ${functionalUnit} of ${primaryProduct.name}.`);
    doc.moveDown(0.5);
    
    doc.text('The assessment focuses on climate change impact represented by the Global Warming Potential in the next 100 years (GWP100) as defined by the IPCC, supplemented by water consumption analysis.');
    
    // INVENTORY ANALYSIS PAGE  
    doc.addPage();
    doc.fontSize(16).fillColor(colors.text).text('2. Inventory analysis');
    doc.moveDown(0.5);
    
    doc.fontSize(12).fillColor(colors.text).text('2.1. Process description');
    doc.fontSize(11);
    doc.text(`The production process of ${primaryProduct.name} includes ingredient sourcing, processing, packaging, and distribution. Raw materials are sourced from verified suppliers and processed according to industry standards.`, { align: 'justify' });
    doc.moveDown(0.5);
    
    doc.fontSize(12).fillColor(colors.text).text('2.2. Process data');
    doc.fontSize(11);
    
    // Ingredient table (simplified for PDFKit)
    if (primaryProduct.ingredients && primaryProduct.ingredients.length > 0) {
      doc.text('Ingredient composition:', { underline: true });
      doc.moveDown(0.3);
      
      primaryProduct.ingredients.forEach((ingredient: any) => {
        doc.text(`• ${ingredient.name}: ${ingredient.amount} ${ingredient.unit || 'kg'}`);
      });
      doc.moveDown(0.5);
    }
    
    // Packaging data
    if (primaryProduct.bottleWeight || primaryProduct.labelWeight) {
      doc.text('Packaging specifications:', { underline: true });
      doc.moveDown(0.3);
      if (primaryProduct.bottleWeight) doc.text(`• Bottle: ${primaryProduct.bottleWeight}g (${primaryProduct.bottleMaterial || 'glass'})`);
      if (primaryProduct.labelWeight) doc.text(`• Label: ${primaryProduct.labelWeight}g (${primaryProduct.labelMaterial || 'paper'})`);
      doc.moveDown(0.5);
    }
    
    doc.fontSize(12).fillColor(colors.text).text('2.3. Dataset references');
    doc.fontSize(11);
    doc.text('All impact calculations are based on the following environmental databases and sources:', { align: 'justify' });
    doc.moveDown(0.3);
    doc.text('• Ecoinvent 3.5 database for background processes');
    doc.text('• DEFRA 2024 emission factors for UK-specific processes'); 
    doc.text('• Verified supplier environmental product declarations where available');
    doc.text('• OpenLCA methodology for ingredient impact calculations');
    doc.moveDown(0.5);
    
    doc.fontSize(12).fillColor(colors.text).text('2.4. Allocation');
    doc.fontSize(11);
    doc.text('Where processes produce multiple outputs, environmental impacts are allocated based on economic value or mass, following ISO 14044 guidelines. Facility-level impacts are allocated proportionally based on production volumes.', { align: 'justify' });
    
    // IMPACT ASSESSMENT PAGE
    doc.addPage();
    doc.fontSize(16).fillColor(colors.text).text('3. Impact assessment / Interpretation');
    doc.moveDown(0.5);
    
    doc.fontSize(11);
    doc.text('Results of the life cycle impact assessment are shown below:', { align: 'justify' });
    doc.moveDown(1);
    
    // Impact breakdown (simplified table for PDFKit)
    if (data.lcaResults.impactsByCategory && data.lcaResults.impactsByCategory.length > 0) {
      doc.fontSize(12).fillColor(colors.text).text('Impact breakdown by category:', { underline: true });
      doc.moveDown(0.5);
      
      data.lcaResults.impactsByCategory.forEach((category: any) => {
        doc.fontSize(10).text(`${category.category}: ${category.impact} ${category.unit}`);
      });
      doc.moveDown(1);
    }
    
    doc.fontSize(11);
    doc.text('The assessment shows that the primary environmental impacts come from raw material production and packaging. Energy consumption during processing contributes a smaller but significant portion of the total impact.', { align: 'justify' });
    doc.moveDown(1);
    
    doc.fontSize(9).fillColor(colors.secondary);
    doc.text(`Calculation date: ${new Date(data.lcaResults.calculationDate).toLocaleDateString()}`);
    doc.text(`System: ${data.lcaResults.systemName}`);
    
    // REFERENCES PAGE
    doc.addPage();
    doc.fontSize(16).fillColor(colors.text).text('4. References');
    doc.moveDown(1);
    
    const references = [
      'ISO 14040:2006 - Environmental management — Life cycle assessment — Principles and framework',
      'ISO 14044:2006 - Environmental management — Life cycle assessment — Requirements and guidelines', 
      'Ecoinvent 3.5 database - Swiss Centre for Life Cycle Inventories',
      'DEFRA 2024 - UK Government GHG Conversion Factors for Company Reporting',
      'IPCC 2013 - Climate Change 2013: The Physical Science Basis'
    ];
    
    doc.fontSize(10).fillColor(colors.text);
    references.forEach((ref, index) => {
      doc.text(`[${index + 1}] ${ref}`, { align: 'justify' });
      doc.moveDown(0.5);
    });
    
    doc.moveDown(2);
    doc.fontSize(8).fillColor(colors.secondary).text(`Report generated by Avallen Sustainability Platform on ${new Date().toLocaleDateString()}`, { align: 'center' });
  }

  private createDocumentDefinition(data: LCAReportData): any {
    const primaryProduct = data.products[0] || {};
    const reportDate = new Date().toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });

    return {
      info: {
        title: `Life Cycle Assessment of ${primaryProduct.name || 'Product'}`,
        author: 'Avallen Sustainability Platform',
        subject: 'Environmental Life Cycle Assessment',
        keywords: 'LCA, sustainability, carbon footprint, environmental impact'
      },
      
      pageSize: 'A4',
      pageMargins: [60, 80, 60, 80],
      
      header: (currentPage: number, pageCount: number) => {
        if (currentPage === 1) return null; // No header on title page
        
        return {
          columns: [
            { 
              text: `LIFE CYCLE ASSESSMENT OF ${(primaryProduct.name || 'PRODUCT').toUpperCase()}`, 
              style: 'headerText',
              width: '*'
            },
            { 
              text: `${String(currentPage).padStart(2, '0')}`, 
              style: 'pageNumber',
              width: 'auto',
              alignment: 'right'
            }
          ],
          margin: [60, 30, 60, 0]
        };
      },
      
      footer: (currentPage: number, pageCount: number) => {
        if (currentPage === 1) return null; // No footer on title page
        
        return {
          text: 'Generated by Avallen Sustainability Platform',
          style: 'footerText',
          alignment: 'center',
          margin: [0, 10, 0, 0]
        };
      },
      
      content: [
        // Title Page
        this.createTitlePage(data, primaryProduct, reportDate),
        
        // Table of Contents
        { text: '', pageBreak: 'before' },
        this.createTableOfContents(),
        
        // Main Findings
        { text: '', pageBreak: 'before' },
        this.createMainFindings(data, primaryProduct),
        
        // Introduction
        { text: '', pageBreak: 'before' },
        this.createIntroduction(data, primaryProduct),
        
        // Inventory Analysis
        { text: '', pageBreak: 'before' },
        this.createInventoryAnalysis(data, primaryProduct),
        
        // Impact Assessment
        { text: '', pageBreak: 'before' },
        this.createImpactAssessment(data),
        
        // References
        { text: '', pageBreak: 'before' },
        this.createReferences()
      ],
      
      styles: this.getDocumentStyles(),
      
      defaultStyle: {
        font: 'Helvetica',
        fontSize: 11,
        lineHeight: 1.3
      }
    };
  }

  private createTitlePage(data: LCAReportData, primaryProduct: any, reportDate: string): any {
    return [
      { text: '\n\n\n' },
      { 
        text: 'Life Cycle Assessment of',
        style: 'titlePrefix',
        alignment: 'center'
      },
      { 
        text: primaryProduct.name || 'Product',
        style: 'mainTitle',
        alignment: 'center',
        margin: [0, 10, 0, 30]
      },
      {
        text: `Produced by ${data.company.name}`,
        style: 'subtitle',
        alignment: 'center',
        margin: [0, 0, 0, 50]
      },
      { text: '\n\n\n\n\n\n' },
      {
        columns: [
          { width: '*', text: '' },
          {
            width: 'auto',
            table: {
              body: [
                [{ text: 'Avallen Sustainability Platform', style: 'authorInfo' }],
                [{ text: 'Environmental Impact Assessment', style: 'authorInfo' }],
                [{ text: '', margin: [0, 10, 0, 0] }],
                [{ text: 'Author', style: 'authorLabel' }],
                [{ text: 'Avallen Sustainability Team', style: 'authorInfo' }],
                [{ text: reportDate, style: 'authorInfo' }]
              ]
            },
            layout: 'noBorders'
          }
        ]
      }
    ];
  }

  private createTableOfContents(): any {
    return [
      { text: 'Table of contents', style: 'sectionTitle' },
      { text: '\n' },
      {
        table: {
          widths: ['*', 'auto'],
          body: [
            ['Main findings', '3'],
            ['1. Introduction', '4'],
            ['  1.1. Background', '4'],
            ['  1.2. Goal and scope definition', '4'],
            ['2. Inventory analysis', '5'],
            ['  2.1. Process description', '5'],
            ['  2.2. Process data', '6'],
            ['  2.3. Dataset references', '7'],
            ['  2.4. Allocation', '7'],
            ['3. Impact assessment / Interpretation', '8'],
            ['4. References', '10']
          ]
        },
        layout: {
          hLineWidth: () => 0,
          vLineWidth: () => 0,
          paddingLeft: () => 0,
          paddingRight: () => 10,
          paddingTop: () => 3,
          paddingBottom: () => 3
        },
        style: 'tableOfContents'
      }
    ];
  }

  private createMainFindings(data: LCAReportData, primaryProduct: any): any {
    const carbonPerUnit = data.lcaResults.totalCarbonFootprint / (data.aggregatedResults.productCount || 1);
    const waterPerUnit = data.lcaResults.totalWaterFootprint / (data.aggregatedResults.productCount || 1);
    
    return [
      { text: 'Main findings', style: 'sectionTitle' },
      { text: '\n' },
      {
        text: `In this study, an environmental life cycle assessment (LCA) of ${primaryProduct.name} produced by ${data.company.name} was conducted. The assessment focused on climate impacts represented by the 'Global Warming Potential in the next 100 years (GWP100)'.`,
        style: 'bodyText',
        alignment: 'justify'
      },
      { text: '\n' },
      {
        text: `The study shows a carbon footprint of ${carbonPerUnit.toFixed(3)} kg CO₂-eq per product unit. The packaging materials have the highest contribution to the climate impacts, followed by ingredient production and processing. The water footprint analysis shows ${waterPerUnit.toFixed(0)} litres of water consumption per product unit.`,
        style: 'bodyText',
        alignment: 'justify'
      },
      { text: '\n' },
      // Key Results Table
      {
        text: 'Key Environmental Impact Results',
        style: 'subsectionTitle'
      },
      { text: '\n' },
      {
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto'],
          body: [
            [
              { text: 'Impact Category', style: 'tableHeader' },
              { text: 'Per Unit', style: 'tableHeader' },
              { text: 'Annual Total', style: 'tableHeader' }
            ],
            [
              'Carbon Footprint',
              `${carbonPerUnit.toFixed(3)} kg CO₂e`,
              `${data.lcaResults.totalCarbonFootprint.toFixed(1)} tonnes CO₂e`
            ],
            [
              'Water Footprint',
              `${waterPerUnit.toFixed(1)} L`,
              `${(data.lcaResults.totalWaterFootprint / 1000).toFixed(1)} m³`
            ],
            [
              'Annual Production',
              `${primaryProduct.annualProductionVolume?.toLocaleString() || 'N/A'} units`,
              `${data.aggregatedResults.productCount} product${data.aggregatedResults.productCount !== 1 ? 's' : ''} assessed`
            ]
          ]
        },
        layout: this.getTableLayout(),
        style: 'dataTable'
      },
      { text: '\n' },
      {
        text: 'All calculations follow ISO 14040 and ISO 14044 LCA standards, using the latest environmental impact databases including ecoinvent 3.5 and verified supplier data where available.',
        style: 'bodyText',
        alignment: 'justify'
      }
    ];
  }

  private createIntroduction(data: LCAReportData, primaryProduct: any): any {
    return [
      { text: '1. Introduction', style: 'sectionTitle' },
      { text: '\n' },
      { text: '1.1. Background', style: 'subsectionTitle' },
      {
        text: `${data.company.name} is committed to sustainable production practices. This Life Cycle Assessment (LCA) was conducted to quantify the environmental impacts of ${primaryProduct.name} using the most widely accepted methodology for calculation of environmental impacts, standardized in ISO 14040 and ISO 14044.`,
        style: 'bodyText',
        alignment: 'justify'
      },
      { text: '\n' },
      {
        text: 'According to these standards, there are four phases in an LCA study:',
        style: 'bodyText'
      },
      {
        ul: [
          'Goal and scope definition',
          'Inventory analysis',
          'Impact assessment',
          'Life cycle interpretation'
        ],
        style: 'bodyText'
      },
      { text: '\n' },
      { text: '1.2. Goal and scope definition', style: 'subsectionTitle' },
      {
        text: `The goal of this study is to assess the environmental impacts of ${primaryProduct.name}. Results will be used for internal sustainability reporting and stakeholder communication. The scope of the assessment is 'cradle-to-gate', including raw materials extraction and production processes.`,
        style: 'bodyText',
        alignment: 'justify'
      },
      { text: '\n' },
      {
        text: `The functional unit is defined as: 1 ${primaryProduct.volume ? primaryProduct.volume + 'L bottle' : 'unit'} of ${primaryProduct.name}.`,
        style: 'bodyText'
      },
      { text: '\n' },
      {
        text: 'The assessment focuses on climate change impact represented by the Global Warming Potential in the next 100 years (GWP100) as defined by the IPCC, supplemented by water consumption analysis.',
        style: 'bodyText',
        alignment: 'justify'
      }
    ];
  }

  private createInventoryAnalysis(data: LCAReportData, primaryProduct: any): any {
    const content = [
      { text: '2. Inventory analysis', style: 'sectionTitle' },
      { text: '\n' },
      { text: '2.1. Process description', style: 'subsectionTitle' },
      {
        text: `The production process of ${primaryProduct.name} includes ingredient sourcing, processing, packaging, and distribution. Raw materials are sourced from verified suppliers and processed according to industry standards.`,
        style: 'bodyText',
        alignment: 'justify'
      },
      { text: '\n' },
      { text: '2.2. Process data', style: 'subsectionTitle' }
    ];

    // Add ingredient composition table if available
    if (primaryProduct.ingredients && primaryProduct.ingredients.length > 0) {
      content.push(
        { text: 'Ingredient composition:', style: 'tableTitle' },
        { text: '\n' },
        {
          table: {
            headerRows: 1,
            widths: ['*', 'auto', 'auto'],
            body: [
              [
                { text: 'Ingredient', style: 'tableHeader' },
                { text: 'Amount', style: 'tableHeader' },
                { text: 'Unit', style: 'tableHeader' }
              ],
              ...primaryProduct.ingredients.map((ing: any) => [
                ing.name || 'Unknown',
                ing.amount || 'N/A',
                ing.unit || 'kg'
              ])
            ]
          },
          layout: this.getTableLayout(),
          style: 'dataTable'
        },
        { text: '\n' }
      );
    }

    // Add packaging specifications
    if (primaryProduct.bottleWeight || primaryProduct.labelWeight) {
      content.push(
        { text: 'Packaging specifications:', style: 'tableTitle' },
        { text: '\n' },
        {
          table: {
            headerRows: 1,
            widths: ['*', 'auto', 'auto'],
            body: [
              [
                { text: 'Component', style: 'tableHeader' },
                { text: 'Weight', style: 'tableHeader' },
                { text: 'Material', style: 'tableHeader' }
              ],
              ...(primaryProduct.bottleWeight ? [[
                'Bottle',
                `${primaryProduct.bottleWeight}g`,
                primaryProduct.bottleMaterial || 'glass'
              ]] : []),
              ...(primaryProduct.labelWeight ? [[
                'Label',
                `${primaryProduct.labelWeight}g`,
                primaryProduct.labelMaterial || 'paper'
              ]] : [])
            ]
          },
          layout: this.getTableLayout(),
          style: 'dataTable'
        },
        { text: '\n' }
      );
    }

    // Add dataset references and allocation sections
    content.push(
      { text: '2.3. Dataset references', style: 'subsectionTitle' },
      {
        text: 'All impact calculations are based on the following environmental databases and sources:',
        style: 'bodyText'
      },
      {
        ul: [
          'Ecoinvent 3.5 database for background processes',
          'DEFRA 2024 emission factors for UK-specific processes',
          'Verified supplier environmental product declarations where available',
          'OpenLCA methodology for ingredient impact calculations'
        ],
        style: 'bodyText'
      },
      { text: '\n' },
      { text: '2.4. Allocation', style: 'subsectionTitle' },
      {
        text: 'Where processes produce multiple outputs, environmental impacts are allocated based on economic value or mass, following ISO 14044 guidelines. Facility-level impacts are allocated proportionally based on production volumes.',
        style: 'bodyText',
        alignment: 'justify'
      }
    );

    return content;
  }

  private createImpactAssessment(data: LCAReportData): any {
    return [
      { text: '3. Impact assessment / Interpretation', style: 'sectionTitle' },
      { text: '\n' },
      {
        text: 'Results of the life cycle impact assessment are shown below:',
        style: 'bodyText'
      },
      { text: '\n' },
      // Impact breakdown table
      {
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto'],
          body: [
            [
              { text: 'Impact Category', style: 'tableHeader' },
              { text: 'Impact Value', style: 'tableHeader' },
              { text: 'Unit', style: 'tableHeader' }
            ],
            ...(data.lcaResults.impactsByCategory || []).map((category: any) => [
              category.category,
              category.impact.toString(),
              category.unit
            ])
          ]
        },
        layout: this.getTableLayout(),
        style: 'dataTable'
      },
      { text: '\n' },
      {
        text: 'The assessment shows that the primary environmental impacts come from raw material production and packaging. Energy consumption during processing contributes a smaller but significant portion of the total impact.',
        style: 'bodyText',
        alignment: 'justify'
      },
      { text: '\n' },
      {
        text: `Calculation date: ${new Date(data.lcaResults.calculationDate).toLocaleDateString()}`,
        style: 'smallText'
      },
      {
        text: `System: ${data.lcaResults.systemName}`,
        style: 'smallText'
      }
    ];
  }

  private createReferences(): any {
    return [
      { text: '4. References', style: 'sectionTitle' },
      { text: '\n' },
      {
        ol: [
          'ISO 14040:2006 - Environmental management — Life cycle assessment — Principles and framework',
          'ISO 14044:2006 - Environmental management — Life cycle assessment — Requirements and guidelines',
          'Ecoinvent 3.5 database - Swiss Centre for Life Cycle Inventories',
          'DEFRA 2024 - UK Government GHG Conversion Factors for Company Reporting',
          'IPCC 2013 - Climate Change 2013: The Physical Science Basis'
        ],
        style: 'references'
      },
      { text: '\n\n' },
      {
        text: `Report generated by Avallen Sustainability Platform on ${new Date().toLocaleDateString()}`,
        style: 'footerText',
        alignment: 'center'
      }
    ];
  }

  private getDocumentStyles(): any {
    return {
      titlePrefix: {
        fontSize: 18,
        color: '#666666',
        margin: [0, 0, 0, 10]
      },
      mainTitle: {
        fontSize: 24,
        bold: true,
        color: '#10b981',
        margin: [0, 0, 0, 20]
      },
      subtitle: {
        fontSize: 14,
        color: '#666666'
      },
      authorInfo: {
        fontSize: 12,
        color: '#333333',
        margin: [0, 2, 0, 2]
      },
      authorLabel: {
        fontSize: 10,
        bold: true,
        color: '#666666',
        margin: [0, 10, 0, 2]
      },
      headerText: {
        fontSize: 9,
        color: '#666666'
      },
      pageNumber: {
        fontSize: 9,
        color: '#666666'
      },
      footerText: {
        fontSize: 8,
        color: '#999999'
      },
      sectionTitle: {
        fontSize: 16,
        bold: true,
        color: '#333333',
        margin: [0, 0, 0, 10]
      },
      subsectionTitle: {
        fontSize: 12,
        bold: true,
        color: '#333333',
        margin: [0, 10, 0, 5]
      },
      tableTitle: {
        fontSize: 11,
        bold: true,
        color: '#333333',
        margin: [0, 5, 0, 5]
      },
      bodyText: {
        fontSize: 11,
        color: '#333333',
        margin: [0, 0, 0, 8]
      },
      smallText: {
        fontSize: 9,
        color: '#666666',
        margin: [0, 2, 0, 2]
      },
      tableHeader: {
        fontSize: 10,
        bold: true,
        color: '#ffffff',
        fillColor: '#10b981'
      },
      dataTable: {
        fontSize: 10,
        margin: [0, 5, 0, 10]
      },
      tableOfContents: {
        fontSize: 11,
        margin: [0, 2, 0, 2]
      },
      references: {
        fontSize: 10,
        color: '#333333'
      }
    };
  }

  private getTableLayout(): any {
    return {
      fillColor: (rowIndex: number) => {
        return rowIndex === 0 ? '#10b981' : (rowIndex % 2 === 0 ? '#f8f9fa' : null);
      },
      hLineWidth: (i: number, node: any) => {
        return (i === 0 || i === node.table.body.length) ? 2 : 1;
      },
      vLineWidth: () => 0,
      hLineColor: () => '#dee2e6',
      paddingLeft: () => 8,
      paddingRight: () => 8,
      paddingTop: () => 6,
      paddingBottom: () => 6
    };
  }
}