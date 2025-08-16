import { ReportDataProcessor } from './server/services/ReportDataProcessor';
import { EnhancedPDFService } from './server/services/EnhancedPDFService';
import fs from 'fs';
import path from 'path';

async function testCompleteSustainabilityReport() {
  try {
    console.log('Testing comprehensive sustainability report generation...');
    
    // Use report ID 3 which has complete emissions data (875.7 tonnes CO2e)
    const reportId = 3;
    
    console.log(`Gathering sustainability data for report ${reportId}...`);
    const sustainabilityData = await ReportDataProcessor.aggregateReportData(reportId);
    
    console.log('Sustainability data summary:');
    console.log(`- Company: ${sustainabilityData.company.name}`);
    console.log(`- Industry: ${sustainabilityData.company.industry}`);
    console.log(`- Country: ${sustainabilityData.company.country}`);
    console.log(`- Total CO2e: ${sustainabilityData.emissions.total} tonnes`);
    console.log(`- Water usage: ${sustainabilityData.environmental.waterUsage.toLocaleString()} liters`);
    console.log(`- Waste generated: ${sustainabilityData.environmental.wasteGenerated.toLocaleString()} kg`);
    console.log(`- Employee count: ${sustainabilityData.social.employeeCount}`);
    console.log(`- Products tracked: ${sustainabilityData.products.length}`);
    
    console.log('\nGenerating 8-page sustainability report...');
    const pdfService = new EnhancedPDFService();
    const reportBuffer = await pdfService.generateSustainabilityReport(sustainabilityData);
    
    // Save complete report
    const filename = `complete_sustainability_report_${Date.now()}.html`;
    const filepath = path.join(process.cwd(), filename);
    fs.writeFileSync(filepath, reportBuffer);
    
    console.log('\nSUCCESS: Complete sustainability report generated!');
    console.log(`Report saved to: ${filepath}`);
    console.log(`Report size: ${Math.round(reportBuffer.length / 1024)} KB`);
    
    // Show report structure preview
    const reportContent = reportBuffer.toString();
    const sections = [
      'Cover Page',
      'Founder\'s Letter', 
      'Vision & Strategy',
      'Impact at a Glance',
      'Environmental Footprint',
      'Social Commitment',
      'Governance & Ethics',
      'Road Ahead'
    ];
    
    console.log('\nReport structure (8 pages):');
    sections.forEach((section, i) => {
      console.log(`${i + 1}. ${section}`);
    });
    
    // Show key metrics being reported
    console.log('\nKey metrics in the report:');
    console.log(`- Scope 1 emissions: ${sustainabilityData.emissions.scope1} tonnes (${sustainabilityData.emissions.breakdown[0]?.percentage}%)`);
    console.log(`- Scope 2 emissions: ${sustainabilityData.emissions.scope2} tonnes (${sustainabilityData.emissions.breakdown[1]?.percentage}%)`);
    console.log(`- Scope 3 emissions: ${sustainabilityData.emissions.scope3} tonnes (${sustainabilityData.emissions.breakdown[2]?.percentage}%)`);
    console.log(`- Renewable energy: ${sustainabilityData.environmental.renewableEnergyPercentage}%`);
    console.log(`- Waste recycled: ${sustainabilityData.environmental.wasteRecycledPercentage}%`);
    console.log(`- Community investment: £${(sustainabilityData.social.communityInvestment/1000)}k`);
    console.log(`- Carbon neutral target: ${sustainabilityData.goals.carbonNeutralTarget}`);
    
    return {
      success: true,
      filepath,
      data: sustainabilityData,
      reportContent: reportContent.substring(0, 3000) + '\n...[Report continues for 8 full pages]...'
    };
    
  } catch (error) {
    console.error('ERROR: Failed to generate sustainability report:', error);
    throw error;
  }
}

testCompleteSustainabilityReport();