/**
 * Comprehensive Syntax Validation for Screen Shark Extension
 * Validates all JavaScript files for syntax errors
 */

const fs = require('fs');
const path = require('path');

function validateJavaScriptFile(filename) {
  console.log(`\n=== Validating ${filename} ===`);
  
  try {
    // Check if file exists
    if (!fs.existsSync(filename)) {
      console.log(`❌ ERROR: File ${filename} not found`);
      return false;
    }
    
    // Read file content
    const content = fs.readFileSync(filename, 'utf8');
    console.log(`📄 File size: ${content.length} characters`);
    
    // Try to parse as JavaScript
    try {
      new Function(content);
      console.log(`✅ ${filename}: No syntax errors detected`);
      return true;
    } catch (syntaxError) {
      console.log(`❌ ${filename}: Syntax error found`);
      console.log(`   Error: ${syntaxError.message}`);
      
      // Try to identify line number if possible
      if (syntaxError.message.includes('line')) {
        console.log(`   Details: ${syntaxError.message}`);
      }
      
      return false;
    }
    
  } catch (error) {
    console.log(`❌ ERROR reading ${filename}: ${error.message}`);
    return false;
  }
}

function runAllSyntaxChecks() {
  console.log('============================================================');
  console.log('SCREEN SHARK EXTENSION - COMPREHENSIVE SYNTAX VALIDATION');
  console.log('============================================================');
  
  const filesToCheck = [
    'background.js',
    'content.js', 
    'popup.js',
    'test-suite.js',
    'console-test.js',
    'debug-helper.js',
    'session-cleanup-test.js',
    'code-validation-test.js',
    'scenario-test.js',
    'real-json-test.js',
    'popup-validation-test.js',
    'popup-method-test.js'
  ];
  
  let totalFiles = 0;
  let passedFiles = 0;
  
  for (const filename of filesToCheck) {
    if (fs.existsSync(filename)) {
      totalFiles++;
      if (validateJavaScriptFile(filename)) {
        passedFiles++;
      }
    } else {
      console.log(`⚠️  ${filename}: File not found (skipping)`);
    }
  }
  
  console.log('\n============================================================');
  console.log('SYNTAX VALIDATION SUMMARY');
  console.log('============================================================');
  console.log(`Total files checked: ${totalFiles}`);
  console.log(`Files with no syntax errors: ${passedFiles}`);
  console.log(`Files with syntax errors: ${totalFiles - passedFiles}`);
  console.log(`Success rate: ${totalFiles > 0 ? Math.round((passedFiles / totalFiles) * 100) : 0}%`);
  
  if (passedFiles === totalFiles && totalFiles > 0) {
    console.log('\n✅ ALL FILES PASSED SYNTAX VALIDATION');
    console.log('🚀 Extension code is syntactically correct and ready for browser testing');
  } else {
    console.log('\n❌ SOME FILES HAVE SYNTAX ERRORS');
    console.log('🔧 Please fix syntax errors before loading in Chrome');
  }
  
  console.log('============================================================');
}

// Run the validation
runAllSyntaxChecks();
