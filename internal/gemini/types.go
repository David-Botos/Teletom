// internal/gemini/types.go
package gemini

// Add to internal/gemini/types.go
type GeminiClient interface {
    Connect() error
    Close() error
    ProcessAudio(data []byte) error
    GetResponses() <-chan *ServerResponse
}

// StreamMessage represents the base message structure for WebSocket communication
type StreamMessage struct {
    Type    string      `json:"type"`
    Content interface{} `json:"content"`
}

// SessionConfig represents the initial session configuration for Gemini
type SessionConfig struct {
    Model             string            `json:"model"`
    GenerationConfig  GenerationConfig  `json:"generation_config"`
    SystemInstruction string            `json:"system_instruction"`
    Tools            []interface{}      `json:"tools"`
}

// GenerationConfig contains all configurable parameters for the Gemini model
type GenerationConfig struct {
    CandidateCount    int     `json:"candidate_count"`
    MaxOutputTokens   int     `json:"max_output_tokens"`
    Temperature       float64 `json:"temperature"`
    TopP             float64 `json:"top_p"`
    TopK             int     `json:"top_k"`
    PresencePenalty  float64 `json:"presence_penalty"`
    FrequencyPenalty float64 `json:"frequency_penalty"`
    ResponseModality string  `json:"response_modalities"`
    SpeechConfig     struct {
        SampleRateHertz int    `json:"sample_rate_hertz"`
        Encoding        string `json:"encoding"`
    } `json:"speech_config"`
}

// AudioChunk represents a single chunk of audio data with metadata
type AudioChunk struct {
    Data       []byte
    SampleRate int
    Channels   int
    Format     string
}

// ClientMessage represents messages sent from client to Gemini
type ClientMessage struct {
    ClientContent *ContentMessage     `json:"client_content,omitempty"`
    RealTimeInput *RealTimeAudioData `json:"realtime_input,omitempty"`
}

// ContentMessage represents a conversation turn
type ContentMessage struct {
    Turns        []Turn `json:"turns"`
    TurnComplete bool   `json:"turn_complete"`
}

// Turn represents a single conversation exchange
type Turn struct {
    Parts []Part `json:"parts"`
    Role  string `json:"role"`
}

// Part represents a piece of content in a turn
type Part struct {
    Text  string `json:"text,omitempty"`
    Audio []byte `json:"audio,omitempty"`
}

// RealTimeAudioData represents streaming audio input
type RealTimeAudioData struct {
    MediaChunks [][]byte `json:"media_chunks"`
}

// ServerResponse represents responses from the Gemini server
type ServerResponse struct {
    TurnComplete bool    `json:"turn_complete"`
    Interrupted  bool    `json:"interrupted"`
    ModelTurn    Content `json:"model_turn"`
}

// Content represents the model's generated content
type Content struct {
    Parts []Part `json:"parts"`
    Role  string `json:"role"`
}