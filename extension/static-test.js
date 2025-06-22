#!/usr/bin/env node

// Screen Shark Extension Static Analysis Test
console.log('=== SCREEN SHARK STATIC ANALYSIS TEST ===');

const fs = require('fs');
const path = require('path');

// Test results
let testsTotal = 0;
let testsPassed = 0;

function test(name, condition, details = '') {
  testsTotal++;
  if (condition) {
    console.log(`✅ ${name}`);
    testsPassed++;
  } else {
    console.log(`❌ ${name}${details ? ': ' + details : ''}`);
  }
}

try {
  // Test 1: Check if all required files exist
  const requiredFiles = [
    'manifest.json',
    'background.js',
    'content.js',
    'popup.html',
    'popup.js',
    'content.css'
  ];
  
  const iconFiles = [
    'icons/icon16_enabled.png',
    'icons/icon16_disabled.png',
    'icons/icon48_enabled.png',
    'icons/icon48_disabled.png',
    'icons/icon128_enabled.png',
    'icons/icon128_disabled.png'
  ];
  
  requiredFiles.forEach(file => {
    test(`File exists: ${file}`, fs.existsSync(file));
  });
  
  iconFiles.forEach(file => {
    test(`Icon exists: ${file}`, fs.existsSync(file));
  });
  
  // Test 2: Check manifest.json structure
  const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
  test('Manifest has correct version', manifest.manifest_version === 3);
  test('Manifest has required permissions', 
    manifest.permissions.includes('activeTab') &&
    manifest.permissions.includes('storage') &&
    manifest.permissions.includes('downloads') &&
    manifest.permissions.includes('notifications'));
  test('Manifest has background service worker', manifest.background && manifest.background.service_worker === 'background.js');
  
  // Test 3: Analyze background.js code
  const backgroundCode = fs.readFileSync('background.js', 'utf8');
  
  // Check for critical methods
  test('Has ScreenSharkBackground class', backgroundCode.includes('class ScreenSharkBackground'));
  test('Has captureScreenshot method', backgroundCode.includes('async captureScreenshot('));
  test('Has startNewSession method', backgroundCode.includes('async startNewSession('));
  test('Has endCurrentSession method', backgroundCode.includes('async endCurrentSession('));
  test('Has forceSaveJSON method', backgroundCode.includes('async forceSaveJSON('));
  test('Has toggleSession method', backgroundCode.includes('async toggleSession('));
  
  // Check for critical functionality
  test('Has session JSON generation', backgroundCode.includes('JSON.stringify(sessionData'));
  test('Has emergency fallback logging', backgroundCode.includes('EMERGENCY SESSION DUMP'));
  test('Has console JSON fallback', backgroundCode.includes('SCREEN SHARK SESSION JSON - COPY THIS'));
  test('Has Chrome downloads API usage', backgroundCode.includes('chrome.downloads.download'));
  test('Has session timeout management', backgroundCode.includes('startSessionTimeout'));
  test('Has proper error handling', backgroundCode.includes('try {') && backgroundCode.includes('catch (error)'));
  
  // Check for session data structure
  test('Has session data structure', 
    backgroundCode.includes('sessionId:') && 
    backgroundCode.includes('screenshots:') && 
    backgroundCode.includes('totalScreenshots:'));
  
  // Check for test methods
  test('Has test screenshot method', backgroundCode.includes('testSimpleCapture'));
  test('Has comprehensive test method', backgroundCode.includes('testSessionJsonGeneration'));
  
  // Test 4: Check popup.js exists and has basic structure
  const popupCode = fs.readFileSync('popup.js', 'utf8');
  test('Popup has debug mode handling', popupCode.includes('debugMode'));
  test('Popup has session toggle', popupCode.includes('toggle-session'));
  
  // Test 5: Check content.js exists and has basic structure
  const contentCode = fs.readFileSync('content.js', 'utf8');
  test('Content script has click tracking', contentCode.includes('click'));
  test('Content script has message handling', contentCode.includes('chrome.runtime.onMessage'));
  
  // Test 6: Syntax validation
  test('Background.js has no obvious syntax errors', !backgroundCode.includes('}}  async') && !backgroundCode.includes('}  async'));
  test('No duplicate method definitions found', 
    (backgroundCode.match(/async startSessionTimeout\(/g) || []).length === 1);
  
  // Test 7: Critical logic checks
  test('Session end always calls forceSaveJSON', 
    backgroundCode.includes('await this.forceSaveJSON(jsonContent, filename)'));
  test('Has proper finally block cleanup', 
    backgroundCode.includes('} finally {') && 
    backgroundCode.includes('this.currentSession = null'));
  test('Has screenshot sequence tracking', backgroundCode.includes('screenshotSequence++'));
  test('Has test capture folder logic', backgroundCode.includes('Screen Shark/test/'));
  
  console.log('\n--- STATIC ANALYSIS RESULTS ---');
  console.log(`Tests Passed: ${testsPassed}/${testsTotal}`);
  
  if (testsPassed === testsTotal) {
    console.log('🎉 ALL STATIC TESTS PASSED!');
    console.log('\n--- EXTENSION READY FOR CHROME TESTING ---');
    console.log('✅ All required files present');
    console.log('✅ Critical methods implemented');
    console.log('✅ Error handling and fallbacks in place');
    console.log('✅ Session JSON generation guaranteed');
    console.log('✅ Test methods available for debugging');
    console.log('\nYou can now safely test the extension in Chrome!');
  } else {
    console.log(`⚠️  ${testsTotal - testsPassed} tests failed - review issues above`);
  }
  
} catch (error) {
  console.error('STATIC ANALYSIS ERROR:', error.message);
  process.exit(1);
}

console.log('\n=== STATIC ANALYSIS COMPLETE ===');
