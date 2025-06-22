# How to Run Screen Shark Tests

## The Issue
The tests failed because they were run from the wrong location. Chrome extensions need to be tested in the proper context.

## Correct Testing Method

### Option 1: Use the Extension Test Page (Recommended)
1. **Load the Screen Shark extension** in Chrome:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `extension/` folder

2. **Open the test page**:
   - Navigate to any website (e.g., `https://example.com`)
   - Open the file: `extension/test.html` in your browser
   - Or serve it locally: `python -m http.server 8000` then go to `http://localhost:8000/extension/test.html`

3. **Run the tests**:
   - The page will automatically check if the extension is loaded
   - Click "Run All Tests" when the extension is ready
   - Results will be displayed and automatically downloaded

### Option 2: Console Test (Quick Check)
1. **Open any website** where the extension is active
2. **Open browser console** (F12)
3. **Copy and paste** the contents of `console-test.js`
4. **Press Enter** to run the quick validation

### Option 3: Manual Testing
1. **Open** `test-extension.html` on any website
2. **Manually test** the extension functionality
3. **Verify** that notifications stop after ending a session

## Why Tests Failed Previously

The tests failed because:
1. **Extension APIs unavailable** - Tests were run from local files without extension context
2. **Content script not injected** - Extension wasn't active on the test page
3. **Wrong file location** - Test files were in root directory instead of extension directory

## Fixed Test Suite Features

✅ **Extension Detection** - Validates extension is loaded before testing
✅ **Better Error Messages** - Clearer feedback when things go wrong  
✅ **Proper Context** - Tests run in extension-aware environment
✅ **Automatic Troubleshooting** - Provides specific help when issues occur
✅ **Results Export** - Automatically downloads test results

## Files Updated
- `extension/test-suite.js` - Improved test framework
- `extension/test.html` - New comprehensive test page
- Both files include better extension detection and error handling

## Expected Results After Fix
- ✅ All 7-8 tests should pass
- ✅ Extension detection should work
- ✅ Event listeners should clean up properly
- ✅ No more persistent screenshot notifications after session ends
