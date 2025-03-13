// Configuration for the Audio Transcription App

const CONFIG = {
  api: {
    gemini: {
      key: 'AIzaSyCd5lAwn55AhKGEPK2Fe8o4zUCfsiquQCo',
      model: 'gemini-1.5-flash'
    },
    speechToText: {
      // Speech-to-Text API configuration
      languageCode: 'en-US',
      enableAutomaticPunctuation: true,
      enableWordTimeOffsets: true,
      model: 'default' // Can be 'phone_call', 'video', 'default' or other models
    }
  },
  fileProcessing: {
    maxChunkSize: 15 * 1024 * 1024, // 15MB to account for base64 encoding increase
    useGeminiAPI: false, // Set to false to use Speech-to-Text
    useSpeechToTextAPI: true  // Set to true to use Speech-to-Text
  },
  debug: {
    enabled: true
  }
};

export default CONFIG;