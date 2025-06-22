/**
 * Download Validation Test for Screen Shark Extension
 * 
 * This test validates that JSON files are actually downloaded to the user's Downloads folder.
 * It must be run from within the Chrome extension context to access the chrome.downloads API.
 */

class DownloadValidationTest {
  constructor() {
    this.testResults = {
      timestamp: new Date().toISOString(),
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0
      }
    };
  }

  log(message, data = null) {
    const logEntry = `[Download Test] ${message}`;
    console.log(logEntry, data || '');
    
    // Also add to our test results
    if (!this.testResults.logs) {
      this.testResults.logs = [];
    }
    this.testResults.logs.push({
      timestamp: new Date().toISOString(),
      message: logEntry,
      data: data
    });
  }

  async addTestResult(testName, passed, details = {}) {
    this.testResults.tests.push({
      name: testName,
      passed: passed,
      timestamp: new Date().toISOString(),
      details: details
    });
    
    this.testResults.summary.total++;
    if (passed) {
      this.testResults.summary.passed++;
    } else {
      this.testResults.summary.failed++;
    }
    
    this.log(`Test: ${testName} - ${passed ? 'PASSED' : 'FAILED'}`, details);
  }

  async testDownloadsPermission() {
    try {
      const permissions = await chrome.permissions.getAll();
      const hasDownloads = permissions.permissions.includes('downloads');
      
      await this.addTestResult('Downloads Permission Check', hasDownloads, {
        allPermissions: permissions.permissions,
        hasDownloads: hasDownloads
      });
      
      return hasDownloads;
    } catch (error) {
      await this.addTestResult('Downloads Permission Check', false, {
        error: error.message
      });
      return false;
    }
  }

  async testBasicDownload() {
    try {
      this.log('Testing basic download functionality...');
      
      // Create a simple test file
      const testContent = JSON.stringify({
        test: 'basic download test',
        timestamp: new Date().toISOString(),
        message: 'This is a test file to validate download functionality'
      }, null, 2);
      
      const blob = new Blob([testContent], { type: 'application/json' });
      const dataUrl = URL.createObjectURL(blob);
      const testFilename = `Screen Shark/test/basic_download_test_${Date.now()}.json`;
      
      // Attempt download
      const downloadId = await new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Download timeout after 15 seconds'));
        }, 15000);
        
        chrome.downloads.download({
          url: dataUrl,
          filename: testFilename,
          saveAs: false,
          conflictAction: 'uniquify'
        }, (downloadId) => {
          clearTimeout(timeoutId);
          
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (!downloadId) {
            reject(new Error('No download ID returned'));
          } else {
            resolve(downloadId);
          }
        });
      });
      
      // Clean up blob URL
      URL.revokeObjectURL(dataUrl);
      
      // Wait a moment for download to complete
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check download status
      const downloads = await chrome.downloads.search({ id: downloadId });
      const download = downloads[0];
      
      const downloadCompleted = download && download.state === 'complete';
      
      await this.addTestResult('Basic Download Test', downloadCompleted, {
        downloadId: downloadId,
        filename: testFilename,
        downloadState: download?.state,
        downloadExists: !!download,
        downloadUrl: download?.url,
        downloadFilename: download?.filename,
        downloadBytesReceived: download?.bytesReceived,
        downloadTotalBytes: download?.totalBytes
      });
      
      return downloadCompleted;
    } catch (error) {
      await this.addTestResult('Basic Download Test', false, {
        error: error.message,
        stack: error.stack
      });
      return false;
    }
  }

  async testSessionJsonDownload() {
    try {
      this.log('Testing session JSON download...');
      
      // Create a realistic session JSON structure
      const sessionData = {
        sessionId: `test-session-${Date.now()}`,
        domain: 'example.com',
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        totalScreenshots: 2,
        screenshots: [
          {
            sequence: 1,
            timestamp: new Date(Date.now() - 5000).toISOString(),
            filename: 'Screenshot_001.png',
            url: 'https://example.com/page1',
            pageTitle: 'Test Page 1',
            elementInfo: {
              tagName: 'BUTTON',
              text: 'Test Button',
              id: 'test-btn'
            },
            isInteraction: true
          },
          {
            sequence: 2,
            timestamp: new Date().toISOString(),
            filename: 'Screenshot_002.png',
            url: 'https://example.com/page2',
            pageTitle: 'Test Page 2',
            elementInfo: null,
            isInteraction: false
          }
        ],
        pages: [
          {
            url: 'https://example.com/page1',
            title: 'Test Page 1',
            visitCount: 1,
            firstVisit: new Date(Date.now() - 5000).toISOString()
          },
          {
            url: 'https://example.com/page2',
            title: 'Test Page 2',
            visitCount: 1,
            firstVisit: new Date().toISOString()
          }
        ],
        metadata: {
          userAgent: 'Test User Agent',
          viewportSize: { width: 1920, height: 1080 },
          extensionVersion: '1.0.0'
        }
      };
      
      const sessionJson = JSON.stringify(sessionData, null, 2);
      const blob = new Blob([sessionJson], { type: 'application/json' });
      const dataUrl = URL.createObjectURL(blob);
      const sessionFilename = `Screen Shark/test/${sessionData.domain}/${sessionData.sessionId}_session.json`;
      
      // Attempt download
      const downloadId = await new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Session download timeout after 15 seconds'));
        }, 15000);
        
        chrome.downloads.download({
          url: dataUrl,
          filename: sessionFilename,
          saveAs: false,
          conflictAction: 'uniquify'
        }, (downloadId) => {
          clearTimeout(timeoutId);
          
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (!downloadId) {
            reject(new Error('No download ID returned for session JSON'));
          } else {
            resolve(downloadId);
          }
        });
      });
      
      // Clean up blob URL
      URL.revokeObjectURL(dataUrl);
      
      // Wait for download to complete
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check download status
      const downloads = await chrome.downloads.search({ id: downloadId });
      const download = downloads[0];
      
      const downloadCompleted = download && download.state === 'complete';
      const fileSizeMatches = download && download.bytesReceived === sessionJson.length;
      
      await this.addTestResult('Session JSON Download Test', downloadCompleted && fileSizeMatches, {
        downloadId: downloadId,
        filename: sessionFilename,
        downloadState: download?.state,
        downloadExists: !!download,
        expectedSize: sessionJson.length,
        actualSize: download?.bytesReceived,
        fileSizeMatches: fileSizeMatches,
        sessionDataValid: sessionData.screenshots.length === 2
      });
      
      return downloadCompleted && fileSizeMatches;
    } catch (error) {
      await this.addTestResult('Session JSON Download Test', false, {
        error: error.message,
        stack: error.stack
      });
      return false;
    }
  }

  async testDownloadHistory() {
    try {
      this.log('Testing download history access...');
      
      // Search for recent downloads
      const recentDownloads = await chrome.downloads.search({
        limit: 10,
        orderBy: ['-startTime']
      });
      
      // Look for Screen Shark downloads
      const screenSharkDownloads = recentDownloads.filter(download => 
        download.filename && download.filename.includes('Screen Shark')
      );
      
      await this.addTestResult('Download History Access', true, {
        totalRecentDownloads: recentDownloads.length,
        screenSharkDownloads: screenSharkDownloads.length,
        recentScreenSharkFiles: screenSharkDownloads.map(d => ({
          filename: d.filename,
          state: d.state,
          startTime: d.startTime,
          bytesReceived: d.bytesReceived
        }))
      });
      
      return true;
    } catch (error) {
      await this.addTestResult('Download History Access', false, {
        error: error.message
      });
      return false;
    }
  }

  async testExtensionIntegration() {
    try {
      this.log('Testing extension integration...');
      
      // Check if we can communicate with the background script
      let backgroundAvailable = false;
      try {
        const response = await chrome.runtime.sendMessage({ action: 'getState' });
        backgroundAvailable = !!response;
      } catch (e) {
        // Background script might not be available
      }
      
      // Check storage access
      let storageAvailable = false;
      try {
        await chrome.storage.local.set({ testKey: 'testValue' });
        const result = await chrome.storage.local.get(['testKey']);
        storageAvailable = result.testKey === 'testValue';
        await chrome.storage.local.remove(['testKey']);
      } catch (e) {
        // Storage not available
      }
      
      await this.addTestResult('Extension Integration Test', backgroundAvailable && storageAvailable, {
        backgroundScriptAvailable: backgroundAvailable,
        storageAvailable: storageAvailable,
        chromeApiAvailable: typeof chrome !== 'undefined'
      });
      
      return backgroundAvailable && storageAvailable;
    } catch (error) {
      await this.addTestResult('Extension Integration Test', false, {
        error: error.message
      });
      return false;
    }
  }

  async saveTestResults() {
    try {
      this.log('Saving test results...');
      
      const resultsJson = JSON.stringify(this.testResults, null, 2);
      const blob = new Blob([resultsJson], { type: 'application/json' });
      const dataUrl = URL.createObjectURL(blob);
      const resultsFilename = `Screen Shark/test/download_validation_results_${Date.now()}.json`;
      
      const downloadId = await new Promise((resolve, reject) => {
        chrome.downloads.download({
          url: dataUrl,
          filename: resultsFilename,
          saveAs: false,
          conflictAction: 'uniquify'
        }, (downloadId) => {
          URL.revokeObjectURL(dataUrl);
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(downloadId);
          }
        });
      });
      
      this.log('Test results saved successfully', { downloadId, filename: resultsFilename });
      return true;
    } catch (error) {
      this.log('Failed to save test results:', error.message);
      return false;
    }
  }

  async runAllTests() {
    this.log('=== STARTING DOWNLOAD VALIDATION TESTS ===');
    
    try {
      // Test 1: Check permissions
      await this.testDownloadsPermission();
      
      // Test 2: Basic download functionality
      await this.testBasicDownload();
      
      // Test 3: Session JSON download
      await this.testSessionJsonDownload();
      
      // Test 4: Download history access
      await this.testDownloadHistory();
      
      // Test 5: Extension integration
      await this.testExtensionIntegration();
      
      // Save results
      await this.saveTestResults();
      
      this.log('=== DOWNLOAD VALIDATION TESTS COMPLETED ===');
      this.log('Test Summary:', this.testResults.summary);
      
      // Return summary
      return {
        success: this.testResults.summary.failed === 0,
        summary: this.testResults.summary,
        results: this.testResults
      };
      
    } catch (error) {
      this.log('Critical test failure:', error.message);
      return {
        success: false,
        error: error.message,
        summary: this.testResults.summary,
        results: this.testResults
      };
    }
  }
}

// Export for use in extension context
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DownloadValidationTest };
} else if (typeof window !== 'undefined') {
  window.DownloadValidationTest = DownloadValidationTest;
}
