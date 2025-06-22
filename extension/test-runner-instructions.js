/**
 * Screen Shark Extension Download Test Runner
 * 
 * This script provides instructions and helpers for testing the download functionality
 * of the Screen Shark extension.
 */

console.log(`
╔══════════════════════════════════════════════════════════════════════════════════╗
║                      SCREEN SHARK DOWNLOAD VALIDATION TEST                      ║
╚══════════════════════════════════════════════════════════════════════════════════╝

🚀 QUICK START INSTRUCTIONS:

1. LOAD EXTENSION:
   - Open chrome://extensions/
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select: f:\\Projects\\screen-shark-v2\\extension\\

2. ENABLE DEBUG MODE:
   - Click Screen Shark extension icon in toolbar
   - Toggle "Debug Mode" ON
   - You should see test buttons appear

3. RUN DOWNLOAD TEST:
   - Click "Test Download Validation" button (blue 💾 button)
   - Wait 10-15 seconds for completion
   - Check popup for success/failure message

4. VERIFY FILES CREATED:
   - Open Downloads folder
   - Look for "Screen Shark/test/" subfolder
   - Verify JSON files were created with valid content

═══════════════════════════════════════════════════════════════════════════════════

📋 ALTERNATIVE TEST METHODS:

METHOD A: Test JSON Generation Button
- Click "Test JSON Generation" (purple 📋 button)
- Checks end-to-end session JSON creation
- Files appear in Downloads/Screen Shark/test/[domain]/

METHOD B: Manual Session Test  
- Click "Start Recording"
- Navigate to a few pages, click some elements
- Click "Save Session" 
- Check Downloads/Screen Shark/[domain]/ for session files

METHOD C: Console Test (Advanced)
- Open extension background page console
- Copy/paste code from console-download-test.js
- Watch console output for success/failure

═══════════════════════════════════════════════════════════════════════════════════

✅ SUCCESS CRITERIA:
- JSON files appear in Downloads folder within 10 seconds
- Files contain valid JSON data with complete structure
- No timeout or permission errors in console
- File sizes match expected content length

❌ FAILURE INDICATORS:
- No files appear in Downloads folder after 30 seconds
- Console shows "chrome.runtime.lastError" messages  
- Files are empty or contain invalid JSON
- Extension popup shows error messages

═══════════════════════════════════════════════════════════════════════════════════

🔧 TROUBLESHOOTING:

Problem: No files appear
Solution: Check Chrome download settings, try different download location

Problem: Permission errors
Solution: Verify extension has "downloads" permission, reload extension

Problem: Timeout errors
Solution: Check antivirus software isn't blocking downloads

Problem: Invalid JSON
Solution: Check console for serialization errors

═══════════════════════════════════════════════════════════════════════════════════

📁 EXPECTED FILE LOCATIONS:

Downloads/Screen Shark/test/download_validation_*.json
Downloads/Screen Shark/test/download_validation_results_*.json  
Downloads/Screen Shark/test/[domain]/[sessionId]_session.json
Downloads/Screen Shark/test/console_test_*.json (if using console test)

═══════════════════════════════════════════════════════════════════════════════════

🎯 CRITICAL: The extension MUST actually create files in the Downloads folder.
Previous tests only validated logic - this validates real file creation!

`);

// Helper function to check if we're in the right context
function checkContext() {
  if (typeof chrome === 'undefined') {
    console.error('❌ ERROR: Not running in Chrome extension context');
    console.log('💡 TIP: Run this from the extension background page console');
    return false;
  }
  
  if (!chrome.downloads) {
    console.error('❌ ERROR: Chrome downloads API not available');
    console.log('💡 TIP: Check extension permissions include "downloads"');
    return false;
  }
  
  console.log('✅ Context check passed - Chrome extension APIs available');
  return true;
}

// Quick download test function
async function quickDownloadTest() {
  if (!checkContext()) return false;
  
  console.log('🧪 Running quick download test...');
  
  try {
    const testData = { 
      quickTest: true, 
      timestamp: new Date().toISOString(),
      message: 'Quick download validation test'
    };
    
    const blob = new Blob([JSON.stringify(testData, null, 2)], { type: 'application/json' });
    const dataUrl = URL.createObjectURL(blob);
    const filename = `Screen Shark/test/quick_test_${Date.now()}.json`;
    
    const downloadId = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout')), 8000);
      
      chrome.downloads.download({
        url: dataUrl,
        filename: filename,
        saveAs: false,
        conflictAction: 'uniquify'
      }, (id) => {
        clearTimeout(timeout);
        URL.revokeObjectURL(dataUrl);
        
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(id);
        }
      });
    });
    
    console.log('✅ Quick test PASSED - Download ID:', downloadId);
    console.log('📁 Check Downloads/Screen Shark/test/ for:', filename);
    return true;
    
  } catch (error) {
    console.error('❌ Quick test FAILED:', error.message);
    return false;
  }
}

// Export for manual use
if (typeof window !== 'undefined') {
  window.screenSharkTest = {
    checkContext,
    quickDownloadTest
  };
}

console.log(`
🚀 READY TO TEST! 

To run a quick test from this console: 
> await quickDownloadTest()

To check context: 
> checkContext()

For full testing, follow the instructions above! 📋
`);
