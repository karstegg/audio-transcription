import Base64 from 'base64-js';
import { GoogleGenerativeAI } from "@google/generative-ai";
import CONFIG from './config.js';
import { transcribeWithSpeechToText } from './speechClient.js';

// Initialize Gemini API client (kept for backward compatibility)
const genAI = new GoogleGenerativeAI(CONFIG.api.gemini.key);

/**
 * Split audio file into smaller chunks to handle large files
 */
function chunkFile(audioFile) {
  console.log('chunkFile function called');
  const chunks = [];
  let start = 0;
  const fileSize = audioFile.size;

  while (start < fileSize) {
    const end = Math.min(start + CONFIG.fileProcessing.maxChunkSize, fileSize);
    const chunk = audioFile.slice(start, end);
    
    // Preserve original file properties
    Object.defineProperties(chunk, {
      'name': { value: audioFile.name },
      'type': { value: audioFile.type }
    });
    
    chunks.push(chunk);
    console.log(`Chunk created: ${start} to ${end} bytes`);
    start = end;
  }
  
  return chunks;
}

/**
 * Read file as ArrayBuffer
 */
function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target.result);
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Transcribe audio using Gemini API (legacy method)
 */
async function transcribeWithGemini(audioChunk) {
  try {
    const model = genAI.getGenerativeModel({
      model: CONFIG.api.gemini.model,
    });
    
    // Convert audio to base64
    const audioData = await readFileAsArrayBuffer(audioChunk);
    const audioBase64 = Base64.fromByteArray(new Uint8Array(audioData));
    
    // Create content with instructions for verbatim transcription
    const contents = [
      {
        role: 'user',
        parts: [
          { text: "Please provide a verbatim transcription of this audio. Include all spoken words exactly as heard without summarizing or paraphrasing." },
          { inline_data: { mime_type: audioChunk.type, data: audioBase64 } }
        ]
      }
    ];
    
    // Call Gemini API
    const result = await model.generateContent({ contents });
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error("Error in transcribeWithGemini:", error);
    throw error;
  }
}

/**
 * Extract audio from video using Web Audio API
 * This preserves the existing implementation approach
 */
async function extractAudioFromVideo(videoFile) {
  // This is a placeholder - the actual implementation would use
  // Web Audio API and MediaRecorder as mentioned in the README
  // The functionality should be implemented based on the existing code
  console.log("Audio extraction from video would happen here");
  return videoFile; // For now, just return the file
}

/**
 * Process audio file with selected API
 */
async function processAudioChunk(chunk, useSTT = true) {
  try {
    if (useSTT) {
      // Use Speech-to-Text API
      const audioData = await readFileAsArrayBuffer(chunk);
      return await transcribeWithSpeechToText(audioData, chunk.type);
    } else {
      // Use Gemini API
      return await transcribeWithGemini(chunk);
    }
  } catch (error) {
    console.error("Error processing audio chunk:", error);
    throw error;
  }
}

export { 
  chunkFile, 
  readFileAsArrayBuffer, 
  transcribeWithGemini, 
  extractAudioFromVideo,
  processAudioChunk 
};