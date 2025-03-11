import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "@google/generative-ai";
import Base64 from 'base64-js';
import MarkdownIt from 'markdown-it';
import { maybeShowApiKeyBanner } from './gemini-api-banner'; 

const MAX_CHUNK_SIZE = 30 * 1024 * 1024; // 30MB

function logToDebugWindow(message) {
  const debugWindow = document.getElementById('debugWindow');
  debugWindow.innerHTML += message + '<br>';
}

const toggleDebugButton = document.getElementById('toggleDebugButton');
const debugWindow = document.getElementById('debugWindow');

toggleDebugButton.addEventListener('click', () => {
  if (debugWindow.style.display === 'none') {
    debugWindow.style.display = 'block';
  } else {
    debugWindow.style.display = 'none';
  }
});

logToDebugWindow('Script loaded');

function chunkFile(audioFile) {
  logToDebugWindow('chunkFile function called');
  const chunks = [];
  let start = 0;
  const fileSize = audioFile.size;

  while (start < fileSize) {
    const end = Math.min(start + MAX_CHUNK_SIZE, fileSize);
    const chunk = audioFile.slice(start, end);
    chunks.push(chunk);
    logToDebugWindow('Chunk created');
    start = end;
  }
  return chunks;
}




async function handleAudioTranscription() {  
  logToDebugWindow('handleAudioTranscription function called');
  try {
    const audioFileInput = document.getElementById('audioFileInput');
    const transcriptionOutput = document.getElementById('transcriptionOutput');
    if (!audioFileInput.files || audioFileInput.files.length === 0) {
      transcriptionOutput.textContent = 'Please select an audio file.';
      return;
    }

    let fullTranscription = '';
    const audioFile = audioFileInput.files[0];    
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
    });
    const prepareData = async (file) => {
      const fileReader = new FileReader();
      const audioData = await new Promise((resolve) => {
          fileReader.onload = (event) => resolve(event.target.result);
          fileReader.readAsArrayBuffer(file);
      });

      const audioBase64 = Base64.fromByteArray(new Uint8Array(audioData));
      const contents = [
        {
          role: 'user',
          parts: [{ inline_data: { mime_type: audioFile.type, data: audioBase64 } }]
        }
      ];
      const result = await model.generateContent({ contents });
      const response = result.response;
      return response.text();   
    }
    
    
    const processChunk = async (chunk, chunkNumber) => {
      try{
        logToDebugWindow('Model called for chunk ' + chunkNumber);
        const chunkTranscription = await prepareData(chunk);
        fullTranscription += chunkTranscription;
        logToDebugWindow('Model content generated for chunk ' + chunkNumber);
      }catch(error){
        logToDebugWindow('Error generating model content: '+ error.message);
        
      }
    };
    
    if (audioFile.size > MAX_CHUNK_SIZE) {
        logToDebugWindow("File is too big, processing chunks now");
        
    }else{
        await prepareData() 
    }
    if (audioFile.size > MAX_CHUNK_SIZE) {
      const chunks = chunkFile(audioFile);
      for (let i = 0; i < chunks.length; i++) {
        transcriptionOutput.textContent = 'Processing chunk ' + (i + 1) + ' of ' + chunks.length + '...';
        logToDebugWindow('Preparing chunk '+i);
        if (!audioFile) {
          logToDebugWindow('Error: No file selected');
          transcriptionOutput.textContent = "No file selected";
        }
        await processChunk(chunks[i], i + 1);
      }
      transcriptionOutput.textContent = fullTranscription;
      logToDebugWindow("All chunks processed");
    }else{
      transcriptionOutput.textContent = await prepareData();
    }
         
  } catch (error) {
    console.error("Error during audio transcription:", error);
    const transcriptionOutput = document.getElementById('transcriptionOutput');
    if(transcriptionOutput){
      transcriptionOutput.textContent = error.message;
    }
    
    logToDebugWindow('Error: '+ error.message);
  }
}

const transcribeButton = document.querySelector('#transcribeButton');
transcribeButton.addEventListener('click', () => {
  logToDebugWindow('handleAudioTranscription function called');
  handleAudioTranscription();
});


// 🔥🔥 FILL THIS OUT FIRST! 🔥🔥
// Get your Gemini API key by:
// - Selecting "Add Gemini API" in the "Project IDX" panel in the sidebar
// - Or by visiting https://g.co/ai/idxGetGeminiKey
let API_KEY = 'AIzaSyCd5lAwn55AhKGEPK2Fe8o4zUCfsiquQCo';


let form = document.querySelector('form');
let promptInput = document.querySelector('input[name="prompt"]');
let output = document.querySelector('.output');

form.onsubmit = async (ev) => {
  ev.preventDefault();
  output.textContent = 'Generating...';

  try {
    // Load the image as a base64 string
    let imageUrl = form.elements.namedItem('chosen-image').value;
    let imageBase64 = await fetch(imageUrl)
      .then(r => r.arrayBuffer())
      .then(a => Base64.fromByteArray(new Uint8Array(a)));

    // Assemble the prompt by combining the text with the chosen image
    let contents = [
      {
        role: 'user',
        parts: [
          { inline_data: { mime_type: 'image/jpeg', data: imageBase64, } },
          { text: promptInput.value }
        ]
      }
    ];

    // Call the multimodal model, and get a stream of results
  } catch (e) {
    output.innerHTML += '<hr>' + e;
  }
};

// You can delete this once you've filled out an API key

maybeShowApiKeyBanner(API_KEY);
