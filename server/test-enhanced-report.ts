// Test script for enhanced report generation
import { ReportDataProcessor } from './services/ReportDataProcessor';
import { EnhancedPDFService } from './services/EnhancedPDFService';
import fs from 'fs';
import path from 'path';

async function testEnhancedReportGeneration() {
  console.log('🧪 Testing Enhanced LCA Report Generation...\n');

  try {
    // Step 1: Test data aggregation
    console.log('📊 Step 1: Testing data aggregation...');
    const reportData = await ReportDataProcessor.aggregateReportData(1);
    console.log('✅ Data aggregated successfully');
    console.log(`   Product: ${reportData.product.name}`);
    console.log(`   Company: ${reportData.company.name}`);
    console.log(`   Carbon footprint: ${reportData.report.totalCarbonFootprint || 'N/A'} kg CO₂-eq`);
    console.log(`   Breakdown stages: ${reportData.calculatedBreakdown?.length || 0}\n`);

    // Step 2: Test PDF generation
    console.log('📄 Step 2: Testing PDF generation...');
    const pdfService = new EnhancedPDFService();
    const pdfBuffer = await pdfService.generateEnhancedLCAPDF(reportData);
    console.log('✅ PDF generated successfully');
    console.log(`   PDF size: ${(pdfBuffer.length / 1024 / 1024).toFixed(2)} MB\n`);

    // Step 3: Save test PDF
    console.log('💾 Step 3: Saving test PDF...');
    const testDir = path.join(process.cwd(), 'test-outputs');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    const testFilePath = path.join(testDir, `enhanced_lca_test_${Date.now()}.pdf`);
    fs.writeFileSync(testFilePath, pdfBuffer);
    console.log('✅ Test PDF saved successfully');
    console.log(`   File path: ${testFilePath}\n`);

    // Step 4: Test database status update
    console.log('🗄️  Step 4: Testing database status update...');
    await ReportDataProcessor.updateReportStatus(1, 'completed', `test-outputs/enhanced_lca_test_${Date.now()}.pdf`);
    console.log('✅ Database status updated successfully\n');

    console.log('🎉 All tests passed! Enhanced report generation is working correctly.');
    console.log('\nNext steps:');
    console.log('1. Test the frontend Enhanced Report Button component');
    console.log('2. Test the API endpoints for generation and download');
    console.log('3. Verify the complete user workflow\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('\nError details:', error.stack);
  }
}

// Run the test
testEnhancedReportGeneration();