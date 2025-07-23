#!/usr/bin/env tsx

/**
 * Test Runner Script for Drinks Sustainability Tool
 * 
 * This script executes the comprehensive End-to-End Testing & Validation Plan
 * Usage: npm run test:e2e
 */

import { runE2ETests } from './test-runner';

async function main() {
  console.log('🚀 Drinks Sustainability Tool - E2E Test Suite');
  console.log('Version: 1.0');
  console.log('Date:', new Date().toLocaleDateString());
  console.log('Environment: Replit Development');
  console.log('\n');

  try {
    const result = await runE2ETests();
    
    if (result.success) {
      console.log('\n🎉 End-to-End test suite completed successfully!');
      process.exit(0);
    } else {
      console.log('\n❌ End-to-End test suite failed. Check results above.');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n💥 Test suite crashed:', error);
    process.exit(1);
  }
}

// Run the test suite
main().catch(console.error);