/**
 * Final Complete Test Suite for Screen Shark Extension
 * Runs all automated tests and validates the extension is ready for Chrome testing
 */

const { execSync } = require('child_process');
const fs = require('fs');

console.log('============================================================');
console.log('SCREEN SHARK EXTENSION - FINAL COMPLETE TEST SUITE');
console.log('============================================================');

const tests = [
  {
    name: 'Code Structure Validation',
    command: 'node code-validation-test.js',
    description: 'Validates all required methods and classes exist'
  },
  {
    name: 'Popup Validation', 
    command: 'node popup-validation-test.js',
    description: 'Validates popup structure and functionality'
  },
  {
    name: 'Popup Method Test',
    command: 'node popup-method-test.js', 
    description: 'Tests popup method calls and dependencies'
  },
  {
    name: 'Session Scenario Tests',
    command: 'node scenario-test.js',
    description: 'Tests session end scenarios and edge cases'
  },
  {
    name: 'Session Cleanup Tests', 
    command: 'node session-cleanup-test.js',
    description: 'Tests session cleanup and state management'
  },
  {
    name: 'JSON Generation Tests',
    command: 'node real-json-test.js',
    description: 'Tests JSON/TXT file generation logic'
  }
];

let totalTests = 0;
let passedTests = 0;
const results = [];

console.log('Running automated test suite...\n');

for (const test of tests) {
  console.log(`🧪 Running: ${test.name}`);
  console.log(`   ${test.description}`);
  
  try {
    totalTests++;
    const output = execSync(test.command, { 
      cwd: process.cwd(),
      encoding: 'utf8',
      timeout: 30000
    });
    
    // Check if test passed by looking for success indicators
    const success = output.includes('PASS') && 
                   !output.includes('FAIL') && 
                   (output.includes('100%') || output.includes('ALL') || output.includes('✅'));
    
    if (success) {
      console.log(`   ✅ PASSED\n`);
      passedTests++;
      results.push({ name: test.name, status: 'PASS', details: 'All checks passed' });
    } else {
      console.log(`   ❌ FAILED\n`);
      results.push({ name: test.name, status: 'FAIL', details: 'Some checks failed' });
    }
    
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}\n`);
    results.push({ name: test.name, status: 'ERROR', details: error.message });
  }
}

// Core file existence check
console.log('🔍 Checking core extension files...');
const coreFiles = [
  'manifest.json',
  'background.js', 
  'content.js',
  'popup.html',
  'popup.js'
];

let allFilesExist = true;
for (const file of coreFiles) {
  if (fs.existsSync(file)) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ ${file} - MISSING`);
    allFilesExist = false;
  }
}

console.log('\n============================================================');
console.log('FINAL TEST RESULTS SUMMARY');
console.log('============================================================');

console.log(`Total automated tests: ${totalTests}`);
console.log(`Passed tests: ${passedTests}`);
console.log(`Failed tests: ${totalTests - passedTests}`);
console.log(`Success rate: ${totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0}%`);

console.log('\nDetailed Results:');
results.forEach((result, index) => {
  const status = result.status === 'PASS' ? '✅' : '❌';
  console.log(`  ${index + 1}. ${result.name}: ${status} ${result.status}`);
});

console.log(`\nCore files check: ${allFilesExist ? '✅ ALL PRESENT' : '❌ MISSING FILES'}`);

if (passedTests === totalTests && allFilesExist) {
  console.log('\n🎉 ALL TESTS PASSED - EXTENSION READY FOR CHROME TESTING!');
  console.log('\nNext steps:');
  console.log('1. Load extension in Chrome Developer Mode');
  console.log('2. Test manual screenshot capture');
  console.log('3. Test session recording and TXT file generation');
  console.log('4. Verify TXT files are saved to Downloads/Screen Shark/[domain]/');
  console.log('5. Validate that TXT files contain valid JSON when opened');
} else {
  console.log('\n❌ SOME TESTS FAILED OR FILES MISSING');
  console.log('Please fix issues before loading in Chrome');
}

console.log('============================================================');
