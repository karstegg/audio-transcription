// This file is maintained for compatibility but functionality is disabled
// Direct video processing is now used instead of audio extraction

export async function extractAudioFromVideo(videoFile, onProgress) {
  // Simply return the original file for direct processing
  if (onProgress) {
    onProgress(100);
  }
  return videoFile;
}