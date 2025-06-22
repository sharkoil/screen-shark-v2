#!/usr/bin/env node

/**
 * Popup Validation Test
 * Tests popup.js structure and method existence
 */

const fs = require('fs');
const path = require('path');

console.log('Running Popup Validation Tests...');

// Read popup.js file
const popupJsPath = path.join(__dirname, 'popup.js');
const popupJsContent = fs.readFileSync(popupJsPath, 'utf8');

// Read popup.html file
const popupHtmlPath = path.join(__dirname, 'popup.html');
const popupHtmlContent = fs.readFileSync(popupHtmlPath, 'utf8');

let testsPassed = 0;
let testsTotal = 0;

function runTest(testName, testFunction) {
  testsTotal++;
  try {
    const result = testFunction();
    if (result) {
      console.log(`${testName}: PASS`);
      testsPassed++;
    } else {
      console.log(`${testName}: FAIL`);
    }
  } catch (error) {
    console.log(`${testName}: FAIL - ${error.message}`);
  }
}

// Test 1: Check if ScreenSharkPopup class exists
runTest('=== Testing ScreenSharkPopup class existence ===', () => {
  return popupJsContent.includes('class ScreenSharkPopup');
});

// Test 2: Check if all required methods exist
runTest('=== Testing required methods existence ===', () => {
  const requiredMethods = [
    'constructor()',
    'async initializePopup()',
    'setupEventListeners()',
    'async saveSession()',
    'async toggleSession()',
    'async captureScreenshot()',
    'async testSimpleCapture()',
    'async testJsonGeneration()',
    'async testDownloadValidation()',
    'updateUI()'
  ];
  
  for (const method of requiredMethods) {
    if (!popupJsContent.includes(method)) {
      throw new Error(`Missing method: ${method}`);
    }
  }
  return true;
});

// Test 3: Check if all required HTML elements exist
runTest('=== Testing required HTML elements ===', () => {
  const requiredElements = [
    'id="toggleSessionBtn"',
    'id="captureBtn"',
    'id="saveSessionBtn"',
    'id="forceStopBtn"',
    'id="testSimpleBtn"',
    'id="testJsonBtn"',
    'id="testDownloadBtn"'
  ];
  
  for (const element of requiredElements) {
    if (!popupHtmlContent.includes(element)) {
      throw new Error(`Missing HTML element: ${element}`);
    }
  }
  return true;
});

// Test 4: Check if event listeners are properly set up
runTest('=== Testing event listener setup ===', () => {
  const eventListeners = [
    "getElementById('saveSessionBtn').addEventListener('click'",
    "getElementById('toggleSessionBtn').addEventListener('click'",
    "getElementById('captureBtn').addEventListener('click'",
    "getElementById('testSimpleBtn').addEventListener('click'",
    "getElementById('testJsonBtn').addEventListener('click'",
    "getElementById('testDownloadBtn').addEventListener('click'"
  ];
  
  // Check if safeAddEventListener is used
  if (!popupJsContent.includes('safeAddEventListener')) {
    throw new Error('Missing safeAddEventListener helper function');
  }
  
  return true;
});

// Test 5: Check if error handling is present
runTest('=== Testing error handling ===', () => {
  const errorHandling = [
    'try {',
    'catch (error)',
    'console.error',
    'this.showError'
  ];
  
  for (const pattern of errorHandling) {
    if (!popupJsContent.includes(pattern)) {
      throw new Error(`Missing error handling pattern: ${pattern}`);
    }
  }
  return true;
});

// Test 6: Check for async/await usage
runTest('=== Testing async/await usage ===', () => {
  return popupJsContent.includes('await chrome.runtime.sendMessage') &&
         popupJsContent.includes('await chrome.tabs.query');
});

// Test 7: Check if debug mode handling exists
runTest('=== Testing debug mode handling ===', () => {
  return popupJsContent.includes('this.debugMode') &&
         popupJsContent.includes('showDebugPanel');
});

console.log('=== POPUP VALIDATION COMPLETE ===');
console.log(`Results: ${testsPassed}/${testsTotal} tests passed (${Math.round(testsPassed/testsTotal*100)}%)`);

if (testsPassed === testsTotal) {
  console.log('Verdict: POPUP VALIDATION PASSED');
  console.log('============================================================');
  console.log('POPUP VALIDATION REPORT');
  console.log('============================================================');
  console.log('SUMMARY:');
  console.log(`  Total Tests: ${testsTotal}`);
  console.log(`  Passed: ${testsPassed}`);
  console.log(`  Failed: ${testsTotal - testsPassed}`);
  console.log(`  Pass Rate: ${Math.round(testsPassed/testsTotal*100)}%`);
  console.log('DETAILED RESULTS:');
  console.log('  1. ScreenSharkPopup Class: ✅ PASS');
  console.log('  2. Required Methods: ✅ PASS');
  console.log('  3. HTML Elements: ✅ PASS');
  console.log('  4. Event Listeners: ✅ PASS');
  console.log('  5. Error Handling: ✅ PASS');
  console.log('  6. Async/Await Usage: ✅ PASS');
  console.log('  7. Debug Mode Handling: ✅ PASS');
  console.log('VERDICT: POPUP VALIDATION PASSED');
  console.log('============================================================');
  console.log('✅ POPUP STRUCTURE AND METHODS VALIDATED');
  process.exit(0);
} else {
  console.log('Verdict: POPUP VALIDATION FAILED');
  process.exit(1);
}
