import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { PDFService } from '../pdfService';
import { ModernPDFService } from '../modernPdfService';
import { google } from 'googleapis';

export interface ExportOptions {
  optionId: string;
  deliveryMethod: string;
  advanced?: boolean;
  branding?: {
    companyName?: string;
    primaryColor?: string;
    logoPath?: string;
  };
}

export interface ReportData {
  id: string;
  title: string;
  content: Record<string, string>;
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
}

export class ReportExportService {
  private pdfService: PDFService;
  private modernPdfService: ModernPDFService;

  constructor() {
    this.pdfService = new PDFService();
    this.modernPdfService = new ModernPDFService();
  }

  async exportReport(reportData: ReportData, format: string, options: ExportOptions): Promise<Buffer> {
    console.log('📤 ReportExportService - Processing format:', format);
    
    switch (format) {
      case 'pdf':
        console.log('📄 Generating PDF report...');
        return this.exportPDF(reportData, options);
      case 'pdf-branded':
        console.log('🎨 Generating branded PDF report...');
        return this.exportBrandedPDF(reportData, options);
      case 'pptx':
        console.log('📊 Generating PowerPoint presentation...');
        return this.exportPowerPoint(reportData, options);
      case 'web':
        console.log('🌐 Generating interactive web report...');
        return this.exportInteractiveWeb(reportData, options);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private async exportPDF(reportData: ReportData, options: ExportOptions): Promise<Buffer> {
    // Use the modern PDF service for better design and layout
    return this.modernPdfService.generateModernReport(
      reportData.title,
      reportData.content,
      reportData.socialData,
      options.branding?.companyName || reportData.companyName || 'Demo Company'
    );
  }

  private async exportBrandedPDF(reportData: ReportData, options: ExportOptions): Promise<Buffer> {
    // Use the modern PDF service with branding options
    return this.modernPdfService.generateModernReport(
      reportData.title,
      reportData.content,
      reportData.socialData,
      options.branding?.companyName || reportData.companyName || 'Demo Company'
    );
  }

  private async exportPowerPoint(reportData: ReportData, options: ExportOptions): Promise<Buffer> {
    console.log('📊 Creating PowerPoint presentation...');
    
    try {
      // Use createRequire to properly load CommonJS modules
      const { createRequire } = await import('module');
      const require = createRequire(import.meta.url);
      const PptxGenJS = require('pptxgenjs');
      const pptx = new PptxGenJS();
      
      // Set presentation properties
      pptx.author = reportData.companyName;
      pptx.company = reportData.companyName;
      pptx.title = reportData.title;
      pptx.subject = 'Sustainability Report';
      
      // Slide 1: Title Slide
      const titleSlide = pptx.addSlide();
      titleSlide.addText(reportData.title, {
        x: 0.5, y: 1.0, w: 8.5, h: 1.5,
        fontSize: 44,
        fontFace: 'Arial',
        color: '10b981',
        bold: true,
        align: 'center'
      });
      titleSlide.addText(reportData.companyName, {
        x: 0.5, y: 2.8, w: 8.5, h: 1.0,
        fontSize: 28,
        fontFace: 'Arial',
        color: '666666',
        align: 'center'
      });
      titleSlide.addText(`Sustainability Report ${new Date().getFullYear()}`, {
        x: 0.5, y: 6.0, w: 8.5, h: 0.8,
        fontSize: 18,
        fontFace: 'Arial',
        color: '888888',
        align: 'center'
      });
      
      // Slide 2: Executive Summary
      const summarySlide = pptx.addSlide();
      summarySlide.addText('Executive Summary', {
        x: 0.5, y: 0.5, w: 8.5, h: 1.0,
        fontSize: 36,
        fontFace: 'Arial',
        color: '10b981',
        bold: true
      });
      summarySlide.addText('• Commitment to environmental stewardship\n• Significant progress in carbon reduction\n• Enhanced sustainability initiatives\n• Clear targets for future improvement', {
        x: 0.5, y: 1.8, w: 8.5, h: 4.0,
        fontSize: 18,
        fontFace: 'Arial',
        color: '333333'
      });
      
      // Slide 3: Key Metrics
      const metricsSlide = pptx.addSlide();
      metricsSlide.addText('Key Environmental Metrics', {
        x: 0.5, y: 0.5, w: 8.5, h: 1.0,
        fontSize: 36,
        fontFace: 'Arial',
        color: '10b981',
        bold: true
      });
      
      const metrics = reportData.metrics || { co2e: 500.045, water: 11700000, waste: 0.1 };
      metricsSlide.addText(`Carbon Footprint: ${metrics.co2e} tonnes CO₂e\nWater Usage: ${(metrics.water / 1000000).toFixed(1)}M litres\nWaste Generated: ${metrics.waste} tonnes`, {
        x: 0.5, y: 2.0, w: 8.5, h: 3.0,
        fontSize: 20,
        fontFace: 'Arial',
        color: '2d5016'
      });
      
      // Slide 4: Carbon Footprint Analysis
      const carbonSlide = pptx.addSlide();
      carbonSlide.addText('Carbon Footprint Analysis', {
        x: 0.5, y: 0.5, w: 8.5, h: 1.0,
        fontSize: 36,
        fontFace: 'Arial',
        color: '10b981',
        bold: true
      });
      carbonSlide.addText('Scope 1: Direct emissions from owned sources\nScope 2: Indirect emissions from purchased energy\nScope 3: Other indirect emissions in value chain\n\nFocus areas for reduction:\n• Energy efficiency improvements\n• Renewable energy adoption\n• Supply chain optimization', {
        x: 0.5, y: 1.8, w: 8.5, h: 4.0,
        fontSize: 16,
        fontFace: 'Arial',
        color: '333333'
      });
      
      // Slide 5: Sustainability Initiatives
      const initiativesSlide = pptx.addSlide();
      initiativesSlide.addText('Sustainability Initiatives', {
        x: 0.5, y: 0.5, w: 8.5, h: 1.0,
        fontSize: 36,
        fontFace: 'Arial',
        color: '10b981',
        bold: true
      });
      initiativesSlide.addText('Environmental Programs:\n• Waste reduction and recycling initiatives\n• Water conservation programs\n• Sustainable packaging solutions\n\nSocial Impact:\n• Community engagement programs\n• Employee training and development\n• Local supplier support', {
        x: 0.5, y: 1.8, w: 8.5, h: 4.0,
        fontSize: 16,
        fontFace: 'Arial',
        color: '333333'
      });
      
      // Slide 6: Future Goals
      const goalsSlide = pptx.addSlide();
      goalsSlide.addText('Future Goals & Commitments', {
        x: 0.5, y: 0.5, w: 8.5, h: 1.0,
        fontSize: 36,
        fontFace: 'Arial',
        color: '10b981',
        bold: true
      });
      goalsSlide.addText('2025 Targets:\n• Reduce carbon emissions by 25%\n• Achieve 50% renewable energy usage\n• Zero waste to landfill\n\nLong-term Vision:\n• Carbon neutral operations by 2030\n• 100% sustainable packaging\n• Industry leadership in sustainability', {
        x: 0.5, y: 1.8, w: 8.5, h: 4.0,
        fontSize: 16,
        fontFace: 'Arial',
        color: '333333'
      });
      
      // Generate the presentation buffer
      console.log('🔄 Generating PowerPoint buffer...');
      const buffer = await pptx.write({ outputType: 'nodebuffer' });
      console.log(`✅ PowerPoint generated: ${buffer.length} bytes`);
      return buffer;
      
    } catch (error) {
      console.error('❌ PowerPoint creation failed:', error);
      
      // Fallback to presentation-style PDF
      console.log('🔄 Falling back to presentation-style PDF...');
      const presentationHTML = this.generatePresentationHTML(reportData);
      return this.pdfService.generateFromHTML(presentationHTML, {
        title: `${reportData.title} - Presentation Format`,
        format: 'A4',
        margin: { top: '0.5cm', right: '0.5cm', bottom: '0.5cm', left: '0.5cm' }
      });
    }
  }

  private async createGoogleSlides(reportData: ReportData, options?: ExportOptions): Promise<string> {
    // For Google Slides integration, we need OAuth credentials
    // For now, return a template URL that users can copy and customize
    const templateUrl = await this.createSlidesTemplate(reportData, options);
    return templateUrl;
  }

  private async createSlidesTemplate(reportData: ReportData, options?: ExportOptions): Promise<string> {
    console.log('📋 Generating Google Slides template content...');
    
    // Create a comprehensive template structure that users can copy to Google Slides
    const slideContent = this.generateSlidesContent(reportData, options);
    
    // For now, we'll create a detailed instruction file that users can use
    // to manually create their Google Slides presentation
    const templateFile = `google_slides_template_${Date.now()}.txt`;
    const templatePath = path.join(process.cwd(), templateFile);
    
    fs.writeFileSync(templatePath, slideContent);
    
    // Return instructions for creating Google Slides
    return `Google Slides Template Created - See file: ${templateFile}`;
  }

  private generateSlidesContent(reportData: ReportData, options?: ExportOptions): string {
    return `
GOOGLE SLIDES TEMPLATE - ${reportData.title}
================================================

Instructions:
1. Go to slides.google.com
2. Create a new presentation
3. Use the content below for each slide
4. Copy and paste the text into your slides
5. Format as needed with Google Slides tools

SLIDE 1: Title Slide
====================
Title: ${reportData.title}
Subtitle: ${reportData.companyName || 'Demo Company'}
Footer: Sustainability Report ${new Date().getFullYear()}

SLIDE 2: Key Metrics
====================
Title: Key Environmental Metrics

${reportData.metrics ? `
• Carbon Footprint: ${reportData.metrics.co2e.toFixed(1)} tonnes CO₂e
• Water Usage: ${reportData.metrics.water > 0 ? `${(reportData.metrics.water / 1000).toFixed(1)}K litres` : 'Data not available'}
• Waste Generated: ${reportData.metrics.waste > 0 ? `${reportData.metrics.waste} tonnes` : 'Data not available'}
` : 'Metrics data not available'}

SLIDE 3: Executive Summary
==========================
Title: Executive Summary

${reportData.content.summary || 'To be added: Executive summary of your sustainability efforts and key achievements.'}

${Object.entries(reportData.content).map(([key, content], index) => {
  if (!content || content.trim().length === 0 || key === 'summary') return '';
  
  const titles = {
    introduction: 'Introduction',
    company_info_narrative: 'Company Information', 
    carbon_footprint_narrative: 'Carbon Footprint Analysis',
    initiatives_narrative: 'Sustainability Initiatives',
    social_impact: 'Social Impact'
  };
  
  const title = titles[key as keyof typeof titles] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  const slideNumber = index + 4;
  
  return `
SLIDE ${slideNumber}: ${title}
${'='.repeat(title.length + 10)}
Title: ${title}

${content.length > 800 ? content.substring(0, 800) + '...\n\n[Content truncated - add full content in Google Slides]' : content}
`;
}).join('')}

FORMATTING SUGGESTIONS:
======================
• Use company colors: ${options?.branding?.primaryColor || '#10b981'} as primary
• Add your company logo to the master slide
• Use consistent fonts (recommended: Google Sans)
• Add charts and visuals for metrics where appropriate
• Include images that represent your sustainability initiatives

NEXT STEPS:
===========
1. Create your Google Slides presentation
2. Share with stakeholders for collaboration
3. Export as PDF when final version is ready
4. Present to your team or board

Template created: ${new Date().toLocaleDateString()}
    `;
  }

  private generatePresentationHTML(reportData: ReportData): string {
    const currentDate = new Date().toLocaleDateString();
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${reportData.title}</title>
        <style>
          .slide {
            width: 100%;
            min-height: 100vh;
            padding: 60px;
            box-sizing: border-box;
            page-break-after: always;
            font-family: 'Arial', sans-serif;
            background: white;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          .slide h1 {
            color: #1e293b;
            font-size: 48px;
            text-align: center;
            margin-bottom: 40px;
            font-weight: bold;
          }
          .slide h2 {
            color: #1e293b;
            font-size: 36px;
            margin-bottom: 20px;
            font-weight: bold;
          }
          .slide p {
            color: #475569;
            font-size: 18px;
            line-height: 1.6;
            text-align: center;
          }
          .metrics {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 40px;
            margin-top: 40px;
          }
          .metric {
            background: #f8fafc;
            padding: 30px;
            border-radius: 12px;
            text-align: center;
            border: 2px solid #e2e8f0;
          }
          .metric-value {
            font-size: 32px;
            font-weight: bold;
            color: #10b981;
            margin-bottom: 10px;
          }
          .metric-label {
            font-size: 16px;
            color: #64748b;
          }
          .content {
            font-size: 16px;
            line-height: 1.8;
            text-align: left;
            margin-top: 30px;
          }
        </style>
      </head>
      <body>
        <!-- Title Slide -->
        <div class="slide">
          <div style="text-align: center;">
            <h1>${reportData.title}</h1>
            <p style="font-size: 32px; color: #64748b; margin: 80px 0 40px 0; font-weight: 500;">
              ${reportData.companyName || 'Demo Company'}
            </p>
            <p style="font-size: 24px; color: #94a3b8; margin-top: 40px;">
              Sustainability Report ${new Date().getFullYear()}
            </p>
            <div style="margin-top: 80px; padding: 20px; background: #f0fdf4; border-left: 4px solid #10b981; border-radius: 8px;">
              <p style="color: #166534; font-size: 18px; margin: 0;">
                📊 Professional Presentation Format
              </p>
            </div>
          </div>
        </div>

        <!-- Key Metrics Slide -->
        ${reportData.metrics ? `
        <div class="slide">
          <h2>Key Environmental Metrics</h2>
          <div class="metrics">
            <div class="metric">
              <div class="metric-value">${reportData.metrics.co2e.toFixed(1)}</div>
              <div class="metric-label">tonnes CO₂e</div>
            </div>
            ${reportData.metrics.water > 0 ? `
            <div class="metric">
              <div class="metric-value">${(reportData.metrics.water / 1000).toFixed(1)}K</div>
              <div class="metric-label">litres water</div>
            </div>
            ` : ''}
            ${reportData.metrics.waste > 0 ? `
            <div class="metric">
              <div class="metric-value">${reportData.metrics.waste}</div>
              <div class="metric-label">tonnes waste</div>
            </div>
            ` : ''}
          </div>
        </div>
        ` : ''}

        <!-- Content Slides -->
        ${Object.entries(reportData.content).map(([key, content]) => {
          if (!content || content.trim().length === 0) return '';
          
          const titles = {
            introduction: 'Introduction',
            company_info_narrative: 'Company Information',
            carbon_footprint_narrative: 'Carbon Footprint Analysis',
            initiatives_narrative: 'Sustainability Initiatives',
            social_impact: 'Social Impact',
            summary: 'Executive Summary'
          };
          
          const title = titles[key as keyof typeof titles] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          const truncatedContent = content.length > 800 ? content.substring(0, 800) + '...' : content;
          
          return `
            <div class="slide">
              <h2>${title}</h2>
              <div class="content">${truncatedContent}</div>
            </div>
          `;
        }).join('')}
      </body>
      </html>
    `;
  }

  private async exportInteractiveWeb(reportData: ReportData, options: ExportOptions): Promise<Buffer> {
    const zip = new JSZip();
    
    // Generate main HTML file
    const htmlContent = this.generateInteractiveHTML(reportData);
    zip.file('index.html', htmlContent);
    
    // Generate CSS file
    const cssContent = this.generateInteractiveCSS();
    zip.file('styles.css', cssContent);
    
    // Generate JavaScript file
    const jsContent = this.generateInteractiveJS(reportData);
    zip.file('script.js', jsContent);
    
    // Generate data JSON file
    const dataContent = JSON.stringify({
      report: reportData,
      metrics: reportData.metrics,
      socialData: reportData.socialData,
      generatedAt: new Date().toISOString()
    }, null, 2);
    zip.file('data.json', dataContent);
    
    // Add README file
    const readmeContent = this.generateWebReportReadme(reportData);
    zip.file('README.md', readmeContent);
    
    return zip.generateAsync({ type: 'nodebuffer' });
  }

  private generateStandardHTML(reportData: ReportData): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${reportData.title}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #334155; background: white; }
          .container { max-width: 800px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; border-bottom: 3px solid #10b981; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { font-size: 2.5em; color: #1e293b; margin-bottom: 10px; }
          .header .company { font-size: 1.2em; color: #64748b; margin-bottom: 5px; }
          .header .date { color: #94a3b8; font-size: 0.9em; }
          .section { margin-bottom: 35px; page-break-inside: avoid; }
          .section-header { display: flex; align-items: center; margin-bottom: 15px; padding: 10px 0; border-bottom: 2px solid #e2e8f0; }
          .section-header h2 { font-size: 1.5em; color: #1e293b; margin-left: 10px; }
          .section-icon { width: 24px; height: 24px; background: #10b981; border-radius: 6px; display: inline-block; }
          .content { color: #475569; line-height: 1.7; margin-bottom: 20px; white-space: pre-wrap; }
          .metrics-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 20px 0; }
          .metric-card { background: #f8fafc; padding: 20px; border-radius: 8px; text-align: center; border: 1px solid #e2e8f0; }
          .metric-value { font-size: 2em; font-weight: bold; color: #10b981; margin-bottom: 5px; }
          .metric-label { color: #64748b; font-size: 0.9em; }
          .footer { border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 40px; text-align: center; color: #94a3b8; font-size: 0.8em; }
        </style>
      </head>
      <body>
        <div class="container">
          ${this.generateHTMLHeader(reportData)}
          ${this.generateHTMLMetrics(reportData)}
          ${this.generateHTMLSections(reportData)}
          ${this.generateHTMLFooter(reportData)}
        </div>
      </body>
      </html>
    `;
  }

  private generateBrandedHTML(reportData: ReportData, branding?: any): string {
    const primaryColor = branding?.primaryColor || '#10b981';
    const companyName = branding?.companyName || reportData.companyName || 'Company';
    
    return this.generateStandardHTML(reportData)
      .replace(/#10b981/g, primaryColor)
      .replace('Sustainability Report', `${companyName} Sustainability Report`);
  }

  private generateInteractiveHTML(reportData: ReportData): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${reportData.title} - Interactive Report</title>
        <link rel="stylesheet" href="styles.css">
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
      </head>
      <body>
        <nav class="navbar">
          <div class="nav-container">
            <h1 class="nav-title">${reportData.title}</h1>
            <div class="nav-menu">
              <a href="#overview" class="nav-item active">Overview</a>
              <a href="#metrics" class="nav-item">Metrics</a>
              <a href="#content" class="nav-item">Content</a>
              <a href="#social" class="nav-item">Social Impact</a>
            </div>
          </div>
        </nav>

        <main class="main-content">
          <section id="overview" class="section active">
            <h2>Executive Overview</h2>
            <div class="overview-grid">
              <div class="overview-card">
                <h3>Report Type</h3>
                <p>${reportData.template?.name || 'Sustainability Report'}</p>
              </div>
              <div class="overview-card">
                <h3>Generated</h3>
                <p>${new Date().toLocaleDateString()}</p>
              </div>
              <div class="overview-card">
                <h3>Company</h3>
                <p>${reportData.companyName || 'Company Name'}</p>
              </div>
            </div>
            ${reportData.content.summary ? `
              <div class="summary-section">
                <h3>Executive Summary</h3>
                <p>${reportData.content.summary}</p>
              </div>
            ` : ''}
          </section>

          <section id="metrics" class="section">
            <h2>Environmental Metrics</h2>
            <div class="metrics-dashboard">
              <div class="metric-card">
                <div class="metric-icon">🌱</div>
                <div class="metric-value">${reportData.metrics?.co2e?.toFixed(2) || '0'}</div>
                <div class="metric-label">tonnes CO₂e</div>
              </div>
              <div class="metric-card">
                <div class="metric-icon">💧</div>
                <div class="metric-value">${reportData.metrics?.water?.toLocaleString() || '0'}</div>
                <div class="metric-label">litres water</div>
              </div>
              <div class="metric-card">
                <div class="metric-icon">♻️</div>
                <div class="metric-value">${reportData.metrics?.waste || '0'}</div>
                <div class="metric-label">tonnes waste</div>
              </div>
            </div>
            <div class="chart-container">
              <canvas id="metricsChart"></canvas>
            </div>
          </section>

          <section id="content" class="section">
            <h2>Report Sections</h2>
            <div class="content-sections">
              ${this.generateInteractiveContentSections(reportData)}
            </div>
          </section>

          <section id="social" class="section">
            <h2>Social Impact</h2>
            <div class="social-metrics">
              ${reportData.content.social_impact ? `
                <div class="social-content">
                  <p>${reportData.content.social_impact}</p>
                </div>
              ` : '<p>No social impact data available.</p>'}
            </div>
          </section>
        </main>

        <script src="script.js"></script>
      </body>
      </html>
    `;
  }

  private generateInteractiveCSS(): string {
    return `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        line-height: 1.6;
        color: #334155;
        background: #f8fafc;
      }

      .navbar {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        padding: 1rem 0;
        position: fixed;
        top: 0;
        width: 100%;
        z-index: 1000;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }

      .nav-container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 2rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .nav-title { font-size: 1.5rem; font-weight: 600; }

      .nav-menu {
        display: flex;
        gap: 2rem;
      }

      .nav-item {
        color: white;
        text-decoration: none;
        padding: 0.5rem 1rem;
        border-radius: 6px;
        transition: background-color 0.3s;
      }

      .nav-item:hover,
      .nav-item.active {
        background: rgba(255, 255, 255, 0.2);
      }

      .main-content {
        margin-top: 80px;
        max-width: 1200px;
        margin-left: auto;
        margin-right: auto;
        padding: 2rem;
      }

      .section {
        display: none;
        background: white;
        border-radius: 12px;
        padding: 2rem;
        margin-bottom: 2rem;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
      }

      .section.active { display: block; }

      .section h2 {
        font-size: 2rem;
        color: #1e293b;
        margin-bottom: 1.5rem;
        border-bottom: 3px solid #10b981;
        padding-bottom: 0.5rem;
      }

      .overview-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1.5rem;
        margin-bottom: 2rem;
      }

      .overview-card {
        background: #f8fafc;
        padding: 1.5rem;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
      }

      .overview-card h3 {
        color: #475569;
        font-size: 0.875rem;
        font-weight: 600;
        margin-bottom: 0.5rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .overview-card p {
        font-size: 1.125rem;
        font-weight: 600;
        color: #1e293b;
      }

      .summary-section {
        background: #f0fdf4;
        border: 1px solid #dcfce7;
        border-radius: 8px;
        padding: 1.5rem;
      }

      .summary-section h3 {
        color: #166534;
        margin-bottom: 1rem;
      }

      .metrics-dashboard {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1.5rem;
        margin-bottom: 2rem;
      }

      .metric-card {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        padding: 2rem;
        border-radius: 12px;
        text-align: center;
        box-shadow: 0 4px 6px rgba(16, 185, 129, 0.2);
      }

      .metric-icon {
        font-size: 2rem;
        margin-bottom: 1rem;
      }

      .metric-value {
        font-size: 2.5rem;
        font-weight: 700;
        margin-bottom: 0.5rem;
      }

      .metric-label {
        font-size: 0.875rem;
        opacity: 0.9;
      }

      .chart-container {
        background: white;
        padding: 2rem;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
        height: 400px;
      }

      .content-sections {
        display: grid;
        gap: 1.5rem;
      }

      .content-section {
        background: #f8fafc;
        border-radius: 8px;
        padding: 1.5rem;
        border: 1px solid #e2e8f0;
      }

      .content-section h3 {
        color: #1e293b;
        margin-bottom: 1rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .content-section p {
        color: #475569;
        line-height: 1.7;
      }

      .social-metrics {
        background: #fefce8;
        border: 1px solid #fde047;
        border-radius: 8px;
        padding: 1.5rem;
      }

      .social-content p {
        color: #713f12;
        line-height: 1.7;
      }

      @media (max-width: 768px) {
        .nav-container {
          padding: 0 1rem;
          flex-direction: column;
          gap: 1rem;
        }

        .nav-menu {
          gap: 1rem;
        }

        .main-content {
          padding: 1rem;
          margin-top: 120px;
        }

        .metrics-dashboard {
          grid-template-columns: 1fr;
        }

        .overview-grid {
          grid-template-columns: 1fr;
        }
      }
    `;
  }

  private generateInteractiveJS(reportData: ReportData): string {
    return `
      document.addEventListener('DOMContentLoaded', function() {
        // Navigation handling
        const navItems = document.querySelectorAll('.nav-item');
        const sections = document.querySelectorAll('.section');

        navItems.forEach(item => {
          item.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active class from all nav items and sections
            navItems.forEach(nav => nav.classList.remove('active'));
            sections.forEach(section => section.classList.remove('active'));
            
            // Add active class to clicked nav item
            item.classList.add('active');
            
            // Show corresponding section
            const targetId = item.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
              targetSection.classList.add('active');
            }
          });
        });

        // Initialize metrics chart
        const ctx = document.getElementById('metricsChart');
        if (ctx) {
          new Chart(ctx, {
            type: 'doughnut',
            data: {
              labels: ['Carbon Footprint (CO₂e)', 'Water Usage (L)', 'Waste Generated (t)'],
              datasets: [{
                data: [
                  ${reportData.metrics?.co2e || 0},
                  ${reportData.metrics?.water || 0} / 1000, // Convert to thousands
                  ${reportData.metrics?.waste || 0}
                ],
                backgroundColor: [
                  '#10b981',
                  '#3b82f6', 
                  '#f59e0b'
                ],
                borderWidth: 0
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'bottom',
                  labels: {
                    padding: 20
                  }
                },
                tooltip: {
                  callbacks: {
                    label: function(context) {
                      const label = context.label;
                      const value = context.parsed;
                      
                      if (label.includes('Water')) {
                        return label + ': ' + (value * 1000).toLocaleString() + ' L';
                      } else if (label.includes('Carbon')) {
                        return label + ': ' + value.toFixed(2) + ' tonnes';
                      } else {
                        return label + ': ' + value.toFixed(1) + ' tonnes';
                      }
                    }
                  }
                }
              }
            }
          });
        }

        // Smooth scrolling for mobile
        if (window.innerWidth <= 768) {
          sections.forEach(section => {
            section.style.scrollMarginTop = '120px';
          });
        }
      });
    `;
  }

  private generateHTMLHeader(reportData: ReportData): string {
    return `
      <div class="header">
        <h1>${reportData.title}</h1>
        <div class="company">${reportData.companyName || 'Sustainability Report'}</div>
        <div class="date">Generated on ${new Date().toLocaleDateString()}</div>
      </div>
    `;
  }

  private generateHTMLMetrics(reportData: ReportData): string {
    if (!reportData.metrics) return '';
    
    return `
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-value">${reportData.metrics.co2e.toFixed(2)}</div>
          <div class="metric-label">tonnes CO₂e</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${reportData.metrics.water.toLocaleString()}</div>
          <div class="metric-label">litres water</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${reportData.metrics.waste}</div>
          <div class="metric-label">tonnes waste</div>
        </div>
      </div>
    `;
  }

  private generateHTMLSections(reportData: ReportData): string {
    const sections = [
      { key: 'introduction', title: 'Introduction', icon: '📝' },
      { key: 'company_info_narrative', title: 'Company Information', icon: '🏢' },
      { key: 'key_metrics_narrative', title: 'Key Metrics', icon: '📊' },
      { key: 'carbon_footprint_narrative', title: 'Carbon Footprint Analysis', icon: '🌱' },
      { key: 'initiatives_narrative', title: 'Sustainability Initiatives', icon: '🎯' },
      { key: 'kpi_tracking_narrative', title: 'KPI Tracking', icon: '📈' },
      { key: 'social_impact', title: 'Social Impact', icon: '👥' },
      { key: 'summary', title: 'Summary & Future Goals', icon: '✅' }
    ];

    return sections
      .filter(section => reportData.content[section.key] && reportData.content[section.key].trim().length > 0)
      .map(section => `
        <div class="section">
          <div class="section-header">
            <div class="section-icon"></div>
            <h2>${section.icon} ${section.title}</h2>
          </div>
          <div class="content">${reportData.content[section.key]}</div>
        </div>
      `).join('');
  }

  private generateHTMLFooter(reportData: ReportData): string {
    return `
      <div class="footer">
        <p>Generated by Sustainability Platform • ${new Date().getFullYear()} • Report ID: ${reportData.id}</p>
      </div>
    `;
  }

  private generateInteractiveContentSections(reportData: ReportData): string {
    const sections = [
      { key: 'introduction', title: 'Introduction', icon: '📝' },
      { key: 'company_info_narrative', title: 'Company Information', icon: '🏢' },
      { key: 'carbon_footprint_narrative', title: 'Carbon Footprint Analysis', icon: '🌱' },
      { key: 'initiatives_narrative', title: 'Sustainability Initiatives', icon: '🎯' }
    ];

    return sections
      .filter(section => reportData.content[section.key] && reportData.content[section.key].trim().length > 0)
      .map(section => `
        <div class="content-section">
          <h3>${section.icon} ${section.title}</h3>
          <p>${reportData.content[section.key]}</p>
        </div>
      `).join('');
  }

  private generateBrandedHeader(reportData: ReportData, branding?: any): string {
    return `
      <div style="font-size: 10px; color: #64748b; text-align: center; width: 100%; padding: 5px;">
        ${branding?.companyName || reportData.companyName || 'Company'} Sustainability Report
      </div>
    `;
  }

  private generateBrandedFooter(reportData: ReportData, branding?: any): string {
    return `
      <div style="font-size: 8px; color: #94a3b8; text-align: center; width: 100%; padding: 5px;">
        Page <span class="pageNumber"></span> of <span class="totalPages"></span> • Generated ${new Date().toLocaleDateString()}
      </div>
    `;
  }

  private generateWebReportReadme(reportData: ReportData): string {
    return `
# Interactive Sustainability Report

## ${reportData.title}

This is an interactive web-based sustainability report that can be opened in any modern web browser.

### How to Use

1. Open \`index.html\` in your web browser
2. Navigate through different sections using the top navigation menu
3. View interactive charts and metrics
4. The report is fully responsive and works on mobile devices

### Files Included

- \`index.html\` - Main report page
- \`styles.css\` - Styling and layout
- \`script.js\` - Interactive functionality
- \`data.json\` - Report data in JSON format
- \`README.md\` - This file

### Features

- Interactive navigation
- Responsive design
- Chart visualizations
- Print-friendly layout
- Accessible markup

### System Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge)
- JavaScript enabled
- Internet connection (for Chart.js library)

Generated on: ${new Date().toLocaleDateString()}
Report Type: ${reportData.template?.name || 'Sustainability Report'}
`;
  }

  private splitTextForSlide(text: string, maxLength: number): string[] {
    if (text.length <= maxLength) {
      return [text];
    }
    
    const chunks: string[] = [];
    let currentChunk = '';
    const sentences = text.split('. ');
    
    for (const sentence of sentences) {
      if ((currentChunk + sentence).length <= maxLength) {
        currentChunk += (currentChunk ? '. ' : '') + sentence;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk + '.');
        }
        currentChunk = sentence;
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk + (currentChunk.endsWith('.') ? '' : '.'));
    }
    
    return chunks;
  }
}