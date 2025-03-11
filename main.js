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
const transcriptionOutput = document.getElementById('transcriptionOutput');
const audioPlayer = document.getElementById('audioPlayer');
const audioPlayerContainer = document.getElementById('audio-player-container');
const statusIndicator = document.getElementById('status-indicator');
const statusText = document.getElementById('status-text');
const toggleDebugButton = document.getElementById('toggleDebugButton');
const debugWindow = document.getElementById('debugWindow');

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
  
  // Event listeners
  toggleDebugButton.addEventListener('click', toggleDebugConsole);
  transcribeButton.addEventListener('click', handleTranscriptionRequest);
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
    
    logToDebug('Starting transcription process');
    
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
    console.error("Transcription error:", error);
    showError(`Error: ${error.message}`);
    logToDebug(`ERROR: ${error.message}`);
  }
}

// Process a large file in chunks
async function processLargeFile(file, model) {
  const chunks = chunkFile(file);
  let fullTranscription = '';
  
  for (let i = 0; i < chunks.length; i++) {
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
      logToDebug(`Error with chunk ${i + 1}: ${error.message}`);
      // Continue with next chunk instead of failing completely
      fullTranscription += ` [Error transcribing part ${i + 1}] `;
    }
  }
  
  // Final display with complete transcription
  displayResult(fullTranscription);
  logToDebug('All chunks processed');
}

// Core transcription function
async function transcribeAudio(file, model, chunkIndex, totalChunks) {
  try {
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
    
    // Generate content
    const result = await model.generateContent({ contents });
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