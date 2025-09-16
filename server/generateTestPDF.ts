import { PDFService, LCAReportData } from './pdfService';
import fs from 'fs';
import path from 'path';

// Test data based on the actual database records
const testReportData: LCAReportData = {
  product: {
    id: 5,
    name: "Avallen Test",
    sku: "Avallen1",
    volume: "750ml",
    annualProductionVolume: 15000,
    productionUnit: "bottles",
    bottleWeight: 480,
    labelWeight: 1,
    bottleMaterial: "Glass",
    labelMaterial: "Paper",
  },
  company: {
    name: "Avallen Test",
    industry: "spirits",
    size: "small",
    address: "4 Love Lane",
    country: "United Kingdom",
    website: "https://avallenspirits.com",
    reportingPeriodStart: "2025-01-01T00:00:00Z",
    reportingPeriodEnd: "2025-12-31T23:59:59Z",
  },
  lcaResults: {
    totalCarbonFootprint: 2.45,
    totalWaterFootprint: 125.8,
    impactsByCategory: [
      {
        category: "Climate Change",
        impact: 2.45,
        unit: "kg CO2e"
      },
      {
        category: "Freshwater Eutrophication",
        impact: 0.0012,
        unit: "kg P eq"
      },
      {
        category: "Water Scarcity",
        impact: 125.8,
        unit: "L eq"
      }
    ],
    calculationDate: "2025-01-18T12:45:00Z",
    systemName: "Test Ecoinvent System",
    systemId: "test-system-001",
  },
  operationalData: {
    electricityConsumption: 100000,
    gasConsumption: 1000,
    waterConsumption: 1000,
    wasteGenerated: 50000,
  }
};

async function generateTestPDF() {
  try {
    
    const pdfBuffer = await PDFService.generateLCAPDF(testReportData);
    
    // Save to a file
    const filename = `LCA_Report_Avallen_Test_${new Date().toISOString().split('T')[0]}.pdf`;
    const filepath = path.join(process.cwd(), filename);
    
    fs.writeFileSync(filepath, pdfBuffer);
    
    
    
    
    
    return filepath;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateTestPDF().catch(console.error);
}

export { generateTestPDF };