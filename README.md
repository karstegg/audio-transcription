# Original Working Video Transcription

This branch contains the original implementation from commit [79cc2c4](https://github.com/karstegg/audio-transcription/commit/79cc2c4a9f177d7af299595af74a1bba2fb0dd7f) ("Fix transcription quality and chunk reliability") that correctly handled video transcription without requiring audio extraction.

## Key Features

- **Direct Video Processing**: Processes video files without extracting audio
- **MIME Type Preservation**: Properly preserves MIME types across file chunks using `Object.defineProperty()`
- **Optimized Chunk Size**: Uses a 15MB effective chunk size to account for base64 encoding overhead
- **Verbatim Transcription**: Configures the Gemini API to focus on exact speech transcription

## How It Works

The implementation handles video files directly by:

1. Preserving the original video file MIME type in each chunk:
   ```javascript
   Object.defineProperty(chunk, 'type', {
     value: file.type,
     writable: false
   });
   ```

2. Using a smaller chunk size to account for base64 encoding:
   ```javascript
   const effectiveChunkSize = 15 * 1024 * 1024; // 15MB instead of 22MB
   ```

3. Sending the video data directly to the Gemini API with the correct MIME type:
   ```javascript
   const mimeType = getAudioMimeType(file);
   // ...
   inline_data: { 
     mime_type: mimeType, 
     data: base64Data 
   }
   ```

This version successfully processes MP3 and video files without requiring audio extraction, making it faster and more efficient for single-chunk videos.

Note: Multi-chunk videos may encounter errors with the Gemini API due to video container format requirements.