// Code Structure Validation Test
// Tests that the actual implementation has the required methods and logic

const fs = require('fs');
const path = require('path');

class CodeValidationTester {
  constructor() {
    this.testResults = [];
    this.extensionPath = __dirname;
  }

  async runCodeValidationTests() {
    console.log('Running Code Structure Validation Tests...');
    
    await this.testBackgroundJsStructure();
    await this.testContentJsStructure();
    await this.testPopupJsStructure();
    await this.testPopupHtmlStructure();
    
    return this.generateReport();
  }

  async testBackgroundJsStructure() {
    console.log('=== Testing background.js structure ===');
    
    const backgroundPath = path.join(this.extensionPath, 'background.js');
    const content = fs.readFileSync(backgroundPath, 'utf8');
    
    const checks = {
      hasEndCurrentSession: content.includes('async endCurrentSession()'),
      hasNotifyAllTabsSessionEnded: content.includes('async notifyAllTabsSessionEnded()'),
      hasForceStopAllSessions: content.includes('async forceStopAllSessions()'),
      hasFinallyBlock: content.includes('} finally {'),
      hasForceEndSessionMessage: content.includes('forceEndSession'),
      hasTabNotificationLoop: content.includes('tabs.map(async (tab)'),
      hasStorageUpdate: content.includes('chrome.storage.local.set'),
      hasSessionActiveSetFalse: content.includes('sessionActive: false'),
      hasTimeoutProtection: content.includes('setTimeout') && content.includes('reject'),
      hasMessageHandler: content.includes('forceStopAllSessions') && content.includes('case')
    };
    
    const passed = Object.values(checks).every(check => check === true);
    
    this.testResults.push({
      test: 'Background.js Structure',
      passed: passed,
      details: checks
    });
    
    console.log(`Background.js structure: ${passed ? 'PASS' : 'FAIL'}`);
    if (!passed) {
      console.log('Missing elements:', Object.keys(checks).filter(k => !checks[k]));
    }
  }

  async testContentJsStructure() {
    console.log('=== Testing content.js structure ===');
    
    const contentPath = path.join(this.extensionPath, 'content.js');
    const content = fs.readFileSync(contentPath, 'utf8');
    
    const checks = {
      hasForceEndSession: content.includes('async forceEndSession()'),
      hasForceEndSessionCase: content.includes('case \'forceEndSession\''),
      hasRemoveInteractionListeners: content.includes('removeInteractionListeners()'),
      hasRemoveFloatingButton: content.includes('removeFloatingButton()'),
      hasSessionActiveFalse: content.includes('this.sessionActive = false'),
      hasHandleMessage: content.includes('handleMessage'),
      hasEventListenerRemoval: content.includes('removeEventListener'),
      hasClickHandlerNull: content.includes('this.clickHandler = null'),
      hasToastNotification: content.includes('showToast')
    };
    
    const passed = Object.values(checks).every(check => check === true);
    
    this.testResults.push({
      test: 'Content.js Structure',
      passed: passed,
      details: checks
    });
    
    console.log(`Content.js structure: ${passed ? 'PASS' : 'FAIL'}`);
    if (!passed) {
      console.log('Missing elements:', Object.keys(checks).filter(k => !checks[k]));
    }
  }

  async testPopupJsStructure() {
    console.log('=== Testing popup.js structure ===');
    
    const popupPath = path.join(this.extensionPath, 'popup.js');
    const content = fs.readFileSync(popupPath, 'utf8');
      const checks = {
      hasForceStopAllSessions: content.includes('async forceStopAllSessions()'),
      hasForceStopButton: content.includes('forceStopBtn'),
      hasSafeEventListener: content.includes('safeAddEventListener'),
      hasRuntimeSendMessage: content.includes('chrome.runtime.sendMessage'),
      hasForceStopAction: content.includes('action: \'forceStopAllSessions\''),
      hasUIUpdate: content.includes('updateUI'),
      hasShowMessage: content.includes('showMessage')
    };
    
    const passed = Object.values(checks).every(check => check === true);
    
    this.testResults.push({
      test: 'Popup.js Structure',
      passed: passed,
      details: checks
    });
    
    console.log(`Popup.js structure: ${passed ? 'PASS' : 'FAIL'}`);
    if (!passed) {
      console.log('Missing elements:', Object.keys(checks).filter(k => !checks[k]));
    }
  }

  async testPopupHtmlStructure() {
    console.log('=== Testing popup.html structure ===');
    
    const popupHtmlPath = path.join(this.extensionPath, 'popup.html');
    const content = fs.readFileSync(popupHtmlPath, 'utf8');
    
    const checks = {
      hasForceStopButton: content.includes('id="forceStopBtn"'),
      hasProperButtonStructure: content.includes('<button') && content.includes('forceStopBtn'),
      hasButtonText: content.includes('Force Stop') || content.includes('force') || content.includes('stop'),
      hasMainControls: content.includes('main-controls'),
      hasSessionButton: content.includes('toggleSessionBtn')
    };
    
    const passed = Object.values(checks).every(check => check === true);
    
    this.testResults.push({
      test: 'Popup.html Structure',
      passed: passed,
      details: checks
    });
    
    console.log(`Popup.html structure: ${passed ? 'PASS' : 'FAIL'}`);
    if (!passed) {
      console.log('Missing elements:', Object.keys(checks).filter(k => !checks[k]));
    }
  }

  generateReport() {
    const passed = this.testResults.filter(t => t.passed).length;
    const total = this.testResults.length;
    
    const report = {
      summary: {
        total: total,
        passed: passed,
        failed: total - passed,
        passRate: `${Math.round((passed / total) * 100)}%`
      },
      tests: this.testResults,
      verdict: passed === total ? 'ALL CODE STRUCTURE TESTS PASSED' : 'CODE STRUCTURE ISSUES FOUND'
    };
    
    console.log('\n=== CODE VALIDATION COMPLETE ===');
    console.log(`Results: ${passed}/${total} tests passed (${report.summary.passRate})`);
    console.log(`Verdict: ${report.verdict}`);
    
    return report;
  }
}

// Run the validation
async function runValidation() {
  const tester = new CodeValidationTester();
  
  try {
    const report = await tester.runCodeValidationTests();
    
    console.log('\n' + '='.repeat(60));
    console.log('CODE STRUCTURE VALIDATION REPORT');
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
        console.log(`     Failed checks:`, Object.keys(test.details).filter(k => !test.details[k]));
      }
    });
    
    console.log(`\nVERDICT: ${report.verdict}`);
    console.log('='.repeat(60));
    
    if (report.summary.failed > 0) {
      console.log('\n❌ CODE STRUCTURE ISSUES - Implementation incomplete');
      process.exit(1);
    } else {
      console.log('\n✅ CODE STRUCTURE VALIDATED - All required methods present');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('❌ VALIDATION ERROR:', error.message);
    process.exit(1);
  }
}

runValidation();
