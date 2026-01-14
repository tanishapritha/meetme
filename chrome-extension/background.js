const DEFAULT_DG_API_KEY = '70ce4b85eb3c099cc39bcee1e318482e2daa9cf2';

chrome.runtime.onInstalled.addListener(async () => {
    const settings = await chrome.storage.local.get(['deepgramApiKey']);
    if (!settings.deepgramApiKey) {
        await chrome.storage.local.set({ deepgramApiKey: DEFAULT_DG_API_KEY });
    }
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
        .catch((error) => console.error('Error setting panel behavior:', error));
});

let isRecording = false;

chrome.commands.onCommand.addListener((command) => {
    console.log('Command received:', command);
    if (command === 'start-recording') {
        handleTrigger();
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Message received in background:', message.type);
    if (message.type === 'RECORDING_STOPPED') {
        isRecording = false;
    } else if (message.type === 'TOGGLE_RECORDING') {
        handleTrigger();
    }
});

async function handleTrigger() {
    console.log('handleTrigger called. current isRecording:', isRecording);
    try {
        // Query all active tabs across all windows
        const tabs = await chrome.tabs.query({ active: true });
        console.log('Active tabs found:', tabs.length);

        // Find the first tab that isn't a chrome:// or edge:// system page
        let recordableTab = tabs.find(t => t.url && !t.url.startsWith('chrome://') && !t.url.startsWith('edge://') && !t.url.startsWith('about:'));

        if (!recordableTab) {
            console.warn('No recordable active tab found in any window. Trying all tabs...');
            const allTabs = await chrome.tabs.query({});
            recordableTab = allTabs.find(t => t.url && !t.url.startsWith('chrome://') && !t.url.startsWith('edge://') && !t.url.startsWith('about:'));
        }

        if (!recordableTab) {
            console.warn('Still no recordable tab found.');
            if (isRecording) {
                console.log('Allowing stop recording even without tab.');
                stopRecording();
            }
            return;
        }

        console.log('Selected tab for recording:', recordableTab.id, recordableTab.url);
        triggerWithTab(recordableTab);
    } catch (err) {
        console.error('Trigger handling error:', err);
    }
}

function triggerWithTab(tab) {
    if (!tab.id || (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')))) {
        console.warn('Cannot record system tabs:', tab.url);
        return;
    }

    if (isRecording) {
        console.log('Stopping recording...');
        stopRecording();
    } else {
        console.log('Starting recording for tab:', tab.id);
        startRecording(tab.id);
    }
}

function startRecording(tabId) {
    chrome.sidePanel.setOptions({
        tabId,
        path: 'sidepanel.html',
        enabled: true
    });

    if (chrome.sidePanel.open) {
        chrome.sidePanel.open({ tabId }).catch(() => { });
    }

    chrome.tabCapture.getMediaStreamId({ targetTabId: tabId }, (streamId) => {
        if (chrome.runtime.lastError) {
            const errMsg = chrome.runtime.lastError.message;
            console.error('tabCapture error:', errMsg);
            chrome.runtime.sendMessage({ type: 'ERROR', message: `Capture failed: ${errMsg}` });
            return;
        }

        if (!streamId) {
            console.error('No stream ID received');
            return;
        }

        isRecording = true;

        // Brief delay to ensure sidepanel is listening
        setTimeout(() => {
            chrome.runtime.sendMessage({
                type: 'STREAM_READY',
                streamId: streamId,
                tabId: tabId
            });
            console.log('STREAM_READY sent to sidepanel');
        }, 800);
    });
}

function stopRecording() {
    isRecording = false;
    chrome.runtime.sendMessage({ type: 'STOP_RECORDING' });
}
