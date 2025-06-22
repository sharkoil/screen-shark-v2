// Test Runner for Session Cleanup Tests
const SessionCleanupTester = require('./session-cleanup-test.js');

async function runTests() {
  const tester = new SessionCleanupTester();
  
  try {
    const report = await tester.runAllTests();
    
    console.log('\n' + '='.repeat(60));
    console.log('SESSION CLEANUP TEST REPORT');
    console.log('='.repeat(60));
    
    console.log(`\nSUMMARY:`);
    console.log(`  Total Tests: ${report.summary.total}`);
    console.log(`  Passed: ${report.summary.passed}`);
    console.log(`  Failed: ${report.summary.failed}`);
    console.log(`  Pass Rate: ${report.summary.passRate}`);
    
    console.log(`\nDETAILED RESULTS:`);
    report.tests.forEach((test, index) => {
      const status = test.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`  ${index + 1}. ${test.test}: ${status}`);
      
      if (!test.passed) {
        console.log(`     Details:`, test.details);
      }
    });
    
    console.log(`\nVERDICT: ${report.verdict}`);
    console.log('='.repeat(60));
    
    // Return exit code based on test results
    if (report.summary.failed > 0) {
      console.log('\n❌ TESTS FAILED - Fix required before user testing');
      process.exit(1);
    } else {
      console.log('\n✅ ALL TESTS PASSED - Ready for user testing');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('❌ TEST SUITE ERROR:', error);
    process.exit(1);
  }
}

// Run the tests
runTests();
