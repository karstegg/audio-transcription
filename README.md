# Audio Transcription App - Direct Video Processing

This branch enhances the `feature-transcript-utilities` branch by restoring direct video transcription capability for large MPEG files without requiring audio extraction.

## Key Improvements

1. **Direct Video Processing**
   - Send video data directly to Gemini API without audio extraction
   - Properly preserve MIME types across file chunks
   - Support for large video files through optimized chunking
   - Added support for more video formats including MPEG

2. **Optimized Chunking**
   - Reduced effective chunk size (15MB) to account for base64 encoding overhead
   - Preserved file type and name properties during chunking
   - Added efficient error handling for failed chunks

3. **MIME Type Handling**
   - Enhanced MIME type detection and preservation
   - Properly informs Gemini API of file type
   - Expanded supported formats in configuration
   
4. **Better Debug Information**
   - Added detailed logging for MIME types and chunk processing
   - Improved error messages for troubleshooting

## Usage

The app handles both audio and video files with the same interface - just select a file and click "Transcribe". All utility features (copy, summary generation, etc.) work with both audio and video transcriptions.

## Implementation Details

- Modified `chunkFile()` to better preserve file metadata
- Enhanced MIME type handling in `getAudioMimeType()`
- Added proper file type reporting to the Gemini API
- Expanded supported formats in the configuration
- No extraction or preprocessing needed for video files
- Maintained all utility features from the original branch