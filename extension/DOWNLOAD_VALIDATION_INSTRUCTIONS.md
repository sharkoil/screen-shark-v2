# Download Validation Test Instructions

## Overview
This document provides step-by-step instructions to validate that the Screen Shark extension can actually download JSON files to the user's Downloads folder.

## Problem Statement
Previous tests only validated code logic but did not verify that files are actually saved to disk. This test validates the complete Chrome downloads API integration.

## Test Methods

### Method 1: Automated Extension Test (Recommended)

1. **Load the Extension:**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `f:\Projects\screen-shark-v2\extension\` folder
   - Verify the extension loads without errors

2. **Enable Debug Mode:**
   - Click the Screen Shark extension icon in the toolbar
   - Toggle "Debug Mode" ON
   - You should see additional test buttons appear

3. **Run Download Validation Test:**
   - Click the "Test Download Validation" button (blue button with 💾 icon)
   - Wait for the test to complete (may take 10-15 seconds)
   - Check the popup message for results

4. **Verify Files Were Created:**
   - Open your Downloads folder
   - Navigate to `Downloads/Screen Shark/test/`
   - You should see files like:
     - `download_validation_*.json`
     - `download_validation_results_*.json`
   - Open these files to verify they contain valid JSON data

### Method 2: Manual Console Test

1. **Open Extension Context:**
   - Go to `chrome://extensions/`
   - Find Screen Shark extension and click "service worker" or "background page"
   - This opens the extension's background script console

2. **Run Console Test:**
   - Copy the contents of `console-download-test.js`
   - Paste into the console and press Enter
   - Watch for console output and success/failure messages

3. **Check Downloads:**
   - Look for `Downloads/Screen Shark/test/console_test_*.json`
   - Verify the file exists and contains valid JSON

### Method 3: Test JSON Generation Button

1. **Start a Test Session:**
   - Open the Screen Shark popup
   - Enable Debug Mode
   - Click "Test JSON Generation" button (purple button with 📋 icon)
   - Wait for completion message

2. **Verify Test Files:**
   - Check `Downloads/Screen Shark/test/` folder
   - Should contain session JSON files and screenshot files
   - Verify JSON structure is complete and valid

### Method 4: End-to-End Session Test

1. **Start Real Session:**
   - Click "Start Recording" in the popup
   - Navigate to a few web pages
   - Click on some elements to trigger screenshots
   - Click "Save Session" to end the session

2. **Verify Session Files:**
   - Check `Downloads/Screen Shark/[domain]/` folder
   - Should contain:
     - `[sessionId]_session.json` file
     - Multiple screenshot PNG files
   - Open the JSON file to verify it contains all session data

## Expected Results

### ✅ Success Indicators:
- JSON files appear in Downloads folder within 5 seconds
- Files contain valid JSON data with correct structure
- File sizes match expected content length
- Console shows "Download completed successfully" messages
- No Chrome runtime errors in console

### ❌ Failure Indicators:
- No files appear in Downloads folder
- Console shows "chrome.runtime.lastError" messages
- Files are empty or contain corrupt data
- Download timeout errors
- Permission denied errors

## Troubleshooting

### Downloads Not Working:
1. **Check Permissions:**
   - Verify `manifest.json` includes `"downloads"` permission
   - Check if user has granted downloads permission to Chrome

2. **Check Chrome Settings:**
   - Go to `chrome://settings/downloads`
   - Verify download location is accessible
   - Try changing download location temporarily

3. **Check Extension Installation:**
   - Reload the extension completely
   - Check for console errors during extension load
   - Verify all files are present in extension folder

### Files Not Appearing:
1. **Check Download Location:**
   - Files go to `[Chrome Downloads Folder]/Screen Shark/`
   - Default is usually `C:\Users\[username]\Downloads\Screen Shark\`

2. **Check File Permissions:**
   - Ensure Chrome has write access to Downloads folder
   - Try running Chrome as administrator temporarily

3. **Wait Longer:**
   - Some antivirus software delays file creation
   - Wait up to 30 seconds before declaring failure

## Validation Checklist

- [ ] Extension loads without errors
- [ ] Debug mode enables successfully
- [ ] Download validation test button appears
- [ ] Test completes without timeout
- [ ] Files appear in Downloads/Screen Shark/test/ folder
- [ ] JSON files contain valid, parseable data
- [ ] File sizes match expected content
- [ ] No error messages in console
- [ ] Multiple test methods all pass

## Critical Success Criteria

The extension MUST:
1. Actually create files in the user's Downloads folder
2. Generate valid JSON with complete session data
3. Create organized folder structure
4. Handle errors gracefully without breaking functionality
5. Work consistently across multiple test runs

If any of these criteria fail, the download functionality is broken and must be fixed before the extension can be considered complete.
