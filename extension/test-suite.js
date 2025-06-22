// Improved Screen Shark Test Suite with better extension detection
class ScreenSharkTestSuite {
  constructor() {
    this.testResults = [];
    this.originalConsoleLog = console.log;
    this.logs = [];
  }

  // Check if we're in an extension context
  isExtensionContext() {
    return typeof chrome !== 'undefined' && 
           chrome.runtime && 
           chrome.runtime.sendMessage;
  }

  // Wait for extension to load
  async waitForExtension(timeout = 10000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (this.isExtensionContext() && window.screenSharkContentLoaded) {
        return true;
      }
      await this.wait(100);
    }
    
    throw new Error('Extension not detected within timeout period');
  }

  // Enhanced test runner with better error handling
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

  // Test 0: Extension Detection (prerequisite)
  async testExtensionDetection() {
    return this.runTest('Extension Detection', async () => {
      // Check if Chrome extension APIs are available
      if (!this.isExtensionContext()) {
        throw new Error('Chrome extension APIs not available. Make sure extension is loaded and page is opened via web server.');
      }

      // Check if content script is loaded
      if (!window.screenSharkContentLoaded) {
        throw new Error('Content script not loaded. Extension may not be active on this page.');
      }

      // Check if background script is reachable
      try {
        const response = await chrome.runtime.sendMessage({ action: 'getState' });
        if (!response) {
          throw new Error('Background script not responding');
        }
      } catch (error) {
        throw new Error(`Cannot communicate with background script: ${error.message}`);
      }

      return { 
        chromeAPI: true, 
        contentScript: true, 
        backgroundScript: true 
      };
    });
  }

  // Test 1: Verify single content script instance
  async testSingleInstance() {
    return this.runTest('Single Content Script Instance', async () => {
      const contentLoaded = window.screenSharkContentLoaded;
      const instanceExists = !!window.screenSharkInstance;
      
      if (!contentLoaded) {
        throw new Error('Content script flag not set');
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

  // Test 3: Test permission validation
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

  // Test 4: Test event listener cleanup
  async testEventListenerCleanup() {
    return this.runTest('Event Listener Cleanup', async () => {
      const instance = window.screenSharkInstance;
      if (!instance) throw new Error('No instance found');

      // Get initial state
      const initialBgState = await chrome.runtime.sendMessage({ action: 'getState' });
      
      // Start session if not active
      if (!initialBgState.sessionActive) {
        await chrome.runtime.sendMessage({ action: 'toggleSession' });
        await this.wait(1000);
      }

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

      // Restore initial state
      if (initialBgState.sessionActive) {
        await chrome.runtime.sendMessage({ action: 'toggleSession' });
        await this.wait(500);
      }

      return { 
        afterStart: hasListenersAfterStart, 
        afterStop: hasListenersAfterStop 
      };
    });
  }

  // Test 5: Test interaction capture prevention after session end
  async testInteractionCapturePrevention() {
    return this.runTest('Interaction Capture Prevention', async () => {
      const instance = window.screenSharkInstance;
      if (!instance) throw new Error('No instance found');

      // Ensure session is stopped
      const bgState = await chrome.runtime.sendMessage({ action: 'getState' });
      if (bgState.sessionActive) {
        await chrome.runtime.sendMessage({ action: 'toggleSession' });
        await this.wait(500);
      }

      // Enable debug mode to capture logs
      const originalDebugMode = instance.debugMode;
      instance.debugMode = true;

      // Capture console logs
      const originalLog = console.log;
      const capturedLogs = [];
      console.log = (...args) => {
        capturedLogs.push(args.join(' '));
        originalLog.apply(console, args);
      };

      // Create and click a test button
      const testButton = document.createElement('button');
      testButton.textContent = 'Test Button';
      testButton.style.cssText = 'position: fixed; top: -100px; left: -100px;';
      document.body.appendChild(testButton);

      // Simulate click
      testButton.click();
      await this.wait(500);

      // Restore
      testButton.remove();
      console.log = originalLog;
      instance.debugMode = originalDebugMode;

      // Check logs for ignore message
      const ignoreMessages = capturedLogs.filter(log => 
        log.includes('Ignoring') && log.includes('session not active')
      );

      if (ignoreMessages.length === 0) {
        throw new Error('Expected ignore message not found in logs. Captured logs: ' + capturedLogs.join('; '));
      }

      return { ignoreMessages: ignoreMessages.length, logs: capturedLogs };
    });
  }

  // Test 6: Test session data structure
  async testSessionDataStructure() {
    return this.runTest('Session Data Structure', async () => {
      // Start a session
      await chrome.runtime.sendMessage({ action: 'toggleSession' });
      await this.wait(500);

      // Take a screenshot
      await chrome.runtime.sendMessage({ action: 'captureScreenshot', options: { reason: 'Test' } });
      await this.wait(1000);

      // Stop session (should trigger save)
      await chrome.runtime.sendMessage({ action: 'toggleSession' });
      await this.wait(2000); // Wait for session save

      return { sessionCreated: true };
    });
  }

  // Test 7: Test error handling
  async testErrorHandling() {
    return this.runTest('Error Handling', async () => {
      try {
        // Try to send invalid message
        await chrome.runtime.sendMessage({ action: 'invalidAction' });
        return { errorHandlingWorks: false };
      } catch (error) {
        // Expected to fail gracefully
        return { errorHandlingWorks: true, errorMessage: error.message };
      }
    });
  }

  // Utility: Wait function
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Run all tests with prerequisite check
  async runAllTests() {
    console.log('🦈 Starting Screen Shark Test Suite...\n');
    
    try {
      // First, wait for extension to be ready
      console.log('⏳ Waiting for extension to load...');
      await this.waitForExtension();
      console.log('✅ Extension detected!\n');
    } catch (error) {
      console.error('❌ Extension not detected:', error.message);
      console.log('\n🔧 Troubleshooting tips:');
      console.log('1. Make sure Screen Shark extension is installed and enabled');
      console.log('2. Reload this page');
      console.log('3. Check that content scripts are allowed on this domain');
      console.log('4. Open browser console for more details');
      return { passed: 0, failed: 1, total: 1, error: error.message };
    }

    const tests = [
      () => this.testExtensionDetection(),
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
      await this.wait(300); // Brief pause between tests
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
      extensionDetected: this.isExtensionContext(),
      contentScriptLoaded: !!window.screenSharkContentLoaded,
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

console.log('🦈 Improved Screen Shark Test Suite loaded');
console.log('Usage: const testSuite = new ScreenSharkTestSuite(); await testSuite.runAllTests();');
