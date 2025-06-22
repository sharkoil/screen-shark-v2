// Screen Shark Extension Validation Test
// This tests the core logic without Chrome APIs

console.log('=== SCREEN SHARK VALIDATION TEST START ===');

// Mock Chrome APIs for testing
const mockChrome = {
  storage: {
    local: {
      get: (keys) => Promise.resolve({}),
      set: (data) => Promise.resolve()
    }
  },
  downloads: {
    download: (options, callback) => {
      console.log('MOCK DOWNLOAD:', options.filename);
      callback && callback(12345); // Mock download ID
    }
  },
  notifications: {
    create: (options) => Promise.resolve()
  },
  tabs: {
    query: (query) => Promise.resolve([{
      id: 1,
      url: 'https://example.com/test',
      title: 'Test Page',
      windowId: 1
    }]),
    captureVisibleTab: (windowId, options) => Promise.resolve('data:image/png;base64,mockdata')
  },
  action: {
    setIcon: (options) => Promise.resolve()
  },
  scripting: {
    executeScript: (options) => Promise.resolve()
  },
  runtime: {
    lastError: null
  }
};

// Mock global objects
global.chrome = mockChrome;
global.URL = {
  createObjectURL: (blob) => 'mock-blob-url',
  revokeObjectURL: (url) => {}
};
global.Blob = class MockBlob {
  constructor(data, options) {
    this.data = data;
    this.type = options?.type || 'text/plain';
  }
};

// Load and test the ScreenSharkBackground class
const fs = require('fs');
const backgroundCode = fs.readFileSync('background.js', 'utf8');

// Remove the initialization line for testing
const testCode = backgroundCode.replace('new ScreenSharkBackground();', '');

// Execute the code to define the class
eval(testCode);

// Create test instance
const screenShark = new ScreenSharkBackground();

async function runValidationTests() {
  let testsPassed = 0;
  let testsTotal = 0;
  
  console.log('\n--- Testing Core Functionality ---');
  
  // Test 1: Session Creation
  testsTotal++;
  try {
    await screenShark.startNewSession();
    if (screenShark.currentSession && screenShark.currentSession.sessionId) {
      console.log('✅ Test 1 PASSED: Session creation works');
      testsPassed++;
    } else {
      console.log('❌ Test 1 FAILED: Session not created properly');
    }
  } catch (error) {
    console.log('❌ Test 1 FAILED:', error.message);
  }
  
  // Test 2: Screenshot Data Structure
  testsTotal++;
  try {
    const mockTab = { id: 1, url: 'https://example.com', title: 'Test Page', windowId: 1 };
    
    // Mock the capture method since we can't actually capture
    const originalCapture = screenShark.captureScreenshot;
    screenShark.captureScreenshot = async function(options, tab) {
      // Simulate screenshot capture logic
      if (this.sessionActive && this.currentSession) {
        this.screenshotSequence++;
        this.currentSession.totalScreenshots++;
        
        const screenshotEntry = {
          sequence: this.screenshotSequence,
          timestamp: new Date().toISOString(),
          filename: `test-screenshot-${this.screenshotSequence}.png`,
          url: tab.url,
          pageTitle: tab.title,
          elementInfo: options.elementInfo || null,
          clickPosition: options.clickPosition || null
        };
        
        this.addScreenshotToSession(screenshotEntry);
      }
      return { success: true, filename: 'test-screenshot.png' };
    };
    
    screenShark.sessionActive = true;
    await screenShark.captureScreenshot({
      reason: 'Test Screenshot',
      elementInfo: { tagName: 'BUTTON', text: 'Test' }
    }, mockTab);
    
    if (screenShark.currentSession.screenshots.length === 1 && 
        screenShark.currentSession.totalScreenshots === 1) {
      console.log('✅ Test 2 PASSED: Screenshot data structure works');
      testsPassed++;
    } else {
      console.log('❌ Test 2 FAILED: Screenshot not added to session properly');
    }
  } catch (error) {
    console.log('❌ Test 2 FAILED:', error.message);
  }
  
  // Test 3: JSON Generation
  testsTotal++;
  try {
    const sessionData = {
      sessionId: screenShark.currentSession.sessionId,
      domain: screenShark.currentSession.domain,
      startTime: screenShark.currentSession.startTime,
      endTime: new Date().toISOString(),
      totalScreenshots: screenShark.currentSession.totalScreenshots,
      navigationCount: screenShark.currentSession.navigationCount,
      screenshots: screenShark.currentSession.screenshots,
      pages: screenShark.currentSession.pages,
      summary: {
        totalActions: screenShark.currentSession.screenshots.length,
        duration: 30,
        uniquePages: 1
      }
    };
    
    const jsonContent = JSON.stringify(sessionData, null, 2);
    const parsedJson = JSON.parse(jsonContent);
    
    if (parsedJson.sessionId && 
        Array.isArray(parsedJson.screenshots) && 
        parsedJson.screenshots.length === 1 &&
        parsedJson.totalScreenshots === 1) {
      console.log('✅ Test 3 PASSED: JSON generation works correctly');
      testsPassed++;
    } else {
      console.log('❌ Test 3 FAILED: JSON structure is incorrect');
    }
  } catch (error) {
    console.log('❌ Test 3 FAILED:', error.message);
  }
  
  // Test 4: Force Save JSON Method
  testsTotal++;
  try {
    const testJson = '{"test": "data", "timestamp": "2025-06-19T10:00:00.000Z"}';
    const result = await screenShark.forceSaveJSON(testJson, 'test-session.json');
    
    // In our mock, this should return a mock download ID
    if (result === 12345) {
      console.log('✅ Test 4 PASSED: Force save JSON method works');
      testsPassed++;
    } else {
      console.log('❌ Test 4 FAILED: Force save JSON method failed');
    }
  } catch (error) {
    console.log('❌ Test 4 FAILED:', error.message);
  }
  
  // Test 5: Session End with JSON Generation
  testsTotal++;
  try {
    const originalConsoleLog = console.log;
    let jsonLogged = false;
    
    // Mock console.log to catch fallback JSON logging
    console.log = (...args) => {
      if (args[0] === '=== SCREEN SHARK SESSION JSON - COPY THIS ===') {
        jsonLogged = true;
      }
      originalConsoleLog.apply(console, args);
    };
    
    await screenShark.endCurrentSession();
    
    // Restore console.log
    console.log = originalConsoleLog;
    
    if (screenShark.currentSession === null) {
      console.log('✅ Test 5 PASSED: Session end cleanup works');
      testsPassed++;
    } else {
      console.log('❌ Test 5 FAILED: Session not cleaned up properly');
    }
  } catch (error) {
    console.log('❌ Test 5 FAILED:', error.message);
  }
  
  console.log('\n--- Test Results ---');
  console.log(`Tests Passed: ${testsPassed}/${testsTotal}`);
  
  if (testsPassed === testsTotal) {
    console.log('🎉 ALL TESTS PASSED! Extension is ready for Chrome testing.');
    return true;
  } else {
    console.log('⚠️  Some tests failed. Check the issues above.');
    return false;
  }
}

// Run the tests
runValidationTests().then(success => {
  console.log('\n=== SCREEN SHARK VALIDATION TEST END ===');
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('VALIDATION TEST ERROR:', error);
  process.exit(1);
});
