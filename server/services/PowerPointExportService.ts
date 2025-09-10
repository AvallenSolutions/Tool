import PptxGenJS from 'pptxgenjs';
import { logger } from '../config/logger';
import path from 'path';
import fs from 'fs/promises';

export interface PowerPointExportOptions {
  reportType: string;
  company: any;
  metricsData: any;
  templateOptions: any;
  blocks?: any[];
}

export class PowerPointExportService {
  
  /**
   * Generate PowerPoint presentation from options
   */
  static async generatePowerPoint(options: PowerPointExportOptions): Promise<{ filePath: string; filename: string }> {
    try {
      logger.info({ reportType: options.reportType }, 'PowerPoint Service: Starting presentation generation');
      
      const { reportType, company, metricsData, templateOptions, blocks } = options;
      
      // Create new presentation
      const pptx = new PptxGenJS();
      
      // Set presentation properties
      pptx.author = 'Drinks Sustainability Platform';
      pptx.company = company.companyName;
      pptx.revision = '1';
      pptx.subject = `Sustainability Report - ${company.companyName}`;
      pptx.title = templateOptions.customTitle || `${reportType.toUpperCase()} Report`;
      
      // Define theme colors (green to blue gradient theme)
      const theme = {
        primary: '22C55E',    // Green
        secondary: '3B82F6',  // Blue
        accent: '8B5CF6',     // Purple
        text: '374151',       // Dark gray
        light: 'F8FAFC',      // Light gray
        white: 'FFFFFF'
      };
      
      // Create title slide
      PowerPointExportService.createTitleSlide(pptx, {
        title: templateOptions.customTitle || `${reportType.toUpperCase()} Report`,
        company: company.companyName,
        date: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        theme
      });
      
      // Create content slides based on blocks or default structure
      if (blocks && blocks.length > 0) {
        blocks.forEach(block => {
          PowerPointExportService.createBlockSlide(pptx, block, metricsData, theme);
        });
      } else {
        // Default slides if no blocks provided
        PowerPointExportService.createDefaultSlides(pptx, metricsData, theme);
      }
      
      // Create summary slide
      PowerPointExportService.createSummarySlide(pptx, metricsData, theme);
      
      // Generate unique filename and path
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `sustainability-report-${timestamp}.pptx`;
      const filePath = path.join(process.cwd(), 'temp', filename);
      
      // Ensure temp directory exists
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      
      // Save presentation
      await pptx.writeFile({ fileName: filePath });
      
      logger.info({ 
        filename, 
        filePath,
        company: company.companyName,
        slideCount: pptx.slides.length
      }, 'PowerPoint Service: Presentation generated successfully');
      
      return { filePath, filename };
      
    } catch (error) {
      logger.error({ 
        error: error instanceof Error ? error.message : String(error),
        reportType: options.reportType 
      }, 'PowerPoint Service: Error generating presentation');
      throw error;
    }
  }
  
  /**
   * Create title slide
   */
  private static createTitleSlide(pptx: pptxgen, options: any): void {
    const slide = pptx.addSlide();
    
    // Background gradient
    slide.background = {
      fill: {
        type: 'gradient',
        colors: [`${options.theme.primary}`, `${options.theme.secondary}`],
        dir: 45
      }
    };
    
    // Main title
    slide.addText(options.title, {
      x: 0.5,
      y: 2.5,
      w: 9,
      h: 1.5,
      fontSize: 36,
      fontFace: 'Inter',
      color: options.theme.white,
      bold: true,
      align: 'center'
    });
    
    // Company name
    slide.addText(options.company, {
      x: 0.5,
      y: 4.2,
      w: 9,
      h: 0.8,
      fontSize: 24,
      fontFace: 'Inter',
      color: options.theme.white,
      align: 'center'
    });
    
    // Date
    slide.addText(`Generated on ${options.date}`, {
      x: 0.5,
      y: 5.2,
      w: 9,
      h: 0.5,
      fontSize: 16,
      fontFace: 'Inter',
      color: options.theme.white,
      align: 'center'
    });
    
    // Logo placeholder
    slide.addShape(pptx.ShapeType.rect, {
      x: 4.25,
      y: 0.5,
      w: 1.5,
      h: 1.5,
      fill: { color: options.theme.white },
      line: { color: options.theme.white, width: 2 }
    });
    
    slide.addText('LOGO', {
      x: 4.25,
      y: 0.5,
      w: 1.5,
      h: 1.5,
      fontSize: 12,
      fontFace: 'Inter',
      color: options.theme.primary,
      align: 'center',
      valign: 'middle'
    });
  }
  
  /**
   * Create slide for a specific block
   */
  private static createBlockSlide(pptx: pptxgen, block: any, metricsData: any, theme: any): void {
    const slide = pptx.addSlide();
    
    // Header
    slide.addText(block.title || block.type.replace('_', ' ').toUpperCase(), {
      x: 0.5,
      y: 0.5,
      w: 9,
      h: 0.8,
      fontSize: 28,
      fontFace: 'Inter',
      color: theme.primary,
      bold: true
    });
    
    // Divider line
    slide.addShape(pptx.ShapeType.line, {
      x: 0.5,
      y: 1.4,
      w: 9,
      h: 0,
      line: { color: theme.secondary, width: 3 }
    });
    
    switch (block.type) {
      case 'title':
        PowerPointExportService.createTitleBlockSlide(slide, block, theme);
        break;
      case 'metrics':
        PowerPointExportService.createMetricsBlockSlide(slide, block, metricsData, theme);
        break;
      case 'chart':
        PowerPointExportService.createChartBlockSlide(slide, block, theme);
        break;
      case 'text':
        PowerPointExportService.createTextBlockSlide(slide, block, theme);
        break;
      case 'editable_text':
        PowerPointExportService.createEditableTextBlockSlide(slide, block, theme);
        break;
      default:
        PowerPointExportService.createDefaultBlockSlide(slide, block, theme);
    }
  }
  
  /**
   * Create metrics block slide
   */
  private static createMetricsBlockSlide(slide: any, block: any, metricsData: any, theme: any): void {
    const metrics = block.content?.metrics || [
      { label: 'Total Products', value: metricsData.products.length, unit: 'products' },
      { label: 'KPIs Tracked', value: metricsData.kpis.length, unit: 'KPIs' },
      { label: 'Reporting Period', value: '2024', unit: 'year' }
    ];
    
    // Create metric cards in a grid
    const cols = Math.min(3, metrics.length);
    const cardWidth = 2.8;
    const cardHeight = 2;
    const startX = 0.5 + (9 - (cols * cardWidth + (cols - 1) * 0.3)) / 2;
    
    metrics.slice(0, 6).forEach((metric, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = startX + col * (cardWidth + 0.3);
      const y = 2.5 + row * (cardHeight + 0.3);
      
      // Card background
      slide.addShape(pptx.ShapeType.rect, {
        x,
        y,
        w: cardWidth,
        h: cardHeight,
        fill: { color: theme.light },
        line: { color: theme.secondary, width: 1 }
      });
      
      // Metric value
      slide.addText(String(metric.value), {
        x,
        y: y + 0.3,
        w: cardWidth,
        h: 0.8,
        fontSize: 32,
        fontFace: 'Inter',
        color: theme.primary,
        bold: true,
        align: 'center'
      });
      
      // Metric unit
      slide.addText(metric.unit, {
        x,
        y: y + 1.1,
        w: cardWidth,
        h: 0.3,
        fontSize: 12,
        fontFace: 'Inter',
        color: theme.text,
        align: 'center'
      });
      
      // Metric label
      slide.addText(metric.label, {
        x,
        y: y + 1.5,
        w: cardWidth,
        h: 0.4,
        fontSize: 14,
        fontFace: 'Inter',
        color: theme.text,
        bold: true,
        align: 'center'
      });
    });
  }
  
  /**
   * Create chart block slide
   */
  private static createChartBlockSlide(slide: any, block: any, theme: any): void {
    // Chart placeholder
    slide.addShape(pptx.ShapeType.rect, {
      x: 1,
      y: 2.5,
      w: 8,
      h: 4,
      fill: { color: theme.light },
      line: { color: theme.secondary, width: 2, dashType: 'dash' }
    });
    
    slide.addText('Chart visualization will be displayed here', {
      x: 1,
      y: 4.5,
      w: 8,
      h: 0.5,
      fontSize: 16,
      fontFace: 'Inter',
      color: theme.text,
      align: 'center',
      italic: true
    });
    
    slide.addText(block.content?.title || 'Chart Title', {
      x: 1,
      y: 3.8,
      w: 8,
      h: 0.5,
      fontSize: 20,
      fontFace: 'Inter',
      color: theme.primary,
      bold: true,
      align: 'center'
    });
  }
  
  /**
   * Create text block slide
   */
  private static createTextBlockSlide(slide: any, block: any, theme: any): void {
    const content = block.content?.content || block.content?.text || 'Text content will be displayed here';
    
    slide.addText(content, {
      x: 0.5,
      y: 2,
      w: 9,
      h: 4.5,
      fontSize: 16,
      fontFace: 'Inter',
      color: theme.text,
      align: 'left',
      valign: 'top'
    });
  }

  /**
   * Create editable text block slide with formatting support
   */
  private static createEditableTextBlockSlide(slide: any, block: any, theme: any): void {
    const text = block.content?.text || 'Text content will be displayed here';
    const formatting = block.content?.formatting || {};
    
    // Determine font size
    let fontSize = 16; // default
    switch (formatting.fontSize) {
      case 'small':
        fontSize = 14;
        break;
      case 'large':
        fontSize = 20;
        break;
      default:
        fontSize = 16;
    }
    
    // Determine alignment
    let align = 'left';
    switch (formatting.alignment) {
      case 'center':
        align = 'center';
        break;
      case 'right':
        align = 'right';
        break;
      case 'justify':
        align = 'justify';
        break;
      default:
        align = 'left';
    }
    
    // Determine font style
    let bold = false;
    let italic = false;
    switch (formatting.style) {
      case 'bold':
        bold = true;
        break;
      case 'italic':
        italic = true;
        break;
      default:
        bold = false;
        italic = false;
    }
    
    slide.addText(text, {
      x: 0.5,
      y: 2,
      w: 9,
      h: 4.5,
      fontSize: fontSize,
      fontFace: 'Inter',
      color: theme.text,
      align: align,
      valign: 'top',
      bold: bold,
      italic: italic
    });
  }
  
  /**
   * Create title block slide
   */
  private static createTitleBlockSlide(slide: any, block: any, theme: any): void {
    slide.addText(block.content?.title || 'Title', {
      x: 0.5,
      y: 3,
      w: 9,
      h: 1.5,
      fontSize: 36,
      fontFace: 'Inter',
      color: theme.primary,
      bold: true,
      align: 'center'
    });
    
    if (block.content?.subtitle) {
      slide.addText(block.content.subtitle, {
        x: 0.5,
        y: 4.8,
        w: 9,
        h: 0.8,
        fontSize: 20,
        fontFace: 'Inter',
        color: theme.text,
        align: 'center'
      });
    }
  }
  
  /**
   * Create default block slide
   */
  private static createDefaultBlockSlide(slide: any, block: any, theme: any): void {
    slide.addText(`Content for ${block.type} block`, {
      x: 0.5,
      y: 3,
      w: 9,
      h: 2,
      fontSize: 18,
      fontFace: 'Inter',
      color: theme.text,
      align: 'center',
      valign: 'middle'
    });
  }
  
  /**
   * Create default slides when no blocks provided
   */
  private static createDefaultSlides(pptx: pptxgen, metricsData: any, theme: any): void {
    // Executive Summary slide
    const summarySlide = pptx.addSlide();
    summarySlide.addText('Executive Summary', {
      x: 0.5,
      y: 0.5,
      w: 9,
      h: 0.8,
      fontSize: 28,
      fontFace: 'Inter',
      color: theme.primary,
      bold: true
    });
    
    summarySlide.addText(
      'This sustainability report provides a comprehensive overview of our environmental performance and commitment to sustainable practices.',
      {
        x: 0.5,
        y: 2,
        w: 9,
        h: 3,
        fontSize: 16,
        fontFace: 'Inter',
        color: theme.text,
        align: 'left'
      }
    );
  }
  
  /**
   * Create summary slide
   */
  private static createSummarySlide(pptx: pptxgen, metricsData: any, theme: any): void {
    const slide = pptx.addSlide();
    
    // Background with subtle gradient
    slide.background = {
      fill: {
        type: 'gradient',
        colors: [`${theme.light}`, `${theme.white}`],
        dir: 90
      }
    };
    
    slide.addText('Summary', {
      x: 0.5,
      y: 0.5,
      w: 9,
      h: 0.8,
      fontSize: 28,
      fontFace: 'Inter',
      color: theme.primary,
      bold: true,
      align: 'center'
    });
    
    slide.addText('Thank you for reviewing our sustainability report.', {
      x: 0.5,
      y: 3,
      w: 9,
      h: 1,
      fontSize: 20,
      fontFace: 'Inter',
      color: theme.text,
      align: 'center'
    });
    
    slide.addText(`Generated by Drinks Sustainability Platform on ${new Date().toLocaleDateString()}`, {
      x: 0.5,
      y: 6,
      w: 9,
      h: 0.5,
      fontSize: 12,
      fontFace: 'Inter',
      color: theme.text,
      align: 'center',
      italic: true
    });
  }
}