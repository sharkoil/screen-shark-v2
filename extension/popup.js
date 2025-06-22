// Screen Shark Popup Script
class ScreenSharkPopup {
  constructor() {
    this.sessionActive = false;
    this.debugMode = false;
    this.currentTab = null;
    
    this.initializePopup();
  }
  async initializePopup() {
    try {
      console.log('[Screen Shark Popup] Starting initialization...');
      
      // Get current tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      this.currentTab = tabs[0];
      console.log('[Screen Shark Popup] Current tab obtained:', this.currentTab?.id);

      // Get current state from background script
      const response = await chrome.runtime.sendMessage({ action: 'getState' });
      console.log('[Screen Shark Popup] State response:', response);
      
      this.sessionActive = response?.sessionActive || false;
      this.debugMode = response?.debugMode || false;

      // Initialize UI
      this.setupEventListeners();
      this.updateUI();
      
      if (this.debugMode) {
        this.showDebugPanel();
        this.updateDebugInfo();
        this.loadDebugLogs();
      }

      console.log('[Screen Shark Popup] Initialization completed successfully');

    } catch (error) {
      console.error('[Screen Shark Popup] Initialization failed:', error);
      this.showError('Failed to initialize popup: ' + error.message);
      
      // Try to set up basic functionality even if initialization partially failed
      try {
        this.setupEventListeners();
        this.updateUI();
      } catch (fallbackError) {
        console.error('[Screen Shark Popup] Fallback setup also failed:', fallbackError);
      }
    }
  }
  setupEventListeners() {
    try {
      // Helper function to safely add event listeners
      const safeAddEventListener = (elementId, event, handler) => {
        const element = document.getElementById(elementId);
        if (element) {
          element.addEventListener(event, handler);
        } else {
          console.warn(`[Screen Shark Popup] Element with ID '${elementId}' not found`);
        }
      };

      // Session toggle button
      safeAddEventListener('toggleSessionBtn', 'click', () => {
        this.toggleSession();
      });

      // Manual capture button
      safeAddEventListener('captureBtn', 'click', () => {
        this.captureScreenshot();
      });

      // Save session button
      safeAddEventListener('saveSessionBtn', 'click', () => {
        this.saveSession();
      });
      
      // Force stop button
      safeAddEventListener('forceStopBtn', 'click', () => {
        this.forceStopAllSessions();
      });

      // Test simple capture button
      safeAddEventListener('testSimpleBtn', 'click', () => {
        this.testSimpleCapture();
      });

      // Test JSON generation button
      safeAddEventListener('testJsonBtn', 'click', () => {
        this.testJsonGeneration();
      });

      // Test download validation button
      safeAddEventListener('testDownloadBtn', 'click', () => {
        this.testDownloadValidation();
      });

      // Debug mode toggle
      safeAddEventListener('debugToggle', 'change', (e) => {
        this.toggleDebugMode(e.target.checked);
      });

      // Debug panel buttons
      safeAddEventListener('clearLogsBtn', 'click', () => {
        this.clearLogs();
      });

      safeAddEventListener('testScreenshotBtn', 'click', () => {
        this.testScreenshot();
      });

      safeAddEventListener('checkPermissionsBtn', 'click', () => {
        this.checkPermissions();
      });

      safeAddEventListener('exportLogsBtn', 'click', () => {
        this.exportLogs();
      });
      
      // Test overlay rendering button
      safeAddEventListener('testOverlayBtn', 'click', () => {
        this.testOverlayRendering();
      });

    } catch (error) {
      console.error('[Screen Shark Popup] Error setting up event listeners:', error);
    }
  }

  async toggleSession() {
    try {
      this.showLoading(true);
      
      const response = await chrome.runtime.sendMessage({ action: 'toggleSession' });
      
      if (response.success) {
        this.sessionActive = response.sessionActive;
        this.updateUI();
        this.updateDebugInfo();
      } else {
        this.showError('Failed to toggle session');
      }
    } catch (error) {
      console.error('Error toggling session:', error);
      this.showError('Error toggling session: ' + error.message);
    } finally {
      this.showLoading(false);
    }
  }

  async captureScreenshot() {
    try {
      this.showLoading(true);
      
      const response = await chrome.runtime.sendMessage({
        action: 'captureScreenshot',
        options: { reason: 'Manual Popup Capture' }
      });
      
      if (response.success) {
        this.showSuccess('Screenshot captured successfully!');
      } else {
        this.showError('Failed to capture screenshot');
      }
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      this.showError('Error capturing screenshot: ' + error.message);
    } finally {
      this.showLoading(false);
    }
  }

  async saveSession() {
    try {
      this.showLoading(true);
      this.showMessage('Ending session and saving JSON...');
      
      const response = await chrome.runtime.sendMessage({ action: 'toggleSession' });
      
      if (response.success) {
        this.sessionActive = response.sessionActive;
        this.updateUI();
        this.showSuccess('Session ended and JSON saved successfully!');
        this.updateDebugInfo();
      } else {
        this.showError('Failed to save session: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error saving session:', error);
      this.showError('Error saving session: ' + error.message);
    } finally {
      this.showLoading(false);
    }
  }

  async toggleDebugMode(enabled) {
    try {
      if (enabled !== undefined) {
        this.debugMode = enabled;
      }
      
      const response = await chrome.runtime.sendMessage({ action: 'toggleDebugMode' });
        if (response.success) {
        this.debugMode = response.debugMode;
        
        // Update UI to reflect debug mode change (including test buttons)
        this.updateUI();
        
        if (this.debugMode) {
          this.showDebugPanel();
          this.updateDebugInfo();
          this.loadDebugLogs();
        } else {
          this.hideDebugPanel();
        }
      }
    } catch (error) {
      console.error('Error toggling debug mode:', error);
      this.showError('Error toggling debug mode: ' + error.message);
    }
  }

  async testScreenshot() {
    try {
      this.showLoading(true);
      
      const response = await chrome.runtime.sendMessage({ action: 'testScreenshot' });
      
      if (response.success) {
        this.showSuccess('Test screenshot captured!');
        this.loadDebugLogs(); // Refresh logs
      } else {
        this.showError('Test screenshot failed');
      }
    } catch (error) {
      console.error('Error with test screenshot:', error);
      this.showError('Test failed: ' + error.message);
    } finally {
      this.showLoading(false);
    }
  }

  async testSimpleCapture() {
    try {
      this.showLoading(true);
      
      const response = await chrome.runtime.sendMessage({
        action: 'testSimpleCapture'
      });
      
      if (response.success) {
        this.showSuccess('Simple capture test passed!');
      } else {
        this.showError('Simple capture test failed');
      }
    } catch (error) {
      console.error('Error testing simple capture:', error);
      this.showError('Test failed: ' + error.message);
    } finally {
      this.showLoading(false);
    }
  }
  async testJsonGeneration() {
    try {
      this.showLoading(true);
      this.showMessage('Running JSON generation test...');
      
      const response = await chrome.runtime.sendMessage({ action: 'testSessionJson' });
      
      if (response.success) {
        this.showMessage(`JSON test PASSED! Generated ${response.screenshotCount} screenshots and ${response.jsonSize} bytes of JSON data. Check Downloads folder.`);
        this.updateDebugInfo();
      } else {
        this.showError('JSON test FAILED: ' + (response.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error testing JSON generation:', error);
      this.showError('Error testing JSON generation: ' + error.message);
    } finally {
      this.showLoading(false);
    }
  }

  async testDownloadValidation() {
    try {
      this.showLoading(true);
      this.showMessage('Running download validation test...');
      
      const response = await chrome.runtime.sendMessage({ action: 'testDownloadValidation' });
      
      if (response.success) {
        this.showMessage(`Download validation PASSED! ${response.summary.passed}/${response.summary.total} tests passed. Check Downloads/Screen Shark/test/ folder for validation files.`);
        this.updateDebugInfo();
      } else {
        this.showError(`Download validation FAILED: ${response.summary.failed}/${response.summary.total} tests failed. Error: ${response.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error testing download validation:', error);
      this.showError('Error testing download validation: ' + error.message);
    } finally {
      this.showLoading(false);
    }
  }

  async checkPermissions() {
    try {
      const permissions = await chrome.permissions.getAll();
      const hasRequired = permissions.permissions.includes('activeTab') && 
                         permissions.permissions.includes('downloads');
      
      const message = hasRequired ? 
        'All required permissions granted ✅' : 
        'Missing required permissions ❌';
      
      this.showInfo(message);
      
      // Update debug info
      document.getElementById('debugUrl').textContent = 
        `Permissions: ${permissions.permissions.join(', ')}`;
    } catch (error) {
      console.error('Error checking permissions:', error);
      this.showError('Error checking permissions: ' + error.message);
    }
  }

  async exportLogs() {
    try {
      const result = await chrome.storage.local.get(['debugLogs']);
      const logs = result.debugLogs || [];
      
      if (logs.length === 0) {
        this.showInfo('No logs to export');
        return;
      }
      
      const logText = logs.map(log => 
        `[${log.timestamp}] ${log.message} ${log.data ? JSON.stringify(log.data) : ''}`
      ).join('\n');
      
      const blob = new Blob([logText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      await chrome.downloads.download({
        url: url,
        filename: `screen-shark-logs-${new Date().toISOString().split('T')[0]}.txt`,
        saveAs: true
      });
      
      this.showSuccess('Logs exported successfully!');
    } catch (error) {
      console.error('Error exporting logs:', error);
      this.showError('Error exporting logs: ' + error.message);
    }
  }

  async clearLogs() {
    try {
      await chrome.storage.local.set({ debugLogs: [] });
      this.loadDebugLogs();
      this.showInfo('Logs cleared');
    } catch (error) {
      console.error('Error clearing logs:', error);
      this.showError('Error clearing logs: ' + error.message);
    }
  }

  async loadDebugLogs() {
    try {
      const result = await chrome.storage.local.get(['debugLogs']);
      const logs = result.debugLogs || [];
      
      const logsContainer = document.getElementById('logsContainer');
      
      if (logs.length === 0) {
        logsContainer.innerHTML = '<p class="no-logs">No logs available</p>';
        return;
      }
      
      // Show last 10 logs
      const recentLogs = logs.slice(-10).reverse();
      
      logsContainer.innerHTML = recentLogs.map(log => `
        <div class="log-entry">
          <span class="log-timestamp">${new Date(log.timestamp).toLocaleTimeString()}</span>
          <span class="log-message">${log.message}</span>
          ${log.data ? `<pre style="margin-top: 4px; font-size: 10px; color: #666;">${JSON.stringify(log.data, null, 2)}</pre>` : ''}
        </div>
      `).join('');
      
    } catch (error) {
      console.error('Error loading logs:', error);
    }
  }
  updateUI() {
    // Update session button
    const sessionBtn = document.getElementById('toggleSessionBtn');
    const sessionIcon = document.getElementById('sessionIcon');    const sessionText = document.getElementById('sessionText');
    const saveSessionBtn = document.getElementById('saveSessionBtn');
    const forceStopBtn = document.getElementById('forceStopBtn');
    
    if (this.sessionActive) {
      sessionBtn.classList.add('recording');
      sessionIcon.textContent = '⏹️';
      sessionText.textContent = 'Stop Recording';
      saveSessionBtn.style.display = 'block';
      forceStopBtn.style.display = 'block';
    } else {
      sessionBtn.classList.remove('recording');
      sessionIcon.textContent = '▶️';
      sessionText.textContent = 'Start Recording';
      saveSessionBtn.style.display = 'none';
      forceStopBtn.style.display = 'none';
    }
    
    // Update status indicator
    const statusDot = document.getElementById('statusDot');
    const statusText = document.getElementById('statusText');
    
    if (this.sessionActive) {
      statusDot.classList.add('recording');
      statusDot.classList.remove('inactive');
      statusText.textContent = 'Recording';
    } else {
      statusDot.classList.remove('recording');
      statusDot.classList.add('inactive');
      statusText.textContent = 'Ready';
    }
      // Update debug toggle
    document.getElementById('debugToggle').checked = this.debugMode;      // Update test button visibility based on debug mode
    const testSimpleBtn = document.getElementById('testSimpleBtn');
    const testJsonBtn = document.getElementById('testJsonBtn');
    const testDownloadBtn = document.getElementById('testDownloadBtn');
    const testOverlayBtn = document.getElementById('testOverlayBtn');
    
    if (this.debugMode) {
      testSimpleBtn.style.display = 'block';
      testJsonBtn.style.display = 'block';
      testDownloadBtn.style.display = 'block';
      testOverlayBtn.style.display = 'block';
    } else {
      testSimpleBtn.style.display = 'none';
      testJsonBtn.style.display = 'none';
      testDownloadBtn.style.display = 'none';
      testOverlayBtn.style.display = 'none';
    }
  }

  updateDebugInfo() {
    if (!this.debugMode) return;
    
    document.getElementById('debugSessionStatus').textContent = this.sessionActive ? 'Yes' : 'No';
    document.getElementById('debugTabId').textContent = this.currentTab?.id || 'N/A';
    
    const url = this.currentTab?.url || 'N/A';
    const shortUrl = url.length > 30 ? url.substring(0, 30) + '...' : url;
    document.getElementById('debugUrl').textContent = shortUrl;
  }

  showDebugPanel() {
    document.getElementById('debugPanel').style.display = 'block';
    // Adjust popup height
    document.body.style.minHeight = '600px';
  }

  hideDebugPanel() {
    document.getElementById('debugPanel').style.display = 'none';
    document.body.style.minHeight = '500px';
  }

  showLoading(show) {
    document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none';
  }

  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  showError(message) {
    this.showNotification(message, 'error');
  }

  showInfo(message) {
    this.showNotification(message, 'info');
  }

  showMessage(message, type = 'info') {
    this.showNotification(message, type);
  }

  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Style the notification
    Object.assign(notification.style, {
      position: 'fixed',
      top: '10px',
      left: '10px',
      right: '10px',
      padding: '12px',
      borderRadius: '6px',
      color: 'white',
      fontSize: '14px',
      zIndex: '1001',
      transform: 'translateY(-100%)',
      transition: 'transform 0.3s ease',
      backgroundColor: type === 'success' ? '#4CAF50' : 
                      type === 'error' ? '#f44336' : '#2196F3'
    });
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateY(0)';
    }, 10);
    
    // Remove after delay
    setTimeout(() => {
      notification.style.transform = 'translateY(-100%)';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
  async forceStopAllSessions() {
    try {
      this.showLoading(true);
      
      const response = await chrome.runtime.sendMessage({ action: 'forceStopAllSessions' });
      
      if (response.success) {
        this.showMessage('All sessions forcibly stopped and cleaned up!', 'success');
        // Update UI to reflect stopped state
        setTimeout(() => {
          this.updateUI();
        }, 500);
      } else {
        this.showMessage(`Failed to force stop sessions: ${response.error}`, 'error');
      }
    } catch (error) {
      this.showMessage(`Error forcing stop: ${error.message}`, 'error');
    } finally {
      this.showLoading(false);
    }
  }

  async testOverlayRendering() {
    try {
      this.showLoading(true);
      this.showMessage('Testing overlay rendering...');
      
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        throw new Error('No active tab found');
      }
      
      const response = await chrome.runtime.sendMessage({ 
        action: 'testOverlayCapture',
        tabId: tab.id
      });
      
      if (response.success) {
        this.showMessage(`Overlay test PASSED! 
          Overlay Present: ${response.overlayCheck.present ? '✅' : '❌'}
          Overlay Visible: ${response.overlayCheck.visible ? '✅' : '❌'}
          Screenshot Captured: ${response.screenshotCaptured ? '✅' : '❌'}
          Check Downloads folder for test screenshot with overlay.`);
        this.updateDebugInfo();
      } else {
        this.showError(`Overlay test FAILED: ${response.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error testing overlay rendering:', error);
      this.showError('Error testing overlay rendering: ' + error.message);
    } finally {
      this.showLoading(false);
    }
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new ScreenSharkPopup();
});
