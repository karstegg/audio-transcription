import Base64 from 'base64-js';
import CONFIG from './config.js';
import { chunkFile, extractAudioFromVideo, processAudioChunk } from './audioProcessor.js';

function logToDebugWindow(message) {
  const debugWindow = document.getElementById('debugWindow');
  if (debugWindow) {
    debugWindow.innerHTML += message + '<br>';
  }
  console.log(message);
}

// Setup UI event listeners
document.addEventListener('DOMContentLoaded', () => {
  // Setup debug window
  const toggleDebugButton = document.getElementById('toggleDebugButton');
  const debugWindow = document.getElementById('debugWindow');
  
  if (toggleDebugButton && debugWindow) {
    toggleDebugButton.addEventListener('click', () => {
      debugWindow.style.display = debugWindow.style.display === 'none' ? 'block' : 'none';
    });
  }
  
  // Setup transcribe button
  const transcribeButton = document.querySelector('#transcribeButton');
  if (transcribeButton) {
    transcribeButton.addEventListener('click', () => {
      logToDebugWindow('handleAudioTranscription function called');
      handleAudioTranscription();
    });
  }
  
  // Setup file input preview
  const audioFileInput = document.getElementById('audioFileInput');
  const audioPlayer = document.getElementById('audioPlayer');
  const videoPlayer = document.getElementById('videoPlayer');
  
  if (audioFileInput && (audioPlayer || videoPlayer)) {
    audioFileInput.addEventListener('change', (event) => {
      if (event.target.files && event.target.files.length > 0) {
        const file = event.target.files[0];
        const isVideo = file.type.startsWith('video/');
        
        // Show appropriate player
        if (audioPlayer) audioPlayer.style.display = isVideo ? 'none' : 'block';
        if (videoPlayer) videoPlayer.style.display = isVideo ? 'block' : 'none';
        
        // Set source
        const objectUrl = URL.createObjectURL(file);
        if (isVideo && videoPlayer) {
          videoPlayer.src = objectUrl;
        } else if (audioPlayer) {
          audioPlayer.src = objectUrl;
        }
      }
    });
  }
  
  logToDebugWindow('Script loaded');
});

/**
 * Handle audio transcription using the selected API
 */
async function handleAudioTranscription() {
  logToDebugWindow('handleAudioTranscription function called');
  
  try {
    const audioFileInput = document.getElementById('audioFileInput');
    const transcriptionOutput = document.getElementById('transcriptionOutput');
    const apiSelect = document.getElementById('apiSelect'); // Optional: UI for API selection
    
    // Validate file selection
    if (!audioFileInput.files || audioFileInput.files.length === 0) {
      if (transcriptionOutput) {
        transcriptionOutput.textContent = 'Please select an audio or video file.';
      }
      return;
    }

    // Get file and determine if it's video
    const file = audioFileInput.files[0];
    const isVideo = file.type.startsWith('video/');
    logToDebugWindow(`Processing ${isVideo ? 'video' : 'audio'} file: ${file.name}, type: ${file.type}, size: ${file.size} bytes`);
    
    // Update UI with processing status
    if (transcriptionOutput) {
      transcriptionOutput.textContent = isVideo ? 'Extracting audio from video...' : 'Processing audio...';
    }
    
    // Extract audio if it's a video file
    let audioFile = file;
    if (isVideo) {
      logToDebugWindow('Extracting audio from video');
      audioFile = await extractAudioFromVideo(file);
    }
    
    // Determine which API to use
    const useSTT = apiSelect ? 
      apiSelect.value === 'speechToText' : 
      CONFIG.fileProcessing.useSpeechToTextAPI;
    
    logToDebugWindow(`Using ${useSTT ? 'Speech-to-Text' : 'Gemini'} API`);
    
    let fullTranscription = '';
    
    // Process in chunks if necessary
    if (audioFile.size > CONFIG.fileProcessing.maxChunkSize) {
      logToDebugWindow("File is too big, processing in chunks");
      const chunks = chunkFile(audioFile);
      
      for (let i = 0; i < chunks.length; i++) {
        if (transcriptionOutput) {
          transcriptionOutput.textContent = `Processing chunk ${i + 1} of ${chunks.length}...`;
        }
        
        try {
          const chunkTranscription = await processAudioChunk(chunks[i], useSTT);
          fullTranscription += chunkTranscription + ' ';
          logToDebugWindow(`Chunk ${i + 1} processed successfully`);
        } catch (error) {
          logToDebugWindow(`Error processing chunk ${i + 1}: ${error.message}`);
          fullTranscription += `[Error processing chunk ${i + 1}] `;
        }
      }
    } else {
      logToDebugWindow("Processing file in one go");
      fullTranscription = await processAudioChunk(audioFile, useSTT);
    }
    
    // Update UI with final transcription
    if (transcriptionOutput) {
      transcriptionOutput.textContent = fullTranscription || 'No transcription generated';
    }
    
    logToDebugWindow("Processing complete");
  } catch (error) {
    console.error("Error during audio transcription:", error);
    
    const transcriptionOutput = document.getElementById('transcriptionOutput');
    if (transcriptionOutput) {
      transcriptionOutput.textContent = `Error: ${error.message}`;
    }
    
    logToDebugWindow(`Error: ${error.message}`);
  }
}
