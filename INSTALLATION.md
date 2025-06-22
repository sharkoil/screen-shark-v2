# Screen Shark Installation and Testing Guide

## Quick Start

1. **Load the Extension**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `screen-shark-v2` folder

2. **Add Icons (Required)**
   - The extension needs PNG icon files in the `icons/` folder
   - See `icons/README.md` for details
   - You can create simple icons or use online tools

3. **Test Basic Functionality**
   - Click the Screen Shark extension icon in the toolbar
   - Try "📸 Capture Screenshot" button
   - Screenshots will be saved to your Downloads folder

4. **Test Recording Mode**
   - Click "▶️ Start Recording"
   - Navigate to any webpage
   - Click buttons, links, or other interactive elements
   - Screenshots will be captured automatically
   - Click "⏹️ Stop Recording" when done

## Debug Mode

Enable debug mode in the popup to access:
- Real-time operation logs
- Test capture buttons
- Session state monitoring
- Error tracking

## Troubleshooting

### Common Issues

1. **"Cannot capture visible tab" error**
   - Make sure you're on a regular webpage (not chrome:// pages)
   - Refresh the page and try again

2. **Content script not injecting**
   - Check that the page is fully loaded
   - Try refreshing the page after starting recording

3. **Downloads not working**
   - Check Chrome's download settings
   - Ensure Downloads permission is granted

4. **Floating button not appearing**
   - Make sure recording mode is active
   - Check if the button is outside the viewport (try scrolling)

### Debug Steps

1. Enable debug mode in popup
2. Check the operation log for errors
3. Use test buttons to verify functionality
4. Check Chrome's extension errors in `chrome://extensions/`

## File Structure Check

Make sure all these files exist:
```
screen-shark-v2/
├── manifest.json
├── popup.html
├── popup.css
├── popup.js
├── background.js
├── content.js
├── content.css
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

## Testing Checklist

- [ ] Extension loads without errors
- [ ] Popup opens when clicking extension icon
- [ ] Manual screenshot capture works
- [ ] Recording session starts/stops
- [ ] Floating button appears during recording
- [ ] Auto-capture works on interactive elements
- [ ] Screenshots save to Downloads folder
- [ ] Debug mode shows logs and status
- [ ] Visual feedback animations work

## Performance Tips

- Screenshots are saved as PNG files (high quality)
- File names include timestamps for organization
- Session state persists across browser restarts
- Extension uses minimal system resources when not recording
