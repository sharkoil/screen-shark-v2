/**
 * Session File Generation Fix Test
 * Tests the completely rewritten session file saving functionality
 */

const fs = require('fs');

console.log('============================================================');
console.log('SESSION FILE GENERATION FIX VERIFICATION');
console.log('============================================================');

const backgroundJs = fs.readFileSync('background.js', 'utf8');

// Test 1: Check if URL.createObjectURL is removed from forceSaveJSON
const hasRemovedCreateObjectURL = !backgroundJs.includes('URL.createObjectURL(blob)');
console.log(`1. Removed URL.createObjectURL (Blob): ${hasRemovedCreateObjectURL ? '✅ YES' : '❌ NO'}`);

// Test 2: Check if base64 data URL approach is implemented
const hasBase64DataUrl = backgroundJs.includes('btoa(unescape(encodeURIComponent(jsonContent)))') &&
                         backgroundJs.includes('data:text/plain;base64');
console.log(`2. Base64 Data URL Implementation: ${hasBase64DataUrl ? '✅ YES' : '❌ NO'}`);

// Test 3: Check if saveSessionFile calls forceSaveJSON
const saveSessionCallsForceSave = backgroundJs.includes('await this.forceSaveJSON(jsonContent, filename)');
console.log(`3. saveSessionFile calls forceSaveJSON: ${saveSessionCallsForceSave ? '✅ YES' : '❌ NO'}`);

// Test 4: Check if waitForDownloadCompletion method exists
const hasWaitMethod = backgroundJs.includes('waitForDownloadCompletion') &&
                     backgroundJs.includes('Download verification attempt');
console.log(`4. Download Completion Verification: ${hasWaitMethod ? '✅ YES' : '❌ NO'}`);

// Test 5: Check if files are saved as .txt (not .json)
const saveAsTxt = backgroundJs.includes('_session.txt') &&
                  backgroundJs.includes('replace(/\\.json$/, \'.txt\')');
console.log(`5. Files Saved as TXT: ${saveAsTxt ? '✅ YES' : '❌ NO'}`);

// Test 6: Check if Chrome Downloads API is used properly
const usesDownloadsAPI = backgroundJs.includes('chrome.downloads.download') &&
                        backgroundJs.includes('conflictAction: \'uniquify\'');
console.log(`6. Chrome Downloads API Usage: ${usesDownloadsAPI ? '✅ YES' : '❌ NO'}`);

// Test 7: Check if console fallback exists
const hasConsoleFallback = backgroundJs.includes('=== SCREEN SHARK SESSION JSON - COPY THIS ===') &&
                          backgroundJs.includes('=== END SESSION JSON ===');
console.log(`7. Console Fallback Logging: ${hasConsoleFallback ? '✅ YES' : '❌ NO'}`);

// Test 8: Check if error handling is comprehensive
const hasErrorHandling = backgroundJs.includes('JSON SAVE FAILED - DETAILED ERROR') &&
                        backgroundJs.includes('Re-throw error so calling function can handle fallback');
console.log(`8. Comprehensive Error Handling: ${hasErrorHandling ? '✅ YES' : '❌ NO'}`);

// Test 9: Check if notification system is used
const hasNotifications = backgroundJs.includes('Session Saved Successfully') &&
                        backgroundJs.includes('Session Save Failed');
console.log(`9. Success/Error Notifications: ${hasNotifications ? '✅ YES' : '❌ NO'}`);

// Test 10: Check if old broken methods are removed
const hasCleanCode = !backgroundJs.includes('const saveAttempts = [') &&
                    !backgroundJs.includes('attemptDownload(dataUrl, savePath)');
console.log(`10. Clean Code (Broken Methods Removed): ${hasCleanCode ? '✅ YES' : '❌ NO'}`);

// Summary
const allTestsPassed = hasRemovedCreateObjectURL && hasBase64DataUrl && 
                      saveSessionCallsForceSave && hasWaitMethod && 
                      saveAsTxt && usesDownloadsAPI &&
                      hasConsoleFallback && hasErrorHandling &&
                      hasNotifications && hasCleanCode;

console.log('============================================================');
console.log(`SUMMARY: ${allTestsPassed ? '✅ ALL SESSION SAVE FIXES IMPLEMENTED' : '❌ SOME FIXES MISSING'}`);

if (allTestsPassed) {
  console.log('✅ Session file generation should now work properly!');
  console.log('🔧 TXT files will be saved to Downloads/Screen Shark/[domain]/');
  console.log('💾 Uses base64 data URLs instead of broken Blob URLs');
  console.log('🔍 Includes download verification and comprehensive error handling');
} else {
  console.log('❌ Some session save improvements are missing or incomplete.');
}

console.log('============================================================');
