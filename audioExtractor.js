/**
 * Audio extraction functionality using Web Audio API
 * This maintains compatibility with the existing approach described in the README
 */

/**
 * Extract audio from a video file using Web Audio API
 * @param {File} videoFile - The video file to extract audio from
 * @returns {Promise<Blob>} - A promise that resolves to an audio blob
 */
async function extractAudioFromVideo(videoFile) {
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

export { extractAudioFromVideo };