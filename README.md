# Screen Shark Chrome Extension

A powerful Chrome extension for capturing screenshots and recording user interactions with advanced session management and debugging capabilities.

## 🚀 Features

### Core Functionality
- **Manual Screenshot Capture**: Click the popup button to instantly capture the current tab
- **Automatic Interactive Capture**: Records screenshots when you click buttons, links, forms, and other interactive elements
- **Session Recording Mode**: Start/stop recording sessions with a floating action button
- **Smart Element Detection**: Automatically identifies interactive elements for capture
- **Timestamp Management**: All screenshots are saved with detailed timestamps

### User Interface
- **Clean Popup Interface**: Minimal design with session controls and manual capture
- **Floating Action Button**: Draggable, animated button during recording sessions
- **Toast Notifications**: Visual feedback for successful captures and operations
- **Status Indicators**: Real-time status display in popup

### Advanced Features
- **Debug Mode**: Comprehensive debugging with real-time logging and test functions
- **Permission Management**: Automatic validation of required permissions
- **Local Storage**: Session state persistence across browser restarts
- **Error Handling**: Graceful handling of capture failures with user-friendly messages

### User Interface
- **Clean Popup UI**: Minimal design with intuitive controls
- **Debug Panel**: Toggle-able debug mode with test functions and operation logs
- **Floating Button**: Pulsing, draggable recording indicator
- **Visual Feedback**: Flash animations and status indicators

## Installation

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the project folder
5. The Screen Shark extension will appear in your extensions bar

## Usage

### Basic Screenshot Capture
1. Click the Screen Shark extension icon
2. Click "📸 Capture Screenshot" for manual capture

### Recording Session
1. Click the Screen Shark extension icon
2. Click "▶️ Start Recording" to begin session
3. A floating shark button 🦈 will appear on the page
4. Screenshots will be automatically captured when you click interactive elements
5. Click "⏹️ Stop Recording" to end the session

### Debug Mode
1. Toggle "Debug Mode" in the popup
2. Access test functions, view operation logs, and monitor session state
3. Use test buttons to verify functionality

## File Structure

```
screen-shark-v2/
├── manifest.json          # Extension manifest (Manifest V3)
├── popup.html             # Extension popup interface
├── popup.css              # Popup styling
├── popup.js               # Popup functionality
├── background.js          # Service worker (background script)
├── content.js             # Content script for page interaction
├── content.css            # Content script styling
├── icons/                 # Extension icons
└── README.md             # This file
```

## Technical Details

### Permissions Required
- `activeTab`: Access current tab for screenshots
- `downloads`: Save screenshots to downloads folder
- `storage`: Persist session state
- `notifications`: Show capture confirmations
- `scripting`: Inject content scripts

### Architecture
- **Service Worker**: Handles screenshot capture, download management, and state persistence
- **Content Script**: Detects interactive elements, manages floating UI, and provides visual feedback
- **Popup**: User interface for manual controls and debug features

### Screenshot Naming
Screenshots are saved with descriptive filenames:
- Format: `screen-shark-YYYY-MM-DDTHH-MM-SS-source.png`
- Sources: `manual`, `auto-click`, `floating-button`

## Error Handling

The extension includes comprehensive error handling for:
- Tab access permissions
- Screenshot capture failures
- Content script injection issues
- Storage operation failures
- User-friendly error messages in debug mode

## Browser Compatibility

- Chrome 88+ (Manifest V3 support required)
- Chromium-based browsers with Manifest V3 support

## Development

### Debug Mode Features
- Real-time operation logging
- Session state monitoring
- Test capture functionality
- Storage state inspection
- Error tracking and reporting

### Customization
The extension is designed to be easily customizable:
- Modify `popup.css` for UI theming
- Adjust `content.css` for floating button styling
- Update interactive element detection in `content.js`
- Customize screenshot naming in `background.js`

## Privacy

Screen Shark operates entirely locally:
- No data sent to external servers
- Screenshots saved locally to downloads folder
- Session state stored in local browser storage
- No tracking or analytics

## License

This project is open source. Feel free to modify and distribute according to your needs.

## Support

For issues or feature requests, please check the debug mode logs first, then report the issue with relevant log information.

## Testing & Validation

### Automated Test Suite
The extension includes comprehensive testing resources to validate the fixes:

1. **Complete Test Suite**: Open `test-page.html` in your browser for automated testing
2. **Simple Test Page**: Use `test-extension.html` for manual interaction testing  
3. **Console Quick Test**: Copy `console-test.js` into browser console for instant validation
4. **Debug Helper**: Use `debug-helper.js` for advanced debugging capabilities

### Running Tests
```bash
# Open the comprehensive test suite
open test-page.html

# Or use the simple test page
open test-extension.html

# For console testing, copy console-test.js content to browser console
```

### Test Coverage
- ✅ Single content script instance validation
- ✅ Event listener cleanup verification  
- ✅ Session state synchronization testing
- ✅ Permission validation
- ✅ Interaction capture prevention after session end
- ✅ Session JSON file generation testing
- ✅ Error handling validation

// ...existing content...

### Version 1.0.1 - Bug Fixes
- **Fixed Event Listener Cleanup**: Resolved issue where screenshot notifications continued after stopping a session
- **Improved Session State Management**: Added proper event listener removal when sessions end
- **Enhanced Error Handling**: Better handling of session JSON file saving with detailed error messages
- **Added Safety Checks**: Double-validation of session state before processing interactions
- **Improved Download Management**: Enhanced download completion monitoring with timeouts
- **Added Cleanup on Page Unload**: Proper cleanup when navigating away from pages

### Known Issues Fixed
- ✅ Screenshots no longer capture after session ends
- ✅ Notifications properly stop when session is stopped
- ✅ Session JSON files save reliably with proper error notifications
- ✅ Event listeners are properly cleaned up to prevent memory leaks
