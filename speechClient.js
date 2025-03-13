import { SpeechClient } from '@google-cloud/speech';
import Base64 from 'base64-js';
import CONFIG from './config.js';

// NOTE: In a production environment, you should use proper authentication
// For development, this will attempt to use application default credentials
// or environment variables (GOOGLE_APPLICATION_CREDENTIALS)
let speechClient;

try {
  // Initialize the Speech client (will use application default credentials)
  speechClient = new SpeechClient();
} catch (error) {
  console.error('Error initializing Speech-to-Text client:', error);
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
 * 
 * @param {ArrayBuffer} audioData - The audio data to transcribe
 * @param {string} mimeType - The MIME type of the audio
 * @param {Object} options - Additional options for transcription
 * @returns {Promise<string>} - A promise that resolves to the transcription text
 */
async function transcribeAudioWithSpeechToText(audioData, mimeType, options = {}) {
  try {
    if (!speechClient) {
      throw new Error('Speech-to-Text client not initialized');
    }

    // Convert audio data to base64
    const audioBase64 = Base64.fromByteArray(new Uint8Array(audioData));

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

    // Call the Speech-to-Text API
    const [response] = await speechClient.recognize(request);
    
    // Extract transcription from response
    if (!response.results || response.results.length === 0) {
      return "";
    }
    
    // If speaker diarization was requested, format accordingly
    if (options.enableSpeakerDiarization) {
      // Format with speaker labels
      let transcription = '';
      let currentSpeaker = null;
      
      response.results.forEach(result => {
        if (result.alternatives && result.alternatives.length > 0) {
          const alternative = result.alternatives[0];
          
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
      
      return transcription.trim();
    } else {
      // Standard transcription without speaker identification
      return response.results
        .map(result => result.alternatives[0].transcript)
        .join(' ');
    }
  } catch (error) {
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
  return videoFile;
}

export { 
  transcribeAudioWithSpeechToText,
  extractAudioFromVideo,
  getAudioEncoding
};