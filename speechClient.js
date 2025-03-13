// Mock implementation for browser-based demo without requiring Google Cloud dependencies
import Base64 from 'base64-js';
import CONFIG from './config.js';

// Log helper function
function safeLog(message) {
  console.log(`[Speech-to-Text] ${message}`);
  
  // Try to log to debug window if it exists
  const debugWindow = document.getElementById('debugWindow');
  if (debugWindow) {
    const timestamp = new Date().toLocaleTimeString();
    debugWindow.innerHTML += `[${timestamp}] [Speech-to-Text] ${message}<br>`;
    debugWindow.scrollTop = debugWindow.scrollHeight;
  }
}

// Mock Speech-to-Text client for demo purposes
safeLog('Using mock Speech-to-Text client for demo');

/**
 * Get appropriate encoding from MIME type
 */
function getAudioEncoding(mimeType) {
  // Map common MIME types to Speech-to-Text encoding types
  const mimeToEncoding = {
    'audio/wav': 'LINEAR16',
    'audio/x-wav': 'LINEAR16',
    'audio/wave': 'LINEAR16',
    'audio/flac': 'FLAC',
    'audio/x-flac': 'FLAC',
    'audio/mp3': 'MP3',
    'audio/mpeg': 'MP3',
    'audio/ogg': 'OGG_OPUS',
    'audio/webm': 'WEBM_OPUS'
  };
  
  // Return mapped encoding or default to LINEAR16
  const encoding = mimeToEncoding[mimeType] || 'LINEAR16';
  safeLog(`MIME type ${mimeType} mapped to encoding ${encoding}`);
  return encoding;
}

/**
 * Simulated transcription function for demo purposes
 * In production, this would use the real Google Cloud Speech-to-Text API
 */
async function transcribeAudioWithSpeechToText(audioData, mimeType, options = {}) {
  try {
    safeLog(`Processing audio chunk (${audioData.byteLength} bytes) with mime type: ${mimeType}`);
    safeLog(`Using settings: ${JSON.stringify(options)}`);
    
    // In a real implementation, this would call the Speech-to-Text API
    // For demo purposes, simulate a delay and return a placeholder response
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API delay
    
    // Generate a simulated response based on audio length
    const audioLengthSecs = audioData.byteLength / 16000 / 2; // Rough estimate
    
    let transcription;
    if (options.enableSpeakerDiarization) {
      // Simulate speaker diarization
      transcription = `\nSpeaker 1: This is a simulated transcription with speaker detection.\n\n` +
                     `Speaker 2: The audio file is approximately ${Math.round(audioLengthSecs)} seconds long.\n\n` +
                     `Speaker 1: In a production environment, this would use the actual Google Cloud Speech-to-Text API.`;
    } else {
      // Standard transcription
      transcription = "This is a simulated transcription. " +
                     `The audio file is approximately ${Math.round(audioLengthSecs)} seconds long. ` +
                     "In a production environment, this would use the actual Google Cloud Speech-to-Text API. " +
                     "To use the real API, you need to install the @google-cloud/speech package and set up Google Cloud credentials.";
    }
    
    safeLog(`Generated demo transcription (${transcription.length} chars)`);
    return transcription;
  } catch (error) {
    safeLog(`Error in transcription: ${error.message}`);
    console.error("Error:", error);
    throw error;
  }
}

/**
 * Extract audio from video using the browser's Web Audio API
 */
async function extractAudioFromVideo(videoFile, progressCallback) {
  return new Promise((resolve, reject) => {
    try {
      safeLog(`Extracting audio from video: ${videoFile.name}`);
      // For demo purposes, just return the original file after a delay
      setTimeout(() => {
        safeLog('Audio extraction complete (demo mode)');
        resolve(videoFile);
      }, 2000);
    } catch (error) {
      safeLog(`Error extracting audio: ${error.message}`);
      reject(error);
    }
  });
}

export { 
  transcribeAudioWithSpeechToText,
  extractAudioFromVideo,
  getAudioEncoding
};