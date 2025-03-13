# Audio Transcription App with Video Support

## How It Works

1. When a video file is detected, audio is extracted using Web Audio API and MediaRecorder
2. The extraction happens at 16x speed to reduce processing time
3. The extracted audio is sent to Google Cloud Speech-to-Text API or Gemini API in chunks for transcription
4. Special handling ensures continuation between chunks for seamless transcriptions

## Technical Implementation

- Uses the browser's Web Audio API to connect a video element to a MediaRecorder
- Optimized memory usage by streaming directly without intermediate processing
- Real-time progress tracking during extraction
- Improved chunk handling with context-aware prompts for each chunk

## Why Audio Extraction?

The Gemini API has issues processing large video files due to container format requirements. The API works fine with the first chunk but fails on subsequent chunks with "invalid argument" errors. By extracting just the audio:

1. We eliminate video container format issues
2. We reduce file sizes significantly (audio is much smaller than video)
3. We ensure better transcription quality as Gemini focuses just on speech

## Performance Considerations

Audio extraction adds processing time but ensures much better reliability for large video files. For optimal performance:

- The extraction uses the maximum playback rate browsers support (16x)
- Progress indicators keep the user informed during extraction
- Memory usage is optimized with streaming extraction

## API Options

This application supports two API options for transcription:

1. **Google Cloud Speech-to-Text API**: Specialized for transcription with per-minute pricing
2. **Gemini API**: General-purpose AI with multimedia capabilities

You can switch between APIs in the UI based on your needs.

## Getting Started

1. Clone this repository
2. Run `npm install` to install dependencies
3. For Speech-to-Text API, set up Google Cloud credentials
4. Run `npm run dev` to start the development server
5. Upload an audio or video file and click "Transcribe"
