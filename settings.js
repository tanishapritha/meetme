// DB Initialization
const db = new Dexie('MeetingContextDB');
db.version(2).stores({
    documents: '++id, title, content, tags, dateAdded, lastUsed',
    fragments: '++id, docId, content'
});

// DOM Elements
const dgApiKeyInput = document.getElementById('dg-api-key');
const aiApiKeyInput = document.getElementById('ai-api-key');
const aiProviderSelect = document.getElementById('ai-provider');
const saveApiKeysBtn = document.getElementById('save-api-keys');
const clearDataBtn = document.getElementById('clear-all-data');
const statDocCount = document.getElementById('stat-doc-count');
const statStorage = document.getElementById('stat-storage');
const docsList = document.getElementById('docs-list');
const docSearch = document.getElementById('doc-search');

const viewDocModal = document.getElementById('view-doc-modal');
const viewTitle = document.getElementById('view-title');
const viewContent = document.getElementById('view-content');
const deleteDocBtn = document.getElementById('delete-doc-btn');
const closeViewModalBtns = [
    document.getElementById('close-view-modal'),
    document.getElementById('close-view-modal-btn')
];

let allDocs = [];
let currentlyViewingId = null;

// Initialize
async function init() {
    await loadSettings();
    await updateStats();
    await loadDocuments();

    saveApiKeysBtn.onclick = saveApiKeys;
    clearDataBtn.onclick = clearAllData;
    docSearch.oninput = filterDocuments;
    deleteDocBtn.onclick = deleteCurrentDoc;
    closeViewModalBtns.forEach(btn => btn.onclick = hideViewModal);
}

async function loadSettings() {
    const settings = await chrome.storage.local.get(['deepgramApiKey', 'aiApiKey', 'aiProvider']);
    if (settings.deepgramApiKey) dgApiKeyInput.value = settings.deepgramApiKey;
    else dgApiKeyInput.value = '70ce4b85eb3c099cc39bcee1e318482e2daa9cf2';

    // Default to OpenRouter for speed
    aiProviderSelect.value = settings.aiProvider || 'openrouter';
    aiApiKeyInput.value = settings.aiApiKey || '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';
}

async function saveApiKeys() {
    const dgKey = dgApiKeyInput.value.trim();
    const aiKey = aiApiKeyInput.value.trim();
    const aiProvider = aiProviderSelect.value;

    await chrome.storage.local.set({
        deepgramApiKey: dgKey,
        aiApiKey: aiKey,
        aiProvider: aiProvider
    });

    const originalText = saveApiKeysBtn.textContent;
    saveApiKeysBtn.textContent = 'CREDENTIALS SAVED';

    setTimeout(() => {
        saveApiKeysBtn.textContent = originalText;
    }, 2000);
}

async function updateStats() {
    const count = await db.documents.count();
    statDocCount.textContent = count;
    const docs = await db.documents.toArray();
    const totalBytes = docs.reduce((acc, doc) => acc + (doc.title.length + doc.content.length), 0);
    statStorage.textContent = (totalBytes / (1024 * 1024)).toFixed(2) + ' MB';
}

async function loadDocuments() {
    allDocs = await db.documents.orderBy('dateAdded').reverse().toArray();
    renderDocuments(allDocs);
}

function renderDocuments(docs) {
    if (docs.length === 0) {
        docsList.innerHTML = '<div class="p-12 text-center text-zinc-600 text-xs italic">NO ASSETS FOUND IN REPOSITORY</div>';
        return;
    }

    docsList.innerHTML = docs.map(doc => `
        <div class="px-6 py-4 flex justify-between items-center hover:bg-white/5 transition-colors cursor-pointer group" onclick="viewDoc(${doc.id})">
            <div class="flex-1 min-w-0 pr-4">
                <h3 class="text-sm font-semibold truncate group-hover:text-blue-400 transition-colors uppercase tracking-tight">${doc.title}</h3>
                <p class="text-[9px] text-zinc-600 mono mt-0.5">${new Date(doc.dateAdded).toLocaleDateString()} // ${Math.round(doc.content.length / 1000)}KB</p>
            </div>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-zinc-800">
                <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
        </div>
    `).join('');
}

function filterDocuments() {
    const query = docSearch.value.toLowerCase();
    const filtered = allDocs.filter(doc =>
        doc.title.toLowerCase().includes(query) ||
        doc.content.toLowerCase().includes(query)
    );
    renderDocuments(filtered);
}

window.viewDoc = async (id) => {
    const doc = await db.documents.get(id);
    if (!doc) return;

    currentlyViewingId = id;
    viewTitle.textContent = doc.title;
    viewContent.textContent = doc.content;
    viewDocModal.classList.remove('hidden');
};

function hideViewModal() {
    viewDocModal.classList.add('hidden');
    currentlyViewingId = null;
}

async function deleteCurrentDoc() {
    if (!currentlyViewingId) return;
    if (!confirm('Permanently wipe this neural asset?')) return;

    await db.documents.delete(currentlyViewingId);
    hideViewModal();
    await updateStats();
    await loadDocuments();
}

async function clearAllData() {
    if (!confirm('CRITICAL ACTION: Purge neural repository?')) return;
    await db.documents.clear();
    await updateStats();
    await loadDocuments();
}

document.addEventListener('DOMContentLoaded', init);
