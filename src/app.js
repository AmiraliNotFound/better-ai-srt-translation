// ============================================
// SRT Translator - App Logic
// ============================================

const DEFAULT_MODEL = 'google/gemini-3-flash-preview';
const DEFAULT_PARALLEL = 50;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;  // 1 second
const REQUEST_TIMEOUT_MS = 30000;  // 30 seconds

// State
let srtContent = '';
let srtBlocks = [];
let translatedResult = '';
let originalFileName = '';

// DOM Elements
const elements = {
    dropZone: document.getElementById('dropZone'),
    fileInput: document.getElementById('fileInput'),
    dropText: document.getElementById('dropText'),
    fileName: document.getElementById('fileName'),
    translateBtn: document.getElementById('translateBtn'),
    translateBtnText: document.getElementById('translateBtnText'),
    progressCard: document.getElementById('progressCard'),
    downloadBtn: document.getElementById('downloadBtn'),
    apiKey: document.getElementById('apiKey'),
    customModel: document.getElementById('customModel'),
    targetLanguage: document.getElementById('targetLanguage'),
    chunkSize: document.getElementById('chunkSize'),
    parallelRequests: document.getElementById('parallelRequests'),
    customInstructions: document.getElementById('customInstructions'),
    chunksGrid: document.getElementById('chunksGrid'),
    logContainer: document.getElementById('logContainer'),
    progressFill: document.getElementById('progressFill'),
    progressPercent: document.getElementById('progressPercent'),
    totalChunks: document.getElementById('totalChunks'),
    completedChunks: document.getElementById('completedChunks'),
    failedChunks: document.getElementById('failedChunks')
};

// ============================================
// Initialization
// ============================================

function init() {
    loadSavedSettings();
    setupEventListeners();
}

function loadSavedSettings() {
    const savedApiKey = localStorage.getItem('srt_openrouter_api_key');
    const savedModel = localStorage.getItem('srt_custom_model');
    const savedLanguage = localStorage.getItem('srt_target_language');
    const savedChunkSize = localStorage.getItem('srt_chunk_size');
    const savedParallel = localStorage.getItem('srt_parallel_requests');
    const savedInstructions = localStorage.getItem('srt_custom_instructions');

    if (savedApiKey) elements.apiKey.value = savedApiKey;
    if (savedModel) elements.customModel.value = savedModel;
    if (savedLanguage) elements.targetLanguage.value = savedLanguage;
    if (savedChunkSize) elements.chunkSize.value = savedChunkSize;
    if (savedParallel) elements.parallelRequests.value = savedParallel;
    else elements.parallelRequests.value = DEFAULT_PARALLEL;
    if (savedInstructions) elements.customInstructions.value = savedInstructions;
}

function saveSettings() {
    localStorage.setItem('srt_openrouter_api_key', elements.apiKey.value);
    localStorage.setItem('srt_custom_model', elements.customModel.value);
    localStorage.setItem('srt_target_language', elements.targetLanguage.value);
    localStorage.setItem('srt_chunk_size', elements.chunkSize.value);
    localStorage.setItem('srt_parallel_requests', elements.parallelRequests.value);
    localStorage.setItem('srt_custom_instructions', elements.customInstructions.value);
}

// ============================================
// Event Listeners
// ============================================

function setupEventListeners() {
    // File upload
    elements.dropZone.addEventListener('click', () => elements.fileInput.click());
    elements.dropZone.addEventListener('dragover', handleDragOver);
    elements.dropZone.addEventListener('dragleave', handleDragLeave);
    elements.dropZone.addEventListener('drop', handleDrop);
    elements.fileInput.addEventListener('change', handleFileSelect);

    // Settings changes
    elements.apiKey.addEventListener('input', () => {
        saveSettings();
        updateTranslateButton();
    });
    elements.customModel.addEventListener('change', saveSettings);
    elements.targetLanguage.addEventListener('change', () => {
        saveSettings();
        updateTranslateButtonText();
    });
    elements.chunkSize.addEventListener('change', saveSettings);
    elements.parallelRequests.addEventListener('change', saveSettings);
    elements.customInstructions.addEventListener('change', saveSettings);

    // Actions
    elements.translateBtn.addEventListener('click', startTranslation);
    elements.downloadBtn.addEventListener('click', downloadResult);

    // Initial UI state
    updateTranslateButton();
    updateTranslateButtonText();
}

function handleDragOver(e) {
    e.preventDefault();
    elements.dropZone.classList.add('dragover');
}

function handleDragLeave() {
    elements.dropZone.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    elements.dropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.srt')) {
        processFile(file);
    }
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) processFile(file);
}

// ============================================
// File Processing
// ============================================

function processFile(file) {
    originalFileName = file.name;
    const reader = new FileReader();

    reader.onload = (e) => {
        srtContent = e.target.result;
        srtBlocks = parseSRT(srtContent);

        elements.dropText.textContent = `Loaded: ${srtBlocks.length} subtitle blocks`;
        elements.fileName.textContent = file.name;
        elements.fileName.classList.remove('hidden');

        updateTranslateButton();
    };

    reader.readAsText(file);
}

function parseSRT(content) {
    const blocks = [];
    const lines = content.split('\n');
    let currentBlock = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (/^\d+$/.test(line)) {
            if (currentBlock) {
                blocks.push(currentBlock);
            }
            currentBlock = {
                index: parseInt(line),
                timestamp: '',
                text: []
            };
        } else if (currentBlock && line.includes('-->')) {
            currentBlock.timestamp = line;
        } else if (currentBlock && line !== '') {
            currentBlock.text.push(line);
        }
    }

    if (currentBlock) {
        blocks.push(currentBlock);
    }

    return blocks;
}

// ============================================
// Smart Chunking
// ============================================

function createSmartChunks(blocks, targetSize) {
    const chunks = [];
    let currentChunk = [];

    for (let i = 0; i < blocks.length; i++) {
        currentChunk.push(blocks[i]);

        if (currentChunk.length >= targetSize) {
            let splitIndex = -1;

            // Look for sentence ending in last 10 blocks
            for (let j = currentChunk.length - 1; j >= Math.max(0, currentChunk.length - 10); j--) {
                const text = currentChunk[j].text.join(' ');
                if (/[.!?][\s"']*$/.test(text)) {
                    splitIndex = j;
                    break;
                }
            }

            if (splitIndex === -1) {
                chunks.push([...currentChunk]);
                currentChunk = [];
            } else {
                chunks.push(currentChunk.slice(0, splitIndex + 1));
                currentChunk = currentChunk.slice(splitIndex + 1);
            }
        }
    }

    if (currentChunk.length > 0) {
        chunks.push(currentChunk);
    }

    return chunks;
}

function blocksToSRT(blocks) {
    return blocks.map(block => {
        return `${block.index}\n${block.timestamp}\n${block.text.join('\n')}`;
    }).join('\n\n');
}

// ============================================
// UI Updates
// ============================================

function updateTranslateButton() {
    elements.translateBtn.disabled = !srtContent || !elements.apiKey.value;
}

function updateTranslateButtonText() {
    const lang = elements.targetLanguage.value;
    elements.translateBtnText.textContent = `Translate to ${lang}`;
}

function log(message, type = 'info') {
    const time = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.innerHTML = `<span class="log-time">${time}</span><span class="log-${type}">${message}</span>`;
    elements.logContainer.insertBefore(entry, elements.logContainer.firstChild);
}

function updateProgress(completed, failed, total) {
    elements.completedChunks.textContent = completed;
    elements.failedChunks.textContent = failed;

    const percent = Math.round((completed + failed) / total * 100);
    elements.progressPercent.textContent = `${percent}%`;
    elements.progressFill.style.width = `${percent}%`;
}

function setChunkStatus(index, status) {
    const indicator = document.querySelector(`[data-chunk="${index}"]`);
    if (indicator) {
        indicator.className = `chunk-indicator ${status}`;
    }
}

// ============================================
// Translation API
// ============================================

function buildSystemPrompt(targetLanguage, customInstructions) {
    let prompt = `You are an expert subtitle translator for ${targetLanguage}.

INPUT: Lines starting with markers [B1], [B2], etc.

PRIORITY ORDER (highest to lowest):
1. LINE STRUCTURE (MANDATORY): Each [B#] line stays separate. Never merge or swap content between lines.
2. NATURAL TRANSLATION: Translate idiomatically, not word-for-word. Omit unnecessary pronouns if the language allows it.
3. WORD COUNT (SOFT): Try to keep similar word count per line, but naturalness comes first.

RULES:
- Keep [B#] markers at the start of each output line
- Return EXACTLY the same number of lines as input
- Do NOT add any annotations, word counts, or comments
- Just output the translated text with markers, nothing else

EXAMPLE:
Input:
[B1] I don't think OpenAI will
[B2] be around in 5 years.

Output:
[B1] OpenAI'ın var olacağını
[B2] 5 yıl içinde sanmıyorum.

CRITICAL: [B1] → [B1], [B2] → [B2]. Never shift content.`;

    if (customInstructions && customInstructions.trim()) {
        prompt += `\n\n⚠️ MANDATORY USER INSTRUCTIONS (MUST FOLLOW):\n${customInstructions.trim()}\n\nYou MUST follow these instructions exactly. They override any conflicting rules.`;
    }

    return prompt;
}

// Extract text with block markers - one per line
function extractTextWithMarkers(blocks) {
    return blocks.map((block, i) => `[B${i + 1}] ${block.text.join(' ')}`).join('\n');
}

// Parse translated text with markers back into blocks
function parseMarkedTranslation(blocks, translatedText) {
    const result = [];

    for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        const markerStart = `[B${i + 1}]`;
        const markerEnd = `[B${i + 2}]`;

        const startIdx = translatedText.indexOf(markerStart);
        if (startIdx === -1) {
            // Marker not found, use original
            result.push({
                index: block.index,
                timestamp: block.timestamp,
                text: [block.text.join(' ')]
            });
            continue;
        }

        const textStart = startIdx + markerStart.length;
        let textEnd;

        if (i === blocks.length - 1) {
            textEnd = translatedText.length;
        } else {
            const endIdx = translatedText.indexOf(markerEnd);
            textEnd = endIdx !== -1 ? endIdx : translatedText.length;
        }

        const blockText = translatedText.substring(textStart, textEnd).trim();

        result.push({
            index: block.index,
            timestamp: block.timestamp,
            text: [blockText]
        });
    }

    return result;
}

async function translateChunk(chunk, index, apiKey, model, targetLanguage, customInstructions) {
    // Extract text with block markers
    const markedText = extractTextWithMarkers(chunk);
    const systemPrompt = buildSystemPrompt(targetLanguage, customInstructions);

    console.log(`[Chunk ${index + 1}] Sending API request...`);

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
        console.log(`[Chunk ${index + 1}] TIMEOUT - aborting request`);
        controller.abort();
    }, REQUEST_TIMEOUT_MS);

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: markedText }
                ],
                temperature: 0.3
            }),
            signal: controller.signal
        });

        console.log(`[Chunk ${index + 1}] Response received, status: ${response.status}`);
        clearTimeout(timeoutId);

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`API Error: ${response.status} - ${error}`);
        }

        const data = await response.json();
        console.log(`[Chunk ${index + 1}] Parsed response, parsing markers...`);
        const translatedText = data.choices[0].message.content;

        // Parse markers and map back to blocks
        const translatedBlocks = parseMarkedTranslation(chunk, translatedText);

        // Convert back to SRT format
        return translatedBlocks.map(block => {
            return `${block.index}\n${block.timestamp}\n${block.text.join('\n')}`;
        }).join('\n\n');

    } catch (error) {
        clearTimeout(timeoutId);
        console.log(`[Chunk ${index + 1}] Error:`, error.name, error.message);
        if (error.name === 'AbortError') {
            throw new Error(`Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`);
        }
        throw error;
    }
}

// Retry wrapper with exponential backoff
async function translateChunkWithRetry(chunk, index, apiKey, model, targetLanguage, customInstructions, onRetry) {
    let lastError;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            return await translateChunk(chunk, index, apiKey, model, targetLanguage, customInstructions);
        } catch (error) {
            lastError = error;

            if (attempt < MAX_RETRIES) {
                const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1); // Exponential backoff
                onRetry(index, attempt, delay, error.message);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    throw lastError;
}

// ============================================
// Main Translation Flow
// ============================================

async function startTranslation() {
    const apiKey = elements.apiKey.value;
    if (!apiKey || !srtContent) return;

    // Get settings
    const model = elements.customModel.value.trim() || DEFAULT_MODEL;
    const targetLanguage = elements.targetLanguage.value;
    const targetChunkSize = parseInt(elements.chunkSize.value) || 50;
    const maxParallel = parseInt(elements.parallelRequests.value) || DEFAULT_PARALLEL;
    const customInstructions = elements.customInstructions.value;

    // Create chunks
    const chunks = createSmartChunks(srtBlocks, targetChunkSize);

    // Setup UI
    elements.progressCard.classList.remove('hidden');
    elements.downloadBtn.classList.add('hidden');
    elements.translateBtn.disabled = true;
    elements.logContainer.innerHTML = '';

    elements.totalChunks.textContent = chunks.length;

    // Create chunk indicators
    elements.chunksGrid.innerHTML = '';
    chunks.forEach((_, i) => {
        const indicator = document.createElement('div');
        indicator.className = 'chunk-indicator pending';
        indicator.dataset.chunk = i;
        indicator.textContent = i + 1;
        elements.chunksGrid.appendChild(indicator);
    });

    log(`Starting translation to ${targetLanguage}...`, 'info');
    log(`Model: ${model}`, 'info');
    log(`Chunks: ${chunks.length} | Size: ~${targetChunkSize} | Parallel: ${maxParallel}`, 'info');

    let completed = 0;
    let failed = 0;
    const results = new Array(chunks.length).fill(null);

    // Process a single chunk
    async function processChunk(chunk, index) {
        setChunkStatus(index, 'processing');
        const blockCount = chunk.length;
        const textLength = chunk.reduce((sum, b) => sum + b.text.join(' ').length, 0);

        // Debug for problematic chunks
        if (index === 107) {
            log(`⚠️ CHUNK 108 DEBUG: ${blockCount} blocks, ${textLength} chars`, 'error');
            console.log('Chunk 108 content:', chunk);
        }

        try {
            log(`Chunk ${index + 1} starting (${blockCount} blocks, ${textLength} chars)...`, 'info');

            const translated = await translateChunkWithRetry(
                chunk,
                index,
                apiKey,
                model,
                targetLanguage,
                customInstructions,
                (idx, attempt, delay, errorMsg) => {
                    setChunkStatus(idx, 'error');
                    log(`Chunk ${idx + 1} retry ${attempt}/${MAX_RETRIES}: ${errorMsg}`, 'error');
                    setTimeout(() => setChunkStatus(idx, 'processing'), 100);
                }
            );

            results[index] = translated;
            completed++;
            setChunkStatus(index, 'done');
            log(`Chunk ${index + 1} completed`, 'success');
        } catch (error) {
            failed++;
            setChunkStatus(index, 'error');
            log(`Chunk ${index + 1} FAILED: ${error.message}`, 'error');
            results[index] = blocksToSRT(chunk);
        }

        updateProgress(completed, failed, chunks.length);
    }

    // Process all chunks with controlled concurrency
    const processing = new Set();
    let nextIndex = 0;

    async function processNext() {
        while (nextIndex < chunks.length) {
            const index = nextIndex++;
            const chunk = chunks[index];

            const promise = processChunk(chunk, index).finally(() => {
                processing.delete(promise);
            });
            processing.add(promise);

            // If at max concurrency, wait for one to complete
            if (processing.size >= maxParallel) {
                await Promise.race(processing);
            }
        }
        // Wait for remaining
        await Promise.all(processing);
    }

    await processNext();

    // Merge results
    translatedResult = results.join('\n\n');

    const status = completed === chunks.length ? 'success' : 'error';
    log(`Translation complete! ${completed} successful, ${failed} failed`, status);

    elements.translateBtn.disabled = false;
    elements.downloadBtn.classList.remove('hidden');
}

// ============================================
// Download
// ============================================

function downloadResult() {
    const lang = elements.targetLanguage.value;
    const langCode = getLanguageCode(lang);

    const blob = new Blob([translatedResult], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = originalFileName.replace('.srt', `_${langCode}.srt`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    log(`Downloaded: ${a.download}`, 'success');
}

function getLanguageCode(language) {
    const codes = {
        'Turkish': 'TR',
        'Spanish': 'ES',
        'French': 'FR',
        'German': 'DE',
        'Italian': 'IT',
        'Portuguese': 'PT',
        'Russian': 'RU',
        'Japanese': 'JA',
        'Korean': 'KO',
        'Chinese (Simplified)': 'ZH-CN',
        'Chinese (Traditional)': 'ZH-TW',
        'Arabic': 'AR',
        'Hindi': 'HI',
        'Dutch': 'NL',
        'Polish': 'PL',
        'Swedish': 'SV',
        'Vietnamese': 'VI',
        'Thai': 'TH',
        'Indonesian': 'ID',
        'Greek': 'EL'
    };
    return codes[language] || 'TRANSLATED';
}

// ============================================
// Initialize App
// ============================================

init();
