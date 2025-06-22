// Quick Console Test Script for Screen Shark
// Copy and paste this entire script into the browser console to run validation

(async function() {
    console.log('🦈 Screen Shark Quick Validation Test');
    console.log('=====================================');
    
    const results = [];
    let passed = 0;
    let failed = 0;
    
    function test(name, condition, details = '') {
        const status = condition ? 'PASS' : 'FAIL';
        const icon = condition ? '✅' : '❌';
        console.log(`${icon} ${name}: ${status} ${details}`);
        results.push({ name, status, details });
        if (condition) passed++; else failed++;
    }
    
    try {
        // Test 1: Content script loaded
        test('Content Script Loaded', !!window.screenSharkContentLoaded);
        
        // Test 2: Single instance
        test('Single Instance Exists', !!window.screenSharkInstance);
        
        // Test 3: Background connection
        let bgState;
        try {
            bgState = await chrome.runtime.sendMessage({ action: 'getState' });
            test('Background Connected', !!bgState);
        } catch (e) {
            test('Background Connected', false, e.message);
        }
        
        // Test 4: State synchronization
        if (bgState && window.screenSharkInstance) {
            const synced = bgState.sessionActive === window.screenSharkInstance.sessionActive;
            test('State Synchronized', synced, 
                `BG: ${bgState.sessionActive}, Content: ${window.screenSharkInstance.sessionActive}`);
        }
        
        // Test 5: Event listener cleanup test
        const instance = window.screenSharkInstance;
        if (instance && bgState) {
            const initialSession = bgState.sessionActive;
            
            // Start session if not active
            if (!initialSession) {
                await chrome.runtime.sendMessage({ action: 'toggleSession' });
                await new Promise(r => setTimeout(r, 1000));
            }
            
            const hasListenersWhenActive = !!instance.clickHandler;
            test('Event Listeners Added When Active', hasListenersWhenActive);
            
            // Stop session
            await chrome.runtime.sendMessage({ action: 'toggleSession' });
            await new Promise(r => setTimeout(r, 1000));
            
            const hasListenersWhenInactive = !!instance.clickHandler;
            test('Event Listeners Removed When Inactive', !hasListenersWhenInactive);
            
            // Restore original state
            if (initialSession) {
                await chrome.runtime.sendMessage({ action: 'toggleSession' });
            }
        }
        
        // Test 6: Permission check
        try {
            const permissions = await chrome.permissions.getAll();
            const required = ['activeTab', 'storage', 'downloads', 'notifications'];
            const hasAll = required.every(p => permissions.permissions.includes(p));
            test('All Permissions Present', hasAll, 
                hasAll ? '' : `Missing: ${required.filter(p => !permissions.permissions.includes(p)).join(', ')}`);
        } catch (e) {
            test('Permission Check', false, e.message);
        }
        
        // Test 7: Interaction test (should be ignored when session inactive)
        console.log('\n🧪 Testing interaction when session is inactive...');
        const originalLog = console.log;
        let logCapture = [];
        console.log = (...args) => {
            logCapture.push(args.join(' '));
            originalLog.apply(console, args);
        };
        
        // Create and click test button
        const testBtn = document.createElement('button');
        testBtn.style.cssText = 'position: fixed; top: -100px; left: -100px;';
        document.body.appendChild(testBtn);
        testBtn.click();
        
        setTimeout(() => {
            const ignoreFound = logCapture.some(log => 
                log.includes('Ignoring') && log.includes('session not active')
            );
            test('Interactions Ignored When Inactive', ignoreFound);
            
            testBtn.remove();
            console.log = originalLog;
            
            // Final summary
            console.log('\n📊 Test Summary:');
            console.log(`✅ Passed: ${passed}`);
            console.log(`❌ Failed: ${failed}`);
            console.log(`📝 Total: ${results.length}`);
            
            if (failed === 0) {
                console.log('\n🎉 All tests passed! Extension fixes are working correctly.');
            } else {
                console.log('\n⚠️ Some tests failed. Extension may need attention.');
                console.log('Failed tests:', results.filter(r => r.status === 'FAIL'));
            }
            
            // Return results for further analysis
            window.screenSharkTestResults = results;
            console.log('\nResults stored in: window.screenSharkTestResults');
            
        }, 1000);
        
    } catch (error) {
        console.error('❌ Test script failed:', error);
    }
})();

console.log('\n💡 Tip: Run this script after loading Screen Shark extension on any page');
console.log('📋 Results will be stored in window.screenSharkTestResults for inspection');
