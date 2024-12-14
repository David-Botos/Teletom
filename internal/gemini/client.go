// internal/gemini/client.go
package gemini

import (
    "context"
    "encoding/json"
    "errors"
    "fmt"
    "log"
    "sync"
    "time"

    "github.com/gorilla/websocket"
)

// Client manages the WebSocket connection to Gemini
type Client struct {
    config     *Config
    conn       *websocket.Conn
    sendMu     sync.Mutex
    ctx        context.Context
    cancel     context.CancelFunc
    audioQueue chan *AudioChunk
	responsesChan chan *ServerResponse
}

// NewClient creates a new Gemini client with the provided configuration
func NewClient(config *Config) (*Client, error) {
    if config == nil {
        return nil, errors.New("config cannot be nil")
    }
    
    if config.APIKey == "" {
        return nil, errors.New("API key is required")
    }
    
    ctx, cancel := context.WithCancel(context.Background())
    
    return &Client{
        config:        config,
        ctx:           ctx,
        cancel:        cancel,
        audioQueue:    make(chan *AudioChunk, 100),
        responsesChan: make(chan *ServerResponse, 100),  // Add this line
    }, nil
}

// Connect establishes a WebSocket connection and initializes the session
func (c *Client) Connect() error {
    dialer := websocket.Dialer{
        HandshakeTimeout: 10 * time.Second,
    }
    
    conn, _, err := dialer.Dial(c.config.WebSocketURL, nil)
    if err != nil {
        return fmt.Errorf("failed to connect to Gemini: %w", err)
    }
    
    c.conn = conn
    
    // Send initial session configuration
    if err := c.sendSessionConfig(); err != nil {
        c.conn.Close()
        return fmt.Errorf("failed to send session config: %w", err)
    }
    
    go c.readPump()
    go c.processAudioQueue()
    
    return nil
}

// Close closes the WebSocket connection and stops all goroutines
func (c *Client) Close() error {
    c.cancel()
    if c.conn != nil {
        return c.conn.Close()
    }
    return nil
}

// SendAudio sends an audio chunk to Gemini
func (c *Client) SendAudio(chunk *AudioChunk) error {
    select {
    case c.audioQueue <- chunk:
        return nil
    default:
        return errors.New("audio queue is full")
    }
}

func (c *Client) sendSessionConfig() error {
    config := SessionConfig{
        Model:             c.config.Model,
        GenerationConfig:  c.config.Generation,
        SystemInstruction: "You are a helpful AI assistant engaging in natural conversation. Process audio input and respond appropriately.",
        Tools:            []interface{}{},
    }
    
    return c.sendJSON(StreamMessage{
        Type:    "BidiGenerateContentSetup",
        Content: config,
    })
}

func (c *Client) sendJSON(v interface{}) error {
    c.sendMu.Lock()
    defer c.sendMu.Unlock()
    
    return c.conn.WriteJSON(v)
}

func (c *Client) readPump() {
    defer func() {
        c.conn.Close()
    }()
    
    for {
        select {
        case <-c.ctx.Done():
            return
        default:
            messageType, message, err := c.conn.ReadMessage()
            if err != nil {
                log.Printf("Error reading message: %v", err)
                return
            }
            
            if messageType == websocket.BinaryMessage {
                // Handle audio response
                continue
            }
            
            var response ServerResponse
            if err := json.Unmarshal(message, &response); err != nil {
                log.Printf("Error unmarshaling response: %v", err)
                continue
            }
            
            // Process the response
            c.handleServerResponse(&response)
        }
    }
}

func (c *Client) processAudioQueue() {
    const maxBatchSize = 4096 // Adjust based on Gemini's requirements
    
    for {
        select {
        case <-c.ctx.Done():
            return
        case chunk := <-c.audioQueue:
            if err := c.sendAudioChunk(chunk); err != nil {
                log.Printf("Error sending audio chunk: %v", err)
            }
        }
    }
}

// ProcessAudio handles incoming audio data and sends it to Gemini
func (c *Client) ProcessAudio(data []byte) error {
    // Create an AudioChunk from the raw data
    chunk := &AudioChunk{
        Data:       data,
        SampleRate: c.config.InputSampleRate,
        Channels:   1,
        Format:     "LINEAR16",
    }
    
    // Send the chunk to the audio queue for processing
    return c.SendAudio(chunk)
}

func (c *Client) sendAudioChunk(chunk *AudioChunk) error {
    message := ClientMessage{
        RealTimeInput: &RealTimeAudioData{
            MediaChunks: [][]byte{chunk.Data},
        },
    }
    
    return c.sendJSON(StreamMessage{
        Type:    "BidiGenerateContentRealtimeInput",
        Content: message,
    })
}

func (c *Client) handleServerResponse(response *ServerResponse) {
    // Handle the response based on your application's needs
    // This could involve sending the response back to the client,
    // processing it further, etc.
    log.Printf("Received response: turn_complete=%v, interrupted=%v",
        response.TurnComplete, response.Interrupted)
}

func (c *Client) GetResponses() <-chan *ServerResponse {
    return c.responsesChan
}

var _ GeminiClient = (*Client)(nil)
