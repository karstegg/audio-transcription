import { GoogleGenerativeAI } from "@google/generative-ai";
import Base64 from 'base64-js';
import { maybeShowApiKeyBanner } from './gemini-api-banner';
import CONFIG from './config.js';

// Get configuration values
const MAX_CHUNK_SIZE = CONFIG.fileProcessing.maxChunkSize;
const GEMINI_MODEL = CONFIG.gemini.model;
const API_KEY = CONFIG.gemini.apiKey;

// DOM Elements
const audioFileInput = document.getElementById('audioFileInput');
const transcribeButton = document.getElementById('transcribeButton');
const cancelButton = document.getElementById('cancelButton');
const copyTranscriptButton = document.getElementById('copyTranscriptButton');
const createSummaryButton = document.getElementById('createSummaryButton');
const copySummaryButton = document.getElementById('copySummaryButton');
const transcriptionOutput = document.getElementById('transcriptionOutput');
const summaryOutput = document.getElementById('summaryOutput');
const summaryContainer = document.getElementById('summary-container');
const audioPlayer = document.getElementById('audioPlayer');
const audioPlayerContainer = document.getElementById('audio-player-container');
const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');
const toggleDebugButton = document.getElementById('toggleDebugButton');
const debugWindow = document.getElementById('debugWindow');

// Global state
let abortController = null;
let currentTranscription = '';

// Debug utility
function logToDebug(message) {
  const timestamp = new Date().toLocaleTimeString();
  debugWindow.innerHTML += `[${timestamp}] ${message}<br>`;
  // Auto-scroll to bottom
  debugWindow.scrollTop = debugWindow.scrollHeight;
}

// Initialize the app
function initApp() {
  logToDebug('App initialized');
  
  // Check for API key and show banner if needed
  maybeShowApiKeyBanner(API_KEY);
  
  // Make summary container visible by default
  summaryContainer.classList.remove('hidden');
  
  // Event listeners
  toggleDebugButton.addEventListener('click', toggleDebugConsole);
  transcribeButton.addEventListener('click', handleTranscriptionRequest);
  cancelButton.addEventListener('click', handleCancelReset);
  copyTranscriptButton.addEventListener('click', copyTranscriptToClipboard);
  createSummaryButton.addEventListener('click', generateSummary);
  copySummaryButton.addEventListener('click', copySummaryToClipboard);
  audioFileInput.addEventListener('change', handleFileSelection);
}

// Toggle debug console visibility
function toggleDebugConsole() {
  if (debugWindow.style.display === 'none') {
    debugWindow.style.display = 'block';
  } else {
    debugWindow.style.display = 'none';
  }
}

// Handle file selection
function handleFileSelection(event) {
  const file = event.target.files[0];
  if (file) {
    // Set the source for the audio player
    audioPlayer.src = URL.createObjectURL(file);
    audioPlayerContainer.classList.remove('hidden');
    
    // Reset transcription output
    transcriptionOutput.textContent = '';
    
    // Reset summary output
    summaryOutput.textContent = '';
    
    // Estimate base64 size and log information
    const estimatedBase64Size = estimateBase64Size(file.size);
    logToDebug(`File selected: ${file.name} (${formatFileSize(file.size)})`);
    logToDebug(`File type: ${file.type}`);
    logToDebug(`Estimated base64 size: ${formatFileSize(estimatedBase64Size)}`);
    
    // Automatically determine if chunking will be needed
    if (estimatedBase64Size > 30 * 1024 * 1024) {
      logToDebug(`File will require chunking (base64 size exceeds 30MB)`);
    }
  }
}

// Handle cancel/reset
function handleCancelReset() {
  // Cancel ongoing API requests
  if (abortController) {
    abortController.abort();
    abortController = null;
    logToDebug('Transcription cancelled');
  }
  
  // Reset the form
  audioFileInput.value = '';
  transcriptionOutput.textContent = '';
  summaryOutput.textContent = '';
  audioPlayer.src = '';
  audioPlayerContainer.classList.add('hidden');
  
  // Hide status indicator
  hideStatus();
  
  // Reset global state
  currentTranscription = '';
  
  logToDebug('App reset');
}

// Fallback copy text function (for browsers with restricted Clipboard API)
function copyTextToClipboard(text) {
  // Create a temporary textarea element
  const textarea = document.createElement('textarea');
  textarea.value = text;
  
  // Make the textarea out of viewport
  textarea.style.position = 'fixed';
  textarea.style.left = '-999999px';
  textarea.style.top = '-999999px';
  document.body.appendChild(textarea);
  
  // Select and copy
  textarea.select();
  let success = false;
  
  try {
    success = document.execCommand('copy');
  } catch (err) {
    logToDebug(`Copy error: ${err.message}`);
    success = false;
  }
  
  // Remove the textarea
  document.body.removeChild(textarea);
  return success;
}

// Copy text with fallback
async function copyText(text) {
  let success = false;
  
  // Try modern Clipboard API first
  try {
    await navigator.clipboard.writeText(text);
    success = true;
  } catch (err) {
    logToDebug(`Clipboard API error: ${err.message}. Trying fallback method...`);
    // Use fallback method
    success = copyTextToClipboard(text);
  }
  
  return success;
}

// Copy transcript to clipboard
async function copyTranscriptToClipboard() {
  if (!transcriptionOutput.textContent.trim()) {
    showToast('No transcript to copy', false);
    return;
  }
  
  const success = await copyText(transcriptionOutput.textContent);
  
  if (success) {
    showToast('Transcript copied to clipboard');
    logToDebug('Transcript copied to clipboard');
  } else {
    showToast('Failed to copy transcript', false);
    logToDebug('Failed to copy transcript');
  }
}

// Copy summary to clipboard
async function copySummaryToClipboard() {
  if (!summaryOutput.textContent.trim()) {
    showToast('No summary to copy', false);
    return;
  }
  
  const success = await copyText(summaryOutput.textContent);
  
  if (success) {
    showToast('Summary copied to clipboard');
    logToDebug('Summary copied to clipboard');
  } else {
    showToast('Failed to copy summary', false);
    logToDebug('Failed to copy summary');
  }
}

// Generate meeting summary
async function generateSummary() {
  if (!currentTranscription.trim()) {
    showToast('No transcript to summarize', false);
    return;
  }
  
  try {
    // Show processing status
    showStatus('Generating summary...');
    summaryOutput.textContent = '';
    
    logToDebug('Starting summary generation');
    
    // Initialize Gemini API
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: GEMINI_MODEL,
      generationConfig: {
        temperature: 0.2,
        topP: 0.95,
        topK: 64,
      }
    });
    
    // Create summary prompt
    const prompt = `
      I'm providing a transcript of a meeting. Please create a concise summary with the following sections:

      1. Key Discussion Points - The main topics discussed in bullet points
      2. Key Decisions - Any decisions made during the meeting
      3. Action Items - Tasks assigned or mentioned with responsible parties if specified

      Keep the summary clear and focused on the most important information.

      Here's the transcript:
      ${currentTranscription}
    `;
    
    // Create a new AbortController for this request
    abortController = new AbortController();
    
    // Generate content
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    }, { signal: abortController.signal });
    
    const response = result.response;
    const summary = response.text();
    
    // Display summary
    summaryOutput.textContent = summary;
    logToDebug('Summary generated successfully');
    
    // Hide status indicator
    hideStatus();
    
  } catch (error) {
    if (error.name === 'AbortError') {
      logToDebug('Summary generation aborted');
    } else {
      console.error("Summary generation error:", error);
      showError(`Error generating summary: ${error.message}`);
      logToDebug(`ERROR: ${error.message}`);
    }
    hideStatus();
  } finally {
    abortController = null;
  }
}

// Show toast notification
function showToast(message, success = true) {
  // Remove existing toast if any
  const existingToast = document.querySelector('.toast');
  if (existingToast) {
    document.body.removeChild(existingToast);
  }
  
  // Create new toast
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  
  if (!success) {
    toast.style.backgroundColor = 'var(--error-color)';
  }
  
  document.body.appendChild(toast);
  
  // Show toast
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  // Hide toast after 3 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, 3000);
}

// Get appropriate MIME type for audio/video files
function getAudioMimeType(file) {
  // If the file already has a valid MIME type, use it
  if (file.type && (file.type.startsWith('audio/') || file.type.startsWith('video/'))) {
    return file.type;
  }
  
  // Otherwise, try to determine from file extension
  const extension = file.name.split('.').pop().toLowerCase();
  
  const mimeTypes = {
    // Audio formats
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'webm': 'audio/webm',
    'm4a': 'audio/mp4',
    'aac': 'audio/aac',
    'flac': 'audio/flac',
    // Video formats
    'mp4': 'video/mp4',
    'mov': 'video/quicktime',
    'avi': 'video/x-msvideo',
    'mkv': 'video/x-matroska'
  };
  
  return mimeTypes[extension] || 'audio/mpeg'; // Default to audio/mpeg if unknown
}

// Estimate base64 encoded size of a file (bytes)
function estimateBase64Size(originalSize) {
  // Base64 encoding increases size by approximately 33-37%
  // We'll use 37% to be safe
  return Math.ceil(originalSize * 1.37);
}

// Format file size for display
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' bytes';
  else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  else return (bytes / 1048576).toFixed(1) + ' MB';
}

// Split large files into manageable chunks
function chunkFile(file) {
  // Make smaller chunks to avoid errors - 15MB instead of 22MB
  const effectiveChunkSize = 15 * 1024 * 1024;
  const chunks = [];
  let start = 0;
  const fileSize = file.size;

  while (start < fileSize) {
    const end = Math.min(start + effectiveChunkSize, fileSize);
    const chunk = file.slice(start, end);
    // Preserve the original file type and name for each chunk
    Object.defineProperty(chunk, 'type', {
      value: file.type,
      writable: false
    });
    Object.defineProperty(chunk, 'name', {
      value: file.name,
      writable: false
    });
    chunks.push(chunk);
    start = end;
  }
  
  logToDebug(`File split into ${chunks.length} chunks of max ${formatFileSize(effectiveChunkSize)}`);
  return chunks;
}

// Handle transcription request
async function handleTranscriptionRequest() {
  const file = audioFileInput.files[0];
  
  if (!file) {
    showError('Please select an audio file.');
    return;
  }
  
  try {
    // Show processing status
    showStatus('Preparing to transcribe...');
    transcriptionOutput.textContent = '';
    currentTranscription = '';
    
    // Reset summary output
    summaryOutput.textContent = '';
    
    logToDebug('Starting transcription process');
    
    // Create a new AbortController for this request
    abortController = new AbortController();
    
    // Initialize Gemini API
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: GEMINI_MODEL,
      generationConfig: {
        temperature: 0,
        topP: 0.95,
        topK: 64,
      }
    });
    
    // All files should be chunked for consistency
    await processLargeFile(file, model);
    
    // Hide status indicator when done
    hideStatus();
    
  } catch (error) {
    if (error.name === 'AbortError') {
      logToDebug('Transcription aborted');
    } else {
      console.error("Transcription error:", error);
      showError(`Error: ${error.message}`);
      logToDebug(`ERROR: ${error.message}`);
    }
    hideStatus();
  } finally {
    abortController = null;
  }
}

// Process a large file in chunks
async function processLargeFile(file, model) {
  const chunks = chunkFile(file);
  let fullTranscription = '';
  
  for (let i = 0; i < chunks.length; i++) {
    // Check if transcription has been cancelled
    if (!abortController || abortController.signal.aborted) {
      throw new DOMException('Transcription aborted by user', 'AbortError');
    }
    
    showStatus(`Processing chunk ${i + 1} of ${chunks.length}...`);
    logToDebug(`Processing chunk ${i + 1} of ${chunks.length}`);
    
    try {
      const chunkTranscription = await transcribeAudio(chunks[i], model, i + 1, chunks.length);
      fullTranscription += chunkTranscription + ' ';
      
      // Update with partial results
      transcriptionOutput.textContent = fullTranscription;
      
      // Add a small delay between chunks to avoid rate limiting
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        throw error; // Re-throw abort errors
      }
      
      logToDebug(`Error with chunk ${i + 1}: ${error.message}`);
      // Continue with next chunk instead of failing completely
      fullTranscription += ` [Error transcribing part ${i + 1}] `;
    }
  }
  
  // Save current transcription for summary generation
  currentTranscription = fullTranscription;
  
  // Final display with complete transcription
  displayResult(fullTranscription);
  logToDebug('All chunks processed');
}

// Core transcription function
async function transcribeAudio(file, model, chunkIndex, totalChunks) {
  try {
    // Check if transcription has been cancelled
    if (!abortController || abortController.signal.aborted) {
      throw new DOMException('Transcription aborted by user', 'AbortError');
    }
    
    // Read file as ArrayBuffer
    const arrayBuffer = await readFileAsArrayBuffer(file);
    
    // Convert to base64
    const base64Data = Base64.fromByteArray(new Uint8Array(arrayBuffer));
    logToDebug(`Chunk actual base64 size: ${formatFileSize(base64Data.length)}`);
    
    // Get appropriate MIME type
    const mimeType = getAudioMimeType(file);
    logToDebug(`Using MIME type: ${mimeType}`);
    
    // Prepare prompt for verbatim transcription
    const prompt = `Please provide a verbatim transcription of this ${chunkIndex ? `part ${chunkIndex} of ${totalChunks} of the` : ''} audio. Include all spoken words exactly as heard, with no summarization, commentary, or analysis. Include filler words, stutters, and false starts. Just transcribe the exact speech.`;
    
    // Prepare content for Gemini API
    const contents = [
      {
        role: 'user',
        parts: [
          { text: prompt }, 
          { 
            inline_data: { 
              mime_type: mimeType, 
              data: base64Data 
            } 
          }
        ]
      }
    ];
    
    logToDebug('Sending to Gemini API...');
    
    // Generate content with abort signal
    const result = await model.generateContent({
      contents
    }, { signal: abortController.signal });
    
    const response = result.response;
    
    logToDebug('Received response from Gemini API');
    
    return response.text();
  } catch (error) {
    logToDebug(`Transcription error: ${error.message}`);
    throw error;
  }
}

// Helper function to read file as ArrayBuffer
function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = event => resolve(event.target.result);
    reader.onerror = error => reject(error);
    reader.readAsArrayBuffer(file);
  });
}

// Display transcription result
function displayResult(text) {
  transcriptionOutput.textContent = text;
}

// Show status message
function showStatus(message) {
  statusText.textContent = message;
  statusIndicator.classList.remove('hidden');
}

// Hide status indicator
function hideStatus() {
  statusIndicator.classList.add('hidden');
}

// Show error message
function showError(message) {
  transcriptionOutput.textContent = message;
  transcriptionOutput.style.color = 'var(--error-color)';
  
  // Reset color after a moment
  setTimeout(() => {
    transcriptionOutput.style.color = '';
  }, 3000);
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);