import puppeteer from 'puppeteer';

export interface LCAReportData {
  product: {
    id: number;
    name: string;
    sku: string;
    volume: string;
    annualProductionVolume: number;
    productionUnit: string;
    bottleWeight: number;
    labelWeight: number;
    bottleMaterial: string;
    labelMaterial: string;
  };
  company: {
    name: string;
    industry: string;
    size: string;
    address: string;
    country: string;
    website: string;
    reportingPeriodStart: string;
    reportingPeriodEnd: string;
  };
  lcaResults: {
    totalCarbonFootprint: number;
    totalWaterFootprint: number;
    impactsByCategory: Array<{
      category: string;
      impact: number;
      unit: string;
    }>;
    calculationDate: string;
    systemName: string;
    systemId: string;
  };
  operationalData: {
    electricityConsumption: number;
    gasConsumption: number;
    waterConsumption: number;
    wasteGenerated: number;
  };
}

export class PDFService {
  private static generateHTML(data: LCAReportData): string {
    const currentDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const reportingPeriod = `${new Date(data.company.reportingPeriodStart).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })} - ${new Date(data.company.reportingPeriodEnd).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })}`;
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>LCA Sustainability Report - ${data.product.name}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 20px;
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #16a34a;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #16a34a;
            font-size: 28px;
            margin: 0;
        }
        .header h2 {
            color: #64748b;
            font-size: 18px;
            margin: 10px 0 0 0;
            font-weight: normal;
        }
        .section {
            margin-bottom: 30px;
            page-break-inside: avoid;
        }
        .section h3 {
            color: #16a34a;
            font-size: 20px;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 10px;
            margin-bottom: 15px;
        }
        .section h4 {
            color: #374151;
            font-size: 16px;
            margin-bottom: 10px;
        }
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
        }
        .info-box {
            background: #f8fafc;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 15px;
        }
        .info-box h4 {
            margin-top: 0;
            color: #16a34a;
        }
        .metric-card {
            background: #ffffff;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 15px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        .metric-value {
            font-size: 24px;
            font-weight: bold;
            color: #16a34a;
            margin-bottom: 5px;
        }
        .metric-label {
            color: #6b7280;
            font-size: 14px;
        }
        .impact-category {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid #e5e7eb;
        }
        .impact-category:last-child {
            border-bottom: none;
        }
        .impact-name {
            font-weight: 500;
            color: #374151;
        }
        .impact-value {
            font-weight: bold;
            color: #16a34a;
        }
        .key-metrics {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 12px;
            color: #6b7280;
        }
        .methodology {
            background: #f0fdf4;
            border-left: 4px solid #16a34a;
            padding: 15px;
            margin: 20px 0;
        }
        .page-break {
            page-break-before: always;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        th, td {
            border: 1px solid #e5e7eb;
            padding: 8px 12px;
            text-align: left;
        }
        th {
            background: #f8fafc;
            font-weight: 600;
            color: #374151;
        }
        @media print {
            body { margin: 0; }
            .section { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Life Cycle Assessment Report</h1>
        <h2>${data.product.name} (${data.product.sku})</h2>
        <p>Generated on ${currentDate}</p>
    </div>

    <div class="section">
        <h3>Executive Summary</h3>
        <div class="info-grid">
            <div class="info-box">
                <h4>Company Information</h4>
                <p><strong>Company:</strong> ${data.company.name}</p>
                <p><strong>Industry:</strong> ${data.company.industry}</p>
                <p><strong>Location:</strong> ${data.company.address}, ${data.company.country}</p>
                <p><strong>Reporting Period:</strong> ${reportingPeriod}</p>
            </div>
            <div class="info-box">
                <h4>Product Information</h4>
                <p><strong>Product:</strong> ${data.product.name}</p>
                <p><strong>SKU:</strong> ${data.product.sku}</p>
                <p><strong>Volume:</strong> ${data.product.volume}</p>
                <p><strong>Annual Production:</strong> ${data.product.annualProductionVolume?.toLocaleString() || 'N/A'} ${data.product.productionUnit || 'units'}</p>
            </div>
        </div>
    </div>

    <div class="section">
        <h3>Key Environmental Metrics</h3>
        <div class="key-metrics">
            <div class="metric-card">
                <div class="metric-value">${data.lcaResults.totalCarbonFootprint} kg CO₂e</div>
                <div class="metric-label">Carbon Footprint per Unit</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${data.lcaResults.totalWaterFootprint} L eq</div>
                <div class="metric-label">Water Footprint per Unit</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${((data.lcaResults.totalCarbonFootprint * (data.product.annualProductionVolume || 0)) / 1000).toFixed(1)} tonnes CO₂e</div>
                <div class="metric-label">Total Annual Carbon Impact</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${((data.lcaResults.totalWaterFootprint * (data.product.annualProductionVolume || 0)) / 1000).toFixed(0)}k L eq</div>
                <div class="metric-label">Total Annual Water Impact</div>
            </div>
        </div>
    </div>

    <div class="section">
        <h3>Impact Categories</h3>
        <div class="impact-categories">
            ${data.lcaResults.impactsByCategory.map(category => `
                <div class="impact-category">
                    <span class="impact-name">${category.category}</span>
                    <span class="impact-value">${category.impact} ${category.unit}</span>
                </div>
            `).join('')}
        </div>
    </div>

    <div class="section">
        <h3>Product Specifications</h3>
        <table>
            <thead>
                <tr>
                    <th>Component</th>
                    <th>Specification</th>
                    <th>Weight/Volume</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Product Volume</td>
                    <td>${data.product.volume}</td>
                    <td>-</td>
                </tr>
                <tr>
                    <td>Bottle Material</td>
                    <td>${data.product.bottleMaterial || 'Glass'}</td>
                    <td>${data.product.bottleWeight}g</td>
                </tr>
                <tr>
                    <td>Label Material</td>
                    <td>${data.product.labelMaterial || 'Paper'}</td>
                    <td>${data.product.labelWeight}g</td>
                </tr>
                <tr>
                    <td>Total Package Weight</td>
                    <td>-</td>
                    <td>${(data.product.bottleWeight || 0) + (data.product.labelWeight || 0)}g</td>
                </tr>
            </tbody>
        </table>
    </div>

    <div class="section">
        <h3>Operational Environmental Performance</h3>
        <div class="info-grid">
            <div class="info-box">
                <h4>Energy Consumption</h4>
                <p><strong>Electricity:</strong> ${data.operationalData.electricityConsumption?.toLocaleString() || 0} kWh</p>
                <p><strong>Natural Gas:</strong> ${data.operationalData.gasConsumption?.toLocaleString() || 0} cubic meters</p>
                <p><strong>Estimated Scope 2 Emissions:</strong> ${((data.operationalData.electricityConsumption || 0) * 0.4 / 1000).toFixed(1)} tonnes CO₂e</p>
            </div>
            <div class="info-box">
                <h4>Resource Consumption</h4>
                <p><strong>Water:</strong> ${data.operationalData.waterConsumption?.toLocaleString() || 0} cubic meters</p>
                <p><strong>Waste Generated:</strong> ${data.operationalData.wasteGenerated?.toLocaleString() || 0} kg</p>
                <p><strong>Water per Unit:</strong> ${((data.operationalData.waterConsumption || 0) * 1000 / (data.product.annualProductionVolume || 1)).toFixed(1)} L/unit</p>
            </div>
        </div>
    </div>

    <div class="section">
        <h3>Methodology & Verification</h3>
        <div class="methodology">
            <h4>LCA Methodology</h4>
            <p><strong>System:</strong> ${data.lcaResults.systemName}</p>
            <p><strong>System ID:</strong> ${data.lcaResults.systemId}</p>
            <p><strong>Database:</strong> ecoinvent 3.9</p>
            <p><strong>Standards:</strong> ISO 14040/14044</p>
            <p><strong>Methodology:</strong> EU Product Environmental Footprint (PEF)</p>
            <p><strong>Calculation Date:</strong> ${new Date(data.lcaResults.calculationDate).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</p>
        </div>
        
        <h4>System Boundaries</h4>
        <p>This LCA follows a cradle-to-grave approach, including:</p>
        <ul>
            <li>Raw material extraction and processing</li>
            <li>Manufacturing and packaging</li>
            <li>Transportation and distribution</li>
            <li>Use phase (minimal for spirits)</li>
            <li>End-of-life treatment and disposal</li>
        </ul>
    </div>

    <div class="section">
        <h3>Sustainability Commitments</h3>
        <h4>Current Initiatives</h4>
        <ul>
            <li>Comprehensive LCA assessment using international standards</li>
            <li>Operational efficiency monitoring for energy and water</li>
            <li>Waste reduction and recycling programs</li>
            <li>Supply chain transparency and environmental data collection</li>
        </ul>
        
        <h4>Future Targets</h4>
        <ul>
            <li>Reduce carbon footprint by 15% through supply chain optimization</li>
            <li>Implement renewable energy sources for production</li>
            <li>Achieve 100% supplier environmental data coverage</li>
            <li>Develop circular economy packaging solutions</li>
        </ul>
    </div>

    <div class="footer">
        <p><strong>Report Information:</strong> This sustainability report was generated using professional LCA methodology and verified environmental data. All calculations follow internationally recognized standards and industry best practices.</p>
        <p><strong>Contact:</strong> For questions about this report or sustainability initiatives, please contact ${data.company.name} at ${data.company.website}</p>
        <p><strong>Generated on:</strong> ${currentDate} | <strong>LCA System:</strong> ${data.lcaResults.systemName}</p>
    </div>
</body>
</html>
    `;
  }

  static async generateLCAPDF(data: LCAReportData): Promise<Buffer> {
    let browser;
    
    try {
      // Launch browser with minimal dependencies for server environment
      browser = await puppeteer.launch({
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920x1080'
        ],
        headless: true
      });

      const page = await browser.newPage();
      
      // Set page format for PDF
      await page.setViewport({ width: 1920, height: 1080 });
      
      // Generate HTML content
      const htmlContent = this.generateHTML(data);
      
      // Set content and wait for it to load
      await page.setContent(htmlContent, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });

      // Generate PDF
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px'
        }
      });

      return pdf;
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error('Failed to generate PDF report');
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}