/**
 * Audio extraction functionality using Web Audio API
 */

/**
 * Extract audio from a video file using Web Audio API
 * @param {File} videoFile - The video file to extract audio from
 * @param {Function} progressCallback - Optional callback for progress updates
 * @returns {Promise<Blob>} - A promise that resolves to an audio blob
 */
async function extractAudioFromVideo(videoFile, progressCallback = null) {
  return new Promise((resolve, reject) => {
    try {
      // Create object URL for the video file
      const videoUrl = URL.createObjectURL(videoFile);
      
      // Create a video element to use as source
      const videoElement = document.createElement('video');
      videoElement.style.display = 'none';
      document.body.appendChild(videoElement);
      
      // Setup audio context
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      let source;
      let mediaRecorder;
      const chunks = [];
      
      // Configure video element
      videoElement.src = videoUrl;
      videoElement.muted = true; // Don't play audio out loud
      videoElement.playbackRate = 16; // Speed up processing (16x)
      
      // Process video when ready
      videoElement.onloadedmetadata = () => {
        console.log(`Video duration: ${videoElement.duration} seconds`);
        
        // Create audio source from video element
        source = audioContext.createMediaElementSource(videoElement);
        source.connect(audioContext.destination);
        
        // Set up MediaRecorder to capture the audio stream
        const audioStream = audioContext.createMediaStreamDestination();
        source.connect(audioStream);
        
        // Create MediaRecorder
        mediaRecorder = new MediaRecorder(audioStream.stream);
        
        // Handle data availability
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
          }
        };
        
        // Handle recording completion
        mediaRecorder.onstop = () => {
          // Create audio blob from chunks
          const audioBlob = new Blob(chunks, { type: 'audio/wav' });
          
          // Clean up resources
          URL.revokeObjectURL(videoUrl);
          videoElement.remove();
          
          // Return the audio blob
          resolve(audioBlob);
        };
        
        // Report progress during extraction
        if (progressCallback) {
          videoElement.ontimeupdate = () => {
            const progress = (videoElement.currentTime / videoElement.duration) * 100;
            progressCallback(progress);
          };
        }
        
        // Start recording and video playback
        mediaRecorder.start();
        videoElement.play();
        
        // Stop recording when video ends
        videoElement.onended = () => {
          mediaRecorder.stop();
          videoElement.pause();
        };
      };
      
      // Handle errors
      videoElement.onerror = (error) => {
        URL.revokeObjectURL(videoUrl);
        videoElement.remove();
        reject(new Error(`Error loading video: ${error.message}`));
      };
      
    } catch (error) {
      reject(new Error(`Error extracting audio: ${error.message}`));
    }
  });
}

/**
 * Split a file into smaller chunks for processing
 * @param {File} file - The file to chunk
 * @param {number} maxChunkSize - Maximum chunk size in bytes
 * @returns {Array<Blob>} - Array of file chunks
 */
function chunkFile(file, maxChunkSize) {
  const chunks = [];
  let start = 0;
  const fileSize = file.size;

  while (start < fileSize) {
    const end = Math.min(start + maxChunkSize, fileSize);
    const chunk = file.slice(start, end);
    
    // Preserve original file properties
    Object.defineProperties(chunk, {
      'name': { value: file.name },
      'type': { value: file.type }
    });
    
    chunks.push(chunk);
    start = end;
  }
  
  return chunks;
}

/**
 * Helper function to read file as ArrayBuffer
 * @param {File} file - The file to read
 * @returns {Promise<ArrayBuffer>} - A promise that resolves to the file's ArrayBuffer
 */
function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = event => resolve(event.target.result);
    reader.onerror = error => reject(error);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Get appropriate MIME type for audio/video files
 * @param {File} file - The file to get MIME type for
 * @returns {string} - The appropriate MIME type
 */
function getFileMimeType(file) {
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

/**
 * Format file size for display
 * @param {number} bytes - The file size in bytes
 * @returns {string} - Formatted file size string
 */
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' bytes';
  else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  else return (bytes / 1048576).toFixed(1) + ' MB';
}

export {
  extractAudioFromVideo,
  chunkFile,
  readFileAsArrayBuffer,
  getFileMimeType,
  formatFileSize
};