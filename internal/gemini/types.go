// internal/gemini/types.go
package gemini

import (
	"context"
	"sync"

	"github.com/gorilla/websocket"
)

// =====================
// Client Interface
// =====================

// GeminiClient defines the interface for interacting with the Gemini API
// Primary usage: client.go, session.go
type GeminiClient interface {
	Connect() error
	Close() error
	ProcessAudio(data []byte) error
	GetResponses() <-chan *ServerResponse
}

// =====================
// WebSocket Communication Types
// Primary usage: client.go
// =====================

// StreamMessage represents the base message structure for WebSocket communication
type StreamMessage struct {
	Type    string      `json:"type"`
	Content interface{} `json:"content"`
}

// ClientMessage represents messages sent from client to Gemini
type ClientMessage struct {
	ClientContent *ContentMessage    `json:"client_content,omitempty"`
	RealTimeInput *RealTimeAudioData `json:"realtime_input,omitempty"`
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

// =====================
// Conversation Types
// Primary usage: session.go
// =====================

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

// Content represents the model's generated content
type Content struct {
	Parts []Part `json:"parts"`
	Role  string `json:"role"`
}

// =====================
// Audio Processing Types 
// Primary usage: audio.go
// =====================

// AudioFormat defines supported audio encoding formats
type AudioFormat string

const (
	// AudioFormatLinear16 represents 16-bit PCM audio format
	AudioFormatLinear16 AudioFormat = "LINEAR16"
)

// AudioConfig holds audio processing configuration
type AudioConfig struct {
	Format         AudioFormat `json:"encoding"`
	SampleRate     int         `json:"sample_rate_hertz"`
	Channels       int         `json:"channels"`
	BytesPerSample int         `json:"bytes_per_sample"`
	BufferSize     int         `json:"buffer_size"`
}

// AudioChunk represents a single chunk of audio data with metadata
type AudioChunk struct {
	Data       []byte
	SampleRate int
	Channels   int
	Format     string
}

// =====================
// Configuration Types
// Primary usage: config.go
// =====================

// Config holds all configuration for the Gemini client
type Config struct {
	APIKey           string
	WebSocketURL     string
	InputSampleRate  int
	OutputSampleRate int
	AudioBuffer      int
	Model            string
	Generation       GenerationConfig
	Audio            AudioConfig
}

// GenerationConfig contains all configurable parameters for the Gemini model
type GenerationConfig struct {
	CandidateCount   int     `json:"candidate_count"`
	MaxOutputTokens  int     `json:"max_output_tokens"`
	Temperature      float64 `json:"temperature"`
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

// SessionConfig represents the initial session configuration for Gemini
type SessionConfig struct {
	Model             string           `json:"model"`
	GenerationConfig  GenerationConfig `json:"generation_config"`
	SystemInstruction string           `json:"system_instruction"`
	Tools             []interface{}    `json:"tools"`
}

// =====================
// Core Implementation Types
// =====================

// Session represents a single conversation session with Gemini
// Primary usage: session.go
type Session struct {
	ID            string
	client        GeminiClient
	audioProc     *AudioProcessor
	context       context.Context
	cancel        context.CancelFunc
	responsesChan chan *ServerResponse
	errorsChan    chan error
	mu            sync.RWMutex
	turns         []Turn
	isActive      bool
}

// SessionOption allows for optional session configuration
type SessionOption func(*Session)

// Client manages the WebSocket connection to Gemini
// Primary usage: client.go
type Client struct {
	config        *Config
	conn          *websocket.Conn
	sendMu        sync.Mutex
	ctx           context.Context
	cancel        context.CancelFunc
	audioQueue    chan *AudioChunk
	responsesChan chan *ServerResponse
}