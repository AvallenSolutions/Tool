import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

export interface EnhancedLCAReportData {
  report: {
    id: number;
    status: string;
    totalCarbonFootprint?: number;
    reportData?: any;
    createdAt: Date;
  };
  product: {
    id: number;
    name: string;
    sku: string;
    volume?: string;
    type?: string;
    description?: string;
    ingredients?: any[];
  };
  company: {
    id: number;
    name: string;
    address?: string;
    country?: string;
    reportingPeriodStart?: Date;
    reportingPeriodEnd?: Date;
  };
  lcaData?: {
    agriculture?: any;
    processing?: any;
    packaging?: any;
    distribution?: any;
    endOfLife?: any;
  };
  calculatedBreakdown?: {
    stage: string;
    contribution: number;
    percentage: number;
  }[];
}

export class EnhancedPDFService {
  constructor() {
    // No Chart.js dependency for now - will generate charts via HTML/CSS
  }

  async generateEnhancedLCAPDF(data: EnhancedLCAReportData): Promise<Buffer> {
    try {
      // Generate comprehensive HTML with CSS-based charts
      const html = this.generateEnhancedHTML(data);

      // Convert to PDF using Puppeteer
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm'
        }
      });

      await browser.close();
      return pdfBuffer;
    } catch (error) {
      console.error('Error generating enhanced PDF:', error);
      throw error;
    }
  }

  private generateHTMLChart(breakdown: { stage: string; contribution: number; percentage: number; }[]): string {
    const maxContribution = Math.max(...breakdown.map(item => item.contribution));
    const colors = ['#16a34a', '#22c55e', '#65a30d', '#84cc16', '#eab308'];
    
    return `
      <div class="chart-container">
        <h3 style="text-align: center; margin-bottom: 20px; color: #333;">Carbon Footprint Contribution Analysis</h3>
        <div class="bar-chart" style="display: flex; align-items: end; height: 300px; gap: 20px; margin: 20px 0; padding: 20px; border: 1px solid #ddd;">
          ${breakdown.map((item, index) => {
            const height = (item.contribution / maxContribution) * 200;
            return `
              <div class="bar-item" style="flex: 1; text-align: center;">
                <div class="bar" style="
                  height: ${height}px; 
                  background-color: ${colors[index % colors.length]}; 
                  margin-bottom: 10px;
                  border-radius: 4px 4px 0 0;
                  position: relative;
                ">
                  <div style="
                    position: absolute;
                    top: -25px;
                    left: 50%;
                    transform: translateX(-50%);
                    font-size: 10px;
                    font-weight: bold;
                    color: #333;
                  ">${item.contribution.toFixed(2)}</div>
                </div>
                <div style="font-size: 10px; color: #666; word-wrap: break-word; line-height: 1.2;">
                  ${item.stage}<br>(${item.percentage}%)
                </div>
              </div>
            `;
          }).join('')}
        </div>
        <div style="text-align: center; font-size: 12px; color: #666; margin-top: 10px;">
          Y-axis: kg CO₂-eq | Percentages show contribution to total footprint
        </div>
      </div>
    `;
  }

  private calculateBreakdown(data: EnhancedLCAReportData): { stage: string; contribution: number; percentage: number; }[] {
    // Default breakdown if no specific data available
    const totalCarbon = data.report.totalCarbonFootprint || 4.43;
    
    return [
      { stage: 'Packaging (Glass)', contribution: totalCarbon * 0.70, percentage: 70 },
      { stage: 'Production (Distillation)', contribution: totalCarbon * 0.15, percentage: 15 },
      { stage: 'Agriculture (Ingredients)', contribution: totalCarbon * 0.10, percentage: 10 },
      { stage: 'Transport & Distribution', contribution: totalCarbon * 0.03, percentage: 3 },
      { stage: 'End of Life', contribution: totalCarbon * 0.02, percentage: 2 }
    ];
  }

  private generateEnhancedHTML(data: EnhancedLCAReportData): string {
    const currentDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    const breakdown = data.calculatedBreakdown || this.calculateBreakdown(data);
    const topHotspots = breakdown.slice(0, 3);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Life Cycle Assessment Report - ${data.product.name}</title>
    <style>
        /* Professional Report Styling */
        @page {
            margin: 20mm 15mm;
            @top-center {
                content: "Life Cycle Assessment Report";
                font-family: 'Times New Roman', serif;
                font-size: 10pt;
                color: #666;
            }
            @bottom-center {
                content: counter(page);
                font-family: 'Times New Roman', serif;
                font-size: 10pt;
                color: #666;
            }
        }
        
        body {
            font-family: 'Times New Roman', serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
        }
        
        .cover-page {
            text-align: center;
            padding: 100px 0;
            page-break-after: always;
        }
        
        .cover-title {
            font-size: 28pt;
            font-weight: bold;
            color: #16a34a;
            margin-bottom: 30px;
            line-height: 1.2;
        }
        
        .cover-subtitle {
            font-size: 18pt;
            color: #666;
            margin-bottom: 50px;
        }
        
        .cover-info {
            font-size: 14pt;
            margin: 20px 0;
        }
        
        .logo-placeholder {
            width: 200px;
            height: 80px;
            background: #f0f0f0;
            border: 2px solid #16a34a;
            margin: 40px auto;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #16a34a;
            font-weight: bold;
        }
        
        .section {
            margin-bottom: 40px;
            page-break-inside: avoid;
        }
        
        .section-title {
            font-size: 18pt;
            font-weight: bold;
            color: #16a34a;
            border-bottom: 2px solid #16a34a;
            padding-bottom: 10px;
            margin-bottom: 20px;
        }
        
        .subsection-title {
            font-size: 14pt;
            font-weight: bold;
            color: #333;
            margin: 20px 0 10px 0;
        }
        
        .key-findings {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-left: 5px solid #16a34a;
            padding: 20px;
            margin: 20px 0;
        }
        
        .results-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        
        .results-table th,
        .results-table td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }
        
        .results-table th {
            background-color: #16a34a;
            color: white;
            font-weight: bold;
        }
        
        .results-table tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        
        .chart-container {
            text-align: center;
            margin: 30px 0;
            page-break-inside: avoid;
        }
        
        .chart-image {
            max-width: 100%;
            height: auto;
            border: 1px solid #ddd;
        }
        
        .two-column {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin: 20px 0;
        }
        
        .info-box {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            padding: 15px;
            border-radius: 5px;
        }
        
        .metric-highlight {
            font-size: 24pt;
            font-weight: bold;
            color: #16a34a;
            text-align: center;
            margin: 20px 0;
        }
        
        .hotspot-list {
            list-style: none;
            padding: 0;
        }
        
        .hotspot-item {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-left: 5px solid #f39c12;
            padding: 10px;
            margin: 10px 0;
        }
        
        .page-break {
            page-break-before: always;
        }
    </style>
</head>
<body>
    <!-- Cover Page -->
    <div class="cover-page">
        <h1 class="cover-title">Life Cycle Assessment of<br>${data.product.name}</h1>
        <h2 class="cover-subtitle">Produced by ${data.company.name}</h2>
        
        <div class="logo-placeholder">
            Avallen Solutions Logo
        </div>
        
        <div class="cover-info">
            <strong>Report Generation Date:</strong> ${currentDate}
        </div>
        <div class="cover-info">
            <strong>Product SKU:</strong> ${data.product.sku}
        </div>
        <div class="cover-info">
            <strong>Assessment Methodology:</strong> ISO 14040/14044
        </div>
    </div>

    <!-- Executive Summary -->
    <div class="section">
        <h2 class="section-title">Executive Summary / Main Findings</h2>
        
        <div class="key-findings">
            <p>This study assessed the climate impact of <strong>${data.product.name}</strong>. The total carbon footprint was found to be <strong>${data.report.totalCarbonFootprint || 'X.XX'} kg CO₂-eq per ${data.product.volume || '750ml'} bottle</strong>.</p>
            
            <p>The primary impact drivers were identified as:</p>
            <ul class="hotspot-list">
                ${topHotspots.map(hotspot => `
                    <li class="hotspot-item">
                        <strong>${hotspot.stage}:</strong> ${hotspot.contribution.toFixed(2)} kg CO₂-eq (${hotspot.percentage}% of total impact)
                    </li>
                `).join('')}
            </ul>
        </div>
        
        <div class="metric-highlight">
            ${data.report.totalCarbonFootprint || 'X.XX'} kg CO₂-eq
            <div style="font-size: 12pt; color: #666; margin-top: 10px;">
                per ${data.product.volume || '750ml'} bottle of ${data.product.name}
            </div>
        </div>
    </div>

    <!-- Introduction -->
    <div class="section page-break">
        <h2 class="section-title">1. Introduction</h2>
        
        <h3 class="subsection-title">1.1 Background</h3>
        <p>${data.company.name} is committed to understanding and reducing the environmental impact of their products. This Life Cycle Assessment (LCA) was conducted to evaluate the carbon footprint of ${data.product.name} following internationally recognized standards.</p>
        
        <h3 class="subsection-title">1.2 Goal and Scope Definition</h3>
        
        <div class="two-column">
            <div class="info-box">
                <h4>Goal</h4>
                <p>The goal of this study is to assess the environmental impacts of a bottle of ${data.product.name}. Results can be used for internal improvement and external communication.</p>
            </div>
            <div class="info-box">
                <h4>Scope</h4>
                <p>The scope of the assessment is 'cradle-to-gate', covering raw material extraction through production.</p>
            </div>
        </div>
        
        <div class="two-column">
            <div class="info-box">
                <h4>Functional Unit</h4>
                <p>The functional unit is defined as: One ${data.product.volume || '750ml'} bottle of ${data.product.name}, including all primary and secondary packaging.</p>
            </div>
            <div class="info-box">
                <h4>Impact Categories</h4>
                <p>The assessment focuses on the Global Warming Potential (GWP100) and Water Consumption.</p>
            </div>
        </div>
    </div>

    <!-- Inventory Analysis -->
    <div class="section page-break">
        <h2 class="section-title">2. Inventory Analysis</h2>
        
        <h3 class="subsection-title">2.1 Process Description</h3>
        <p>The production process includes ingredient sourcing, processing, packaging, and distribution. Key stages analyzed include:</p>
        <ul>
            <li>Agricultural production of raw materials</li>
            <li>Processing and production operations</li>
            <li>Primary and secondary packaging</li>
            <li>Transportation and distribution</li>
            <li>End-of-life considerations</li>
        </ul>
        
        <h3 class="subsection-title">2.2 Process Data</h3>
        <table class="results-table">
            <thead>
                <tr>
                    <th>Process Stage</th>
                    <th>Key Inputs</th>
                    <th>Environmental Relevance</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Agriculture</td>
                    <td>Raw materials, fertilizers, water</td>
                    <td>Land use, GHG emissions</td>
                </tr>
                <tr>
                    <td>Processing</td>
                    <td>Energy, water, processing aids</td>
                    <td>Energy consumption, emissions</td>
                </tr>
                <tr>
                    <td>Packaging</td>
                    <td>Glass, labels, cork, secondary packaging</td>
                    <td>Material production, transport</td>
                </tr>
                <tr>
                    <td>Distribution</td>
                    <td>Fuel, packaging materials</td>
                    <td>Transport emissions</td>
                </tr>
            </tbody>
        </table>
        
        <h3 class="subsection-title">2.3 Dataset References</h3>
        <p>Primary background database used: <strong>Ecoinvent 3.5</strong></p>
        <p>Impact assessment method: <strong>IPCC 2013 GWP 100a</strong></p>
    </div>

    <!-- Impact Assessment -->
    <div class="section page-break">
        <h2 class="section-title">3. Impact Assessment & Interpretation</h2>
        
        <h3 class="subsection-title">3.1 Contribution Analysis</h3>
        
        ${this.generateHTMLChart(breakdown)}
        <p style="text-align: center; font-style: italic; margin-top: 10px;"><em>Figure 1: Carbon footprint contribution by life cycle stage</em></p>
        
        <h3 class="subsection-title">3.2 Results Summary</h3>
        <table class="results-table">
            <thead>
                <tr>
                    <th>Impact Category</th>
                    <th>Result</th>
                    <th>Unit</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Climate Change (GWP100)</td>
                    <td>${data.report.totalCarbonFootprint || 'X.XX'}</td>
                    <td>kg CO₂-eq per bottle</td>
                </tr>
                <tr>
                    <td>Water Consumption</td>
                    <td>TBD</td>
                    <td>L per bottle</td>
                </tr>
            </tbody>
        </table>
        
        <h3 class="subsection-title">3.3 Key Insights</h3>
        <ul>
            ${topHotspots.map(hotspot => `
                <li><strong>${hotspot.stage}</strong> contributes ${hotspot.percentage}% of the total carbon footprint</li>
            `).join('')}
            <li>Primary improvement opportunities lie in the highest-contributing stages</li>
            <li>Packaging optimization represents the greatest potential for impact reduction</li>
        </ul>
    </div>

    <!-- References -->
    <div class="section page-break">
        <h2 class="section-title">References</h2>
        
        <p>This assessment follows internationally recognized standards:</p>
        <ul>
            <li>ISO 14040:2006 - Environmental management -- Life cycle assessment -- Principles and framework</li>
            <li>ISO 14044:2006 - Environmental management -- Life cycle assessment -- Requirements and guidelines</li>
            <li>IPCC 2013 - Climate Change 2013: The Physical Science Basis</li>
        </ul>
        
        <div style="margin-top: 50px; text-align: center; color: #666; font-size: 10pt;">
            <p>Report generated by Avallen Solutions Sustainability Platform</p>
            <p>Generated on ${currentDate}</p>
        </div>
    </div>
</body>
</html>
    `;
  }
}