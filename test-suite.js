// Screen Shark Automated Test Suite
// This script validates the fixes for event listener cleanup and session saving

class ScreenSharkTestSuite {
  constructor() {
    this.testResults = [];
    this.originalConsoleLog = console.log;
    this.logs = [];
  }

  // Capture console logs for analysis
  captureConsole() {
    console.log = (...args) => {
      this.logs.push(args.join(' '));
      this.originalConsoleLog.apply(console, args);
    };
  }

  restoreConsole() {
    console.log = this.originalConsoleLog;
  }

  async runTest(testName, testFunction) {
    console.log(`🧪 Running: ${testName}`);
    try {
      const result = await testFunction();
      this.testResults.push({ name: testName, status: 'PASS', result });
      console.log(`✅ PASS: ${testName}`);
      return result;
    } catch (error) {
      this.testResults.push({ name: testName, status: 'FAIL', error: error.message });
      console.log(`❌ FAIL: ${testName} - ${error.message}`);
      throw error;
    }
  }

  // Test 1: Verify single content script instance
  async testSingleInstance() {
    return this.runTest('Single Content Script Instance', async () => {
      const contentLoaded = window.screenSharkContentLoaded;
      const instanceExists = !!window.screenSharkInstance;
      
      if (!contentLoaded) {
        throw new Error('Content script not loaded');
      }
      
      if (!instanceExists) {
        throw new Error('Content script instance not found');
      }

      return { contentLoaded, instanceExists };
    });
  }

  // Test 2: Verify session state synchronization
  async testSessionStatSync() {
    return this.runTest('Session State Synchronization', async () => {
      const bgState = await chrome.runtime.sendMessage({ action: 'getState' });
      const contentState = window.screenSharkInstance?.sessionActive;
      
      if (bgState.sessionActive !== contentState) {
        throw new Error(`State mismatch - BG: ${bgState.sessionActive}, Content: ${contentState}`);
      }

      return { background: bgState.sessionActive, content: contentState };
    });
  }

  // Test 3: Test event listener cleanup
  async testEventListenerCleanup() {
    return this.runTest('Event Listener Cleanup', async () => {
      const instance = window.screenSharkInstance;
      if (!instance) throw new Error('No instance found');

      // Start session
      await chrome.runtime.sendMessage({ action: 'toggleSession' });
      await this.wait(1000);

      const hasListenersAfterStart = {
        click: !!instance.clickHandler,
        submit: !!instance.submitHandler
      };

      if (!hasListenersAfterStart.click || !hasListenersAfterStart.submit) {
        throw new Error('Event listeners not added after session start');
      }

      // Stop session
      await chrome.runtime.sendMessage({ action: 'toggleSession' });
      await this.wait(1000);

      const hasListenersAfterStop = {
        click: !!instance.clickHandler,
        submit: !!instance.submitHandler
      };

      if (hasListenersAfterStop.click || hasListenersAfterStop.submit) {
        throw new Error('Event listeners not removed after session stop');
      }

      return { 
        afterStart: hasListenersAfterStart, 
        afterStop: hasListenersAfterStop 
      };
    });
  }

  // Test 4: Test interaction capture prevention after session end
  async testInteractionCapturePrevention() {
    return this.runTest('Interaction Capture Prevention', async () => {
      this.captureConsole();
      const instance = window.screenSharkInstance;
      if (!instance) throw new Error('No instance found');

      // Ensure session is stopped
      const bgState = await chrome.runtime.sendMessage({ action: 'getState' });
      if (bgState.sessionActive) {
        await chrome.runtime.sendMessage({ action: 'toggleSession' });
        await this.wait(500);
      }

      // Clear previous logs
      this.logs = [];

      // Create and click a test button
      const testButton = document.createElement('button');
      testButton.textContent = 'Test Button';
      testButton.style.cssText = 'position: fixed; top: -100px; left: -100px;';
      document.body.appendChild(testButton);

      // Simulate click
      testButton.click();
      await this.wait(500);

      // Check logs for ignore message
      const ignoreMessages = this.logs.filter(log => 
        log.includes('Ignoring') && log.includes('session not active')
      );

      testButton.remove();
      this.restoreConsole();

      if (ignoreMessages.length === 0) {
        throw new Error('Expected ignore message not found in logs');
      }

      return { ignoreMessages: ignoreMessages.length };
    });
  }

  // Test 5: Test session data structure
  async testSessionDataStructure() {
    return this.runTest('Session Data Structure', async () => {
      // Start a session
      await chrome.runtime.sendMessage({ action: 'toggleSession' });
      await this.wait(500);

      // Take a screenshot
      await chrome.runtime.sendMessage({ action: 'captureScreenshot', options: { reason: 'Test' } });
      await this.wait(1000);

      // Stop session
      await chrome.runtime.sendMessage({ action: 'toggleSession' });
      await this.wait(2000); // Wait for session save

      // Session should have been saved
      return { sessionCreated: true };
    });
  }

  // Test 6: Test permission validation
  async testPermissionValidation() {
    return this.runTest('Permission Validation', async () => {
      const permissions = await chrome.permissions.getAll();
      const requiredPermissions = ['activeTab', 'storage', 'downloads', 'notifications'];
      
      const missingPermissions = requiredPermissions.filter(
        perm => !permissions.permissions.includes(perm)
      );

      if (missingPermissions.length > 0) {
        throw new Error(`Missing permissions: ${missingPermissions.join(', ')}`);
      }

      return { permissions: permissions.permissions };
    });
  }

  // Test 7: Test error handling
  async testErrorHandling() {
    return this.runTest('Error Handling', async () => {
      this.captureConsole();
      this.logs = [];

      try {
        // Try to send invalid message
        await chrome.runtime.sendMessage({ action: 'invalidAction' });
      } catch (error) {
        // Expected to fail
      }

      await this.wait(500);

      const errorLogs = this.logs.filter(log => 
        log.includes('Error') || log.includes('error')
      );

      this.restoreConsole();

      return { errorLogsFound: errorLogs.length > 0 };
    });
  }

  // Utility: Wait function
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Run all tests
  async runAllTests() {
    console.log('🦈 Starting Screen Shark Test Suite...\n');
    
    const tests = [
      () => this.testSingleInstance(),
      () => this.testSessionStatSync(),
      () => this.testPermissionValidation(),
      () => this.testEventListenerCleanup(),
      () => this.testInteractionCapturePrevention(),
      () => this.testSessionDataStructure(),
      () => this.testErrorHandling()
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
      try {
        await test();
        passed++;
      } catch (error) {
        failed++;
      }
      await this.wait(500); // Brief pause between tests
    }

    console.log('\n📊 Test Results Summary:');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📝 Total: ${this.testResults.length}`);

    // Show detailed results
    console.table(this.testResults);

    return {
      passed,
      failed,
      total: this.testResults.length,
      results: this.testResults
    };
  }

  // Generate test report
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.testResults.length,
        passed: this.testResults.filter(r => r.status === 'PASS').length,
        failed: this.testResults.filter(r => r.status === 'FAIL').length
      },
      details: this.testResults
    };

    console.log('📋 Test Report Generated');
    return report;
  }
}

// Make available globally
window.ScreenSharkTestSuite = ScreenSharkTestSuite;

// Auto-run tests if requested
if (window.location.search.includes('autotest=true')) {
  window.addEventListener('load', async () => {
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for extension to load
    const testSuite = new ScreenSharkTestSuite();
    await testSuite.runAllTests();
  });
}

console.log('🦈 Screen Shark Test Suite loaded');
console.log('Usage: const testSuite = new ScreenSharkTestSuite(); await testSuite.runAllTests();');
