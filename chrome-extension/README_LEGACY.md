# MeetMe (Legacy Shell)

This directory contains the Chrome Extension shell for the MeetMe platform. It handles the audio capture and provides the HUD (Heads-Up Display) overlay for live meetings.

## Technical Details
- **Manifest:** Manifest V3
- **Audio Capture:** `chrome.tabCapture` API
- **Communication:** `chrome.runtime.sendMessage` to the intelligence layer
- **Styling:** Custom Obsidian-Dark Theme

## Development
To load this into Chrome:
1. Open `chrome://extensions`
2. Enable **Developer Mode**
3. Click **Load Unpacked**
4. Select this directory (`/chrome-extension`)

---
*Powered by MeetMe Intelligence*
