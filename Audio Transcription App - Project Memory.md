# Audio Transcription App - Project Memory

## Project Overview
A web application using Google's Gemini API to transcribe audio and video files. The app allows users to upload files, processes them (including chunking large files), and returns a text transcript with additional features like meeting summaries.

## Repository Structure
- GitHub: `karstegg/audio-transcription`
- Branches:
  - `main`: Original implementation
  - `improved-ui-and-functionality`: Enhanced core functionality
  - `feature-diarization`: Speaker identification feature
  - `feature-transcript-utilities`: Added utilities like copy, cancel, and summary

## Technical Implementation

### Core Components
1. **HTML/CSS**
   - Form interface for file upload
   - Audio player for previewing files
   - Transcription output display
   - Summary section with generation button
   - Toast notifications for user feedback
   - Debug console for troubleshooting

2. **JavaScript**
   - Gemini API integration via Google Generative AI client
   - File chunking for large files
   - Base64 encoding for API requests
   - Prompt engineering for better transcription quality
   - AbortController for cancellable requests
   - Clipboard API for copy functionality
   - Meeting summary generation

3. **Configuration**
   - Separated configuration into `config.js`
   - Adjustable chunk size settings
   - API key management

## Changes Timeline

### March 11, 2025
1. **Initial Analysis**
   - Identified inconsistent element IDs
   - Discovered file chunking issues with base64 encoding overhead
   - Found MIME type problems when chunking files

2. **UI Improvements**
   - Fixed element ID inconsistencies
   - Added visual loading indicators
   - Improved debug console output
   - Enhanced styling for better user experience

3. **Technical Fixes**
   - Reduced chunk size from 30MB to 15MB to account for base64 encoding
   - Added file type preservation for chunks
   - Fixed MIME type detection for both audio and video files
   - Added proper error handling during chunk processing
   - Enhanced prompting for verbatim transcription

4. **Feature Development**
   - Implemented speaker diarization in separate branch
   - Created toggle UI for enabling/disabling speaker identification
   - Used prompt engineering to make Gemini identify different speakers

5. **Transcript Utilities**
   - Added cancel/reset button to abort ongoing transcription
   - Implemented clipboard functionality for copying transcripts
   - Added meeting summary generation using Gemini
   - Added clipboard functionality for copying summaries
   - Implemented toast notifications for user feedback
   - Enhanced UI with improved button styling

## Key Technical Decisions

1. **File Size Handling**
   - **Problem**: Base64 encoding increases file size by 33-37%, causing API limits to be exceeded
   - **Solution**: Reduced effective chunk size to 15MB to ensure encoded size stays under 30MB limit
   - **Implementation**: Modified `chunkFile()` function and adjusted `CONFIG.fileProcessing.maxChunkSize`

2. **MIME Type Preservation**
   - **Problem**: File chunks lost MIME type information, causing API errors
   - **Solution**: Used `Object.defineProperty()` to preserve original file's type and name
   - **Implementation**: Enhanced `chunkFile()` function and added fallback MIME type detection

3. **Transcription Quality**
   - **Problem**: Gemini was summarizing/analyzing instead of providing verbatim transcription
   - **Solution**: Added explicit prompt instructions for verbatim transcription
   - **Implementation**: Modified API call to include directive for exact speech transcription

4. **Speaker Diarization**
   - **Problem**: No built-in speaker identification in Gemini API
   - **Solution**: Used prompt engineering approach to guide Gemini to identify speakers
   - **Implementation**: Created separate feature branch with toggle option

5. **Cancellable Requests**
   - **Problem**: No way to stop long-running transcription processes
   - **Solution**: Implemented AbortController to cancel ongoing API requests
   - **Implementation**: Added controller to fetch requests and cancel button handler

6. **Meeting Summary Generation**
   - **Problem**: Raw transcripts are difficult to quickly review
   - **Solution**: Added Gemini-powered summary generation for meeting transcripts
   - **Implementation**: Created summary prompt to extract key points, decisions, and actions

## Issues Addressed

1. ✅ **Base64 Size Issue**
   - Error: "Request payload size exceeds the limit: 31457280 bytes"
   - Solution: Reduced chunk size and improved chunking logic

2. ✅ **MIME Type Error**
   - Error: "Unable to submit request because it has an empty mimeType parameter in inlineData"
   - Solution: Added MIME type preservation and detection

3. ✅ **Transcription Quality**
   - Issue: Summaries instead of verbatim transcripts
   - Solution: Enhanced prompt with specific instructions

4. ✅ **Failed Chunks Handling**
   - Issue: One chunk failure would stop entire process
   - Solution: Added error handling to continue processing remaining chunks

5. ✅ **Long Processing Cancellation**
   - Issue: No way to cancel long-running transcription
   - Solution: Implemented AbortController and cancel button

6. ✅ **Meeting Review Workflow**
   - Issue: Difficult to quickly extract key information from transcripts
   - Solution: Added meeting summary feature with structured output

## Future Improvements
1. Export options (TXT, SRT)
2. Direct microphone recording
3. Language selection for multilingual transcription
4. Timestamp generation
5. Enhanced speaker identification
6. Integration with other speech-to-text APIs for comparison