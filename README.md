# Audio Transcription App with Video Support

This branch adds improved video file handling with audio extraction for reliable transcription of large video files.

## Key Features

- Automatic audio extraction from video files using Web Audio API
- Optimized extraction with high-speed playback (16x) for faster processing
- Progress tracking during extraction
- Fallback to direct video processing if extraction fails
- Improved chunking with context-aware prompts for better chunk transitions
- Support for multiple video formats (MP4, MPEG, MOV, AVI, MKV)

## How It Works

1. When a video file is detected, audio is extracted using Web Audio API and MediaRecorder
2. The extraction happens at 16x speed to reduce processing time
3. The extracted audio is sent to Gemini API in chunks for transcription
4. Special prompts ensure continuation between chunks for seamless transcriptions

## Technical Implementation

- Uses the browser's Web Audio API to connect a video element to a MediaRecorder
- Optimized memory usage by streaming directly without intermediate processing
- Real-time progress tracking during extraction
- Improved chunk handling with context-aware prompts for each chunk

## Why Audio Extraction?

The Gemini API has issues processing multi-part video files due to container format requirements. The API works fine with the first chunk but fails on subsequent chunks with "invalid argument" errors. By extracting just the audio:

1. We eliminate video container format issues
2. We reduce file sizes significantly (audio is much smaller than video)
3. We ensure better transcription quality as Gemini focuses just on speech

## Performance Considerations

Audio extraction adds processing time but ensures much better reliability for large video files. For optimal performance:

- The extraction uses the maximum playback rate browsers support (16x)
- Progress indicators keep the user informed during extraction
- Memory usage is optimized by streaming directly to MediaRecorder