// Configuration settings for the application
// In a production environment, this would be loaded from environment variables
// or a secure configuration service

const CONFIG = {
  // Gemini API settings
  gemini: {
    apiKey: 'AIzaSyCd5lAwn55AhKGEPK2Fe8o4zUCfsiquQCo', // Replace with your API key
    model: 'gemini-1.5-flash',
    maxTokens: 1024,
  },
  
  // File processing settings
  fileProcessing: {
    // Adjusted to account for base64 encoding overhead (about 33-37% increase)
    maxChunkSize: 22 * 1024 * 1024, // ~22MB (will be ~30MB after base64 encoding)
    supportedAudioFormats: ['audio/mp3', 'audio/wav', 'audio/mpeg', 'audio/ogg', 'audio/webm'],
    supportedVideoFormats: ['video/mp4', 'video/webm', 'video/ogg'],
  },
  
  // App settings
  app: {
    version: '1.0.0',
    debug: true, // Set to false in production
  }
};

export default CONFIG;