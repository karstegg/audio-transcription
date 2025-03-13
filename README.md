# Audio Transcription App with Dual API Support

This application transcribes audio and video files using either Google Cloud Speech-to-Text API (simulated for demo) or Google's Gemini API, with a focus on accurate transcription and seamless user experience.

## Features

- **Dual API Support**:
  - Google Cloud Speech-to-Text API (simulated for demo purposes)
  - Google Gemini API (for backward compatibility)

- **Advanced Audio Processing**:
  - Automatic audio extraction from video files
  - Optimized chunking for large files
  - Proper MIME type preservation

- **Speech Recognition Options**:
  - Multiple language support
  - Specialized models (default, phone call, video)
  - Speaker diarization (speaker identification)
  - Automatic punctuation

- **User-Friendly Interface**:
  - Real-time progress tracking
  - Debug console for troubleshooting
  - Media preview for both audio and video

## Demo Implementation Note

This demo version simulates the Speech-to-Text API for development and testing purposes. The actual implementation would require:

1. Installing the Google Cloud Speech-to-Text client library:
   ```
   npm install @google-cloud/speech
   ```

2. Setting up authentication:
   ```
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/service-account-key.json"
   ```

## How It Works

1. **File Upload**: Select any audio or video file for transcription
2. **API Selection**: Choose between Speech-to-Text or Gemini API
3. **Video Processing**: For video files, audio is extracted using Web Audio API at 16x speed
4. **Chunking**: Large files are automatically split into appropriate chunks
5. **Transcription**: Each chunk is sent to the selected API for processing
6. **Result**: A complete transcription is displayed with proper formatting

## Speech-to-Text vs. Gemini API

### Google Cloud Speech-to-Text API
- **Advantages**:
  - Purpose-built for speech recognition
  - Better accuracy for different accents and background noise
  - Speaker identification capabilities
  - Per-minute pricing model (typically more cost-effective)
  - Support for 120+ languages

### Gemini API
- **Advantages**:
  - Broader content understanding
  - Direct processing of media content
  - Simpler authentication (API key only)

## Getting Started

### Prerequisites

- Node.js and npm
- Google Cloud account for Speech-to-Text API (for production)
- Google AI Studio account for Gemini API

### Installation

1. Clone this repository
   ```
   git clone https://github.com/karstegg/audio-transcription.git
   cd audio-transcription
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Set up API credentials
   - For Gemini: Update the API key in config.js
   - For Speech-to-Text (production): Set up Google Cloud credentials

4. Run the development server
   ```
   npm run dev
   ```

## Configuration

All application settings can be found in `config.js`, including:
- API selection flags
- Speech recognition options
- File processing settings

## Technical Implementation

### Audio Extraction

Video files are processed using the Web Audio API and MediaRecorder:

```javascript
// Create audio source from video element
source = audioContext.createMediaElementSource(videoElement);

// Set up MediaRecorder to capture the audio stream
const audioStream = audioContext.createMediaStreamDestination();
source.connect(audioStream);

// Speed up processing
videoElement.playbackRate = 16; // 16x speed
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.