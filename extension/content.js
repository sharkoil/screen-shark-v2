// Screen Shark Content Script
class ScreenSharkContent {  constructor() {
    this.sessionActive = false;
    this.floatingButton = null;
    this.debugMode = true; // Enable debug mode by default for troubleshooting
    this.lastInteractionTime = 0;
    this.interactionThrottle = 500; // Minimum time between captures (ms)
    this.highlightOverlay = null;
    
    // Store event listeners for cleanup
    this.clickHandler = null;
    this.submitHandler = null;
    this.mouseMoveHandler = null;
    this.mouseUpHandler = null;
    
    this.initializeContentScript();
    
    // Clean up when page unloads
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });
  }

  cleanup() {
    this.log('Cleaning up content script...');
    this.removeInteractionListeners();
    this.removeFloatingButton();
    this.removeHighlightOverlay();
  }

  async initializeContentScript() {
    try {
      // Get initial state from background
      const response = await chrome.runtime.sendMessage({ action: 'getState' });
      this.sessionActive = response.sessionActive;
      this.debugMode = response.debugMode;

      this.log('Content script initialized', {
        url: window.location.href,
        sessionActive: this.sessionActive,
        debugMode: this.debugMode
      });

      // Set up event listeners
      this.setupEventListeners();
      
      // Create floating button if session is active
      if (this.sessionActive) {
        this.createFloatingButton();
      }

    } catch (error) {
      console.error('[Screen Shark] Failed to initialize content script:', error);
    }
  }
  setupEventListeners() {
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true;
    });

    // Only set up interaction listeners if session is active
    if (this.sessionActive) {
      this.setupInteractionListeners();
    }
  }  setupInteractionListeners() {
    // Remove any existing listeners first
    this.removeInteractionListeners();
    
    // Store handlers as class properties for removal later
    this.clickHandler = this.throttle((event) => {
      this.log('Click event detected', { 
        sessionActive: this.sessionActive, 
        target: event.target.tagName,
        timestamp: Date.now()
      });
      
      if (!this.sessionActive) {
        this.log('Ignoring click - session not active');
        return;
      }
      
      const element = event.target;
      const elementInfo = this.getElementInfo(element);
      
      // Only capture for interactive elements
      if (this.isInteractiveElement(element)) {
        this.log('Processing interactive element click', elementInfo);
        this.captureInteraction(elementInfo, element);
      } else {
        this.log('Ignoring non-interactive element click', { tagName: element.tagName });
      }
    }, this.interactionThrottle);

    this.submitHandler = (event) => {
      this.log('Submit event detected', { 
        sessionActive: this.sessionActive,
        timestamp: Date.now()
      });
      
      if (!this.sessionActive) {
        this.log('Ignoring submit - session not active');
        return;
      }
      
      const form = event.target;
      const elementInfo = this.getElementInfo(form);
      elementInfo.type = 'form-submit';
      
      this.captureInteraction(elementInfo, form);
    };

    // Add listeners
    document.addEventListener('click', this.clickHandler, true);
    document.addEventListener('submit', this.submitHandler, true);

    this.log('Interaction listeners set up', { 
      sessionActive: this.sessionActive,
      hasClickHandler: !!this.clickHandler,
      hasSubmitHandler: !!this.submitHandler
    });
  }
  removeInteractionListeners() {
    this.log('Attempting to remove interaction listeners', {
      hasClickHandler: !!this.clickHandler,
      hasSubmitHandler: !!this.submitHandler,
      hasMouseMoveHandler: !!this.mouseMoveHandler,
      hasMouseUpHandler: !!this.mouseUpHandler
    });
    
    if (this.clickHandler) {
      document.removeEventListener('click', this.clickHandler, true);
      this.clickHandler = null;
      this.log('Click handler removed');
    }
    
    if (this.submitHandler) {
      document.removeEventListener('submit', this.submitHandler, true);
      this.submitHandler = null;
      this.log('Submit handler removed');
    }
    
    // Clean up draggable listeners
    if (this.mouseMoveHandler) {
      document.removeEventListener('mousemove', this.mouseMoveHandler);
      this.mouseMoveHandler = null;
      this.log('Mouse move handler removed');
    }
    
    if (this.mouseUpHandler) {
      document.removeEventListener('mouseup', this.mouseUpHandler);
      this.mouseUpHandler = null;
      this.log('Mouse up handler removed');
    }

    this.log('All interaction listeners removed');
  }
  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.action) {
        case 'updateSessionState':
          await this.updateSessionState(message.sessionActive);
          sendResponse({ success: true });
          break;

        case 'forceEndSession':
          this.log('FORCE END SESSION MESSAGE RECEIVED', { 
            sessionActive: message.sessionActive,
            timestamp: message.timestamp 
          });
          await this.forceEndSession();
          sendResponse({ success: true, action: 'forceEndSession' });
          break;

        case 'captureManual':
          await this.captureManual();
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      this.log('Error handling message:', error);
      sendResponse({ success: false, error: error.message });    }
  }

  async forceEndSession() {
    this.log('FORCE ENDING SESSION - CLEANING UP ALL LISTENERS');
    
    // Set session as inactive
    this.sessionActive = false;
    
    // Remove all event listeners immediately
    this.removeInteractionListeners();
    
    // Remove floating button
    this.removeFloatingButton();
    
    // Remove any overlays
    this.removeHighlightOverlay();
    
    // Show notification that session ended
    this.showToast('Recording session forcibly ended', 'info');
    
    this.log('Force session cleanup completed', {
      sessionActive: this.sessionActive,
      hasClickHandler: !!this.clickHandler,
      hasSubmitHandler: !!this.submitHandler,
      hasFloatingButton: !!this.floatingButton
    });
  }

  async updateSessionState(sessionActive) {
    const wasActive = this.sessionActive;
    this.sessionActive = sessionActive;

    this.log('Session state update requested', { 
      wasActive, 
      newState: sessionActive,
      currentHandlers: {
        click: !!this.clickHandler,
        submit: !!this.submitHandler
      }
    });

    if (sessionActive && !wasActive) {
      // Session started
      this.setupInteractionListeners(); // Ensure listeners are set up
      this.createFloatingButton();
      this.showToast('Recording session started', 'success');
      this.log('Session started - listeners added');
    } else if (!sessionActive && wasActive) {
      // Session stopped - CLEAN UP EVERYTHING
      this.log('Session stopping - removing all listeners and UI elements');
      this.removeInteractionListeners(); // Remove event listeners
      this.removeFloatingButton();
      this.removeHighlightOverlay(); // Clean up any highlight overlays
      this.showToast('Recording session stopped', 'info');
      this.log('Session stopped - cleanup completed');
    }

    // Force state verification after a short delay
    setTimeout(async () => {
      try {
        const bgState = await chrome.runtime.sendMessage({ action: 'getState' });
        if (this.sessionActive !== bgState.sessionActive) {
          this.log('State mismatch detected - forcing sync', {
            local: this.sessionActive,
            background: bgState.sessionActive
          });
          
          // Force sync to background state
          if (bgState.sessionActive && !this.sessionActive) {
            this.sessionActive = true;
            this.setupInteractionListeners();
            this.createFloatingButton();
          } else if (!bgState.sessionActive && this.sessionActive) {
            this.sessionActive = false;
            this.removeInteractionListeners();
            this.removeFloatingButton();
            this.removeHighlightOverlay();
          }
        }
      } catch (error) {
        this.log('Failed to verify state sync:', error);
      }
    }, 500);

    this.log('Session state updated', { 
      sessionActive: this.sessionActive,
      hasHandlers: {
        click: !!this.clickHandler,
        submit: !!this.submitHandler
      }
    });
  }async captureInteraction(elementInfo, element) {
    try {
      // Triple-check session is still active
      if (!this.sessionActive) {
        this.log('Ignoring interaction - session not active (local check)');
        return;
      }

      // Verify with background script
      const bgState = await chrome.runtime.sendMessage({ action: 'getState' });
      if (!bgState.sessionActive) {
        this.log('Ignoring interaction - session not active (background check)');
        this.sessionActive = false; // Sync local state
        return;
      }

      this.log('Processing interaction capture', { 
        elementInfo: elementInfo.tagName, 
        sessionActive: this.sessionActive,
        bgSessionActive: bgState.sessionActive
      });

      // Add visual feedback
      this.addCaptureEffect(element);

      // Get click position relative to viewport
      const rect = element.getBoundingClientRect();
      const clickPosition = {
        x: Math.round(rect.left + rect.width / 2),
        y: Math.round(rect.top + rect.height / 2)
      };

      // Send capture request to background
      const response = await chrome.runtime.sendMessage({
        action: 'interactionCapture',
        elementType: elementInfo.type,
        elementInfo: {
          ...elementInfo,
          isInteractive: true
        },
        clickPosition: clickPosition
      });

      if (response.success) {
        this.log('Interaction captured successfully', { elementInfo, clickPosition });
      } else {
        this.log('Interaction capture failed', { error: response.error });
      }
    } catch (error) {
      this.log('Error capturing interaction:', error);
    }
  }

  async captureManual() {
    try {
      await chrome.runtime.sendMessage({
        action: 'captureScreenshot',
        options: { reason: 'Manual Capture' }
      });
      
      this.showToast('Screenshot captured manually', 'success');
    } catch (error) {
      this.log('Error with manual capture:', error);
      this.showToast('Failed to capture screenshot', 'error');
    }
  }

  isInteractiveElement(element) {
    const interactiveTags = ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'];
    const interactiveRoles = ['button', 'link', 'tab', 'menuitem'];
    const hasClickHandler = element.onclick || element.addEventListener;

    return (
      interactiveTags.includes(element.tagName) ||
      interactiveRoles.includes(element.getAttribute('role')) ||
      element.classList.contains('btn') ||
      element.classList.contains('button') ||
      element.hasAttribute('data-toggle') ||
      hasClickHandler
    );
  }  getElementInfo(element) {
    const rect = element.getBoundingClientRect();
    return {
      tagName: element.tagName,
      text: element.textContent?.trim().substring(0, 50) || '',
      id: element.id || '',
      className: element.className || '',
      href: element.href || '',
      type: element.type || '',
      alt: element.alt || '',
      title: element.title || '',
      ariaLabel: element.getAttribute('aria-label') || '',
      placeholder: element.placeholder || '',
      value: element.value || '',
      position: {
        x: Math.round(rect.left),
        y: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      },
      timestamp: Date.now()
    };
  }

  createFloatingButton() {
    if (this.floatingButton) return;

    this.floatingButton = document.createElement('div');
    this.floatingButton.id = 'screen-shark-floating-btn';
    this.floatingButton.innerHTML = `
      <div class="ss-btn-content">
        <span class="ss-btn-icon">📸</span>
        <span class="ss-btn-pulse"></span>
      </div>
    `;

    // Add click handler
    this.floatingButton.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await this.captureManual();
    });

    // Make draggable
    this.makeDraggable(this.floatingButton);

    document.body.appendChild(this.floatingButton);
    this.log('Floating button created');
  }

  removeFloatingButton() {
    if (this.floatingButton) {
      this.floatingButton.remove();
      this.floatingButton = null;
      this.log('Floating button removed');
    }
  }
  makeDraggable(element) {
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    const mouseDownHandler = (e) => {
      if (e.target === element || element.contains(e.target)) {
        initialX = e.clientX - xOffset;
        initialY = e.clientY - yOffset;
        isDragging = true;
        element.style.cursor = 'grabbing';
      }
    };

    // Store handlers for cleanup
    this.mouseMoveHandler = (e) => {
      if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        xOffset = currentX;
        yOffset = currentY;
        element.style.transform = `translate(${currentX}px, ${currentY}px)`;
      }
    };

    this.mouseUpHandler = () => {
      isDragging = false;
      element.style.cursor = 'grab';
    };

    element.addEventListener('mousedown', mouseDownHandler);
    document.addEventListener('mousemove', this.mouseMoveHandler);
    document.addEventListener('mouseup', this.mouseUpHandler);
  }
  addCaptureEffect(element) {
    // Create translucent highlight overlay
    this.createHighlightOverlay(element);
    
    // Add flash effect to captured element
    const originalTransition = element.style.transition;
    const originalBackground = element.style.backgroundColor;
    
    element.style.transition = 'background-color 0.3s ease';
    element.style.backgroundColor = 'rgba(76, 175, 80, 0.3)';
    
    setTimeout(() => {
      element.style.backgroundColor = originalBackground;
      setTimeout(() => {
        element.style.transition = originalTransition;
      }, 300);
    }, 300);
  }

  createHighlightOverlay(element) {
    // Remove any existing highlight
    this.removeHighlightOverlay();
    
    const rect = element.getBoundingClientRect();
    
    // Create highlight overlay
    this.highlightOverlay = document.createElement('div');
    this.highlightOverlay.id = 'screen-shark-highlight';
    
    // Position and style the overlay
    Object.assign(this.highlightOverlay.style, {
      position: 'fixed',
      left: `${rect.left - 4}px`,
      top: `${rect.top - 4}px`,
      width: `${rect.width + 8}px`,
      height: `${rect.height + 8}px`,
      border: '3px solid rgba(76, 175, 80, 0.8)',
      backgroundColor: 'rgba(76, 175, 80, 0.1)',
      borderRadius: '6px',
      zIndex: '9999998',
      pointerEvents: 'none',
      boxShadow: '0 0 15px rgba(76, 175, 80, 0.4)',
      transition: 'all 0.3s ease',
      animation: 'screen-shark-highlight-pulse 0.6s ease-out'
    });
    
    document.body.appendChild(this.highlightOverlay);
    
    // Remove highlight after animation
    setTimeout(() => {
      this.removeHighlightOverlay();
    }, 1500);
  }

  removeHighlightOverlay() {
    if (this.highlightOverlay) {
      this.highlightOverlay.remove();
      this.highlightOverlay = null;
    }
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `screen-shark-toast ss-toast-${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('ss-toast-show'), 10);
    
    // Remove after delay
    setTimeout(() => {
      toast.classList.remove('ss-toast-show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  throttle(func, limit) {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  log(message, data = null) {
    if (this.debugMode) {
      console.log(`[Screen Shark Content] ${message}`, data || '');
    }
  }
}

// Prevent multiple instances with global flag
if (window.screenSharkContentLoaded) {
  console.log('[Screen Shark] Content script already loaded, skipping initialization');
} else {
  window.screenSharkContentLoaded = true;
  
  // Ensure only one instance is created globally
  let screenSharkInstance = null;

  function initializeScreenShark() {
    if (screenSharkInstance) {
      console.log('[Screen Shark] Instance already exists, cleaning up previous instance');
      screenSharkInstance.cleanup();
    }
    
    screenSharkInstance = new ScreenSharkContent();
    
    // Store instance globally for debugging
    window.screenSharkInstance = screenSharkInstance;
  }

  // Initialize content script when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeScreenShark);
  } else {
    initializeScreenShark();
  }
}
