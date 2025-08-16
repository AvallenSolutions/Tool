// Direct test of the comprehensive sustainability report generation
import { ReportDataProcessor } from './server/services/ReportDataProcessor.js';
import { EnhancedPDFService } from './server/services/EnhancedPDFService.js';
import fs from 'fs';
import path from 'path';

async function testSustainabilityReport() {
  try {
    console.log('🚀 Testing comprehensive sustainability report generation...');
    
    // Test with report ID 3 (has complete data: 875.7 tonnes CO2e)
    const reportId = 3;
    
    console.log(`📊 Aggregating sustainability data for report ${reportId}...`);
    const sustainabilityData = await ReportDataProcessor.aggregateReportData(reportId);
    
    console.log('✅ Sustainability data aggregated:');
    console.log(`   Company: ${sustainabilityData.company.name}`);
    console.log(`   Industry: ${sustainabilityData.company.industry}`);
    console.log(`   Total Emissions: ${sustainabilityData.emissions.total} tonnes CO2e`);
    console.log(`   Scope 1: ${sustainabilityData.emissions.scope1} tonnes`);
    console.log(`   Scope 2: ${sustainabilityData.emissions.scope2} tonnes`);
    console.log(`   Scope 3: ${sustainabilityData.emissions.scope3} tonnes`);
    console.log(`   Water Usage: ${sustainabilityData.environmental.waterUsage.toLocaleString()} liters`);
    console.log(`   Waste Generated: ${sustainabilityData.environmental.wasteGenerated.toLocaleString()} kg`);
    console.log(`   Employee Count: ${sustainabilityData.social.employeeCount}`);
    console.log(`   Products: ${sustainabilityData.products.length} tracked`);
    
    console.log('\n📄 Generating comprehensive 8-page sustainability report...');
    const pdfService = new EnhancedPDFService();
    const reportBuffer = await pdfService.generateSustainabilityReport(sustainabilityData);
    
    console.log('✅ Report generated successfully!');
    console.log(`   Report size: ${Math.round(reportBuffer.length / 1024)} KB`);
    
    // Save the report for review
    const filename = `test_sustainability_report_${Date.now()}.html`;
    const filepath = path.join(process.cwd(), filename);
    fs.writeFileSync(filepath, reportBuffer);
    
    console.log(`📁 Complete report saved to: ${filepath}`);
    console.log('\n🎉 Test completed successfully!');
    
    // Show a preview of the report structure
    const reportPreview = reportBuffer.toString().substring(0, 2000);
    console.log('\n📋 Report preview (first 2000 characters):');
    console.log('=' .repeat(80));
    console.log(reportPreview);
    console.log('=' .repeat(80));
    
    return {
      success: true,
      data: sustainabilityData,
      reportPath: filepath,
      reportSize: reportBuffer.length
    };
    
  } catch (error) {
    console.error('❌ Error testing sustainability report:', error);
    throw error;
  }
}

// Run the test
testSustainabilityReport()
  .then(result => {
    console.log('\n✅ SUCCESS: Comprehensive sustainability report test completed');
    console.log(`Report available at: ${result.reportPath}`);
  })
  .catch(error => {
    console.error('\n❌ FAILED: Sustainability report test failed');
    console.error(error.message);
    process.exit(1);
  });