/**
 * CRITICAL OVERLAY FIX TEST
 * This test addresses the critical issue where overlays are not appearing in screenshots
 */

// Test function to run in browser console or extension
async function testOverlayVisibilityFix() {
  console.log('=== CRITICAL OVERLAY FIX TEST ===');
  
  try {
    // Get current tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs.length) {
      console.error('No active tab found');
      return;
    }
    
    const tab = tabs[0];
    console.log('Testing overlay on tab:', tab.url);
    
    // Check if we can access the tab
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      console.error('Cannot test on Chrome internal pages');
      return;
    }
    
    // Test 1: Create overlay with maximum visibility
    console.log('Step 1: Creating highly visible overlay...');
    
    const overlayCreateResult = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        // Remove any existing overlay
        const existing = document.getElementById('screen-shark-screenshot-overlay');
        if (existing) existing.remove();
        
        // Create container with maximum visibility
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
          background: rgba(255, 0, 0, 0.05) !important;
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
        `;
        
        // Create highly visible highlight in center of screen
        const highlight = document.createElement('div');
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        
        highlight.style.cssText = `
          position: absolute !important;
          left: ${centerX - 50}px !important;
          top: ${centerY - 50}px !important;
          width: 100px !important;
          height: 100px !important;
          border: 8px solid #FF0000 !important;
          border-radius: 12px !important;
          background: rgba(255, 0, 0, 0.6) !important;
          box-shadow: 0 0 0 4px rgba(255, 255, 255, 1), 0 0 30px rgba(255, 0, 0, 1) !important;
          pointer-events: none !important;
          opacity: 1 !important;
          display: block !important;
          visibility: visible !important;
          z-index: 2147483648 !important;
        `;
        
        // Create very visible label
        const label = document.createElement('div');
        label.textContent = 'OVERLAY TEST - SHOULD BE VISIBLE IN SCREENSHOT';
        label.style.cssText = `
          position: absolute !important;
          left: ${centerX - 150}px !important;
          top: ${centerY - 90}px !important;
          background: #FF0000 !important;
          color: white !important;
          padding: 10px 15px !important;
          border-radius: 8px !important;
          font-family: Arial, sans-serif !important;
          font-size: 14px !important;
          font-weight: 700 !important;
          white-space: nowrap !important;
          pointer-events: none !important;
          z-index: 2147483649 !important;
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5) !important;
          border: 3px solid rgba(255, 255, 255, 1) !important;
        `;
        
        // Assemble overlay
        overlay.appendChild(highlight);
        overlay.appendChild(label);
        document.body.appendChild(overlay);
        
        // Force multiple repaints
        for (let i = 0; i < 10; i++) {
          overlay.offsetHeight;
          highlight.offsetHeight;
          label.offsetHeight;
          
          // Force style recalculation
          window.getComputedStyle(overlay).display;
          window.getComputedStyle(highlight).display;
          window.getComputedStyle(label).display;
        }
        
        console.log('✅ Overlay created and forced to render');
        
        return {
          success: true,
          overlayId: overlay.id,
          overlayRect: {
            width: overlay.offsetWidth,
            height: overlay.offsetHeight
          },
          highlightRect: {
            width: highlight.offsetWidth,
            height: highlight.offsetHeight,
            left: highlight.offsetLeft,
            top: highlight.offsetTop
          },
          centerPosition: { x: centerX, y: centerY }
        };
      }
    });
    
    console.log('Overlay creation result:', overlayCreateResult[0].result);
    
    // Step 2: Wait for overlay to be fully rendered
    console.log('Step 2: Waiting for overlay to fully render...');
    await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second wait
    
    // Step 3: Verify overlay is still present and visible
    console.log('Step 3: Verifying overlay visibility...');
    
    const verifyResult = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const overlay = document.getElementById('screen-shark-screenshot-overlay');
        if (!overlay) {
          return { present: false, error: 'Overlay not found' };
        }
        
        const style = getComputedStyle(overlay);
        const children = Array.from(overlay.children);
        
        return {
          present: true,
          overlayVisible: style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0',
          overlayStyle: {
            display: style.display,
            visibility: style.visibility,
            opacity: style.opacity,
            zIndex: style.zIndex
          },
          childCount: children.length,
          childrenVisible: children.map(child => {
            const childStyle = getComputedStyle(child);
            return {
              visible: childStyle.display !== 'none' && childStyle.visibility !== 'hidden' && childStyle.opacity !== '0',
              display: childStyle.display,
              visibility: childStyle.visibility,
              opacity: childStyle.opacity
            };
          })
        };
      }
    });
    
    console.log('Overlay verification result:', verifyResult[0].result);
    
    // Step 4: Capture screenshot with overlay
    console.log('Step 4: Capturing screenshot with overlay...');
    
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: 'png',
      quality: 100 // Maximum quality
    });
    
    if (!dataUrl) {
      throw new Error('Screenshot capture failed');
    }
    
    console.log('✅ Screenshot captured, size:', dataUrl.length);
    
    // Step 5: Save test screenshot
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `Screen Shark/test/CRITICAL_OVERLAY_TEST_${timestamp}.png`;
    
    const downloadId = await chrome.downloads.download({
      url: dataUrl,
      filename: filename,
      saveAs: false,
      conflictAction: 'uniquify'
    });
    
    console.log('✅ Test screenshot saved as:', filename);
    
    // Step 6: Keep overlay visible for a moment for visual confirmation
    console.log('Step 6: Keeping overlay visible for 5 more seconds for visual confirmation...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Step 7: Clean up
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const overlay = document.getElementById('screen-shark-screenshot-overlay');
        if (overlay) {
          overlay.remove();
          console.log('✅ Overlay removed');
        }
      }
    });
    
    // Show success notification
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48_enabled.png',
      title: 'CRITICAL OVERLAY TEST COMPLETED',
      message: `Test screenshot saved: ${filename}. Check if overlay is visible in the image!`
    });
    
    console.log('=== CRITICAL OVERLAY TEST COMPLETED SUCCESSFULLY ===');
    console.log('Check the saved screenshot to see if the red overlay is visible!');
    
    return {
      success: true,
      filename: filename,
      downloadId: downloadId,
      overlayData: overlayCreateResult[0].result,
      verificationData: verifyResult[0].result
    };
    
  } catch (error) {
    console.error('❌ CRITICAL OVERLAY TEST FAILED:', error);
    
    await chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48_enabled.png',
      title: 'CRITICAL OVERLAY TEST FAILED',
      message: `Error: ${error.message}`
    });
    
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
}

// Run the test if in extension context
if (typeof chrome !== 'undefined' && chrome.runtime) {
  console.log('Critical overlay test function loaded. Run testOverlayVisibilityFix() to test.');
  window.testOverlayVisibilityFix = testOverlayVisibilityFix;
}
