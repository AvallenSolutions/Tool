// Test script for enhanced report generation
import { ReportDataProcessor } from './services/ReportDataProcessor';
import { EnhancedPDFService } from './services/EnhancedPDFService';
import fs from 'fs';
import path from 'path';

async function testEnhancedReportGeneration() {
  

  try {
    // Step 1: Test data aggregation
    
    const reportData = await ReportDataProcessor.aggregateReportData(1);
    
    
    
    
    

    // Step 2: Test PDF generation
    
    const pdfService = new EnhancedPDFService();
    const pdfBuffer = await pdfService.generateEnhancedLCAPDF(reportData);
    
    

    // Step 3: Save test PDF
    
    const testDir = path.join(process.cwd(), 'test-outputs');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    const testFilePath = path.join(testDir, `enhanced_lca_test_${Date.now()}.pdf`);
    fs.writeFileSync(testFilePath, pdfBuffer);
    
    

    // Step 4: Test database status update
    
    await ReportDataProcessor.updateReportStatus(1, 'completed', `test-outputs/enhanced_lca_test_${Date.now()}.pdf`);
    

    
    
    
    
    

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('\nError details:', error.stack);
  }
}

// Run the test
testEnhancedReportGeneration();