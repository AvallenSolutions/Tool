import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { PDFService } from '../pdfService';
import { createRequire } from 'module';

// Use createRequire for CommonJS modules in ES modules
const require = createRequire(import.meta.url);
const officegen = require('officegen');

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

  constructor() {
    this.pdfService = new PDFService();
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
    const htmlContent = this.generateStandardHTML(reportData);
    return this.pdfService.generateFromHTML(htmlContent, {
      title: reportData.title,
      format: 'A4',
      margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' }
    });
  }

  private async exportBrandedPDF(reportData: ReportData, options: ExportOptions): Promise<Buffer> {
    const htmlContent = this.generateBrandedHTML(reportData, options.branding);
    return this.pdfService.generateFromHTML(htmlContent, {
      title: reportData.title,
      format: 'A4',
      margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' }
    });
  }

  private async exportPowerPoint(reportData: ReportData, options: ExportOptions): Promise<Buffer> {
    console.log('🔧 Starting PowerPoint generation with officegen...');
    
    return new Promise((resolve, reject) => {
      try {
        const pptx = officegen('pptx');
        
        console.log('📝 Setting PowerPoint properties...');
        // Set presentation properties (only use supported methods)
        pptx.setDocTitle(reportData.title);

        console.log('📊 Creating title slide...');
        // Title slide
        const titleSlide = pptx.makeNewSlide();
        titleSlide.name = 'Title Slide';
        
        titleSlide.addText(reportData.title, {
          x: 'c', y: 20, cx: '90%', cy: '20%',
          font_size: 44, bold: true, color: '1e293b',
          align: 'center'
        });

        titleSlide.addText(reportData.companyName || 'Company Name', {
          x: 'c', y: '40%', cx: '90%', cy: '15%',
          font_size: 24, color: '64748b',
          align: 'center'
        });

        titleSlide.addText(new Date().getFullYear().toString(), {
          x: 'c', y: '60%', cx: '90%', cy: '10%',
          font_size: 18, color: '94a3b8',
          align: 'center'
        });

        // Executive Summary slide
        if (reportData.content.summary) {
          const summarySlide = pptx.makeNewSlide();
          summarySlide.name = 'Executive Summary';
          
          summarySlide.addText('Executive Summary', {
            x: '5%', y: '5%', cx: '90%', cy: '15%',
            font_size: 32, bold: true, color: '1e293b'
          });

          summarySlide.addText(reportData.content.summary.substring(0, 500) + (reportData.content.summary.length > 500 ? '...' : ''), {
            x: '5%', y: '20%', cx: '90%', cy: '70%',
            font_size: 16, color: '475569'
          });
        }

        // Key Metrics slide
        if (reportData.metrics) {
          const metricsSlide = pptx.makeNewSlide();
          metricsSlide.name = 'Key Metrics';
          
          metricsSlide.addText('Key Environmental Metrics', {
            x: '5%', y: '5%', cx: '90%', cy: '15%',
            font_size: 32, bold: true, color: '1e293b'
          });

          // CO2 emissions
          metricsSlide.addText('🌱 Carbon Footprint', {
            x: '5%', y: '25%', cx: '40%', cy: '10%',
            font_size: 18, bold: true, color: '10b981'
          });
          metricsSlide.addText(`${reportData.metrics.co2e.toFixed(2)} tonnes CO₂e`, {
            x: '5%', y: '35%', cx: '40%', cy: '10%',
            font_size: 24, bold: true, color: '1e293b'
          });

          // Water usage
          metricsSlide.addText('💧 Water Usage', {
            x: '55%', y: '25%', cx: '40%', cy: '10%',
            font_size: 18, bold: true, color: '3b82f6'
          });
          metricsSlide.addText(`${reportData.metrics.water.toLocaleString()} litres`, {
            x: '55%', y: '35%', cx: '40%', cy: '10%',
            font_size: 24, bold: true, color: '1e293b'
          });

          // Waste generated
          metricsSlide.addText('♻️ Waste Generated', {
            x: '5%', y: '55%', cx: '40%', cy: '10%',
            font_size: 18, bold: true, color: 'f59e0b'
          });
          metricsSlide.addText(`${reportData.metrics.waste} tonnes`, {
            x: '5%', y: '65%', cx: '40%', cy: '10%',
            font_size: 24, bold: true, color: '1e293b'
          });
        }

        // Content slides for each section
        const sections = [
          { key: 'introduction', title: 'Introduction' },
          { key: 'company_info_narrative', title: 'Company Information' },
          { key: 'carbon_footprint_narrative', title: 'Carbon Footprint Analysis' },
          { key: 'initiatives_narrative', title: 'Sustainability Initiatives' },
          { key: 'social_impact', title: 'Social Impact' }
        ];

        sections.forEach(section => {
          const content = reportData.content[section.key];
          if (content && content.trim().length > 0) {
            const slide = pptx.makeNewSlide();
            slide.name = section.title;
            
            slide.addText(section.title, {
              x: '5%', y: '5%', cx: '90%', cy: '15%',
              font_size: 32, bold: true, color: '1e293b'
            });

            // Split content into chunks that fit on slide
            const contentChunks = this.splitTextForSlide(content, 800);
            contentChunks.forEach((chunk, index) => {
              slide.addText(chunk, {
                x: '5%', y: '20%', cx: '90%', cy: '70%',
                font_size: 14, color: '475569'
              });
            });
          }
        });

        // Generate the PowerPoint file
        console.log('🔧 Generating PPTX buffer...');
        const chunks: Buffer[] = [];
        
        pptx.on('data', (chunk: Buffer) => {
          console.log('📦 Received chunk:', chunk.length, 'bytes');
          chunks.push(chunk);
        });
        
        pptx.on('end', () => {
          const finalBuffer = Buffer.concat(chunks);
          console.log('✅ PowerPoint generation completed:', finalBuffer.length, 'bytes');
          resolve(finalBuffer);
        });
        
        pptx.on('error', (error: any) => {
          console.error('❌ PowerPoint generation error:', error);
          reject(error);
        });
        
        console.log('🚀 Starting PPTX generation...');
        pptx.generate();

      } catch (error) {
        console.error('❌ PowerPoint export error:', error);
        reject(error);
      }
    });
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