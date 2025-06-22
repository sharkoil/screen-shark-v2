// Screen Shark Debug Helper
// Run this script in the browser console to debug Screen Shark issues

console.log('🦈 Screen Shark Debug Helper Loaded');

const ScreenSharkDebug = {
  // Check if content script is loaded
  checkContentScript() {
    console.log('=== Content Script Status ===');
    console.log('screenSharkContentLoaded:', window.screenSharkContentLoaded);
    console.log('screenSharkInstance:', window.screenSharkInstance);
    
    if (window.screenSharkInstance) {
      const instance = window.screenSharkInstance;
      console.log('Instance sessionActive:', instance.sessionActive);
      console.log('Instance debugMode:', instance.debugMode);
      console.log('Click handler exists:', !!instance.clickHandler);
      console.log('Submit handler exists:', !!instance.submitHandler);
      console.log('Floating button exists:', !!instance.floatingButton);
    }
  },

  // Check background script state
  async checkBackgroundState() {
    try {
      console.log('=== Background Script Status ===');
      const response = await chrome.runtime.sendMessage({ action: 'getState' });
      console.log('Background sessionActive:', response.sessionActive);
      console.log('Background debugMode:', response.debugMode);
      return response;
    } catch (error) {
      console.error('Failed to get background state:', error);
    }
  },

  // Force cleanup of content script
  forceCleanup() {
    console.log('=== Forcing Content Script Cleanup ===');
    if (window.screenSharkInstance) {
      window.screenSharkInstance.cleanup();
      console.log('Cleanup completed');
    } else {
      console.log('No instance to cleanup');
    }
  },

  // Test event listeners
  testEventListeners() {
    console.log('=== Testing Event Listeners ===');
    const testElement = document.createElement('button');
    testElement.textContent = 'Test Button';
    testElement.style.cssText = 'position: fixed; top: 10px; left: 10px; z-index: 999999; background: red; color: white; padding: 10px;';
    document.body.appendChild(testElement);
    
    console.log('Added test button. Click it to see if event listeners are working.');
    
    setTimeout(() => {
      testElement.remove();
      console.log('Test button removed');
    }, 10000);
  },

  // Enable debug mode for content script
  enableDebug() {
    if (window.screenSharkInstance) {
      window.screenSharkInstance.debugMode = true;
      console.log('Debug mode enabled for content script');
    }
  },

  // Get all active event listeners (requires browser dev tools)
  getEventListeners() {
    console.log('=== Active Event Listeners ===');
    console.log('Use getEventListeners(document) in Chrome DevTools console to see all listeners');
    console.log('Look for click and submit listeners with Screen Shark handlers');
  },

  // Run all checks
  async runAllChecks() {
    console.log('🦈 Running all Screen Shark debug checks...\n');
    this.checkContentScript();
    await this.checkBackgroundState();
    this.getEventListeners();
    console.log('\n✅ Debug checks completed');
  }
};

// Add to global scope
window.ScreenSharkDebug = ScreenSharkDebug;

console.log('Available commands:');
console.log('- ScreenSharkDebug.runAllChecks() - Run all debug checks');
console.log('- ScreenSharkDebug.checkContentScript() - Check content script status');
console.log('- ScreenSharkDebug.checkBackgroundState() - Check background script status');
console.log('- ScreenSharkDebug.forceCleanup() - Force cleanup of content script');
console.log('- ScreenSharkDebug.testEventListeners() - Test event listeners');
console.log('- ScreenSharkDebug.enableDebug() - Enable debug logging');
