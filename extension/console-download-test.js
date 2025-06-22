/**
 * Browser Console Test for Chrome Downloads API
 * 
 * Run this in the browser console while the Screen Shark extension is loaded
 * to manually test if downloads are working.
 */

console.log('=== Screen Shark Download API Test ===');

async function testScreenSharkDownload() {
  try {
    console.log('Testing download functionality...');
    
    // Create test data
    const testData = {
      test: 'manual browser console test',
      timestamp: new Date().toISOString(),
      message: 'This is a manual test of the Chrome downloads API'
    };
    
    const jsonContent = JSON.stringify(testData, null, 2);
    console.log('Test data created:', jsonContent.length, 'bytes');
    
    // Create blob and data URL
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const dataUrl = URL.createObjectURL(blob);
    console.log('Blob created:', blob.size, 'bytes');
    
    // Attempt download
    const filename = `Screen Shark/test/console_test_${Date.now()}.json`;
    console.log('Attempting download with filename:', filename);
    
    // Check if chrome.downloads is available
    if (typeof chrome === 'undefined' || !chrome.downloads) {
      console.error('ERROR: chrome.downloads API not available. Are you running this in the extension context?');
      return false;
    }
    
    const downloadId = await new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Download timeout after 10 seconds'));
      }, 10000);
      
      chrome.downloads.download({
        url: dataUrl,
        filename: filename,
        saveAs: false,
        conflictAction: 'uniquify'
      }, (downloadId) => {
        clearTimeout(timeoutId);
        
        if (chrome.runtime.lastError) {
          console.error('Chrome runtime error:', chrome.runtime.lastError);
          reject(new Error(chrome.runtime.lastError.message));
        } else if (!downloadId) {
          reject(new Error('No download ID returned'));
        } else {
          console.log('Download ID received:', downloadId);
          resolve(downloadId);
        }
      });
    });
    
    // Clean up blob URL
    URL.revokeObjectURL(dataUrl);
    console.log('Blob URL cleaned up');
    
    // Wait a moment for download to start
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check download status
    console.log('Checking download status...');
    const downloads = await chrome.downloads.search({ id: downloadId });
    const download = downloads[0];
    
    if (download) {
      console.log('Download found:', {
        id: download.id,
        filename: download.filename,
        state: download.state,
        bytesReceived: download.bytesReceived,
        totalBytes: download.totalBytes,
        url: download.url
      });
      
      if (download.state === 'complete') {
        console.log('✅ SUCCESS: Download completed successfully!');
        console.log('📁 Check your Downloads folder for:', download.filename);
        return true;
      } else if (download.state === 'in_progress') {
        console.log('⏳ Download in progress...');
        return 'in_progress';
      } else {
        console.log('❌ Download failed. State:', download.state);
        return false;
      }
    } else {
      console.log('❌ Download not found in history');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Error stack:', error.stack);
    return false;
  }
}

// Run the test
testScreenSharkDownload().then(result => {
  console.log('=== Test completed. Result:', result, '===');
}).catch(error => {
  console.error('=== Test failed with error:', error, '===');
});

// Also provide instructions
console.log(`
INSTRUCTIONS:
1. Make sure Screen Shark extension is loaded and enabled
2. Open the popup and enable Debug Mode
3. The test above should automatically run
4. Check your Downloads folder for: Downloads/Screen Shark/test/console_test_*.json
5. If it works, the JSON download functionality is working correctly
6. If it fails, there's an issue with the Chrome downloads API integration
`);
