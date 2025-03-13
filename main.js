import { GoogleGenerativeAI } from "@google/generative-ai";
import Base64 from 'base64-js';
import { maybeShowApiKeyBanner } from './gemini-api-banner';
import CONFIG from './config.js';
import { transcribeAudioWithSpeechToText } from './speechClient.js';
import { 
  extractAudioFromVideo, 
  chunkFile, 
  readFileAsArrayBuffer, 
  getFileMimeType, 
  formatFileSize 
} from './audioProcessor.js';

// Get configuration values
const MAX_CHUNK_SIZE = CONFIG.fileProcessing.maxChunkSize;
const USE_GEMINI = CONFIG.fileProcessing.useGeminiAPI;
const USE_SPEECH_TO_TEXT = CONFIG.fileProcessing.useSpeechToTextAPI;

// Gemini API configuration (kept for backward compatibility)
const GEMINI_MODEL = CONFIG.gemini.model;
const API_KEY = CONFIG.gemini.apiKey;

// DOM Elements
let audioFileInput;
let transcribeButton;
let transcriptionOutput;
let audioPlayer;
let videoPlayer;
let audioPlayerContainer;
let statusIndicator;
let statusText;
let toggleDebugButton;
let debugWindow;
let apiSelect;
let languageSelect;
let modelSelect;
let enablePunctuation;
let enableSpeakerDiarization;

// Debug utility
function logToDebug(message) {
  if (!debugWindow) return;
  
  const timestamp = new Date().toLocaleTimeString();
  debugWindow.innerHTML += `[${timestamp}] ${message}<br>`;
  // Auto-scroll to bottom
  debugWindow.scrollTop = debugWindow.scrollHeight;
  console.log(`[DEBUG] ${message}`);
}

// Initialize the app
function initApp() {
  // Get DOM elements
  audioFileInput = document.getElementById('audioFileInput');
  transcribeButton = document.getElementById('transcribeButton');
  transcriptionOutput = document.getElementById('transcriptionOutput');
  audioPlayer = document.getElementById('audioPlayer');
  videoPlayer = document.getElementById('videoPlayer');
  audioPlayerContainer = document.getElementById('mediaPreviewContainer');
  statusIndicator = document.getElementById('status-indicator');
  statusText = document.getElementById('status-text');
  toggleDebugButton = document.getElementById('toggleDebugButton');
  debugWindow = document.getElementById('debugWindow');
  apiSelect = document.getElementById('apiSelect');
  languageSelect = document.getElementById('languageSelect');
  modelSelect = document.getElementById('modelSelect');
  enablePunctuation = document.getElementById('enablePunctuation');
  enableSpeakerDiarization = document.getElementById('enableSpeakerDiarization');
  
  logToDebug('App initialized');
  
  // Check for API key and show banner if needed
  maybeShowApiKeyBanner(API_KEY);
  
  // Event listeners
  toggleDebugButton.addEventListener('click', toggleDebugConsole);
  transcribeButton.addEventListener('click', handleTranscriptionRequest);
  audioFileInput.addEventListener('change', handleFileSelection);
  
  // Set initial API selection from config
  if (apiSelect) {
    apiSelect.value = USE_SPEECH_TO_TEXT ? 'speechToText' : 'gemini';
  }
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
  if (!file) return;
  
  // Determine if this is a video or audio file
  const isVideo = file.type.startsWith('video/');
  
  // Show the appropriate player
  if (isVideo && videoPlayer) {
    videoPlayer.style.display = 'block';
    audioPlayer.style.display = 'none';
    videoPlayer.src = URL.createObjectURL(file);
  } else if (audioPlayer) {
    videoPlayer.style.display = 'none';
    audioPlayer.style.display = 'block';
    audioPlayer.src = URL.createObjectURL(file);
  }
  
  // Show the media container
  if (audioPlayerContainer) {
    audioPlayerContainer.classList.remove('hidden');
  }
  
  // Reset transcription output
  if (transcriptionOutput) {
    transcriptionOutput.textContent = '';
  }
  
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

// Estimate base64 encoded size of a file (bytes)
function estimateBase64Size(originalSize) {
  // Base64 encoding increases size by approximately 33-37%
  // We'll use 37% to be safe
  return Math.ceil(originalSize * 1.37);
}

// Handle transcription request
async function handleTranscriptionRequest() {
  const file = audioFileInput.files[0];
  
  if (!file) {
    showError('Please select an audio or video file.');
    return;
  }
  
  try {
    // Show processing status
    showStatus('Preparing to transcribe...');
    transcriptionOutput.textContent = '';
    
    logToDebug('Starting transcription process');
    
    // Determine which API to use based on UI or config
    const useGemini = apiSelect ? 
      apiSelect.value === 'gemini' : 
      USE_GEMINI;
    
    const useSpeechToText = apiSelect ? 
      apiSelect.value === 'speechToText' : 
      USE_SPEECH_TO_TEXT;
    
    // Log which API we're using
    logToDebug(`Using API: ${useGemini ? 'Gemini' : 'Speech-to-Text'}`);
    
    // Check if it's a video file and extract audio if needed
    const isVideo = file.type.startsWith('video/');
    let audioFile = file;
    
    if (isVideo) {
      logToDebug('Processing video file - extracting audio');
      showStatus('Extracting audio from video...');
      
      try {
        audioFile = await extractAudioFromVideo(file, (progress) => {
          showStatus(`Extracting audio: ${Math.round(progress)}%`);
        });
        logToDebug('Audio extraction complete');
      } catch (error) {
        logToDebug(`Audio extraction failed: ${error.message}`);
        // Continue with the original file if extraction fails
        audioFile = file;
      }
    }
    
    // All files should be chunked for consistency
    if (useGemini) {
      // Use Gemini API
      await processWithGemini(audioFile);
    } else {
      // Use Speech-to-Text API
      await processWithSpeechToText(audioFile);
    }
    
    // Hide status indicator when done
    hideStatus();
    
  } catch (error) {
    console.error("Transcription error:", error);
    showError(`Error: ${error.message}`);
    logToDebug(`ERROR: ${error.message}`);
    hideStatus();
  }
}

// Process with Gemini API
async function processWithGemini(file) {
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
  
  // Process file in chunks
  const chunks = chunkFile(file, MAX_CHUNK_SIZE);
  let fullTranscription = '';
  
  for (let i = 0; i < chunks.length; i++) {
    showStatus(`Processing chunk ${i + 1} of ${chunks.length}...`);
    logToDebug(`Processing chunk ${i + 1} of ${chunks.length}`);
    
    try {
      const chunkTranscription = await transcribeAudioWithGemini(chunks[i], model);
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
  logToDebug('All chunks processed with Gemini API');
}

// Process with Speech-to-Text API
async function processWithSpeechToText(file) {
  // Get transcription options from UI
  const options = {
    languageCode: languageSelect ? languageSelect.value : CONFIG.speechToText.languageCode,
    model: modelSelect ? modelSelect.value : CONFIG.speechToText.model,
    enableAutomaticPunctuation: enablePunctuation ? enablePunctuation.checked : CONFIG.speechToText.enableAutomaticPunctuation,
    enableSpeakerDiarization: enableSpeakerDiarization ? enableSpeakerDiarization.checked : false,
    speakerCount: 2 // Default to 2 speakers if diarization is enabled
  };
  
  logToDebug(`Speech-to-Text options: ${JSON.stringify(options)}`);
  
  // Process file in chunks
  const chunks = chunkFile(file, MAX_CHUNK_SIZE);
  let fullTranscription = '';
  
  for (let i = 0; i < chunks.length; i++) {
    showStatus(`Processing chunk ${i + 1} of ${chunks.length}...`);
    logToDebug(`Processing chunk ${i + 1} of ${chunks.length}`);
    
    try {
      // Read file as ArrayBuffer
      const arrayBuffer = await readFileAsArrayBuffer(chunks[i]);
      
      // Get appropriate MIME type
      const mimeType = getFileMimeType(chunks[i]);
      
      // Transcribe with Speech-to-Text API
      const chunkTranscription = await transcribeAudioWithSpeechToText(arrayBuffer, mimeType, options);
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
  logToDebug('All chunks processed with Speech-to-Text API');
}

// Core Gemini transcription function
async function transcribeAudioWithGemini(file, model) {
  try {
    // Read file as ArrayBuffer
    const arrayBuffer = await readFileAsArrayBuffer(file);
    
    // Convert to base64
    const base64Data = Base64.fromByteArray(new Uint8Array(arrayBuffer));
    logToDebug(`Chunk actual base64 size: ${formatFileSize(base64Data.length)}`);
    
    // Get appropriate MIME type
    const mimeType = getFileMimeType(file);
    logToDebug(`Using MIME type: ${mimeType}`);
    
    // Prepare content for Gemini API with specific instruction for verbatim transcription
    const contents = [
      {
        role: 'user',
        parts: [
          { text: "Please provide a verbatim transcription of this audio. Include all spoken words exactly as heard, with no summarization, commentary, or analysis. Just transcribe the exact speech." }, 
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
    logToDebug(`Gemini transcription error: ${error.message}`);
    throw error;
  }
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