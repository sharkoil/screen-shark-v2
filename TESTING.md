# Screen Shark Testing and Debugging Guide

## Issue 1: Screenshots continuing after session ends
**Root Cause**: Multiple content script instances creating duplicate event listeners

**Fixes Applied**:
1. Added global flag to prevent multiple content script instances
2. Added proper cleanup of previous instances
3. Enhanced event listener removal with detailed logging
4. Added session state verification between content and background scripts

## Issue 2: Session JSON save failures
**Root Cause**: Various potential issues with downloads API

**Fixes Applied**:
1. Added comprehensive error handling and logging
2. Added permission validation before download
3. Added timeout protection for download operations
4. Enhanced error messages for better debugging

## Testing Steps

### 1. Test Multiple Instance Prevention
```javascript
// In browser console:
console.log('Content script loaded:', window.screenSharkContentLoaded);
console.log('Instance exists:', !!window.screenSharkInstance);
```

### 2. Test Event Listener Cleanup
1. Start a recording session
2. Click some buttons/links (should capture screenshots)
3. Stop the session
4. Click buttons again (should NOT capture screenshots)
5. Check console for "Ignoring click - session not active" messages

### 3. Test Session JSON Saving
1. Start a recording session
2. Take a few screenshots
3. Stop the session
4. Check Downloads folder for "Screen Shark" directory
5. Verify JSON file contains session data

### 4. Use Debug Helper
```javascript
// Copy contents of debug-helper.js to browser console, then:
ScreenSharkDebug.runAllChecks();
```

## Debug Console Commands

```javascript
// Enable debug mode
if (window.screenSharkInstance) {
    window.screenSharkInstance.debugMode = true;
}

// Check current state
chrome.runtime.sendMessage({action: 'getState'}, response => {
    console.log('Background state:', response);
});

// Force cleanup
if (window.screenSharkInstance) {
    window.screenSharkInstance.cleanup();
}

// Check for event listeners (Chrome DevTools only)
getEventListeners(document);
```

## Expected Behavior After Fixes

1. **Session Start**: 
   - Toast notification appears
   - Floating button appears
   - Event listeners are attached
   - Debug logs show "Session started - listeners added"

2. **During Session**:
   - Clicks on interactive elements trigger screenshots
   - Toast notifications appear for each capture
   - Console shows interaction processing logs

3. **Session End**:
   - Toast notification appears
   - Floating button disappears
   - Event listeners are removed
   - Debug logs show "Session stopped - cleanup completed"
   - Session JSON file downloads successfully

4. **After Session**:
   - Clicks on interactive elements do NOT trigger screenshots
   - Console shows "Ignoring click - session not active" messages
   - No toast notifications for clicks

## Troubleshooting

### If screenshots still happen after session ends:
1. Check console for multiple content script instances
2. Use `ScreenSharkDebug.forceCleanup()` to force cleanup
3. Reload the page to reset content script

### If session JSON doesn't save:
1. Check Downloads permission in chrome://extensions
2. Check console for detailed error messages
3. Verify Downloads folder exists and is writable
4. Try with shorter domain names (avoid special characters)

### If extension stops working:
1. Reload the extension in chrome://extensions
2. Reload the web page
3. Check console for JavaScript errors
4. Use debug helper to diagnose issues
