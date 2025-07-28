import { Router } from 'express';
import { runE2ETests } from '../../scripts/test-runner';
import { runTestSeeding } from '../../scripts/test-seed';

const router = Router();

/**
 * API endpoint to run the complete E2E test suite
 * GET /api/test/e2e
 */
router.get('/e2e', async (req, res) => {
  try {
    
    
    const result = await runE2ETests();
    
    res.json({
      success: result.success,
      message: result.success ? 'All tests passed!' : 'Some tests failed',
      report: result.report,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ E2E Test Suite failed:', error);
    res.status(500).json({
      success: false,
      message: 'Test suite crashed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * API endpoint to seed test data only
 * POST /api/test/seed
 */
router.post('/seed', async (req, res) => {
  try {
    
    
    const result = await runTestSeeding();
    
    res.json({
      success: true,
      message: 'Test data seeded successfully',
      data: {
        company: result.company,
        product: result.product,
        supplierCount: result.supplierIds.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Test data seeding failed:', error);
    res.status(500).json({
      success: false,
      message: 'Seeding failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * API endpoint to get test status and basic validation
 * GET /api/test/status
 */
router.get('/status', async (req, res) => {
  try {
    const { validateSeedData } = await import('../../scripts/test-seed');
    const isValid = await validateSeedData();
    
    res.json({
      testEnvironment: 'ready',
      validationPassed: isValid,
      timestamp: new Date().toISOString(),
      message: isValid ? 'Test environment is properly configured' : 'Test environment needs setup'
    });
  } catch (error) {
    res.status(500).json({
      testEnvironment: 'error',
      validationPassed: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;