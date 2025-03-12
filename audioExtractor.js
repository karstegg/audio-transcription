// Utility to extract audio from video files using browser APIs
export async function extractAudioFromVideo(videoFile, onProgress) {
  return new Promise((resolve, reject) => {
    const videoElement = document.createElement('video');
    videoElement.preload = 'metadata';
    
    // Set up audio context and nodes
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const destination = audioContext.createMediaStreamDestination();
    let audioRecorder = new MediaRecorder(destination.stream);
    const audioChunks = [];
    
    // Handle recording data
    audioRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };
    
    // Handle recording completion
    audioRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      // Copy the name property from the original file for better user experience
      Object.defineProperty(audioBlob, 'name', {
        value: videoFile.name.replace(/\.[^.]+$/, '.webm'),
        writable: false
      });
      resolve(audioBlob);
    };
    
    // Create video URL and set up event handlers
    const videoURL = URL.createObjectURL(videoFile);
    videoElement.src = videoURL;
    
    videoElement.onloadedmetadata = () => {
      // Connect audio processing nodes
      const source = audioContext.createMediaElementSource(videoElement);
      source.connect(destination);
      
      // Start recording
      audioRecorder.start();
      
      // Set playback rate higher for faster extraction
      videoElement.playbackRate = 4.0;
      videoElement.muted = true; // Don't play audio out loud
      
      // Track progress
      if (onProgress) {
        const duration = videoElement.duration;
        videoElement.ontimeupdate = () => {
          const progress = (videoElement.currentTime / duration) * 100;
          onProgress(Math.round(progress));
        };
      }
      
      // Start playing to extract audio
      videoElement.play();
    };
    
    // Handle video ended - stop recording
    videoElement.onended = () => {
      audioRecorder.stop();
      source.disconnect();
      audioContext.close();
      URL.revokeObjectURL(videoURL);
    };
    
    // Handle errors
    videoElement.onerror = (err) => {
      URL.revokeObjectURL(videoURL);
      reject(new Error(`Video loading error: ${err}`));
    };
  });
}