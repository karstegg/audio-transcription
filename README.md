# Audio Transcription App

A simple web application that uses Google's Gemini API to transcribe audio files.

## Features

- Upload and transcribe audio or video files
- Support for large files through file chunking
- Visual progress indicators
- Debug console for development and troubleshooting

## Getting Started

### Prerequisites

- Node.js 20 or higher
- Google Gemini API key ([Get one here](https://g.co/ai/idxGetGeminiKey))

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/audio-transcription-app.git
cd audio-transcription-app
```

2. Install dependencies:
```bash
npm install
```

3. Configure your API key:
   - Open `config.js`
   - Replace the placeholder API key with your own

4. Start the development server:
```bash
npm run dev
```

5. Open your browser and navigate to the URL shown in the terminal (usually http://localhost:5173)

## Project Structure

- `index.html` - Main HTML structure
- `main.js` - Core application logic
- `config.js` - Application configuration
- `style.css` - Styling
- `gemini-api-banner.js` - API key reminder functionality

## How it Works

1. User selects an audio or video file
2. The app checks the file size:
   - If under 30MB, processes directly
   - If over 30MB, splits into chunks for processing
3. Files are converted to base64 and sent to Gemini API
4. Transcription results are displayed to the user

## Key Components

### Chunking Process

Large files are split into chunks of 30MB or less to accommodate API limitations:

```javascript
function chunkFile(file) {
  const chunks = [];
  let start = 0;
  const fileSize = file.size;

  while (start < fileSize) {
    const end = Math.min(start + MAX_CHUNK_SIZE, fileSize);
    const chunk = file.slice(start, end);
    chunks.push(chunk);
    start = end;
  }
  
  return chunks;
}
```

### API Integration

The app uses the Gemini API to process audio files:

```javascript
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

// Generate content with audio data
const result = await model.generateContent({ contents });
```

## Security Notes

- For production, store your API key securely using environment variables
- Consider adding rate limiting and user authentication for public deployments

## Future Improvements

- Add support for direct recording from microphone
- Implement real-time transcription for streaming audio
- Add language selection for multilingual transcription
- Export transcriptions to various formats (TXT, SRT, etc.)
- Enhance error handling with retry mechanisms

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Google Gemini API for audio transcription capabilities
- Vite for the rapid development environment