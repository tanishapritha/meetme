const DEFAULT_DG_API_KEY = '70ce4b85eb3c099cc39bcee1e318482e2daa9cf2';

chrome.runtime.onInstalled.addListener(async () => {
    const settings = await chrome.storage.local.get(['deepgramApiKey']);
    if (!settings.deepgramApiKey) {
        await chrome.storage.local.set({ deepgramApiKey: DEFAULT_DG_API_KEY });
    }

    // Set side panel to open on icon click
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
        .catch((error) => console.error('Error setting panel behavior:', error));
});

let isRecording = false;

// Handle keyboard shortcut
chrome.commands.onCommand.addListener((command) => {
    if (command === 'start-recording') {
        handleTrigger();
    }
});

// Handle explicit message from side panel button
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'RECORDING_STOPPED') {
        isRecording = false;
    } else if (message.type === 'TOGGLE_RECORDING') {
        handleTrigger();
    }
});

async function handleTrigger() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        if (!tab || !tab.id || (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')))) {
            console.warn('Cannot record this tab.');
            return;
        }

        if (isRecording) {
            stopRecording();
        } else {
            startRecording(tab.id);
        }
    } catch (err) {
        console.error('Trigger handling error:', err);
    }
}

function startRecording(tabId) {
    // Ensure side panel is configured
    chrome.sidePanel.setOptions({
        tabId,
        path: 'sidepanel.html',
        enabled: true
    });

    // Open side panel if possible
    if (chrome.sidePanel.open) {
        chrome.sidePanel.open({ tabId }).catch(() => { });
    }

    // CRITICAL: getMediaStreamId MUST be called synchronously in the gesture task
    chrome.tabCapture.getMediaStreamId({ targetTabId: tabId }, (streamId) => {
        if (chrome.runtime.lastError) {
            const errMsg = chrome.runtime.lastError.message;
            console.error('tabCapture error:', errMsg);

            chrome.runtime.sendMessage({
                type: 'ERROR',
                message: `Capture failed: ${errMsg}.`
            });
            return;
        }

        if (!streamId) {
            console.error('No stream ID received');
            return;
        }

        isRecording = true;

        // Wait a moment for side panel to be ready for the message
        setTimeout(() => {
            chrome.runtime.sendMessage({
                type: 'STREAM_READY',
                streamId: streamId,
                tabId: tabId
            });
        }, 1000);
    });
}

function stopRecording() {
    isRecording = false;
    chrome.runtime.sendMessage({ type: 'STOP_RECORDING' });
}
