/**
 * Overlay Debug Test
 * Tests overlay visibility and screenshot capture with overlays
 */

class OverlayDebugTest {
  constructor() {
    this.testResults = [];
  }

  log(message, data = null) {
    console.log(`[Overlay Debug] ${message}`, data || '');
  }

  async testOverlayVisibility() {
    try {
      this.log('=== TESTING OVERLAY VISIBILITY ===');
      
      // Get current active tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs.length) {
        throw new Error('No active tab found');
      }
      
      const tab = tabs[0];
      this.log('Testing on tab:', { id: tab.id, url: tab.url });
      
      // Check if tab is accessible
      if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
        throw new Error('Cannot test on Chrome internal pages');
      }
      
      // Create test element info
      const mockElementInfo = {
        tagName: 'BUTTON',
        type: 'button',
        text: 'Test Element',
        className: 'test-class',
        position: { x: 100, y: 100, width: 120, height: 40 }
      };
      
      const mockClickPosition = { x: 160, y: 120 };
      
      // Test overlay creation
      this.log('Creating overlay...');
      const overlayResult = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (elementInfo, clickPosition) => {
          console.log('[Test] Creating overlay for testing...');
          
          // Remove any existing overlay
          const existing = document.getElementById('screen-shark-screenshot-overlay');
          if (existing) existing.remove();
          
          // Create overlay container
          const overlay = document.createElement('div');
          overlay.id = 'screen-shark-screenshot-overlay';
          overlay.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            pointer-events: none !important;
            z-index: 2147483647 !important;
            background: rgba(255, 0, 0, 0.1) !important;
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
          `;
          
          // Create highlight at test position
          const highlight = document.createElement('div');
          highlight.style.cssText = `
            position: absolute !important;
            left: ${clickPosition.x - 25}px !important;
            top: ${clickPosition.y - 25}px !important;
            width: 50px !important;
            height: 50px !important;
            border: 4px solid #FF6B35 !important;
            border-radius: 6px !important;
            background: rgba(255, 107, 53, 0.4) !important;
            box-shadow: 0 0 0 2px rgba(255, 255, 255, 1), 0 0 15px rgba(255, 107, 53, 0.8) !important;
            pointer-events: none !important;
            opacity: 1 !important;
            display: block !important;
            visibility: visible !important;
            z-index: 2147483648 !important;
          `;
          
          // Create label
          const label = document.createElement('div');
          label.textContent = `📸 TEST OVERLAY - ${elementInfo.tagName}`;
          label.style.cssText = `
            position: absolute !important;
            left: ${clickPosition.x - 25}px !important;
            top: ${clickPosition.y - 60}px !important;
            background: linear-gradient(135deg, #FF6B35, #F7931E) !important;
            color: white !important;
            padding: 6px 12px !important;
            border-radius: 6px !important;
            font-family: Arial, sans-serif !important;
            font-size: 12px !important;
            font-weight: 600 !important;
            white-space: nowrap !important;
            pointer-events: none !important;
            z-index: 2147483649 !important;
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
            border: 2px solid rgba(255, 255, 255, 0.8) !important;
          `;
          
          // Assemble overlay
          overlay.appendChild(highlight);
          overlay.appendChild(label);
          document.body.appendChild(overlay);
          
          // Force render
          overlay.offsetHeight;
          highlight.offsetHeight;
          label.offsetHeight;
          
          console.log('[Test] Overlay created and appended to body');
          
          return {
            created: true,
            overlayCount: document.querySelectorAll('#screen-shark-screenshot-overlay').length,
            highlightCount: overlay.children.length,
            overlayDisplay: getComputedStyle(overlay).display,
            overlayVisibility: getComputedStyle(overlay).visibility,
            overlayOpacity: getComputedStyle(overlay).opacity
          };
        },
        args: [mockElementInfo, mockClickPosition]
      });
      
      this.log('Overlay creation result:', overlayResult[0].result);
      
      // Wait for overlay to be fully rendered
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verify overlay is present and visible
      const verifyResult = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const overlay = document.getElementById('screen-shark-screenshot-overlay');
          if (!overlay) {
            return { present: false, reason: 'Overlay element not found' };
          }
          
          const style = getComputedStyle(overlay);
          const isVisible = style.display !== 'none' && 
                           style.visibility !== 'hidden' && 
                           style.opacity !== '0';
          
          const children = overlay.children;
          const childrenInfo = Array.from(children).map(child => ({
            tagName: child.tagName,
            display: getComputedStyle(child).display,
            visibility: getComputedStyle(child).visibility,
            opacity: getComputedStyle(child).opacity
          }));
          
          return {
            present: true,
            visible: isVisible,
            overlayDisplay: style.display,
            overlayVisibility: style.visibility,
            overlayOpacity: style.opacity,
            childCount: children.length,
            childrenInfo: childrenInfo,
            overlayRect: {
              width: overlay.offsetWidth,
              height: overlay.offsetHeight,
              top: overlay.offsetTop,
              left: overlay.offsetLeft
            }
          };
        }
      });
      
      this.log('Overlay verification result:', verifyResult[0].result);
      
      // Test screenshot capture with overlay
      this.log('Testing screenshot capture with overlay...');
      const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
        format: 'png',
        quality: 90
      });
      
      if (!dataUrl) {
        throw new Error('Screenshot capture failed');
      }
      
      this.log('Screenshot captured successfully, length:', dataUrl.length);
      
      // Save test screenshot
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `Screen Shark/test/overlay_test_${timestamp}.png`;
      
      const downloadId = await chrome.downloads.download({
        url: dataUrl,
        filename: filename,
        saveAs: false,
        conflictAction: 'uniquify'
      });
      
      this.log('Test screenshot saved:', filename);
      
      // Clean up overlay
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const overlay = document.getElementById('screen-shark-screenshot-overlay');
          if (overlay) {
            overlay.remove();
            console.log('[Test] Overlay removed');
          }
        }
      });
      
      return {
        success: true,
        overlayCreated: overlayResult[0].result,
        overlayVerified: verifyResult[0].result,
        screenshotCaptured: true,
        screenshotFilename: filename,
        downloadId: downloadId
      };
      
    } catch (error) {
      this.log('Overlay test failed:', error);
      return {
        success: false,
        error: error.message,
        stack: error.stack
      };
    }
  }
  
  async runAllTests() {
    this.log('Starting overlay debug tests...');
    
    const visibilityTest = await this.testOverlayVisibility();
    this.testResults.push({
      name: 'Overlay Visibility Test',
      result: visibilityTest
    });
    
    // Show notification with results
    const success = visibilityTest.success;
    const message = success ? 
      `Overlay test PASSED! Check ${visibilityTest.screenshotFilename}` :
      `Overlay test FAILED: ${visibilityTest.error}`;
    
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48_enabled.png',
      title: success ? 'Overlay Test Passed' : 'Overlay Test Failed',
      message: message
    });
    
    this.log('=== OVERLAY DEBUG TEST COMPLETED ===');
    this.log('Final results:', this.testResults);
    
    return {
      success: success,
      results: this.testResults
    };
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OverlayDebugTest;
}

// For direct execution in extension context
if (typeof chrome !== 'undefined' && chrome.runtime) {
  window.OverlayDebugTest = OverlayDebugTest;
}
