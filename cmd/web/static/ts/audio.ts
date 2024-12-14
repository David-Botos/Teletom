// Types and Interfaces
interface ServerMessage {
    type: 'transcript' | 'error';
    text: string;
}

interface AudioState {
    socket: WebSocket | null;
    mediaRecorder: MediaRecorder | null;
    audioContext: AudioContext | null;
    recordingStream: MediaStream | null;
    processorNode: ScriptProcessorNode | null;
    sourceNode: MediaStreamAudioSourceNode | null;
}

// Logger utility
const Logger = {
    init: (message: string) => console.log(`🚀 Initializing: ${message}`),
    success: (message: string) => console.log(`✅ Success: ${message}`),
    error: (message: string) => console.log(`❌ Error: ${message}`),
    warning: (message: string) => console.log(`⚠️ Warning: ${message}`),
    info: (message: string) => console.log(`ℹ️ Info: ${message}`),
    audio: (message: string) => console.log(`🎤 Audio: ${message}`),
    websocket: (message: string) => console.log(`🔌 WebSocket: ${message}`),
    processing: (message: string) => console.log(`⚙️ Processing: ${message}`),
    transcript: (message: string) => console.log(`📝 Transcript: ${message}`),
    cleanup: (message: string) => console.log(`🧹 Cleanup: ${message}`)
};

// Initialize audio state
const audioState: AudioState = {
    socket: null,
    mediaRecorder: null,
    audioContext: null,
    recordingStream: null,
    processorNode: null,
    sourceNode: null
};

// WebSocket connection handler
function connectWebSocket(): void {
    const wsProtocol: string = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl: string = `${wsProtocol}//${window.location.host}/ws`;
    
    Logger.init('Starting WebSocket connection');
    audioState.socket = new WebSocket(wsUrl);
    
    audioState.socket.onopen = (): void => {
        Logger.success('WebSocket connected successfully');
        updateStatus('Connected to server');
    };
    
    audioState.socket.onclose = (): void => {
        Logger.warning('WebSocket disconnected - attempting to reconnect');
        updateStatus('Disconnected from server');
        setTimeout(connectWebSocket, 3000);
    };
    
    audioState.socket.onerror = (error: Event): void => {
        Logger.error(`WebSocket error: ${JSON.stringify(error)}`);
    };
    
    audioState.socket.onmessage = (event: MessageEvent): void => {
        try {
            const message: ServerMessage = JSON.parse(event.data);
            if (message.type === 'transcript') {
                Logger.transcript(`Received: ${message.text}`);
                updateConversation(message.text);
            } else if (message.type === 'error') {
                Logger.error(`Server error: ${message.text}`);
                updateStatus(`Error: ${message.text}`);
            }
        } catch (err) {
            Logger.error(`Failed to parse server message: ${err}`);
        }
    };
}

// Initialize audio recording
async function initializeAudio(): Promise<void> {
    try {
        Logger.init('Requesting microphone access');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioState.recordingStream = stream;
        Logger.success('Microphone access granted');
        
        audioState.audioContext = new AudioContext({
            sampleRate: 16000
        });
        
        audioState.sourceNode = audioState.audioContext.createMediaStreamSource(stream);
        audioState.processorNode = audioState.audioContext.createScriptProcessor(4096, 1, 1);
        
        Logger.audio('Setting up audio processing pipeline');
        
        // Convert to mono 16-bit PCM
        audioState.processorNode.onaudioprocess = (e: AudioProcessingEvent): void => {
            if (!audioState.mediaRecorder || audioState.mediaRecorder.state !== 'recording') return;
            
            const inputData = e.inputBuffer.getChannelData(0);
            const convertedBuffer = convertFloat32ToInt16(inputData);
            
            if (audioState.socket?.readyState === WebSocket.OPEN) {
                Logger.processing(`Sending audio chunk: ${convertedBuffer.byteLength} bytes`);
                audioState.socket.send(convertedBuffer);
            }
        };
        
        audioState.sourceNode.connect(audioState.processorNode);
        audioState.processorNode.connect(audioState.audioContext.destination);
        
        Logger.success('Audio pipeline initialized successfully');
        updateStatus('Audio initialized');
    } catch (err) {
        Logger.error(`Audio initialization failed: ${err}`);
        updateStatus(`Error initializing audio: ${err instanceof Error ? err.message : String(err)}`);
        throw err;
    }
}

// Convert Float32Array to Int16Array for proper encoding
function convertFloat32ToInt16(float32Array: Float32Array): ArrayBuffer {
    Logger.processing(`Converting audio format: ${float32Array.length} samples`);
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
        const s = Math.max(-1, Math.min(1, float32Array[i]));
        int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16Array.buffer;
}

// Update UI status
function updateStatus(message: string): void {
    const statusDiv = document.getElementById('status');
    if (statusDiv) {
        statusDiv.textContent = message;
        Logger.info(`Status updated: ${message}`);
    }
}

// Update conversation with transcription
function updateConversation(text: string): void {
    const conversationDiv = document.getElementById('conversation');
    if (conversationDiv) {
        const message = document.createElement('div');
        message.className = 'message';
        message.textContent = text;
        conversationDiv.appendChild(message);
        conversationDiv.scrollTop = conversationDiv.scrollHeight;
        Logger.transcript('Updated conversation with new message');
    }
}

// Cleanup function
function cleanup(): void {
    Logger.cleanup('Starting cleanup process');
    
    if (audioState.mediaRecorder?.state === 'recording') {
        audioState.mediaRecorder.stop();
        Logger.cleanup('Stopped media recorder');
    }
    
    if (audioState.processorNode && audioState.sourceNode) {
        audioState.processorNode.disconnect();
        audioState.sourceNode.disconnect();
        Logger.cleanup('Disconnected audio nodes');
    }
    
    if (audioState.recordingStream) {
        audioState.recordingStream.getTracks().forEach(track => {
            track.stop();
            Logger.cleanup(`Stopped audio track: ${track.kind}`);
        });
    }
    
    if (audioState.socket?.readyState === WebSocket.OPEN) {
        audioState.socket.close();
        Logger.cleanup('Closed WebSocket connection');
    }
    
    Logger.success('Cleanup completed successfully');
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    Logger.init('Initializing application');
    
    const startButton = document.getElementById('startRecording') as HTMLButtonElement;
    const stopButton = document.getElementById('stopRecording') as HTMLButtonElement;
    
    connectWebSocket();
    
    startButton?.addEventListener('click', async () => {
        try {
            Logger.audio('Starting recording session');
            if (!audioState.audioContext) {
                await initializeAudio();
            }
            
            startButton.disabled = true;
            stopButton.disabled = false;
            updateStatus('Recording...');
            
            if (audioState.recordingStream) {
                audioState.mediaRecorder = new MediaRecorder(audioState.recordingStream);
                audioState.mediaRecorder.start();
                Logger.success('Recording started successfully');
            }
        } catch (err) {
            Logger.error(`Failed to start recording: ${err}`);
            updateStatus(`Error starting recording: ${err instanceof Error ? err.message : String(err)}`);
            startButton.disabled = false;
            stopButton.disabled = true;
        }
    });
    
    stopButton?.addEventListener('click', () => {
        if (audioState.mediaRecorder?.state === 'recording') {
            audioState.mediaRecorder.stop();
            Logger.audio('Recording stopped by user');
        }
        
        startButton.disabled = false;
        stopButton.disabled = true;
        updateStatus('Recording stopped');
    });
    
    Logger.success('Application initialized successfully');
});

// Cleanup on page unload
window.addEventListener('beforeunload', cleanup);