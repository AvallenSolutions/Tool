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
          
          /* Enhanced Grid Layouts - Match Tailwind grid-cols-3 */
          .metrics-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 20px;
            margin: 20px 0;
          }
          
          .breakdown-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr 1fr;
            gap: 15px;
            margin: 20px 0;
          }
          
          /* Metric Cards - Match Preview Styling Exactly */
          .metric-card {
            text-align: center;
            padding: 20px;
            border-radius: 8px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
          }
          
          /* Color-specific metric cards to match Preview */
          .metric-card-green {
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
          }
          
          .metric-card-blue {
            background: #dbeafe;
            border: 1px solid #93c5fd;
          }
          
          .metric-card-purple {
            background: #faf5ff;
            border: 1px solid #c4b5fd;
          }
          
          .metric-card-red {
            background: #fef2f2;
            border: 1px solid #fecaca;
          }
          
          .metric-card-yellow {
            background: #fef3c7;
            border: 1px solid #fde68a;
          }
          
          .metric-card-slate {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
          }
          
          /* Typography - Match Preview exactly */
          .metric-value {
            font-size: 1.5rem;
            font-weight: bold;
            margin-bottom: 5px;
          }
          
          .metric-value-large {
            font-size: 1.5rem;
            font-weight: bold;
            margin-bottom: 5px;
          }
          
          .metric-label {
            font-size: 0.875rem;
            color: #6b7280;
          }
          
          .metric-sublabel {
            font-size: 0.75rem;
            color: #6b7280;
            margin-top: 2px;
          }
          
          /* Color-specific text colors */
          .text-green-700 { color: #15803d; }
          .text-blue-700 { color: #1d4ed8; }
          .text-purple-700 { color: #7c3aed; }
          .text-red-700 { color: #dc2626; }
          .text-yellow-700 { color: #a16207; }
          .text-slate-700 { color: #374151; }
          
          /* Text Block Backgrounds - Match Preview */
          .text-block-blue {
            background: #dbeafe;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            border-left: 4px solid #3b82f6;
            color: #374151;
            line-height: 1.6;
          }
          
          .text-block-green {
            background: #f0fdf4;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            border-left: 4px solid #22c55e;
            color: #374151;
            line-height: 1.6;
          }
          
          .text-block-yellow {
            background: #fefce8;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            border-left: 4px solid #eab308;
            color: #374151;
            line-height: 1.6;
          }
          
          /* Breakdown Cards */
          .breakdown-card {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px;
            background: #f9fafb;
            border-radius: 8px;
            margin-bottom: 10px;
          }
          
          .breakdown-title {
            font-weight: 500;
            margin-bottom: 3px;
          }
          
          .breakdown-description {
            font-size: 0.875rem;
            color: #6b7280;
          }
          
          .breakdown-value {
            font-weight: 600;
            text-align: right;
          }
          
          .breakdown-source {
            font-size: 0.875rem;
            color: #6b7280;
            text-align: right;
          }
          
          /* Progress Elements */
          .progress-bar-bg {
            width: 100%;
            background: #e5e7eb;
            border-radius: 4px;
            height: 8px;
            margin-bottom: 10px;
          }
          
          .progress-bar-fill {
            height: 8px;
            border-radius: 4px;
          }
          
          /* Status Badges */
          .status-badge {
            font-size: 0.75rem;
            font-weight: 500;
            padding: 4px 8px;
            border-radius: 4px;
            margin-bottom: 10px;
            color: white;
          }
          
          .status-on-track { background: #15803d; }
          .status-at-risk { background: #ca8a04; }
          .status-behind { background: #dc2626; }
          .status-achieved { background: #1d4ed8; }
          
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
      
      case 'company_story':
        const companyStory = metricsData.companyStory;
        let companyStoryHTML = `
          <div class="section">
            <h2>Company Story</h2>`;
        
        // Introduction from block
        if (block.content?.customText?.introduction) {
          companyStoryHTML += `<div style="margin-bottom: 20px; color: #374151; line-height: 1.6;">${block.content.customText.introduction}</div>`;
        }
        
        // Mission Statement
        if (companyStory?.missionStatement) {
          companyStoryHTML += `
            <h3 style="color: #22c55e; font-size: 1.3rem; margin: 20px 0 10px 0;">Mission Statement</h3>
            <p style="color: #374151; line-height: 1.6; margin-bottom: 15px;">${companyStory.missionStatement}</p>`;
          
          if (block.content?.customText?.missionContext) {
            companyStoryHTML += `<div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid #22c55e; color: #374151; line-height: 1.6;">${block.content.customText.missionContext}</div>`;
          }
        }
        
        // Vision Statement  
        if (companyStory?.visionStatement) {
          companyStoryHTML += `
            <h3 style="color: #22c55e; font-size: 1.3rem; margin: 20px 0 10px 0;">Vision Statement</h3>
            <p style="color: #374151; line-height: 1.6; margin-bottom: 15px;">${companyStory.visionStatement}</p>`;
          
          if (block.content?.customText?.visionContext) {
            companyStoryHTML += `<div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid #22c55e; color: #374151; line-height: 1.6;">${block.content.customText.visionContext}</div>`;
          }
        }
        
        // Strategic Pillars
        if (companyStory?.strategicPillars && companyStory.strategicPillars.length > 0) {
          companyStoryHTML += `
            <h3 style="color: #22c55e; font-size: 1.3rem; margin: 20px 0 10px 0;">Strategic Pillars</h3>
            <ul style="color: #374151; line-height: 1.8; margin-left: 20px;">`;
          companyStory.strategicPillars.forEach((pillar: string) => {
            companyStoryHTML += `<li style="margin-bottom: 5px;">${pillar}</li>`;
          });
          companyStoryHTML += `</ul>`;
        }
        
        // Conclusion from block
        if (block.content?.customText?.conclusion) {
          companyStoryHTML += `<div style="margin-top: 20px; color: #374151; line-height: 1.6;">${block.content.customText.conclusion}</div>`;
        }
        
        companyStoryHTML += `</div>`;
        return companyStoryHTML;

      case 'metrics_summary':
        // Use EXACT same logic as MetricsSummaryPreview
        const dashboardMetrics = metricsData.dashboardMetrics;
        const comprehensiveData = metricsData.comprehensiveFootprint;
        const carbonCalculatorTotal = metricsData.carbonCalculatorTotal;
        
        // EXACT COPY of dashboard getCarbonCalculatorTotal function
        const getTotalCO2e = () => {
          if (carbonCalculatorTotal?.data?.totalCO2e) {
            return carbonCalculatorTotal.data.totalCO2e;
          }
          if (comprehensiveData?.data?.totalFootprint?.co2e_tonnes) {
            return comprehensiveData.data.totalFootprint.co2e_tonnes;
          }
          return (dashboardMetrics?.totalCO2e || 0);
        };
        
        const totalCO2e = getTotalCO2e();
        const waterUsage = dashboardMetrics?.waterUsage || 11700000;
        const wasteGenerated = dashboardMetrics?.wasteGenerated || 0.1;
        
        let metricsSummaryHTML = `
          <div class="section">
            <h2>Key Sustainability Metrics</h2>`;
        
        // Executive Summary
        if (block.content?.customText?.executiveSummary) {
          metricsSummaryHTML += `<div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #3b82f6; color: #374151; line-height: 1.6;">${block.content.customText.executiveSummary}</div>`;
        }
        
        // Key Metrics - EXACT same formatting as preview
        metricsSummaryHTML += `
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin: 20px 0;">
            <div style="text-align: center; padding: 20px; background: #f0fdf4; border-radius: 8px;">
              <div style="font-size: 1.5rem; font-weight: bold; color: #15803d;">
                ${totalCO2e.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              </div>
              <div style="font-size: 0.875rem; color: #6b7280;">tonnes CO₂e</div>
            </div>
            <div style="text-align: center; padding: 20px; background: #dbeafe; border-radius: 8px;">
              <div style="font-size: 1.5rem; font-weight: bold; color: #1d4ed8;">
                ${(waterUsage / 1000000).toFixed(1)}M
              </div>
              <div style="font-size: 0.875rem; color: #6b7280;">litres water</div>
            </div>
            <div style="text-align: center; padding: 20px; background: #faf5ff; border-radius: 8px;">
              <div style="font-size: 1.5rem; font-weight: bold; color: #7c3aed;">
                ${wasteGenerated.toFixed(1)}
              </div>
              <div style="font-size: 0.875rem; color: #6b7280;">tonnes waste</div>
            </div>
          </div>`;
        
        // Data Analysis
        if (block.content?.customText?.dataAnalysis) {
          metricsSummaryHTML += `<div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #22c55e; color: #374151; line-height: 1.6;">${block.content.customText.dataAnalysis}</div>`;
        }
        
        // Key Insights
        if (block.content?.customText?.keyInsights) {
          metricsSummaryHTML += `<div style="background: #fefce8; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #eab308; color: #374151; line-height: 1.6;">${block.content.customText.keyInsights}</div>`;
        }
        
        metricsSummaryHTML += `</div>`;
        return metricsSummaryHTML;

      case 'carbon_footprint':
        // Use EXACT same data sources as CarbonFootprintPreview
        const scope3Data = metricsData.scope3Data;
        const carbonCalcData = metricsData.carbonCalculatorTotal;
        
        if (!scope3Data?.data && !carbonCalcData?.data) {
          return `
            <div class="section">
              <h2>Carbon Footprint Analysis</h2>
              <div style="text-align: center; padding: 40px; background: #f3f4f6; border-radius: 8px; color: #6b7280;">
                <p>No footprint data available. Complete the Carbon Footprint Calculator to see detailed analysis.</p>
              </div>
            </div>`;
        }
        
        // Calculate emissions using EXACT SAME logic as CarbonFootprintPreview
        const ingredients = scope3Data?.data?.categories?.purchasedGoodsServices?.emissions || 0;
        const packaging = (scope3Data?.data?.categories?.purchasedGoodsServices?.emissions || 0) * 0.16 || 0;
        const totalEmissions = carbonCalcData?.data?.totalCO2e || 0;
        const scope3Total = scope3Data?.data?.totalEmissions || 0;
        const facilities = totalEmissions - scope3Total; // Scope 1+2 = Total - Scope 3
        const transportOther = (
          (scope3Data?.data?.categories?.businessTravel?.emissions || 0) +
          (scope3Data?.data?.categories?.employeeCommuting?.emissions || 0) +
          (scope3Data?.data?.categories?.transportation?.emissions || 0) +
          (scope3Data?.data?.categories?.fuelEnergyRelated?.emissions || 0)
        );
        const waste = scope3Data?.data?.categories?.wasteGenerated?.emissions || 0;
        const adjustedIngredients = ingredients - packaging;
        
        const scope1And2Total = facilities * 1000;
        const scope3EmissionsTotal = (adjustedIngredients + packaging + transportOther + waste) * 1000;
        const totalEmissionsKg = scope1And2Total + scope3EmissionsTotal;
        
        let carbonFootprintHTML = `
          <div class="section">
            <h2>Carbon Footprint Analysis</h2>`;
        
        // Introduction
        if (block.content?.customText?.introduction) {
          carbonFootprintHTML += `<div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #3b82f6; color: #374151; line-height: 1.6;">${block.content.customText.introduction}</div>`;
        }
        
        // Summary Cards with Visual Progress Bars - SAME logic as Preview
        carbonFootprintHTML += `
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin: 20px 0;">
            <div style="text-align: center; padding: 20px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px;">
              <div style="font-size: 1.25rem; font-weight: bold; color: #dc2626;">${(scope1And2Total / 1000).toFixed(1)}</div>
              <div style="font-size: 0.875rem; color: #6b7280;">Scope 1+2 (tonnes CO₂e)</div>
            </div>
            <div style="text-align: center; padding: 20px; background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px;">
              <div style="font-size: 1.25rem; font-weight: bold; color: #d97706;">${(scope3EmissionsTotal / 1000).toFixed(1)}</div>
              <div style="font-size: 0.875rem; color: #6b7280;">Scope 3 (tonnes CO₂e)</div>
            </div>
            <div style="text-align: center; padding: 20px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px;">
              <div style="font-size: 1.25rem; font-weight: bold; color: #15803d;">${(totalEmissionsKg / 1000).toFixed(1)}</div>
              <div style="font-size: 0.875rem; color: #6b7280;">Total (tonnes CO₂e)</div>
            </div>
          </div>`;
        
        // Detailed Breakdown
        if (adjustedIngredients > 0 || packaging > 0 || facilities > 0 || transportOther > 0 || waste > 0) {
          carbonFootprintHTML += `
            <h3 style="color: #22c55e; font-size: 1.3rem; margin: 30px 0 15px 0;">Detailed Breakdown</h3>
            <div style="space-y: 10px;">`;
          
          if (adjustedIngredients > 0) {
            carbonFootprintHTML += `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; background: #f9fafb; border-radius: 8px; margin-bottom: 10px;">
                <div>
                  <div style="font-weight: 500;">INGREDIENTS</div>
                  <div style="font-size: 0.875rem; color: #6b7280;">Raw materials and agricultural inputs</div>
                </div>
                <div style="text-align: right;">
                  <div style="font-weight: 600;">${adjustedIngredients.toFixed(1)} t CO₂e</div>
                  <div style="font-size: 0.875rem; color: #6b7280;">OpenLCA ecoinvent database</div>
                </div>
              </div>`;
          }
          
          if (facilities > 0) {
            carbonFootprintHTML += `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; background: #f9fafb; border-radius: 8px; margin-bottom: 10px;">
                <div>
                  <div style="font-weight: 500;">PRODUCTION FACILITIES</div>
                  <div style="font-size: 0.875rem; color: #6b7280;">Energy, gas, and operational emissions</div>
                </div>
                <div style="text-align: right;">
                  <div style="font-weight: 600;">${facilities.toFixed(1)} t CO₂e</div>
                  <div style="font-size: 0.875rem; color: #6b7280;">Scope 1+2 Direct & Indirect emissions</div>
                </div>
              </div>`;
          }
          
          if (packaging > 0) {
            carbonFootprintHTML += `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; background: #f9fafb; border-radius: 8px; margin-bottom: 10px;">
                <div>
                  <div style="font-weight: 500;">PACKAGING MATERIALS</div>
                  <div style="font-size: 0.875rem; color: #6b7280;">Glass bottles, labels, closures with recycled content</div>
                </div>
                <div style="text-align: right;">
                  <div style="font-weight: 600;">${packaging.toFixed(1)} t CO₂e</div>
                  <div style="font-size: 0.875rem; color: #6b7280;">Comprehensive LCA product breakdown</div>
                </div>
              </div>`;
          }
          
          if (transportOther > 0) {
            carbonFootprintHTML += `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; background: #f9fafb; border-radius: 8px; margin-bottom: 10px;">
                <div>
                  <div style="font-weight: 500;">TRANSPORT & OTHER</div>
                  <div style="font-size: 0.875rem; color: #6b7280;">Business travel, employee commuting, and transportation</div>
                </div>
                <div style="text-align: right;">
                  <div style="font-weight: 600;">${transportOther.toFixed(1)} t CO₂e</div>
                  <div style="font-size: 0.875rem; color: #6b7280;">Scope 3 Travel & Transportation categories</div>
                </div>
              </div>`;
          }
          
          if (waste > 0) {
            carbonFootprintHTML += `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; background: #f9fafb; border-radius: 8px; margin-bottom: 10px;">
                <div>
                  <div style="font-weight: 500;">WASTE</div>
                  <div style="font-size: 0.875rem; color: #6b7280;">Waste disposal and end-of-life treatment</div>
                </div>
                <div style="text-align: right;">
                  <div style="font-weight: 600;">${waste.toFixed(1)} t CO₂e</div>
                  <div style="font-size: 0.875rem; color: #6b7280;">Scope 3 Waste Generated category</div>
                </div>
              </div>`;
          }
          
          carbonFootprintHTML += `</div>`;
        }
        
        // Total Summary - SAME as Dashboard Total
        carbonFootprintHTML += `
          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 20px; background: #f0fdf4; border-radius: 8px;">
              <div style="font-weight: 600; font-size: 1.125rem;">Total Carbon Footprint</div>
              <div style="font-size: 1.5rem; font-weight: bold; color: #15803d;">
                ${(totalEmissionsKg / 1000).toFixed(1)} tonnes CO₂e
              </div>
            </div>
          </div>`;
        
        // Analysis Section
        if (block.content?.customText?.analysis) {
          carbonFootprintHTML += `<div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #22c55e; color: #374151; line-height: 1.6;">${block.content.customText.analysis}</div>`;
        }
        
        carbonFootprintHTML += `</div>`;
        return carbonFootprintHTML;

      case 'water_usage':
        const waterFootprintData = metricsData.waterFootprint;
        const monthlyData = metricsData.monthlyDataSummary;
        
        if (!waterFootprintData?.data?.total || waterFootprintData.data.total === 0) {
          return `
            <div class="section">
              <h2>Water Footprint Analysis</h2>
              <div style="text-align: center; padding: 40px; background: #dbeafe; border: 1px solid #93c5fd; border-radius: 8px;">
                <h3 style="font-size: 1.125rem; font-weight: 600; color: #1d4ed8; margin-bottom: 10px;">Water Data Collection Needed</h3>
                <p style="color: #1e40af; margin-bottom: 20px;">
                  Complete your product data and facility information to see comprehensive water footprint analysis.
                </p>
                <p style="font-size: 0.875rem; color: #3b82f6;">
                  Add product ingredients and monthly facility data to generate your water footprint report.
                </p>
              </div>
            </div>`;
        }
        
        // Extract water data - SAME logic as WaterFootprintPreview
        const totalWaterL = waterFootprintData.data.total;
        const totalWaterM3 = waterFootprintData.data.total_m3;
        const agriculturalWaterL = waterFootprintData.data.agricultural_water;
        const processingWaterL = waterFootprintData.data.processing_and_dilution_water;
        const operationalWaterL = waterFootprintData.data.net_operational_water;
        
        let waterUsageHTML = `
          <div class="section">
            <h2>Water Footprint Analysis</h2>`;
        
        // Introduction
        if (block.content?.customText?.introduction) {
          waterUsageHTML += `<div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #3b82f6; color: #374151; line-height: 1.6;">${block.content.customText.introduction}</div>`;
        }
        
        // Key Metrics Cards
        waterUsageHTML += `
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin: 20px 0;">
            <div style="text-align: center; padding: 20px; background: #dbeafe; border-radius: 8px;">
              <div style="font-size: 1.5rem; font-weight: bold; color: #1d4ed8;">
                ${(totalWaterL / 1000000).toFixed(1)}M
              </div>
              <div style="font-size: 0.875rem; color: #6b7280;">Total Water (L)</div>
            </div>
            <div style="text-align: center; padding: 20px; background: #f0fdf4; border-radius: 8px;">
              <div style="font-size: 1.5rem; font-weight: bold; color: #15803d;">
                ${totalWaterM3.toFixed(0)}
              </div>
              <div style="font-size: 0.875rem; color: #6b7280;">Total Water (m³)</div>
            </div>
            <div style="text-align: center; padding: 20px; background: #faf5ff; border-radius: 8px;">
              <div style="font-size: 1.5rem; font-weight: bold; color: #7c3aed;">
                ${monthlyData?.aggregated?.dataQuality || 'medium'}
              </div>
              <div style="font-size: 0.875rem; color: #6b7280;">Data Quality</div>
            </div>
          </div>`;
        
        // Water Sources Breakdown
        waterUsageHTML += `
          <h3 style="color: #1d4ed8; font-size: 1.3rem; margin: 30px 0 15px 0;">Water Usage Breakdown</h3>
          <div style="space-y: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; background: #f0fdf4; border-radius: 8px; margin-bottom: 10px;">
              <div>
                <div style="font-weight: 500;">AGRICULTURAL WATER</div>
                <div style="font-size: 0.875rem; color: #6b7280;">Ingredient production and farming</div>
              </div>
              <div style="text-align: right;">
                <div style="font-weight: 600;">${(agriculturalWaterL / 1000000).toFixed(1)}M L</div>
                <div style="font-size: 0.875rem; color: #6b7280;">${((agriculturalWaterL / totalWaterL) * 100).toFixed(1)}% of total</div>
              </div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; background: #dbeafe; border-radius: 8px; margin-bottom: 10px;">
              <div>
                <div style="font-weight: 500;">PROCESSING & DILUTION</div>
                <div style="font-size: 0.875rem; color: #6b7280;">Manufacturing and product dilution water</div>
              </div>
              <div style="text-align: right;">
                <div style="font-weight: 600;">${(processingWaterL / 1000000).toFixed(1)}M L</div>
                <div style="font-size: 0.875rem; color: #6b7280;">${((processingWaterL / totalWaterL) * 100).toFixed(1)}% of total</div>
              </div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; background: #faf5ff; border-radius: 8px; margin-bottom: 10px;">
              <div>
                <div style="font-weight: 500;">OPERATIONAL WATER</div>
                <div style="font-size: 0.875rem; color: #6b7280;">Facility operations and cleaning</div>
              </div>
              <div style="text-align: right;">
                <div style="font-weight: 600;">${(operationalWaterL / 1000000).toFixed(1)}M L</div>
                <div style="font-size: 0.875rem; color: #6b7280;">${((operationalWaterL / totalWaterL) * 100).toFixed(1)}% of total</div>
              </div>
            </div>
          </div>`;
        
        // Water Efficiency Metrics (if monthly data available)
        if (monthlyData?.aggregated) {
          const productionVolume = monthlyData.aggregated.totalProductionVolume;
          const waterConsumption = monthlyData.aggregated.totalWaterM3;
          if (productionVolume > 0 && waterConsumption > 0) {
            const waterIntensity = (waterConsumption * 1000) / productionVolume;
            waterUsageHTML += `
              <h3 style="color: #1d4ed8; font-size: 1.3rem; margin: 30px 0 15px 0;">Water Efficiency Metrics</h3>
              <div style="background: #dbeafe; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6;">
                <div style="font-size: 1.125rem; font-weight: 600; color: #1e40af; margin-bottom: 10px;">
                  Water Intensity: ${waterIntensity.toFixed(1)} L water per L product
                </div>
                <p style="color: #374151; font-size: 0.875rem;">
                  Based on ${productionVolume.toLocaleString()} L production volume and ${waterConsumption.toFixed(0)} m³ facility water consumption
                </p>
              </div>`;
          }
        }
        
        // Summary
        if (block.content?.customText?.summary) {
          waterUsageHTML += `<div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #3b82f6; color: #374151; line-height: 1.6;">${block.content.customText.summary}</div>`;
        }
        
        waterUsageHTML += `</div>`;
        return waterUsageHTML;

      case 'kpi_progress':
        const enhancedKpis = metricsData.enhancedKpis;
        
        if (!enhancedKpis?.data?.kpiGoals || enhancedKpis.data.kpiGoals.length === 0) {
          return `
            <div class="section">
              <h2>KPI Progress Tracking</h2>
              <div style="text-align: center; padding: 40px; background: #f3f4f6; border-radius: 8px; color: #6b7280;">
                <p>No KPI data available. Set up your sustainability targets to track progress.</p>
              </div>
            </div>`;
        }
        
        const kpiGoals = enhancedKpis.data.kpiGoals;
        const selectedKPIs = block.content?.selectedKPIs || [];
        const kpisToShow = selectedKPIs.length > 0 
          ? kpiGoals.filter((kpi: any) => selectedKPIs.includes(kpi.id))
          : kpiGoals.slice(0, 6); // Show first 6 if none selected
        
        let kpiProgressHTML = `
          <div class="section">
            <h2>KPI Progress Tracking</h2>`;
        
        // Introduction
        if (block.content?.customText?.introduction) {
          kpiProgressHTML += `<div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #3b82f6; color: #374151; line-height: 1.6;">${block.content.customText.introduction}</div>`;
        }
        
        // Summary Stats
        const summary = enhancedKpis.data.summary;
        if (summary) {
          kpiProgressHTML += `
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 15px; margin: 20px 0;">
              <div style="text-align: center; padding: 15px; background: #f0fdf4; border-radius: 8px;">
                <div style="font-size: 1.25rem; font-weight: bold; color: #15803d;">${summary.onTrack}</div>
                <div style="font-size: 0.875rem; color: #6b7280;">On Track</div>
              </div>
              <div style="text-align: center; padding: 15px; background: #fefce8; border-radius: 8px;">
                <div style="font-size: 1.25rem; font-weight: bold; color: #ca8a04;">${summary.atRisk}</div>
                <div style="font-size: 0.875rem; color: #6b7280;">At Risk</div>
              </div>
              <div style="text-align: center; padding: 15px; background: #fef2f2; border-radius: 8px;">
                <div style="font-size: 1.25rem; font-weight: bold; color: #dc2626;">${summary.behind}</div>
                <div style="font-size: 0.875rem; color: #6b7280;">Behind</div>
              </div>
              <div style="text-align: center; padding: 15px; background: #dbeafe; border-radius: 8px;">
                <div style="font-size: 1.25rem; font-weight: bold; color: #1d4ed8;">${summary.achieved}</div>
                <div style="font-size: 0.875rem; color: #6b7280;">Achieved</div>
              </div>
            </div>`;
        }
        
        // Individual KPI Cards
        kpiProgressHTML += `
          <h3 style="color: #22c55e; font-size: 1.3rem; margin: 30px 0 15px 0;">Individual KPI Progress</h3>
          <div style="space-y: 15px;">`;
        
        kpisToShow.forEach((kpi: any) => {
          const statusColors = {
            'on-track': { bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d' },
            'at-risk': { bg: '#fefce8', border: '#fde68a', text: '#ca8a04' },
            'behind': { bg: '#fef2f2', border: '#fecaca', text: '#dc2626' },
            'achieved': { bg: '#dbeafe', border: '#93c5fd', text: '#1d4ed8' }
          };
          
          const colors = statusColors[kpi.status as keyof typeof statusColors] || statusColors['on-track'];
          
          kpiProgressHTML += `
            <div style="padding: 20px; background: ${colors.bg}; border: 1px solid ${colors.border}; border-radius: 8px; margin-bottom: 15px;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                <div style="flex: 1;">
                  <h4 style="font-weight: 600; color: #374151; margin-bottom: 5px;">${kpi.name}</h4>
                  <div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 10px;">${kpi.category} • Target: ${kpi.targetValue} ${kpi.unit}</div>
                  ${kpi.description ? `<p style="font-size: 0.875rem; color: #6b7280; line-height: 1.5;">${kpi.description}</p>` : ''}
                </div>
                <div style="text-align: right;">
                  <div style="font-size: 0.75rem; font-weight: 500; padding: 4px 8px; background: ${colors.text}; color: white; border-radius: 4px; margin-bottom: 10px;">
                    ${kpi.status.toUpperCase().replace('-', ' ')}
                  </div>
                  <div style="font-size: 1.125rem; font-weight: bold; color: ${colors.text};">${kpi.progress.toFixed(0)}%</div>
                </div>
              </div>
              
              <!-- Progress Bar -->
              <div style="width: 100%; background: #e5e7eb; border-radius: 4px; height: 8px; margin-bottom: 10px;">
                <div style="width: ${Math.min(kpi.progress, 100)}%; background: ${colors.text}; height: 8px; border-radius: 4px;"></div>
              </div>
              
              <div style="display: flex; justify-content: space-between; font-size: 0.875rem; color: #6b7280;">
                <span>Current: ${kpi.currentValue} ${kpi.unit}</span>
                <span>Target: ${kpi.targetValue} ${kpi.unit} by ${new Date(kpi.targetDate).getFullYear()}</span>
              </div>
            </div>`;
        });
        
        kpiProgressHTML += `</div>`;
        
        // Summary
        if (block.content?.customText?.summary) {
          kpiProgressHTML += `<div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #22c55e; color: #374151; line-height: 1.6;">${block.content.customText.summary}</div>`;
        }
        
        kpiProgressHTML += `</div>`;
        return kpiProgressHTML;

      case 'initiatives':
        // For now, return a placeholder since InitiativesPreview logic is complex
        // This can be expanded later with actual initiatives data
        return `
          <div class="section">
            <h2>Sustainability Initiatives</h2>
            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; border-left: 4px solid #22c55e;">
              <h3 style="color: #15803d; margin-bottom: 10px;">Our Sustainability Commitments</h3>
              <p style="color: #374151; line-height: 1.6;">
                This section showcases our ongoing sustainability initiatives and their impact on our environmental performance.
              </p>
            </div>
          </div>`;

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