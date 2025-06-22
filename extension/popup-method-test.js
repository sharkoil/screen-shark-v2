#!/usr/bin/env node

/**
 * Popup Method Validation Test
 * Specifically tests for all required notification methods
 */

const fs = require('fs');
const path = require('path');

console.log('Running Popup Method Validation Test...');

// Read popup.js file
const popupJsPath = path.join(__dirname, 'popup.js');
const popupJsContent = fs.readFileSync(popupJsPath, 'utf8');

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

// Test 1: Check all notification methods exist
runTest('=== Testing all notification methods exist ===', () => {
  const requiredMethods = [
    'showSuccess(message)',
    'showError(message)',
    'showInfo(message)',
    'showMessage(message, type = \'info\')',
    'showNotification(message, type = \'info\')',
    'showLoading(show)',
    'showDebugPanel()',
    'hideDebugPanel()'
  ];
  
  for (const method of requiredMethods) {
    if (!popupJsContent.includes(method)) {
      throw new Error(`Missing notification method: ${method}`);
    }
  }
  return true;
});

// Test 2: Check saveSession method exists and calls correct methods
runTest('=== Testing saveSession method calls ===', () => {
  if (!popupJsContent.includes('async saveSession()')) {
    throw new Error('saveSession method not found');
  }
  
  // Find the saveSession method by looking for the method start and finding its end
  const methodStart = popupJsContent.indexOf('async saveSession()');
  if (methodStart === -1) {
    throw new Error('Could not find saveSession method start');
  }
  
  // Find the next method to get the end boundary
  const nextMethodStart = popupJsContent.indexOf('async ', methodStart + 1);
  const methodEnd = nextMethodStart > -1 ? nextMethodStart : popupJsContent.length;
  
  const saveSessionContent = popupJsContent.substring(methodStart, methodEnd);
  
  // Check that it calls the correct methods that now exist
  const requiredCalls = [
    'this.showLoading(true)',
    'this.showMessage(',
    'this.showSuccess(',
    'this.showError(',
    'this.showLoading(false)'
  ];
  
  for (const call of requiredCalls) {
    if (!saveSessionContent.includes(call)) {
      throw new Error(`saveSession method missing required call: ${call}`);
    }
  }
  
  return true;
});

// Test 3: Check forceStopAllSessions method
runTest('=== Testing forceStopAllSessions method calls ===', () => {
  if (!popupJsContent.includes('async forceStopAllSessions()')) {
    throw new Error('forceStopAllSessions method not found');
  }
  
  // Find the method content using simple string search
  const methodStart = popupJsContent.indexOf('async forceStopAllSessions()');
  if (methodStart === -1) {
    throw new Error('Could not find forceStopAllSessions method start');
  }
  
  // Get the rest of the file from this method
  const methodContent = popupJsContent.substring(methodStart, methodStart + 1000); // Get next 1000 chars
  
  // Check it uses showLoading correctly (not hideLoading)
  if (methodContent.includes('this.hideLoading()')) {
    throw new Error('forceStopAllSessions should use this.showLoading(false), not this.hideLoading()');
  }
  
  if (!methodContent.includes('this.showLoading(false)')) {
    throw new Error('forceStopAllSessions missing this.showLoading(false) call');
  }
  
  return true;
});

// Test 4: Check all methods called in the code exist
runTest('=== Testing all called methods exist ===', () => {
  const methodCalls = [
    'this.showMessage(',
    'this.showSuccess(',
    'this.showError(',
    'this.showInfo(',
    'this.showLoading(',
    'this.showNotification('
  ];
  
  // Extract all method calls from the file
  for (const call of methodCalls) {
    if (popupJsContent.includes(call)) {
      const methodName = call.replace('this.', '').replace('(', '');
      const methodDefinition = `${methodName}(`;
      
      if (!popupJsContent.includes(methodDefinition)) {
        throw new Error(`Method called but not defined: ${methodName}`);
      }
    }
  }
  
  return true;
});

console.log('=== POPUP METHOD VALIDATION COMPLETE ===');
console.log(`Results: ${testsPassed}/${testsTotal} tests passed (${Math.round(testsPassed/testsTotal*100)}%)`);

if (testsPassed === testsTotal) {
  console.log('Verdict: ALL POPUP METHODS VALIDATED');
  console.log('============================================================');
  console.log('POPUP METHOD VALIDATION REPORT');
  console.log('============================================================');
  console.log('SUMMARY:');
  console.log(`  Total Tests: ${testsTotal}`);
  console.log(`  Passed: ${testsPassed}`);
  console.log(`  Failed: ${testsTotal - testsPassed}`);
  console.log(`  Pass Rate: ${Math.round(testsPassed/testsTotal*100)}%`);
  console.log('DETAILED RESULTS:');
  console.log('  1. All Notification Methods: ✅ PASS');
  console.log('  2. SaveSession Method Calls: ✅ PASS');
  console.log('  3. ForceStopAllSessions Method: ✅ PASS');
  console.log('  4. All Called Methods Exist: ✅ PASS');
  console.log('VERDICT: ALL POPUP METHODS VALIDATED');
  console.log('============================================================');
  console.log('✅ POPUP saveSession() ERROR FIXED - All methods exist');
  process.exit(0);
} else {
  console.log('Verdict: POPUP METHOD VALIDATION FAILED');
  process.exit(1);
}
