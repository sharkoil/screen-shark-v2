/**
 * URGENT SCRIPTING PERMISSION TEST
 * This test verifies that chrome.scripting API is available
 */

console.log('=== CHECKING CHROME.SCRIPTING AVAILABILITY ===');

// Check if chrome.scripting is available
if (typeof chrome === 'undefined') {
    console.error('❌ chrome API not available');
} else if (!chrome.scripting) {
    console.error('❌ chrome.scripting not available - missing "scripting" permission in manifest');
} else if (!chrome.scripting.executeScript) {
    console.error('❌ chrome.scripting.executeScript not available');
} else {
    console.log('✅ chrome.scripting API is available');
}

// Test function to verify scripting works
async function testScriptingAPI() {
    try {
        console.log('Testing scripting API...');
        
        // Get current active tab
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tabs.length) {
            console.error('No active tab found');
            return;
        }
        
        const tab = tabs[0];
        console.log('Testing on tab:', tab.url);
        
        // Check if tab is accessible
        if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
            console.error('Cannot test on Chrome internal pages');
            return;
        }
        
        // Try a simple script execution
        const result = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                console.log('[Scripting Test] Script executed successfully');
                return {
                    success: true,
                    url: document.location.href,
                    title: document.title,
                    timestamp: new Date().toISOString()
                };
            }
        });
        
        console.log('✅ Scripting test successful:', result[0].result);
        return result[0].result;
        
    } catch (error) {
        console.error('❌ Scripting test failed:', error);
        return { success: false, error: error.message };
    }
}

// Test simple overlay creation
async function testSimpleOverlay() {
    try {
        console.log('Testing simple overlay creation...');
        
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tabs.length) {
            console.error('No active tab found');
            return;
        }
        
        const tab = tabs[0];
        
        if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
            console.error('Cannot test on Chrome internal pages');
            return;
        }
        
        // Create a simple test overlay
        const result = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                // Remove any existing test overlay
                const existing = document.getElementById('scripting-test-overlay');
                if (existing) existing.remove();
                
                // Create simple test overlay
                const overlay = document.createElement('div');
                overlay.id = 'scripting-test-overlay';
                overlay.style.cssText = `
                    position: fixed !important;
                    top: 20px !important;
                    right: 20px !important;
                    background: #FF0000 !important;
                    color: white !important;
                    padding: 10px !important;
                    border-radius: 5px !important;
                    z-index: 999999 !important;
                    font-family: Arial, sans-serif !important;
                    font-size: 14px !important;
                `;
                overlay.textContent = 'SCRIPTING TEST - OVERLAY WORKS!';
                
                document.body.appendChild(overlay);
                
                // Remove after 3 seconds
                setTimeout(() => {
                    overlay.remove();
                }, 3000);
                
                console.log('[Overlay Test] Simple overlay created successfully');
                return { success: true, message: 'Simple overlay created and will disappear in 3 seconds' };
            }
        });
        
        console.log('✅ Simple overlay test successful:', result[0].result);
        return result[0].result;
        
    } catch (error) {
        console.error('❌ Simple overlay test failed:', error);
        return { success: false, error: error.message };
    }
}

// Auto-run tests if in extension context
if (typeof chrome !== 'undefined' && chrome.runtime) {
    console.log('Scripting permission test loaded');
    console.log('Run testScriptingAPI() to test basic scripting');
    console.log('Run testSimpleOverlay() to test overlay creation');
    
    // Make functions globally available
    window.testScriptingAPI = testScriptingAPI;
    window.testSimpleOverlay = testSimpleOverlay;
}
