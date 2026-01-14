// DB Initialization
const db = new Dexie('MeetingContextDB');
db.version(3).stores({
    documents: '++id, title, content, tags, dateAdded, lastUsed',
    fragments: '++id, docId, content',
    heroCards: '++id, docId, entityPath, bullets'
});

// PDF.js Worker Configuration
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js';
}

// App State
let mediaRecorder;
let socket;
let fullTranscript = [];
let lastAnalyzedLength = 0;
let fuse;
let searchTimeout;
let dgApiKey = '';
let aiApiKey = '';
let aiProvider = 'gemini'; // fallback
let isRecording = false;
let importantPoints = [];

// DOM Elements
const transcriptEl = document.getElementById('transcript');
const transcriptContainer = document.getElementById('transcript-container');
const statusLed = document.getElementById('status-led');
const docCountEl = document.getElementById('doc-count');
const contextCardsEl = document.getElementById('context-cards');
const topicTagsEl = document.getElementById('topic-tags');

const aiInsightContainer = document.getElementById('ai-insight-container');
const aiInsightText = document.getElementById('ai-insight-text');
const vitalBulletsList = document.getElementById('vital-bullets');
const vitalRedFlagsList = document.getElementById('vital-redflags');
const vitalDiscussionList = document.getElementById('vital-discussion');
const importantList = document.getElementById('important-list');
const importantCenter = document.getElementById('important-center');

const vitalBulletsContainer = document.getElementById('vital-bullets-container');
const vitalRedFlagsContainer = document.getElementById('vital-redflags-container');
const vitalDiscussionContainer = document.getElementById('critical-path-container');
const actionItemsSection = document.getElementById('action-items-section');
const actionItemsContainer = document.getElementById('action-items-container');
const neuralGroundingContainer = document.getElementById('neural-grounding-container');
const groundingList = document.getElementById('grounding-list');
const healthGlow = document.getElementById('health-glow');
const flashbackInput = document.getElementById('flashback-input');
const flashbackResponse = document.getElementById('flashback-response');
const flashbackStatus = document.getElementById('flashback-status');

let pendingActions = [];

const errorBanner = document.getElementById('error-banner');
const errorMessage = document.getElementById('error-message');
const toggleRecordBtn = document.getElementById('toggle-record-btn');

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-upload');
const fileNameDisplay = document.getElementById('file-name');
const docTitleInput = document.getElementById('doc-title');
const docContentInput = document.getElementById('doc-content');

// Initialize
async function init() {
    await loadSettings();
    await updateDocCount();
    await refreshFuse();

    chrome.runtime.onMessage.addListener((message) => {
        if (message.type === 'STREAM_READY') startTranscription(message.streamId);
        else if (message.type === 'STOP_RECORDING') stopTranscription();
        else if (message.type === 'ERROR') showError(message.message);
    });

    if (toggleRecordBtn) {
        toggleRecordBtn.onclick = () => chrome.runtime.sendMessage({ type: 'TOGGLE_RECORDING' });
    }

    document.getElementById('add-doc-btn').onclick = () => showModal('add-doc-modal');
    document.querySelectorAll('.close-modal').forEach(btn => btn.onclick = hideModal);
    document.getElementById('add-doc-form').onsubmit = handleAddDoc;

    if (dropZone) {
        dropZone.onclick = () => fileInput.click();
        dropZone.ondragover = (e) => { e.preventDefault(); dropZone.classList.add('border-blue-500'); };
        dropZone.ondragleave = () => dropZone.classList.remove('border-blue-500');
        dropZone.ondrop = handleFileDrop;
    }

    if (fileInput) {
        fileInput.onchange = (e) => handleFileSelection(e.target.files[0]);
    }

    const briefingBtn = document.getElementById('briefing-btn');
    if (briefingBtn) briefingBtn.onclick = handleBriefing;

    const copyBtn = document.getElementById('copy-briefing-btn');
    if (copyBtn) copyBtn.onclick = copyBriefing;

    const settingsBtn = document.getElementById('settings-btn-top');
    if (settingsBtn) settingsBtn.onclick = () => chrome.tabs.create({ url: 'settings.html' });

    const errorFixBtn = document.getElementById('error-fix-btn');
    if (errorFixBtn) errorFixBtn.onclick = () => chrome.tabs.create({ url: 'settings.html' });

    if (flashbackInput) {
        flashbackInput.onkeydown = async (e) => {
            if (e.key === 'Enter' && flashbackInput.value.trim()) {
                handleFlashback();
            }
        };
    }

    console.log('MeetingIQ: Intelligence System Initialized.');
}

async function handleFlashback() {
    const query = flashbackInput.value.trim();
    if (!query || !fullTranscript.length) return;

    flashbackStatus.classList.remove('hidden');
    flashbackResponse.classList.add('hidden');

    const contextText = fullTranscript.join(' ');
    const answer = await askMeeting(aiApiKey, query, contextText, aiProvider);

    flashbackStatus.classList.add('hidden');
    flashbackResponse.textContent = answer;
    flashbackResponse.classList.remove('hidden');
    flashbackInput.value = '';
}

async function handleBriefing() {
    showModal('briefing-modal');
    const status = document.getElementById('briefing-status');
    const content = document.getElementById('briefing-content');

    status.classList.remove('hidden');
    content.textContent = '';

    // Collect context for the brief
    const transcript = fullTranscript.join('\n');
    const actions = Array.from(actionItemsContainer.querySelectorAll('span')).map(s => s.textContent);
    const docGroundings = Array.from(vitalDiscussionList.querySelectorAll('span')).map(s => s.textContent);

    const brief = await generateExecutiveBriefing(aiApiKey, transcript, actions, docGroundings, aiProvider);

    status.classList.add('hidden');
    content.textContent = brief;
}

function copyBriefing() {
    const content = document.getElementById('briefing-content').textContent;
    navigator.clipboard.writeText(content);
    const btn = document.getElementById('copy-briefing-btn');
    btn.textContent = 'COPIED!';
    setTimeout(() => btn.textContent = 'COPY TO CLIPBOARD', 2000);
}

async function loadSettings() {
    const settings = await chrome.storage.local.get(['deepgramApiKey', 'aiApiKey', 'aiProvider']);
    dgApiKey = settings.deepgramApiKey || '70ce4b85eb3c099cc39bcee1e318482e2daa9cf2';

    // Developer Default to OpenRouter for speed
    aiApiKey = settings.aiApiKey || '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';
    aiProvider = settings.aiProvider || 'openrouter';

    if (!dgApiKey) showError('SYSTEM_HALT: DEEPGRAM_KEY_UNDEFINED');
    else hideError();
}

async function updateDocCount() {
    const count = await db.documents.count();
    docCountEl.textContent = count;
}

async function refreshFuse() {
    const docs = await db.documents.toArray();
    const fragments = await db.fragments.toArray();

    // We search fragments for RAG context, but docs for the card UI
    fuse = new Fuse(fragments, {
        keys: ['content'],
        threshold: 0.4,
        includeScore: true
    });

    // Second fuse for document titles/meta
    window.docFuse = new Fuse(docs, {
        keys: [{ name: 'title', weight: 0.5 }, { name: 'content', weight: 0.3 }],
        threshold: 0.4,
        includeScore: true
    });
}

// File Parsing
async function handleFileSelection(file) {
    if (!file) return;
    fileNameDisplay.textContent = `SYNCING: ${file.name.toUpperCase()}`;
    fileNameDisplay.classList.remove('hidden');
    docTitleInput.value = file.name.split('.')[0];
    const ext = file.name.split('.').pop().toLowerCase();
    try {
        let text = '';
        if (ext === 'txt') text = await file.text();
        else if (ext === 'pdf') {
            const buffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                text += content.items.map(item => item.str).join(' ') + '\n';
            }
        } else if (ext === 'docx') {
            const buffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer: buffer });
            text = result.value;
        }
        docContentInput.value = text;
        fileNameDisplay.textContent = `PARSED: ${file.name.toUpperCase()}`;
    } catch (err) {
        showError(`FILE_IO_ERROR: ${err.message}`);
    }
}

// Transcription
async function startTranscription(streamId) {
    if (isRecording) return;
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: { mandatory: { chromeMediaSource: 'tab', chromeMediaSourceId: streamId } }
        });
        updateUIStarted();
        isRecording = true;
        setupWebSocket(stream);
    } catch (err) {
        showError(`MEDIA_ACCESS_DENIED: ${err.message || 'TAB_CAPTURE_FAILED'}. Try refreshing the target tab.`);
        isRecording = false;
        updateUIStopped();
    }
}

function updateUIStarted() {
    toggleRecordBtn.className = 'w-6 h-6 rounded-full bg-emerald-500 border border-white/10 shadow-[0_0_12px_rgba(16,185,129,0.5)] hover:scale-105 active:scale-95 transition-all';
    statusLed.classList.add('active');
}

function updateUIStopped() {
    toggleRecordBtn.className = 'w-6 h-6 rounded-full bg-red-600 border border-white/10 shadow-lg hover:scale-105 active:scale-95 transition-all';
    statusLed.classList.remove('active');
}

function setupWebSocket(stream) {
    const url = 'wss://api.deepgram.com/v1/listen?punctuate=true&interim_results=true&smart_format=true&model=nova-2&language=en';
    socket = new WebSocket(url, ['token', dgApiKey]);

    socket.onopen = () => {
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0 && socket.readyState === WebSocket.OPEN) socket.send(e.data);
        };
        mediaRecorder.start(250);
    };

    socket.onmessage = (message) => {
        const data = JSON.parse(message.data);
        const transcript = data.channel?.alternatives?.[0]?.transcript;
        if (transcript && data.is_final) handleFinalTranscript(transcript);
        else if (transcript) handleInterimTranscript(transcript);
    };

    socket.onerror = () => showError('WS_ENDPOINT_FAILURE');
}

function handleFinalTranscript(text) {
    fullTranscript.push(text);
    renderTranscript();

    // Trigger analysis if 20+ new characters added or force update
    const currentLength = fullTranscript.join(' ').length;
    if (currentLength - lastAnalyzedLength > 20) {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => performAnalysis(), 600);
    }
}

function handleInterimTranscript(text) {
    if (!transcriptEl || !transcriptContainer) return;
    const history = fullTranscript.slice(-3).join(' ');
    transcriptEl.innerHTML = `<span>${history}</span> <span class="text-zinc-500">${text}...</span>`;
    transcriptContainer.scrollTop = transcriptContainer.scrollHeight;
}

function renderTranscript() {
    if (!transcriptEl || !transcriptContainer) return;
    transcriptEl.innerHTML = `<span>${fullTranscript.slice(-8).join(' ')}</span>`;
    transcriptContainer.scrollTop = transcriptContainer.scrollHeight;
}

function stopTranscription() {
    isRecording = false;
    updateUIStopped();
    if (mediaRecorder) {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
    if (socket) socket.close();
    chrome.runtime.sendMessage({ type: 'RECORDING_STOPPED' });
}

async function performAnalysis() {
    if (!fullTranscript.length) return;

    const text = fullTranscript.join(' ').split(/\s+/).slice(-100).join(' ');
    lastAnalyzedLength = fullTranscript.join(' ').length;

    // aiInsightText.innerHTML = `<span class="text-blue-500 animate-pulse mono text-[9px]">COMPUTING_STRATEGY...</span>`;

    const context = extractContext(text);
    // renderTags(context); // Disabled keywords as they don't add value for MNC users
    const fragmentResults = performSmartSearch(fuse, context);

    // UI Card Search (Find relevant documents)
    const docResults = performSmartSearch(window.docFuse, context);
    renderCards(docResults);

    // Check for Hero Cards (Micro-Briefings)
    checkHeroCards(text);

    if (aiApiKey) {
        const topFragments = fragmentResults.slice(0, 3).map(r => r.item.content);
        const vitals = await generateStructuredInsights(aiApiKey, text, topFragments, aiProvider);
        if (vitals) renderVitals(vitals);
    }
}

async function checkHeroCards(text) {
    const heroes = await db.heroCards.toArray();
    const upperText = text.toUpperCase();

    for (const hero of heroes) {
        if (upperText.includes(hero.entityPath)) {
            renderHeroCard(hero);
        }
    }
}

function renderHeroCard(hero) {
    // Check if card already exists
    const existing = document.getElementById(`hero-${hero.id}`);
    if (existing) return;

    const card = document.createElement('div');
    card.id = `hero-${hero.id}`;
    card.className = 'content-card border-l-4 border-purple-500 bg-purple-500/5 slide-in mb-4';
    card.innerHTML = `
        <div class="card-inner-header">
            <span class="text-[9px] font-bold text-purple-400 uppercase tracking-widest">MICRO-BRIEFING: ${hero.entityPath}</span>
            <span class="text-[8px] font-black text-purple-300 mono italic">ACTIVE_INTEL</span>
        </div>
        <div class="p-3">
            <ul class="space-y-1">
                ${hero.bullets.map(b => `
                    <li class="flex items-start gap-2">
                        <div class="w-1 h-1 rounded-full bg-purple-400 mt-1.5"></div>
                        <span class="text-[12px] text-purple-100 font-medium">${b}</span>
                    </li>
                `).join('')}
            </ul>
        </div>
    `;

    // Prepend to neural grounding container or a dedicated briefed stack
    neuralGroundingContainer.classList.remove('hidden');
    neuralGroundingContainer.prepend(card);

    // Auto-dismiss after 60 seconds of no mention (UX refinement)
    setTimeout(() => {
        card.style.opacity = '0';
        setTimeout(() => card.remove(), 500);
    }, 60000);
}

function renderTags(context) {
    topicTagsEl.innerHTML = '';
    [...new Set([...context.topics, ...context.entities])].slice(0, 5).forEach(t => {
        const span = document.createElement('span');
        span.className = 'px-2 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-500 text-[9px] font-bold uppercase tracking-tight rounded';
        span.textContent = t;
        topicTagsEl.appendChild(span);
    });
}

function renderVitals(vitals) {
    aiInsightContainer.classList.remove('hidden');

    // 1. Health Glow Update (Sentiment)
    const sentimentClass = `glow-${(vitals.sentiment || 'CALM').toLowerCase()}`;
    healthGlow.className = sentimentClass;

    // 2. Update Strategic Pulse (Single Line, no BS)
    aiInsightText.textContent = vitals.pulse || "Monitoring live stream...";

    // 3. Update Critical Path (Stable Appending)
    if (vitals.criticalPath?.length) {
        vitalDiscussionContainer.classList.remove('hidden');
        vitals.criticalPath.forEach(p => {
            // Check if bullet already exists to prevent duplicates
            const existing = Array.from(vitalDiscussionList.querySelectorAll('span')).some(s => s.textContent === p);
            if (!existing) {
                const li = document.createElement('li');
                li.className = 'intel-row slide-in';
                li.innerHTML = `
                    <div class="intel-dot bg-blue-500 mt-1.5"></div>
                    <span class="text-[13px] text-white flex-1 font-bold">${p}</span>
                `;
                vitalDiscussionList.prepend(li); // Newest at top

                // Keep only last 5 items to prevent vertical crawl
                if (vitalDiscussionList.children.length > 5) {
                    vitalDiscussionList.lastElementChild.remove();
                }
            }
        });
    }

    // 4. Action Item Stack (Deduplicated)
    if (vitals.actionItems?.length) {
        actionItemsSection.classList.remove('hidden');
        vitals.actionItems.forEach(item => {
            const itemWords = item.toLowerCase().split(/\s+/).filter(w => w.length > 3);
            const isDuplicate = pendingActions.some(existing => {
                const existingWords = existing.toLowerCase().split(/\s+/).filter(w => w.length > 3);
                if (!existingWords.length || !itemWords.length) return existing.toLowerCase() === item.toLowerCase();
                const overlap = itemWords.filter(w => existingWords.includes(w)).length;
                return overlap >= (itemWords.length * 0.7);
            });

            if (!isDuplicate) {
                pendingActions.push(item);
                const card = document.createElement('div');
                card.className = 'action-card slide-in';
                card.innerHTML = `
                    <span>${item}</span>
                    <button class="btn-done" onclick="completeAction(this)">DONE</button>
                `;
                actionItemsContainer.prepend(card);
            }
        });
    }

    // 5. Neural Grounding (Rolling Audit Feed)
    if (vitals.grounding?.matchFound) {
        neuralGroundingContainer.classList.remove('hidden');
        const detail = vitals.grounding.detail;
        const type = vitals.grounding.type;
        const isConflict = type === 'CONFLICT';

        const existing = Array.from(groundingList.querySelectorAll('.detail-text')).some(s => s.textContent === detail);

        if (!existing) {
            const card = document.createElement('div');
            card.className = `content-card slide-in border-l-2 p-3 mb-3 ${isConflict ? 'border-red-500 bg-red-500/10' : 'border-white bg-white/5'}`;
            card.innerHTML = `
                <div class="flex justify-between items-start mb-1">
                    <span class="text-[8px] font-black mono ${isConflict ? 'text-red-500' : 'text-emerald-500'}">${type}</span>
                    <span class="text-[8px] text-zinc-500 mono uppercase tracking-widest">Audit Hit</span>
                </div>
                <div class="detail-text text-[12px] text-white font-medium leading-relaxed">${detail}</div>
            `;
            groundingList.prepend(card);
            if (groundingList.children.length > 3) groundingList.lastElementChild.remove();
        }
    } else if (groundingList.children.length === 0) {
        neuralGroundingContainer.classList.add('hidden');
    }
}

window.completeAction = (btn) => {
    const card = btn.closest('.action-card');
    card.style.opacity = '0';
    setTimeout(() => {
        card.remove();
        if (actionItemsContainer.children.length === 0) {
            actionItemsSection.classList.add('hidden');
        }
    }, 300);
};

window.toggleImportant = (text) => {
    if (importantPoints.includes(text)) importantPoints = importantPoints.filter(p => p !== text);
    else importantPoints.push(text);
    renderImportantList();
};

function renderImportantList() {
    importantCenter.classList.toggle('hidden', !importantPoints.length);
    importantList.innerHTML = importantPoints.map(p => `
        <li class="intel-row bg-blue-500/[0.02]">
            <div class="intel-dot bg-blue-500 mt-1.5"></div>
            <span class="text-[11px] text-zinc-100 flex-1 font-medium">${p}</span>
            <div class="btn-action-star active" onclick="toggleImportant('${p.replace(/'/g, "\\'")}')">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            </div>
        </li>
    `).join('');
}

function renderCards(results) {
    if (!results.length) {
        contextCardsEl.innerHTML = '<div class="p-6 text-center border border-dashed border-zinc-800 rounded opacity-30"><p class="text-[9px] uppercase font-bold mono">No documentation hits</p></div>';
        return;
    }
    contextCardsEl.innerHTML = results.map(res => `
        <div class="content-card p-3 hover:border-zinc-700 transition-colors cursor-pointer" onclick="viewAsset(${res.item.id})">
            <div class="flex justify-between items-start mb-1.5">
                <h3 class="text-[10px] font-bold text-zinc-200 mono">RETRIEVAL: ${res.item.title.toUpperCase()}</h3>
                <span class="text-[8px] font-black text-blue-500">${res.relevanceScore}%</span>
            </div>
            <p class="text-[11px] text-zinc-500 line-clamp-2 leading-relaxed">${res.item.content}</p>
        </div>
    `).join('');
}

window.viewAsset = async (id) => {
    const doc = await db.documents.get(id);
    alert(`[SYSTEM_ASSET] ${doc.title}\n\n${doc.content}`);
};

function showModal(id) {
    document.getElementById('modal-overlay').classList.remove('hidden');
    document.getElementById(id).classList.remove('hidden');
}

function hideModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
    document.getElementById('add-doc-modal').classList.add('hidden');
    document.getElementById('add-doc-form').reset();
    fileNameDisplay.classList.add('hidden');
}

async function handleAddDoc(e) {
    e.preventDefault();
    const title = docTitleInput.value;
    const content = docContentInput.value;

    if (!title || content.length < 50) {
        showError("Title and content (min 50 chars) are required.");
        return;
    }

    try {
        const docId = await db.documents.add({
            title,
            content,
            dateAdded: new Date().toISOString(),
            lastUsed: new Date().toISOString()
        });

        // 1. Shard into fragments for RAG
        const chunks = createChunks(content, 600, 100); // Assuming createChunks is the correct function name
        const fragmentOps = chunks.map(c => db.fragments.add({ docId, content: c }));
        await Promise.all(fragmentOps);

        // 2. Extract Hero Cards (Micro-Briefings) via AI
        const extractionPrompt = `[DOCUMENT]: ${content.slice(0, 2000)}
        [TASK]: Identify the single main entity (Project, Person, or Product) discussed.
        Return JSON ONLY: { "entityName": "Short Tag", "bullets": ["Fact 1", "Fact 2", "Fact 3"] }`;

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${aiApiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                "model": "xiaomi/mimo-v2-flash:free",
                "messages": [{ "role": "user", "content": extractionPrompt }]
            })
        });

        if (response.ok) {
            const data = await response.json();
            const textResp = data.choices[0].message.content;
            const cardData = JSON.parse(textResp.match(/\{[\s\S]*\}/)[0]);
            if (cardData.entityName) {
                await db.heroCards.add({
                    docId,
                    entityPath: cardData.entityName.toUpperCase(),
                    bullets: cardData.bullets
                });
            }
        }

        hideModal();
        await updateDocCount();
        await refreshFuse();
        addDocForm.reset();
        fileNameDisplay.classList.add('hidden');
    } catch (err) {
        showError(`INGESTION_FAILED: ${err.message}`);
    }
}

function createChunks(text, size = 800, overlap = 100) {
    const chunks = [];
    if (!text) return chunks;

    let i = 0;
    while (i < text.length) {
        chunks.push(text.slice(i, i + size));
        i += (size - overlap);
        if (i >= text.length - overlap && i < text.length) break;
    }
    return chunks;
}

function showError(msg) { errorBanner.classList.remove('hidden'); errorMessage.textContent = msg; }
function hideError() { errorBanner.classList.add('hidden'); }

document.addEventListener('DOMContentLoaded', init);
