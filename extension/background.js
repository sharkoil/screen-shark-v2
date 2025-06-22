// Screen Shark Background Service Worker
class ScreenSharkBackground {  constructor() {
    this.sessionActive = false;
    this.debugMode = true; // Enable debug mode by default for troubleshooting
    this.currentSession = null;
    this.screenshotSequence = 0;
    this.navigationCount = 0;
    this.sessionTimeout = null;
    this.SESSION_TIMEOUT_MINUTES = 5; // Auto-end session after 5 minutes of inactivity
    this.initializeExtension();
  }

  initializeExtension() {
    // Listen for extension installation
    chrome.runtime.onInstalled.addListener(() => {
      this.log('Screen Shark extension installed');
      this.initializeStorage();
    });

    // Listen for messages from content script and popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async responses
    });

    // Listen for tab updates to manage session state
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && this.sessionActive) {
        this.updateContentScriptState(tabId);
      }
    });
  }

  async initializeStorage() {
    try {
      const result = await chrome.storage.local.get(['debugMode', 'sessionActive']);
      this.debugMode = result.debugMode || false;
      this.sessionActive = result.sessionActive || false;
      this.log('Storage initialized', { debugMode: this.debugMode, sessionActive: this.sessionActive });
    } catch (error) {
      this.log('Error initializing storage:', error);
    }
  }
  async handleMessage(message, sender, sendResponse) {
    try {
      this.log('Received message:', message.action, message);
      
      switch (message.action) {        case 'captureScreenshot':
          this.log('Processing captureScreenshot request...');
          
          // Get the tab - either from sender or current active tab
          let targetTab = sender.tab;
          if (!targetTab) {
            this.log('No sender tab, getting active tab...');
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs.length > 0) {
              targetTab = tabs[0];
              this.log('Using active tab:', { id: targetTab.id, url: targetTab.url });
            } else {
              throw new Error('No active tab found for screenshot capture');
            }
          }
          
          await this.captureScreenshot(message.options, targetTab);
          this.log('Screenshot capture completed');
          sendResponse({ success: true });
          break;        case 'testSimpleCapture':
          this.log('Processing testSimpleCapture request...');
          
          // Get the active tab for testing
          const testTabs = await chrome.tabs.query({ active: true, currentWindow: true });
          if (testTabs.length === 0) {
            throw new Error('No active tab found for test capture');
          }
          
          const firstTestResult = await this.testSimpleCapture();
          sendResponse(firstTestResult);
          break;case 'toggleSession':
          this.log('Processing toggleSession request...');
          await this.toggleSession();
          sendResponse({ success: true, sessionActive: this.sessionActive });
          break;

        case 'saveSession':
          this.log('Processing saveSession request...');
          try {
            if (this.currentSession && this.currentSession.screenshots.length > 0) {
              await this.saveSessionFile();
              sendResponse({ success: true, message: 'Session saved successfully' });
            } else {
              sendResponse({ success: false, error: 'No active session with screenshots to save' });
            }
          } catch (error) {
            this.log('Error saving session:', error);
            sendResponse({ success: false, error: error.message });
          }
          break;        case 'toggleDebugMode':
          await this.toggleDebugMode();
          sendResponse({ success: true, debugMode: this.debugMode });
          break;

        case 'forceStopAllSessions':
          try {
            const result = await this.forceStopAllSessions();
            sendResponse(result);
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
          break;

        case 'getState':
          sendResponse({
            sessionActive: this.sessionActive,
            debugMode: this.debugMode
          });
          break;

        case 'testScreenshot':
          await this.testScreenshot(sender.tab);
          sendResponse({ success: true });
          break;        case 'testSimpleCapture':
          this.log('Processing testSimpleCapture request...');
          const simpleTestResult = await this.testSimpleCapture();
          sendResponse(simpleTestResult);
          break;        case 'testSessionJson':
          this.log('Processing testSessionJson request...');
          try {
            const jsonTestResult = await this.testSessionJsonGeneration();
            sendResponse(jsonTestResult);
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
          break;

        case 'testDownloadValidation':
          this.log('Processing testDownloadValidation request...');
          try {
            const downloadTestResult = await this.runDownloadValidationTest();
            sendResponse(downloadTestResult);
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
          break;

        case 'interactionCapture':
          if (this.sessionActive) {
            await this.captureScreenshot({
              reason: `Interaction: ${message.elementType}`,
              elementInfo: message.elementInfo,
              clickPosition: message.clickPosition,
              isInteraction: true
            }, sender.tab);
            sendResponse({ success: true });
          } else {
            // Session not active - ignore the request
            this.log('Ignoring interaction capture - session not active');
            sendResponse({ success: false, error: 'Session not active' });
          }
          break;

        case 'testOverlayCapture':
          this.log('Processing testOverlayCapture request...');
          try {
            const overlayTestResult = await this.runOverlayTest(message.tabId);
            sendResponse(overlayTestResult);
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
          break;

        default:
          this.log('Unknown message action:', message.action);
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      this.log('Error handling message:', error);      sendResponse({ success: false, error: error.message });
    }
  }  async captureScreenshot(options = {}, tab) {
    try {
      // CRITICAL: Double-check session is still active before any screenshot operations
      if (!this.sessionActive) {
        this.log('Screenshot capture aborted - session no longer active');
        return { success: false, error: 'Session ended' };
      }
      
      this.log('=== SCREENSHOT CAPTURE START ===');
      this.log('Capturing screenshot...', { 
        options, 
        tabId: tab?.id, 
        tabUrl: tab?.url,
        tabExists: !!tab,
        tabWindowId: tab?.windowId,
        sessionActive: this.sessionActive
      });

      // Validate tab
      if (!tab) {
        throw new Error('No tab provided for screenshot capture');
      }
      
      if (!tab.id) {
        throw new Error('Tab ID is missing for screenshot capture');
      }
      
      if (!tab.windowId) {
        this.log('Warning: Tab windowId is missing, attempting to get window info...');
        try {
          const tabInfo = await chrome.tabs.get(tab.id);
          tab.windowId = tabInfo.windowId;
          this.log('Retrieved windowId from tab info:', tab.windowId);
        } catch (windowError) {
          this.log('Failed to get window info:', windowError);
          throw new Error('Cannot determine window for screenshot capture');
        }
      }

      this.log('Tab validation passed');

      // Check if tab is valid and accessible
      try {
        const tabInfo = await chrome.tabs.get(tab.id);
        this.log('Tab info retrieved:', { id: tabInfo.id, status: tabInfo.status, url: tabInfo.url });
        
        if (tabInfo.url.startsWith('chrome://') || tabInfo.url.startsWith('chrome-extension://')) {
          throw new Error('Cannot capture screenshots of Chrome internal pages');
        }
        
        if (tabInfo.status !== 'complete') {
          this.log('Warning: Tab is still loading');
        }
      } catch (tabError) {
        this.log('Tab access error:', tabError);
        throw new Error(`Cannot access tab: ${tabError.message}`);
      }

      // Check permissions explicitly
      try {
        const hasActiveTab = await chrome.permissions.contains({ permissions: ['activeTab'] });
        if (!hasActiveTab) {
          throw new Error('Missing activeTab permission');
        }
        this.log('Permission check passed');
      } catch (permError) {
        this.log('Permission check failed:', permError);
        throw new Error(`Permission error: ${permError.message}`);
      }      // If this is an interaction capture, add visual overlay to the page first
      if (options.isInteraction && options.elementInfo && options.clickPosition) {
        this.log('Adding screenshot overlay...', {
          elementInfo: options.elementInfo,
          clickPosition: options.clickPosition
        });        try {
          await this.addScreenshotOverlay(tab.id, options.elementInfo, options.clickPosition);
          this.log('Overlay added, waiting for render...');
          // Wait for overlay to fully render
          await new Promise(resolve => setTimeout(resolve, 1500));
          this.log('Overlay rendered after 1500ms delay');
          
          // Verify overlay is actually visible
          const overlayPresent = await this.verifyOverlayPresent(tab.id);
          this.log('Overlay verification result:', overlayPresent);
          
          // If overlay is not properly visible, try creating it again
          if (!overlayPresent.present || !overlayPresent.visible) {
            this.log('Overlay not visible, recreating...');
            await this.addScreenshotOverlay(tab.id, options.elementInfo, options.clickPosition);
            await new Promise(resolve => setTimeout(resolve, 800));
            const secondCheck = await this.verifyOverlayPresent(tab.id);
            this.log('Second overlay verification:', secondCheck);
          }
        } catch (overlayError) {
          this.log('Overlay error (non-fatal):', overlayError.message || overlayError.toString());
          // Continue without overlay
        }
      }      // Capture the visible tab
      this.log('Capturing visible tab...');
      this.log('Tab capture details:', {
        windowId: tab.windowId,
        tabId: tab.id,
        tabUrl: tab.url,
        hasOverlay: !!options.isInteraction
      });
      let dataUrl;
      try {
        dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
          format: 'png',
          quality: 90
        });
      } catch (captureError) {
        this.log('Chrome captureVisibleTab failed - Raw error:', captureError);
        this.log('Error message:', captureError?.message);
        this.log('Error stack:', captureError?.stack);
        this.log('chrome.runtime.lastError:', chrome.runtime.lastError);
        
        // Get the actual error message
        let errorMessage = captureError?.message || chrome.runtime.lastError?.message || 'Unknown error';
        
        // Check for common error patterns
        if (errorMessage.includes('Cannot access')) {
          throw new Error('Cannot access tab for screenshot - check permissions');
        } else if (errorMessage.includes('visible tab')) {
          throw new Error('Tab is not visible or active');
        } else if (errorMessage.includes('window')) {
          throw new Error('Window is not accessible for capture');
        } else if (errorMessage.includes('No window')) {
          throw new Error('No window found for capture');
        } else if (errorMessage.includes('internal pages')) {
          throw new Error('Cannot capture Chrome internal pages');
        } else {
          throw new Error(`Screenshot capture failed: ${errorMessage}`);
        }
      }
      
      if (!dataUrl) {
        throw new Error('Screenshot capture returned empty data');
      }
      
      this.log('Tab captured successfully, dataUrl length:', dataUrl.length);
      
      // CRITICAL: Check again if session is still active after screenshot capture
      if (!this.sessionActive) {
        this.log('Session ended during screenshot capture - aborting processing');
        return { success: false, error: 'Session ended during capture' };
      }

      // Remove the overlay after capture (with delay so user can see it briefly)
      if (options.isInteraction) {
        this.log('Keeping overlay visible for user feedback...');
        setTimeout(async () => {
          this.log('Removing overlay...');
          await this.removeScreenshotOverlay(tab.id);
        }, 1500); // Keep overlay visible for 1.5 seconds after capture
      }

      // Extract website base URL for folder structure
      const url = new URL(tab.url);
      const baseURL = url.hostname.replace(/^www\./, ''); // Remove www. prefix
      
      // Generate filename with timestamp and sequence
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      let filename;      if (this.sessionActive && this.currentSession) {
        this.log('Adding screenshot to active session...', { 
          sessionId: this.currentSession.sessionId,
          currentCount: this.currentSession.totalScreenshots,
          screenshotsArrayLength: this.currentSession.screenshots.length
        });
        
        this.screenshotSequence++;
        this.currentSession.totalScreenshots++;
        
        // Check if this is a navigation (URL change)
        const isNavigation = this.isNewPage(tab.url);
        if (isNavigation) {
          this.navigationCount++;
          this.currentSession.navigationCount++;
          this.addPageToSession(tab);
        }
        
        // Create sequence-based filename for session
        const sequenceNum = String(this.screenshotSequence).padStart(3, '0');
        const elementText = options.elementInfo?.text ? `_${options.elementInfo.text.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20)}` : '';
        filename = `${sequenceNum}_screenshot_${timestamp.split('T')[0]}T${timestamp.split('T')[1].split('-')[0]}-${timestamp.split('T')[1].split('-')[1]}-${timestamp.split('T')[1].split('-')[2]}${elementText}.png`;
        
        // Add screenshot to session data
        const screenshotEntry = {
          sequence: this.screenshotSequence,
          timestamp: new Date().toISOString(),
          filename: `Screen Shark/${baseURL}/${filename}`,
          url: tab.url,
          pageTitle: tab.title,
          elementInfo: options.elementInfo || null,
          clickPosition: options.clickPosition || null,
          isNavigation: isNavigation,
          navigationCount: isNavigation ? this.navigationCount : null,
          precedingStep: this.screenshotSequence > 1 ? this.screenshotSequence - 1 : null,
          proceedingStep: null // Will be updated by next screenshot
        };
        
        this.addScreenshotToSession(screenshotEntry);
          this.log('Screenshot added to session', { 
          sequence: this.screenshotSequence,
          totalInSession: this.currentSession.totalScreenshots,
          screenshotsArrayLength: this.currentSession.screenshots.length
        });
        
        // Reset session timeout since we have activity
        this.resetSessionTimeout();
        
        // Update preceding step's proceedingStep
        if (this.currentSession.screenshots.length > 1) {
          this.currentSession.screenshots[this.currentSession.screenshots.length - 2].proceedingStep = this.screenshotSequence;
        }
        
      } else if (options.isInteraction) {
        this.log('Interaction detected but no session active - starting auto session');
        
        // Start an automatic session for interaction captures
        await this.startNewSession();
        this.sessionActive = true;
        await chrome.storage.local.set({ sessionActive: this.sessionActive });
        
        // Now capture as part of the new session
        this.screenshotSequence++;
        this.currentSession.totalScreenshots++;
        
        // Add page to session
        this.addPageToSession(tab);
        
        // Create sequence-based filename for session
        const sequenceNum = String(this.screenshotSequence).padStart(3, '0');
        const elementText = options.elementInfo?.text ? `_${options.elementInfo.text.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20)}` : '';
        filename = `${sequenceNum}_screenshot_${timestamp.split('T')[0]}T${timestamp.split('T')[1].split('-')[0]}-${timestamp.split('T')[1].split('-')[1]}-${timestamp.split('T')[1].split('-')[2]}${elementText}.png`;
        
        // Add screenshot to session data
        const screenshotEntry = {
          sequence: this.screenshotSequence,
          timestamp: new Date().toISOString(),
          filename: `Screen Shark/${baseURL}/${filename}`,
          url: tab.url,
          pageTitle: tab.title,
          elementInfo: options.elementInfo || null,
          clickPosition: options.clickPosition || null,
          isNavigation: true,
          navigationCount: 1,
          precedingStep: null,
          proceedingStep: null
        };
        
        this.addScreenshotToSession(screenshotEntry);
          this.log('Auto-session started and screenshot added', { 
          sessionId: this.currentSession.sessionId,
          sequence: this.screenshotSequence
        });
        
        // Start session timeout for auto-session
        this.startSessionTimeout();
        
      } else {
        this.log('No active session - using standalone filename', { 
          sessionActive: this.sessionActive, 
          hasCurrentSession: !!this.currentSession 
        });
        // Non-session filename
        const reason = options.reason ? `_${options.reason.replace(/[^a-zA-Z0-9]/g, '_')}` : '';
        filename = `screen-shark_${timestamp}${reason}.png`;
      }        // Create organized folder path: Screen Shark/website.com/filename.png
        // Use test folder if this is a test capture
        let folderPath;
        if (options.isTestCapture) {
          folderPath = `Screen Shark/test/${baseURL}/${filename}`;
        } else {
          folderPath = `Screen Shark/${baseURL}/${filename}`;
        }

      // Download the screenshot
      this.log('Starting download...', folderPath);
      try {
        await chrome.downloads.download({
          url: dataUrl,
          filename: folderPath,
          saveAs: false
        });
        this.log('Download completed successfully');
      } catch (downloadError) {
        this.log('Download failed:', downloadError);
        throw new Error(`Download failed: ${downloadError.message}`);
      }

      // Show notification
      const notificationTitle = options.reason ? 
        `Screenshot captured: ${options.reason}` : 
        'Screenshot captured';      
      // Only show notification if session is still active
      if (this.sessionActive) {
        await this.showNotification(notificationTitle, `Saved to Screen Shark/${baseURL}/`);
      } else {
        this.log('Skipping notification - session ended during screenshot processing');
      }

      this.log('Screenshot captured successfully', {
        filename: folderPath, 
        reason: options.reason,
        elementInfo: options.elementInfo,
        website: baseURL 
      });
      
      this.log('=== SCREENSHOT CAPTURE END ===');

      return { success: true, filename: folderPath };
    } catch (error) {
      this.log('Screenshot capture failed:', error);
      await this.showNotification('Screenshot Failed', error.message);
      throw error;
    }
  }
  async toggleSession() {
    try {
      this.sessionActive = !this.sessionActive;
      await chrome.storage.local.set({ sessionActive: this.sessionActive });      if (this.sessionActive) {
        // Start new session
        await this.startNewSession();
      } else {
        // End current session - this will call notifyAllTabsSessionEnded()
        await this.endCurrentSession();
        // Note: endCurrentSession() already handles tab notifications
      }

      // Update all content scripts (with timeout protection)
      const tabs = await chrome.tabs.query({});
      const updatePromises = tabs.map(async (tab) => {
        try {
          // Add timeout to prevent hanging
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Tab message timeout')), 2000)
          );
          
          const messagePromise = chrome.tabs.sendMessage(tab.id, {
            action: 'updateSessionState',
            sessionActive: this.sessionActive
          });
          
          await Promise.race([messagePromise, timeoutPromise]);
        } catch (error) {
          // Log but don't fail the entire operation
          this.log(`Failed to update tab ${tab.id}:`, error.message);
        }
      });
      
      // Wait for all tab updates (or timeouts) to complete
      await Promise.allSettled(updatePromises);

      // Update extension icon
      await this.updateExtensionIcon();

      const status = this.sessionActive ? 'started' : 'stopped';
      await this.showNotification(`Screen Shark`, `Recording session ${status}`);
        this.log(`Session ${status}`, { sessionActive: this.sessionActive });
    } catch (error) {
      this.log('Error toggling session:', error);
      throw error;
    }
  }

  async startNewSession() {
    const now = new Date();
    const sessionId = `session_${now.toISOString().replace(/[:.]/g, '-').split('.')[0]}`;
    
    // Get current tab to determine domain
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const domain = activeTab ? new URL(activeTab.url).hostname.replace(/^www\./, '') : 'unknown';
    
    this.currentSession = {
      sessionId: sessionId,
      domain: domain,
      startTime: now.toISOString(),
      endTime: null,
      totalScreenshots: 0,
      navigationCount: 0,
      screenshots: [],
      pages: []
    };
    
    this.screenshotSequence = 0;
    this.navigationCount = 0;
      // Save session state to storage
    await chrome.storage.local.set({ 
      currentSession: this.currentSession,
      screenshotSequence: this.screenshotSequence,
      navigationCount: this.navigationCount    });
    
    this.log('New session started', { sessionId, domain });
    
    // Start session timeout
    this.startSessionTimeout();
  }

  async endCurrentSession() {
    if (!this.currentSession) {
      this.log('No current session to end');
      return;
    }
    
    try {
      this.currentSession.endTime = new Date().toISOString();
      
      this.log('ENDING SESSION - GENERATING JSON...', { 
        sessionId: this.currentSession.sessionId,
        totalScreenshots: this.currentSession.totalScreenshots || 0,
        screenshotsCount: this.currentSession.screenshots?.length || 0,
        domain: this.currentSession.domain
      });
      
      // Create clean session data for JSON
      const sessionData = {
        sessionId: this.currentSession.sessionId || `session_${Date.now()}`,
        domain: this.currentSession.domain || 'unknown',
        startTime: this.currentSession.startTime,
        endTime: this.currentSession.endTime,
        totalScreenshots: this.currentSession.totalScreenshots || 0,
        navigationCount: this.currentSession.navigationCount || 0,
        screenshots: this.currentSession.screenshots || [],
        pages: this.currentSession.pages || [],
        summary: {
          totalActions: (this.currentSession.screenshots?.length || 0),
          duration: this.currentSession.startTime ? 
            Math.round((new Date(this.currentSession.endTime).getTime() - new Date(this.currentSession.startTime).getTime()) / 1000) : 0,
          uniquePages: [...new Set((this.currentSession.pages || []).map(p => p.url))].length
        }
      };
      
      const jsonContent = JSON.stringify(sessionData, null, 2);
      this.log('SESSION JSON CREATED - SIZE:', jsonContent.length);
      
      // FORCE SAVE THE JSON
      const timestamp = Date.now();
      const filename = `screen-shark-session-${sessionData.sessionId}-${timestamp}.json`;
        try {
        await this.forceSaveJSON(jsonContent, filename);
        this.log('SESSION JSON SAVED SUCCESSFULLY');
        await this.showNotification('Session Saved!', `Session JSON downloaded: ${filename}`);
      } catch (saveError) {
        this.log('JSON SAVE FAILED - DETAILED ERROR:', {
          message: saveError.message,
          stack: saveError.stack,
          filename: filename,
          jsonSize: jsonContent.length,
          currentSession: this.currentSession ? 'exists' : 'null',
          domain: this.currentSession?.domain || 'unknown'
        });
        
        // FALLBACK: Log complete JSON to console
        console.log('=== SCREEN SHARK SESSION JSON - COPY THIS ===');
        console.log(jsonContent);
        console.log('=== END SESSION JSON ===');
        
        await this.showNotification('Session JSON Failed', 'Session data logged to console - please copy manually');
      }
      
      this.log('Session ended successfully');
      
    } catch (error) {
      this.log('CRITICAL ERROR ending session:', error);
      
      // Emergency dump
      if (this.currentSession) {
        console.log('EMERGENCY SESSION DUMP:', JSON.stringify(this.currentSession, null, 2));
      }
      
      await this.showNotification('Session Error', 'Session ended with errors - check console for data');    } finally {
      // Always clean up session state
      this.sessionActive = false;
      this.currentSession = null;
      this.screenshotSequence = 0;
      this.navigationCount = 0;
      this.clearSessionTimeout();
      
      // CRITICAL: Update storage and notify ALL content scripts that session is ended
      await chrome.storage.local.set({ 
        sessionActive: false,
        currentSession: null,
        screenshotSequence: 0,
        navigationCount: 0
      });
      
      // Force update all tabs to stop screenshot capturing
      await this.notifyAllTabsSessionEnded();
      
      // Update extension icon to show inactive state
      await this.updateExtensionIcon();
      
      this.log('Session cleanup completed - all content scripts notified');
    }
  }  async saveSessionFile() {
    if (!this.currentSession) {
      this.log('No session to save');
      return;
    }
    
    try {
      this.log('STARTING FORCED SESSION FILE SAVE...', { 
        sessionId: this.currentSession.sessionId,
        totalScreenshots: this.currentSession.totalScreenshots,
        screenshotsArray: this.currentSession.screenshots?.length || 0
      });

      // Ensure session has minimum required data
      if (!this.currentSession.sessionId) {
        this.currentSession.sessionId = `session_${Date.now()}`;
        this.log('Generated missing sessionId:', this.currentSession.sessionId);
      }

      if (!this.currentSession.domain) {
        this.currentSession.domain = 'unknown_domain';
        this.log('Set default domain');
      }
      
      // Ensure screenshots array exists
      if (!this.currentSession.screenshots) {
        this.currentSession.screenshots = [];
        this.log('Initialized empty screenshots array');
      }
      
      // Ensure pages array exists
      if (!this.currentSession.pages) {
        this.currentSession.pages = [];
        this.log('Initialized empty pages array');
      }

      const jsonContent = JSON.stringify(this.currentSession, null, 2);
      this.log('JSON content created successfully', { 
        size: jsonContent.length,
        preview: jsonContent.substring(0, 300) + '...'
      });
      
      if (jsonContent.length < 10) {
        throw new Error('Session data appears to be empty or invalid');
      }

      // Create filename - save as TXT file to avoid Chrome restrictions
      const filename = `${this.currentSession.sessionId}_session.txt`;
      this.log('Attempting to save session file:', filename);

      // Use the new forceSaveJSON method that works properly
      const result = await this.forceSaveJSON(jsonContent, filename);
      
      this.log('Session file saved successfully!', result);
      
      // Show success notification
      await this.showNotification('Session Saved Successfully', 
        `Session file saved to Downloads/Screen Shark/${this.currentSession.domain}/`);
      
      return result;
      
    } catch (error) {
      this.log('CRITICAL ERROR SAVING SESSION FILE:', {
        message: error.message,
        stack: error.stack,
        sessionExists: !!this.currentSession,
        sessionId: this.currentSession?.sessionId,
        domain: this.currentSession?.domain
      });
      
      // Show error notification and provide fallback
      await this.showNotification('Session Save Failed', 
        'File save failed. Session data will be logged to console.');
      
      // FALLBACK: Log complete JSON to console
      if (this.currentSession) {
        const jsonContent = JSON.stringify(this.currentSession, null, 2);
        console.log('=== SCREEN SHARK SESSION JSON - COPY THIS ===');
        console.log(jsonContent);
        console.log('=== END SESSION JSON ===');
      }
      
      // Re-throw error so calling function can handle fallback      throw error;
    }
  }

  async forceSaveJSON(jsonContent, filename) {
    try {
      this.log('FORCE SAVING JSON:', { filename, size: jsonContent.length });
      
      // Convert JSON to data URL directly (no Blob/URL.createObjectURL needed)
      const base64Content = btoa(unescape(encodeURIComponent(jsonContent)));
      const dataUrl = `data:text/plain;base64,${base64Content}`;
      
      // Ensure filename has .txt extension to avoid Chrome restrictions
      const txtFilename = filename.replace(/\.json$/, '.txt');
      const domain = this.currentSession?.domain || 'unknown';
      const fullPath = `Screen Shark/${domain}/${txtFilename}`;
      
      // Use Chrome Downloads API to save
      const downloadId = await chrome.downloads.download({
        url: dataUrl,
        filename: fullPath,
        saveAs: false,
        conflictAction: 'uniquify'
      });
      
      this.log('JSON file download initiated:', { downloadId, filename: txtFilename, path: fullPath });
      
      // Wait for download to complete and verify
      await this.waitForDownloadCompletion(downloadId);
      
      this.log('JSON file saved successfully:', { downloadId, filename: txtFilename });
      return { success: true, downloadId, filename: txtFilename };
      
    } catch (error) {
      this.log('JSON SAVE FAILED - DETAILED ERROR:', {
        message: error.message,
        stack: error.stack,
        filename,
        jsonSize: jsonContent.length,
        currentSession: this.currentSession ? 'exists' : 'null',
        domain: this.currentSession?.domain
      });      
      // Re-throw error so calling function can handle fallback
      throw error;
    }
  }

  // Session timeout management
  startSessionTimeout() {
    this.clearSessionTimeout();
    if (this.sessionActive && this.currentSession) {
      this.log(`Starting session timeout (${this.SESSION_TIMEOUT_MINUTES} minutes)`);
      this.sessionTimeout = setTimeout(async () => {
        this.log('Session timeout reached - auto-ending session');
        if (this.sessionActive && this.currentSession) {
          await this.showNotification('Session Auto-Ended', 
            `Session automatically ended after ${this.SESSION_TIMEOUT_MINUTES} minutes of inactivity`);
          this.sessionActive = false;
          await chrome.storage.local.set({ sessionActive: this.sessionActive });
          await this.endCurrentSession();
        }
      }, this.SESSION_TIMEOUT_MINUTES * 60 * 1000);
    }
  }
  clearSessionTimeout() {
    if (this.sessionTimeout) {
      clearTimeout(this.sessionTimeout);
      this.sessionTimeout = null;
    }
  }
  
  resetSessionTimeout() {
    if (this.sessionActive && this.currentSession) {
      this.startSessionTimeout();
    }
  }

  async toggleDebugMode() {
    try {
      this.debugMode = !this.debugMode;
      await chrome.storage.local.set({ debugMode: this.debugMode });
      
      this.log(`Debug mode ${this.debugMode ? 'enabled' : 'disabled'}`);
    } catch (error) {
      this.log('Error toggling debug mode:', error);
      throw error;
    }
  }

  async updateContentScriptState(tabId) {
    try {
      await chrome.tabs.sendMessage(tabId, {
        action: 'updateSessionState',
        sessionActive: this.sessionActive
      });
    } catch (error) {
      // Content script might not be ready or tab might not support it
      this.log('Could not update content script state for tab:', tabId);
    }
  }

  async updateExtensionIcon() {
    try {
      const iconSuffix = this.sessionActive ? 'enabled' : 'disabled';
      await chrome.action.setIcon({
        path: {
          16: `icons/icon16_${iconSuffix}.png`,
          48: `icons/icon48_${iconSuffix}.png`,
          128: `icons/icon128_${iconSuffix}.png`
        }
      });
    } catch (error) {
      this.log('Error updating extension icon:', error);
    }
  }

  async testScreenshot(tab) {
    try {
      await this.captureScreenshot({
        reason: 'Debug Test',
        elementInfo: { type: 'test', location: 'debug panel' }
      }, tab);
    } catch (error) {
      this.log('Test screenshot failed:', error);
      throw error;
    }
  }

  // Simple test function for debugging screenshot capture
  async testSimpleCapture() {
    try {
      this.log('=== TEST SIMPLE CAPTURE START ===');
      
      // Get current active tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs.length) {
        throw new Error('No active tab found');
      }
      
      const tab = tabs[0];
      this.log('Active tab:', { id: tab.id, url: tab.url, windowId: tab.windowId });
      
      // Check if tab is accessible
      if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
        throw new Error('Cannot capture screenshots of Chrome internal pages');
      }
      
      // Try to capture without any overlay or complex logic
      this.log('Attempting simple capture...');
      const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
        format: 'png',
        quality: 90
      });
      
      if (!dataUrl) {
        throw new Error('Capture returned empty data');
      }
      
      this.log('Capture successful! DataUrl length:', dataUrl.length);
      
      // Try a simple download
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `test-capture-${timestamp}.png`;
      
      await chrome.downloads.download({
        url: dataUrl,
        filename: filename,
        saveAs: false
      });
      
      this.log('Download successful!');
      await this.showNotification('Test Capture Successful', `Saved as ${filename}`);
      
      this.log('=== TEST SIMPLE CAPTURE END ===');
      return { success: true };
      
    } catch (error) {
      this.log('Test capture failed:', error);
      this.log('Error message:', error?.message);
      this.log('Error stack:', error?.stack);
      this.log('chrome.runtime.lastError:', chrome.runtime.lastError);
      
      await this.showNotification('Test Capture Failed', error.message || 'Unknown error');
      throw error;
    }
  }
  // Comprehensive test for session JSON generation
  async testSessionJsonGeneration() {
    let testSession = null;
    
    try {
      this.log('=== TESTING SESSION JSON GENERATION ===');
      
      // Step 1: Get current active tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs.length) {
        throw new Error('No active tab found for testing');
      }
      
      const tab = tabs[0];
      this.log('Test tab:', { id: tab.id, url: tab.url });
      
      // Check if tab is accessible
      if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
        throw new Error('Cannot test on Chrome internal pages. Please navigate to a regular website.');
      }
      
      // Step 2: Start a test session
      this.log('Starting test session...');
      await this.startNewSession();
      this.sessionActive = true;
      await chrome.storage.local.set({ sessionActive: this.sessionActive });
      
      // Store reference to test session before cleanup
      testSession = {
        sessionId: this.currentSession.sessionId,
        domain: this.currentSession.domain
      };
      
      this.log('Test session started:', testSession);
      
      // Step 3: Add some test data to session
      this.log('Adding test data to session...');
      
      // Add test screenshots data (without actual screenshot capture to avoid tab access issues)
      for (let i = 1; i <= 3; i++) {
        const testScreenshot = {
          sequence: i,
          timestamp: new Date().toISOString(),
          filename: `Screen Shark/${this.currentSession.domain}/screenshot_${i}_test.png`,
          url: tab.url,
          pageTitle: tab.title || 'Test Page',
          reason: `Test Screenshot ${i}`,
          elementInfo: {
            tagName: i === 1 ? 'BUTTON' : i === 2 ? 'LINK' : 'DIV',
            text: `Test Element ${i}`,
            id: `test-element-${i}`
          }
        };
        
        this.currentSession.screenshots.push(testScreenshot);
        this.currentSession.totalScreenshots++;
      }
      
      // Add test page data
      this.currentSession.pages.push({
        url: tab.url,
        title: tab.title || 'Test Page',
        timestamp: new Date().toISOString(),
        sequence: 1
      });
      
      // Step 4: Validate session data
      this.log('Validating session data...');
      
      if (!this.currentSession) {
        throw new Error('Session not found after adding test data');
      }
      
      if (this.currentSession.screenshots.length !== 3) {
        throw new Error(`Expected 3 screenshots, got ${this.currentSession.screenshots.length}`);
      }
      
      if (this.currentSession.totalScreenshots !== 3) {
        throw new Error(`Expected totalScreenshots to be 3, got ${this.currentSession.totalScreenshots}`);
      }
      
      this.log('Session validation passed:', {
        screenshots: this.currentSession.screenshots.length,
        totalScreenshots: this.currentSession.totalScreenshots,
        pages: this.currentSession.pages.length
      });
      
      // Step 5: Test JSON generation
      this.log('Testing JSON generation...');
      
      // Create test JSON content
      const testJsonContent = JSON.stringify(this.currentSession, null, 2);
      
      if (testJsonContent.length < 100) {
        throw new Error('Generated JSON appears to be too small');
      }
      
      this.log('JSON content generated successfully:', {
        size: testJsonContent.length,
        preview: testJsonContent.substring(0, 300) + '...'
      });
      
      // Validate JSON structure
      const parsedJson = JSON.parse(testJsonContent);
      
      const requiredFields = ['sessionId', 'domain', 'startTime', 'totalScreenshots', 'screenshots', 'pages'];
      for (const field of requiredFields) {
        if (!(field in parsedJson)) {
          throw new Error(`Missing required field in JSON: ${field}`);
        }
      }
      
      if (!Array.isArray(parsedJson.screenshots)) {
        throw new Error('Screenshots field is not an array');
      }
      
      if (parsedJson.screenshots.length !== 3) {
        throw new Error(`JSON screenshots array has ${parsedJson.screenshots.length} items, expected 3`);
      }
      
      // Validate screenshot entries
      for (let i = 0; i < parsedJson.screenshots.length; i++) {
        const screenshot = parsedJson.screenshots[i];
        const requiredScreenshotFields = ['sequence', 'timestamp', 'filename', 'url', 'pageTitle'];
        
        for (const field of requiredScreenshotFields) {
          if (!(field in screenshot)) {
            throw new Error(`Screenshot ${i + 1} missing required field: ${field}`);
          }
        }
        
        if (screenshot.sequence !== i + 1) {
          throw new Error(`Screenshot ${i + 1} has incorrect sequence number: ${screenshot.sequence}`);
        }
      }
      
      this.log('JSON structure validation passed');
      
      // Step 6: Test actual file save to test folder
      this.log('Testing actual file save to test folder...');
      
      // Save to test subfolder
      const testFolderPath = `Screen Shark/test/${testSession.domain}`;
      const testFilename = `${testFolderPath}/${testSession.sessionId}_test_session.txt`;
        try {
        // Use base64 data URL instead of blob
        const base64Content = btoa(unescape(encodeURIComponent(testJsonContent)));
        const dataUrl = `data:text/plain;base64,${base64Content}`;
        
        const downloadId = await new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            reject(new Error('Test download timeout after 10 seconds'));
          }, 10000);

          chrome.downloads.download({
            url: dataUrl,
            filename: testFilename,
            saveAs: false,
            conflictAction: 'uniquify'
          }, (downloadId) => {
            clearTimeout(timeoutId);
            
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else if (!downloadId) {
              reject(new Error('Failed to get download ID'));
            } else {
              resolve(downloadId);
            }
          });        });
        
        // Note: No need to clean up data URLs (not blob URLs)
        
        // Verify download completed
        let downloadCompleted = false;
        for (let attempt = 0; attempt < 5; attempt++) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          try {
            const downloads = await chrome.downloads.search({ id: downloadId });
            if (downloads.length > 0 && downloads[0].state === 'complete') {
              downloadCompleted = true;
              break;
            }
          } catch (checkError) {
            this.log(`Download check attempt ${attempt + 1} failed:`, checkError.message);
          }
        }
        
        if (!downloadCompleted) {
          throw new Error('Download verification failed - file may not have been saved');
        }
        
        this.log('Test file save PASSED - JSON file saved to test folder:', testFilename);
        
      } catch (saveError) {
        this.log('Test file save FAILED:', saveError);
        throw new Error(`Test file save failed: ${saveError.message}`);
      }
      
      // Step 7: Clean up test session
      this.log('Cleaning up test session...');
      this.sessionActive = false;
      await chrome.storage.local.set({ sessionActive: this.sessionActive });
      this.currentSession = null;
      this.screenshotSequence = 0;
      this.navigationCount = 0;
      this.clearSessionTimeout();
      
      this.log('=== SESSION JSON GENERATION TEST COMPLETED SUCCESSFULLY ===');
      
      await this.showNotification('JSON Test Passed!', 
        `Session JSON generation test completed successfully. Check Downloads/Screen Shark/test/${testSession.domain}/`);
      
      return { 
        success: true, 
        message: `Session JSON generation test passed - check Downloads/Screen Shark/test/${testSession.domain}/`,
        screenshotCount: 3,
        jsonSize: testJsonContent.length,
        testFolder: `Screen Shark/test/${testSession.domain}`,
        sessionId: testSession.sessionId
      };
      
    } catch (error) {
      this.log('=== SESSION JSON GENERATION TEST FAILED ===');
      this.log('Test error:', error);
      this.log('Error details:', {
        message: error.message,
        stack: error.stack
      });
      
      // Clean up on failure
      try {
        this.sessionActive = false;
        await chrome.storage.local.set({ sessionActive: this.sessionActive });
        this.currentSession = null;
        this.screenshotSequence = 0;
        this.navigationCount = 0;
        this.clearSessionTimeout();
      } catch (cleanupError) {
        this.log('Cleanup error:', cleanupError);
      }
      
      await this.showNotification('JSON Test Failed', 
        `Session JSON generation test failed: ${error.message}`);
      
      throw error;    }
  }
  async runOverlayTest(tabId) {
    try {
      this.log('Running overlay test for tab:', tabId);
      
      // Get tab info
      const tab = await chrome.tabs.get(tabId);
      if (!tab) {
        throw new Error('Tab not found');
      }
      
      // Create mock element info for testing
      const mockElementInfo = {
        tagName: 'BUTTON',
        type: 'button',
        text: 'Test Button',
        className: 'test-btn',
        position: { x: 100, y: 100, width: 80, height: 30 }
      };
      
      const mockClickPosition = { x: 140, y: 115 };
      
      // Add overlay
      await this.addScreenshotOverlay(tabId, mockElementInfo, mockClickPosition);
      
      // Wait for overlay to render
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      // Verify overlay is present
      const overlayCheck = await this.verifyOverlayPresent(tabId);
      
      // Capture screenshot with overlay
      const screenshotResult = await this.captureScreenshot({
        reason: 'Overlay Test',
        elementInfo: mockElementInfo,
        clickPosition: mockClickPosition,
        isInteraction: true
      }, tab);
      
      // Clean up overlay
      await this.removeScreenshotOverlay(tabId);
      
      return {
        success: true,
        overlayCheck: overlayCheck,
        screenshotCaptured: !!screenshotResult,
        mockElementInfo: mockElementInfo,
        mockClickPosition: mockClickPosition
      };
      
    } catch (error) {
      this.log('Overlay test failed:', error);
      return {
        success: false,
        error: error.message,
        overlayCheck: { present: false, reason: 'Test failed' },
        screenshotCaptured: false
      };
    }
  }

  // Critical overlay visibility test
  async runCriticalOverlayTest() {
    try {
      this.log('=== RUNNING CRITICAL OVERLAY VISIBILITY TEST ===');
      
      // Get current active tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs.length) {
        throw new Error('No active tab found');
      }
      
      const tab = tabs[0];
      this.log('Testing critical overlay on tab:', { id: tab.id, url: tab.url });
      
      // Check if tab is accessible
      if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
        throw new Error('Cannot test on Chrome internal pages. Please navigate to a regular website.');
      }
      
      // Create highly visible overlay for testing
      this.log('Creating maximum visibility overlay...');
      
      const overlayResult = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          // Remove any existing overlay
          const existing = document.getElementById('screen-shark-screenshot-overlay');
          if (existing) existing.remove();
          
          // Create container with maximum visibility settings
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
          
          // Create very visible highlight in center
          const centerX = Math.floor(window.innerWidth / 2);
          const centerY = Math.floor(window.innerHeight / 2);
          
          const highlight = document.createElement('div');
          highlight.style.cssText = `
            position: absolute !important;
            left: ${centerX - 60}px !important;
            top: ${centerY - 60}px !important;
            width: 120px !important;
            height: 120px !important;
            border: 8px solid #FF0000 !important;
            border-radius: 12px !important;
            background: rgba(255, 0, 0, 0.7) !important;
            box-shadow: 0 0 0 4px rgba(255, 255, 255, 1), 0 0 30px rgba(255, 0, 0, 1) !important;
            pointer-events: none !important;
            opacity: 1 !important;
            display: block !important;
            visibility: visible !important;
            z-index: 2147483648 !important;
          `;
          
          // Create highly visible label
          const label = document.createElement('div');
          label.textContent = '🔴 CRITICAL OVERLAY TEST - MUST BE VISIBLE IN SCREENSHOT 🔴';
          label.style.cssText = `
            position: absolute !important;
            left: ${centerX - 200}px !important;
            top: ${centerY - 100}px !important;
            background: #FF0000 !important;
            color: white !important;
            padding: 12px 18px !important;
            border-radius: 8px !important;
            font-family: Arial, sans-serif !important;
            font-size: 16px !important;
            font-weight: 700 !important;
            white-space: nowrap !important;
            pointer-events: none !important;
            z-index: 2147483649 !important;
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.6) !important;
            border: 4px solid rgba(255, 255, 255, 1) !important;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8) !important;
          `;
          
          // Assemble overlay
          overlay.appendChild(highlight);
          overlay.appendChild(label);
          document.body.appendChild(overlay);
          
          // Force extensive repaints to ensure visibility
          for (let i = 0; i < 20; i++) {
            overlay.offsetHeight;
            highlight.offsetHeight;
            label.offsetHeight;
            
            // Force style recalculation
            window.getComputedStyle(overlay).display;
            window.getComputedStyle(highlight).display;
            window.getComputedStyle(label).display;
          }
          
          console.log('[Critical Test] Overlay created with maximum visibility');
          
          return {
            success: true,
            centerPosition: { x: centerX, y: centerY },
            overlayElements: overlay.children.length,
            overlayVisible: getComputedStyle(overlay).display !== 'none'
          };
        }
      });
      
      this.log('Critical overlay creation result:', overlayResult[0].result);
      
      // Wait longer for overlay to be fully rendered
      this.log('Waiting 4 seconds for overlay to be fully rendered...');
      await new Promise(resolve => setTimeout(resolve, 4000));
      
      // Verify overlay is still present
      const verifyResult = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const overlay = document.getElementById('screen-shark-screenshot-overlay');
          if (!overlay) {
            return { present: false, error: 'Overlay disappeared' };
          }
          
          const style = getComputedStyle(overlay);
          const children = Array.from(overlay.children);
          
          return {
            present: true,
            visible: style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0',
            childCount: children.length,
            allChildrenVisible: children.every(child => {
              const childStyle = getComputedStyle(child);
              return childStyle.display !== 'none' && childStyle.visibility !== 'hidden' && childStyle.opacity !== '0';
            })
          };
        }
      });
      
      this.log('Critical overlay verification:', verifyResult[0].result);
      
      if (!verifyResult[0].result.present || !verifyResult[0].result.visible) {
        throw new Error('Critical overlay is not visible before screenshot capture');
      }
      
      // Capture screenshot with maximum quality
      this.log('Capturing critical test screenshot...');
      const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
        format: 'png',
        quality: 100
      });
      
      if (!dataUrl) {
        throw new Error('Critical test screenshot capture failed');
      }
      
      this.log('Critical test screenshot captured, size:', dataUrl.length);
      
      // Save with distinctive name
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `Screen Shark/test/CRITICAL_OVERLAY_VISIBILITY_TEST_${timestamp}.png`;
      
      const downloadId = await chrome.downloads.download({
        url: dataUrl,
        filename: filename,
        saveAs: false,
        conflictAction: 'uniquify'
      });
      
      this.log('Critical test screenshot saved:', filename);
      
      // Keep overlay visible for visual confirmation
      this.log('Keeping overlay visible for 5 more seconds for manual verification...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Clean up
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const overlay = document.getElementById('screen-shark-screenshot-overlay');
          if (overlay) {
            overlay.remove();
            console.log('[Critical Test] Overlay removed');
          }
        }
      });
      
      await this.showNotification('CRITICAL OVERLAY TEST COMPLETED', 
        `Check screenshot: ${filename} - Red overlay MUST be visible!`);
      
      this.log('=== CRITICAL OVERLAY TEST COMPLETED ===');
      
      return {
        success: true,
        filename: filename,
        downloadId: downloadId,
        message: 'Critical overlay test completed - check screenshot for red overlay visibility'
      };
      
    } catch (error) {
      this.log('CRITICAL OVERLAY TEST FAILED:', error);
      
      await this.showNotification('CRITICAL OVERLAY TEST FAILED', 
        `Error: ${error.message}`);
      
      throw error;
    }
  }

  async showNotification(title, message) {
    try {
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48_enabled.png',
        title: title,
        message: message
      });    } catch (error) {
      this.log('Error showing notification:', error);
    }
  }
  
  log(message, data = null) {
    const timestamp = new Date().toISOString();
    
    // Better error logging
    let logData = data;
    if (data instanceof Error) {
      logData = {
        error: data.message,
        stack: data.stack,
        name: data.name,
        toString: data.toString()
      };
      console.error(`[Screen Shark] ${message}`, logData);
    } else {
      console.log(`[Screen Shark] ${message}`, data || '');
    }
    
    const logEntry = {
      timestamp,
      message,
      data: logData
    };
    
    // Store logs for debug mode
    if (this.debugMode) {
      chrome.storage.local.get(['debugLogs']).then(result => {
        const logs = result.debugLogs || [];
        logs.push(logEntry);
        
        // Keep only last 100 logs
        if (logs.length > 100) {
          logs.splice(0, logs.length - 100);
        }
        
        chrome.storage.local.set({ debugLogs: logs });
      });
    }
  }

  isNewPage(currentUrl) {
    if (!this.currentSession || this.currentSession.pages.length === 0) {
      return true;
    }
    
    const lastPage = this.currentSession.pages[this.currentSession.pages.length - 1];
    return lastPage.url !== currentUrl;
  }

  addPageToSession(tab) {
    if (!this.currentSession) return;
    
    this.currentSession.pages.push({
      url: tab.url,
      title: tab.title,
      timestamp: new Date().toISOString(),
      sequence: this.navigationCount
    });
  }

  addScreenshotToSession(screenshotData) {
    if (!this.currentSession) return;
    
    this.currentSession.screenshots.push(screenshotData);
  }  async addScreenshotOverlay(tabId, elementInfo, clickPosition) {
    try {
      // Check if chrome.scripting is available
      if (!chrome.scripting || !chrome.scripting.executeScript) {
        throw new Error('chrome.scripting API not available - check manifest permissions');
      }
      
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: (elementInfo, clickPosition) => {
          console.log('[Screen Shark] Creating overlay for element:', elementInfo);
          
          // Remove any existing screenshot overlay
          const existingOverlay = document.getElementById('screen-shark-screenshot-overlay');
          if (existingOverlay) {
            existingOverlay.remove();
          }

          // First try to find element by exact position match
          let targetElement = null;
          const elements = document.querySelectorAll('*');
          
          // Method 1: Try exact position match
          if (elementInfo.position) {
            for (const el of elements) {
              const rect = el.getBoundingClientRect();
              if (Math.abs(rect.left - elementInfo.position.x) < 5 && 
                  Math.abs(rect.top - elementInfo.position.y) < 5 &&
                  Math.abs(rect.width - elementInfo.position.width) < 10 &&
                  Math.abs(rect.height - elementInfo.position.height) < 10) {
                targetElement = el;
                console.log('[Screen Shark] Found element by position match:', el);
                break;
              }
            }
          }
          
          // Method 2: Try to find by element properties if position match failed
          if (!targetElement && elementInfo.id) {
            targetElement = document.getElementById(elementInfo.id);
            console.log('[Screen Shark] Found element by ID:', targetElement);
          }
          
          // Method 3: Try to find by selector combination
          if (!targetElement && elementInfo.tagName) {
            const tagName = elementInfo.tagName.toLowerCase();
            const candidates = document.querySelectorAll(tagName);
            
            for (const candidate of candidates) {
              const matches = (
                (!elementInfo.text || candidate.textContent?.includes(elementInfo.text.substring(0, 20))) &&
                (!elementInfo.className || candidate.className === elementInfo.className) &&
                (!elementInfo.type || candidate.type === elementInfo.type)
              );
              
              if (matches) {
                targetElement = candidate;
                console.log('[Screen Shark] Found element by properties match:', candidate);
                break;
              }
            }
          }
          
          // Method 4: Use click position as fallback
          if (!targetElement && clickPosition) {
            targetElement = document.elementFromPoint(clickPosition.x, clickPosition.y);
            console.log('[Screen Shark] Found element by click position:', targetElement);
          }

          if (!targetElement) {
            console.warn('[Screen Shark] Could not find target element for overlay');
            // Create a generic overlay at click position if we have it
            if (clickPosition) {
              targetElement = { 
                getBoundingClientRect: () => ({
                  left: clickPosition.x - 20,
                  top: clickPosition.y - 20,
                  width: 40,
                  height: 40,
                  right: clickPosition.x + 20,
                  bottom: clickPosition.y + 20
                })
              };
            } else {
              return;
            }
          }

          const rect = targetElement.getBoundingClientRect();
          console.log('[Screen Shark] Element rect:', rect);
            // Create screenshot overlay container
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
          `;          // Create element highlight border
          const highlight = document.createElement('div');
          highlight.style.cssText = `
            position: absolute !important;            left: ${rect.left - 3}px !important;
            top: ${rect.top - 3}px !important;
            width: ${rect.width + 6}px !important;
            height: ${rect.height + 6}px !important;
            border: 4px solid #FF6B35 !important;
            border-radius: 6px !important;
            background: rgba(255, 107, 53, 0.4) !important;
            box-shadow: 0 0 0 2px rgba(255, 255, 255, 1), 0 0 15px rgba(255, 107, 53, 0.8) !important;
            pointer-events: none !important;
            animation: screenSharkPulse 2s ease-in-out infinite !important;
            opacity: 1 !important;
            display: block !important;
            visibility: visible !important;
            z-index: 2147483648 !important;
          `;
          
          // Create info label with better element identification
          const infoLabel = document.createElement('div');
          const elementType = elementInfo.tagName || 'ELEMENT';
          const elementText = elementInfo.text ? elementInfo.text.substring(0, 30) : '';
          const elementName = targetElement.name || targetElement.id || '';
          const altText = targetElement.alt || targetElement.title || targetElement.placeholder || '';
          const ariaLabel = targetElement.getAttribute('aria-label') || '';
          
          // Build comprehensive label text
          let labelText = `📸 ${elementType}`;
          
          // Add element name/id if available
          if (elementName) {
            labelText += ` [${elementName}]`;
          }
          
          // Add text content if available
          if (elementText) {
            labelText += `: "${elementText}"`;
          }
          
          // Add alt text or aria-label if available and different from text
          if (altText && altText !== elementText) {
            labelText += ` (${altText.substring(0, 20)})`;
          } else if (ariaLabel && ariaLabel !== elementText && ariaLabel !== altText) {
            labelText += ` (${ariaLabel.substring(0, 20)})`;
          }
          
          infoLabel.textContent = labelText;
          infoLabel.style.cssText = `
            position: absolute !important;
            left: ${rect.left}px !important;
            top: ${rect.top - 35}px !important;
            background: linear-gradient(135deg, #FF6B35, #F7931E) !important;
            color: white !important;
            padding: 6px 12px !important;
            border-radius: 6px !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif !important;
            font-size: 12px !important;
            font-weight: 600 !important;
            white-space: nowrap !important;
            max-width: 300px !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;            pointer-events: none !important;
            z-index: 2147483649 !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2) !important;
            border: 2px solid rgba(255, 255, 255, 0.8) !important;
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
          `;

          // Adjust label position if it would be off-screen
          if (rect.top < 40) {
            infoLabel.style.top = `${rect.bottom + 10}px !important`;
          }
          if (rect.left < 0) {
            infoLabel.style.left = '10px !important';
          }
          if (rect.left + 300 > window.innerWidth) {
            infoLabel.style.left = `${window.innerWidth - 310}px !important`;
          }          // Add pulse animation that ensures visibility during screenshot
          const style = document.createElement('style');
          style.textContent = `
            @keyframes screenSharkPulse {
              0%, 100% { 
                transform: scale(1); 
                opacity: 1; 
              }
              25%, 75% { 
                transform: scale(1.01); 
                opacity: 1; 
              }
              50% { 
                transform: scale(1.02); 
                opacity: 1; 
              }            }
          `;
          document.head.appendChild(style);
          
          overlay.appendChild(highlight);
          overlay.appendChild(infoLabel);
          document.body.appendChild(overlay);
          
          console.log('[Screen Shark] Overlay created successfully with elements:', {
            overlayId: overlay.id,
            overlayDisplay: overlay.style.display,
            highlightDisplay: highlight.style.display,
            labelDisplay: infoLabel.style.display,
            elementRect: rect
          });
          
          // Force multiple repaints to ensure overlay is fully visible
          overlay.offsetHeight;
          highlight.offsetHeight;
          infoLabel.offsetHeight;
          
          // Force style recalculation and log computed styles
          const overlayComputed = window.getComputedStyle(overlay);
          const highlightComputed = window.getComputedStyle(highlight);
          const labelComputed = window.getComputedStyle(infoLabel);
          
          console.log('[Screen Shark] Computed overlay styles:', {
            overlay: {
              display: overlayComputed.display,
              visibility: overlayComputed.visibility,
              opacity: overlayComputed.opacity,
              zIndex: overlayComputed.zIndex
            },
            highlight: {
              display: highlightComputed.display,
              visibility: highlightComputed.visibility,
              opacity: highlightComputed.opacity,
              zIndex: highlightComputed.zIndex
            },
            label: {
              display: labelComputed.display,
              visibility: labelComputed.visibility,
              opacity: labelComputed.opacity,
              zIndex: labelComputed.zIndex
            }
          });
          
          return true;
        },
        args: [elementInfo, clickPosition]
      });
    } catch (error) {
      this.log('Error adding screenshot overlay:', error);
    }  }  async removeScreenshotOverlay(tabId) {
    try {
      // Check if tab is accessible first
      const tab = await chrome.tabs.get(tabId);
      if (!tab || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
        this.log('Skipping overlay removal for inaccessible tab:', tabId);
        return;
      }

      // Check if chrome.scripting is available
      if (!chrome.scripting || !chrome.scripting.executeScript) {
        this.log('chrome.scripting API not available for overlay removal');
        return;
      }

      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: () => {
          const overlay = document.getElementById('screen-shark-screenshot-overlay');
          if (overlay) {
            overlay.remove();
          }
        }
      });
    } catch (error) {
      // This is expected for tabs without content scripts - log at debug level only
      this.log('Could not remove overlay from tab (expected for some pages):', { tabId, error: error.message });
    }
  }

  async notifyAllTabsSessionEnded() {
    try {
      this.log('FORCE NOTIFYING ALL TABS - SESSION ENDED');
      
      // Get all tabs
      const tabs = await chrome.tabs.query({});
      this.log(`Found ${tabs.length} tabs to notify`);
      
      // Create promises for all tab notifications
      const notificationPromises = tabs.map(async (tab) => {
        try {
          // Skip Chrome internal pages
          if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
            return { tabId: tab.id, status: 'skipped', reason: 'chrome page' };
          }
          
          // Add timeout to prevent hanging
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Tab notification timeout')), 3000)
          );
          
          const messagePromise = chrome.tabs.sendMessage(tab.id, {
            action: 'forceEndSession',
            sessionActive: false,
            timestamp: Date.now()
          });
          
          await Promise.race([messagePromise, timeoutPromise]);
          this.log(`Successfully notified tab ${tab.id}: ${tab.url}`);
          return { tabId: tab.id, status: 'success', url: tab.url };
          
        } catch (error) {
          this.log(`Failed to notify tab ${tab.id} (${tab.url}):`, error.message);
          return { tabId: tab.id, status: 'failed', error: error.message, url: tab.url };
        }
      });
      
      // Wait for all notifications to complete (or timeout)
      const results = await Promise.allSettled(notificationPromises);
      
      // Log summary
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.status === 'success').length;
      const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.status === 'failed')).length;
      const skipped = results.filter(r => r.status === 'fulfilled' && r.value.status === 'skipped').length;
      
      this.log(`Tab notification summary: ${successful} successful, ${failed} failed, ${skipped} skipped`);
      
    } catch (error) {
      this.log('Error in notifyAllTabsSessionEnded:', error);
    }
  }

  async forceStopAllSessions() {
    this.log('FORCE STOPPING ALL SESSIONS AND CLEANING UP');
    
    try {
      // Force session state to inactive
      this.sessionActive = false;
      this.currentSession = null;
      this.screenshotSequence = 0;
      this.navigationCount = 0;
      this.clearSessionTimeout();
      
      // Update storage
      await chrome.storage.local.set({ 
        sessionActive: false,
        currentSession: null,
        screenshotSequence: 0,
        navigationCount: 0
      });
      
      // Force notify all tabs
      await this.notifyAllTabsSessionEnded();
      
      // Update extension icon
      await this.updateExtensionIcon();
      
      // Show notification
      await this.showNotification('Session Force Stopped', 'All recording sessions have been forcibly stopped');
        this.log('Force stop completed successfully');
      return { success: true };
      
    } catch (error) {
      this.log('Error in forceStopAllSessions:', error);
      throw error;
    }
  }

  // Run download validation test using the dedicated test class
  async runDownloadValidationTest() {
    try {
      this.log('=== STARTING DOWNLOAD VALIDATION TEST ===');
      
      // Import or define the DownloadValidationTest class inline
      class DownloadValidationTest {
        constructor() {
          this.testResults = {
            timestamp: new Date().toISOString(),
            tests: [],
            summary: { total: 0, passed: 0, failed: 0 }
          };
        }

        log(message, data = null) {
          console.log(`[Download Test] ${message}`, data || '');
        }

        async addTestResult(testName, passed, details = {}) {
          this.testResults.tests.push({
            name: testName,
            passed: passed,
            timestamp: new Date().toISOString(),
            details: details
          });
          
          this.testResults.summary.total++;
          if (passed) {
            this.testResults.summary.passed++;
          } else {
            this.testResults.summary.failed++;
          }
        }

        async testBasicDownload() {
          try {
            const testContent = JSON.stringify({
              test: 'basic download validation',
              timestamp: new Date().toISOString()
            });
              // Use base64 data URL instead of blob
            const base64Content = btoa(unescape(encodeURIComponent(testContent)));
            const dataUrl = `data:text/plain;base64,${base64Content}`;
            const testFilename = `Screen Shark/test/download_validation_${Date.now()}.txt`;
            
            const downloadId = await new Promise((resolve, reject) => {
              const timeoutId = setTimeout(() => {
                reject(new Error('Download timeout'));
              }, 10000);
              
              chrome.downloads.download({
                url: dataUrl,
                filename: testFilename,
                saveAs: false,
                conflictAction: 'uniquify'              }, (downloadId) => {
                clearTimeout(timeoutId);
                // Note: No need to revoke data URLs (not blob URLs)
                
                if (chrome.runtime.lastError) {
                  reject(new Error(chrome.runtime.lastError.message));
                } else if (!downloadId) {
                  reject(new Error('No download ID returned'));
                } else {
                  resolve(downloadId);
                }
              });
            });
            
            // Wait for download to complete
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Check download status
            const downloads = await chrome.downloads.search({ id: downloadId });
            const download = downloads[0];
            const downloadCompleted = download && download.state === 'complete';
            
            await this.addTestResult('Basic Download Test', downloadCompleted, {
              downloadId: downloadId,
              filename: testFilename,
              downloadState: download?.state,
              bytesReceived: download?.bytesReceived,
              expectedSize: testContent.length
            });
            
            return downloadCompleted;
          } catch (error) {
            await this.addTestResult('Basic Download Test', false, { error: error.message });
            return false;
          }
        }

        async runAllTests() {
          this.log('Starting download validation tests...');
          
          // Test basic download functionality
          await this.testBasicDownload();
            // Save test results
          try {
            const resultsJson = JSON.stringify(this.testResults, null, 2);
            // Use base64 data URL instead of blob
            const base64Content = btoa(unescape(encodeURIComponent(resultsJson)));
            const dataUrl = `data:text/plain;base64,${base64Content}`;
            const resultsFilename = `Screen Shark/test/download_validation_results_${Date.now()}.txt`;
            
            await new Promise((resolve, reject) => {
              chrome.downloads.download({
                url: dataUrl,
                filename: resultsFilename,
                saveAs: false,
                conflictAction: 'uniquify'              }, (downloadId) => {
                // Note: No need to revoke data URLs (not blob URLs)
                if (chrome.runtime.lastError) {
                  reject(new Error(chrome.runtime.lastError.message));
                } else {
                  resolve(downloadId);
                }
              });
            });
            
            this.log('Test results saved successfully');
          } catch (saveError) {
            this.log('Failed to save test results:', saveError.message);
          }
          
          return {
            success: this.testResults.summary.failed === 0,
            summary: this.testResults.summary,
            results: this.testResults
          };
        }
      }
      
      // Run the validation test
      const validator = new DownloadValidationTest();
      const result = await validator.runAllTests();
      
      this.log('Download validation test completed:', result.summary);
      
      // Show notification
      const status = result.success ? 'PASSED' : 'FAILED';
      await this.showNotification(`Download Test ${status}`, 
        `Passed: ${result.summary.passed}, Failed: ${result.summary.failed}`);
      
           
      return result;
      
    } catch (error) {
      this.log('Download validation test failed:', error);
      return { 
        success: false, 
        error: error.message,
        summary: { total: 1, passed: 0, failed: 1 }
      };
    }
  }
  async verifyOverlayPresent(tabId) {
    try {
      // Check if chrome.scripting is available
      if (!chrome.scripting || !chrome.scripting.executeScript) {
        throw new Error('chrome.scripting API not available - check manifest permissions');
      }
      
      const result = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: () => {
          const overlay = document.getElementById('screen-shark-screenshot-overlay');
          if (!overlay) {
            return { present: false, reason: 'Overlay element not found' };
          }
          
          const style = window.getComputedStyle(overlay);
          const isVisible = style.display !== 'none' && 
                           style.visibility !== 'hidden' && 
                           style.opacity !== '0';
          
          const highlight = overlay.querySelector('div');
          const highlightStyle = highlight ? window.getComputedStyle(highlight) : null;
          
          return {
            present: true,
            visible: isVisible,
            overlayDisplay: style.display,
            overlayVisibility: style.visibility,
            overlayOpacity: style.opacity,
            hasHighlight: !!highlight,
            highlightVisible: highlightStyle ? highlightStyle.opacity !== '0' : false,
            elementCount: overlay.children.length
          };
        }
      });
      
      return result[0]?.result || { present: false, reason: 'Script execution failed' };    } catch (error) {
      this.log('Error verifying overlay:', error.message || error.toString());
      return { present: false, reason: error.message || error.toString() };
    }
  }

  async waitForDownloadCompletion(downloadId) {
    const maxAttempts = 15; // Wait up to 15 seconds
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        
        const downloads = await chrome.downloads.search({ id: downloadId });
        if (downloads.length > 0) {
          const download = downloads[0];
          this.log(`Download verification attempt ${attempt + 1}:`, {
            state: download.state,
            bytesReceived: download.bytesReceived,
            totalBytes: download.totalBytes,
            filename: download.filename
          });
          
          if (download.state === 'complete') {
            this.log('Download completed successfully:', {
              filename: download.filename,
              downloadId,
              bytesReceived: download.bytesReceived
            });
            return true;
          } else if (download.state === 'interrupted') {
            throw new Error(`Download interrupted: ${download.error || 'Unknown error'}`);
          }
          // If in_progress, continue waiting
        } else {
          this.log(`Download ${downloadId} not found in search results`);
        }
      } catch (checkError) {
        this.log(`Download verification attempt ${attempt + 1} failed:`, checkError.message);
        if (checkError.message.includes('interrupted')) {
          throw checkError; // Re-throw interrupted errors immediately
        }
      }
    }
    
    // If we get here, download didn't complete within the timeout
    throw new Error(`Download verification failed: Download did not complete within ${maxAttempts} seconds`);
  }
}

// Initialize the background service
new ScreenSharkBackground();
