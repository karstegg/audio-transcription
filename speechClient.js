import { SpeechClient } from '@google-cloud/speech';
import Base64 from 'base64-js';
import CONFIG from './config.js';

// NOTE: In a production environment, you should use proper authentication
// This is a simplified client for demonstration purposes
// For real deployment, use service account keys or application default credentials
let speechClient;

try {
  speechClient = new SpeechClient();
} catch (error) {
  console.error('Error initializing Speech client:', error);
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
  return mimeToEncoding[mimeType] || 'LINEAR16';
}

/**
 * Transcribe audio using Google Cloud Speech-to-Text API
 */
async function transcribeWithSpeechToText(audioData, mimeType) {
  try {
    // Convert audio to base64
    const audioBase64 = Base64.fromByteArray(new Uint8Array(audioData));

    // Configure request based on app settings
    const request = {
      audio: {
        content: audioBase64,
      },
      config: {
        encoding: getAudioEncoding(mimeType),
        sampleRateHertz: 16000,  // Default, can be detected dynamically if needed
        languageCode: CONFIG.api.speechToText.languageCode,
        enableAutomaticPunctuation: CONFIG.api.speechToText.enableAutomaticPunctuation,
        enableWordTimeOffsets: CONFIG.api.speechToText.enableWordTimeOffsets,
        model: CONFIG.api.speechToText.model
      },
    };

    // Call Speech-to-Text API
    const [response] = await speechClient.recognize(request);
    
    // Extract transcription from response
    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join('\n');
    
    return transcription;
  } catch (error) {
    console.error("Error in transcribeWithSpeechToText:", error);
    throw error;
  }
}

export { transcribeWithSpeechToText };