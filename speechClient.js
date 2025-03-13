import { SpeechClient } from '@google-cloud/speech';
import Base64 from 'base64-js';
import CONFIG from './config.js';

// Log helper function that works even if the debug window isn't initialized yet
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

// NOTE: In a production environment, you should use proper authentication
// For development, this will attempt to use application default credentials
// or environment variables (GOOGLE_APPLICATION_CREDENTIALS)
let speechClient;

try {
  // Initialize the Speech client (will use application default credentials)
  speechClient = new SpeechClient();
  safeLog('Speech-to-Text client initialized successfully');
} catch (error) {
  console.error('Error initializing Speech-to-Text client:', error);
  safeLog(`Failed to initialize Speech-to-Text client: ${error.message}`);
}

/**
 * Determine audio encoding from MIME type
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
    'audio/webm': 'WEBM_OPUS',
    'audio/amr': 'AMR',
    'audio/amr-wb': 'AMR_WB'
  };
  
  // Return mapped encoding or default to LINEAR16
  const encoding = mimeToEncoding[mimeType] || 'LINEAR16';
  safeLog(`MIME type ${mimeType} mapped to encoding ${encoding}`);
  return encoding;
}

/**
 * Transcribe audio using Google Cloud Speech-to-Text API
 * 
 * @param {ArrayBuffer} audioData - The audio data to transcribe
 * @param {string} mimeType - The MIME type of the audio
 * @param {Object} options - Additional options for transcription
 * @returns {Promise<string>} - A promise that resolves to the transcription text
 */
async function transcribeAudioWithSpeechToText(audioData, mimeType, options = {}) {
  try {
    if (!speechClient) {
      const error = new Error('Speech-to-Text client not initialized');
      safeLog(error.message);
      throw error;
    }

    safeLog(`Processing audio chunk (${audioData.byteLength} bytes) with mime type: ${mimeType}`);
    
    // Convert audio data to base64
    const audioBase64 = Base64.fromByteArray(new Uint8Array(audioData));
    safeLog(`Converted to base64 (${audioBase64.length} characters)`);

    // Merge default settings with provided options
    const settings = {
      languageCode: options.languageCode || CONFIG.speechToText.languageCode,
      enableAutomaticPunctuation: options.enableAutomaticPunctuation !== undefined ? 
        options.enableAutomaticPunctuation : CONFIG.speechToText.enableAutomaticPunctuation,
      enableWordTimeOffsets: options.enableWordTimeOffsets !== undefined ? 
        options.enableWordTimeOffsets : CONFIG.speechToText.enableWordTimeOffsets,
      model: options.model || CONFIG.speechToText.model,
      sampleRateHertz: options.sampleRateHertz || CONFIG.speechToText.sampleRateHertz
    };
    
    safeLog(`Using settings: ${JSON.stringify(settings)}`);

    // Configure the request
    const request = {
      audio: {
        content: audioBase64,
      },
      config: {
        encoding: getAudioEncoding(mimeType),
        sampleRateHertz: settings.sampleRateHertz,
        languageCode: settings.languageCode,
        enableAutomaticPunctuation: settings.enableAutomaticPunctuation,
        enableWordTimeOffsets: settings.enableWordTimeOffsets,
        model: settings.model,
        // Include any speaker diarization settings if requested
        ...(options.enableSpeakerDiarization && {
          enableSpeakerDiarization: true,
          diarizationSpeakerCount: options.speakerCount || 2,
        })
      },
    };
    
    safeLog('Sending request to Speech-to-Text API...');

    // Call the Speech-to-Text API
    const [response] = await speechClient.recognize(request);
    safeLog('Received response from Speech-to-Text API');
    
    // Extract transcription from response
    if (!response.results || response.results.length === 0) {
      safeLog('No transcription results received');
      return "";
    }
    
    // Log the number of results received
    safeLog(`Received ${response.results.length} result segments`);
    
    // If speaker diarization was requested, format accordingly
    if (options.enableSpeakerDiarization) {
      // Format with speaker labels
      let transcription = '';
      let currentSpeaker = null;
      
      response.results.forEach((result, index) => {
        if (result.alternatives && result.alternatives.length > 0) {
          const alternative = result.alternatives[0];
          safeLog(`Result ${index + 1}: ${alternative.transcript.substring(0, 50)}...`);
          
          // Process words with speaker tags
          if (alternative.words && alternative.words.length > 0) {
            alternative.words.forEach(wordInfo => {
              const speakerTag = wordInfo.speakerTag || 1;
              
              if (currentSpeaker !== speakerTag) {
                transcription += `\n\nSpeaker ${speakerTag}: `;
                currentSpeaker = speakerTag;
              }
              
              transcription += `${wordInfo.word} `;
            });
          } else {
            // If no word-level speaker info, just add the transcript
            transcription += alternative.transcript;
          }
        }
      });
      
      safeLog(`Generated speaker-aware transcription (${transcription.length} chars)`);
      return transcription.trim();
    } else {
      // Standard transcription without speaker identification
      const transcription = response.results
        .map(result => result.alternatives[0].transcript)
        .join(' ');
      
      safeLog(`Generated transcription (${transcription.length} chars)`);
      return transcription;
    }
  } catch (error) {
    safeLog(`Error in Speech-to-Text API: ${error.message}`);
    console.error("Error in Speech-to-Text API:", error);
    throw error;
  }
}

/**
 * Helper function for extracting audio from video in the browser
 * This would be a placeholder for a future implementation
 */
async function extractAudioFromVideo(videoFile) {
  // In a real implementation, this would use Web Audio API or similar
  // For now, we'll just pass the video file directly
  safeLog(`Audio extraction from video would be handled here: ${videoFile.name}`);
  return videoFile;
}

export { 
  transcribeAudioWithSpeechToText,
  extractAudioFromVideo,
  getAudioEncoding
};