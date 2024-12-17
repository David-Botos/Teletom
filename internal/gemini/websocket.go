package gemini

import (
    "encoding/binary"
    "fmt"
    "net/http"
    "sync"
    "github.com/David-Botos/BearHug/internal/logger"
    "github.com/gorilla/websocket"
)

var geminiLogger = logger.NewLogger("WebSocket")

var upgrader = websocket.Upgrader{
    ReadBufferSize:  1024,
    WriteBufferSize: 1024,
    CheckOrigin: func(r *http.Request) bool {
        return true
    },
}

// Client represents a WebSocket client connection
type Client struct {
    conn *websocket.Conn
    mu   sync.Mutex // Protect concurrent writes to websocket
    done chan struct{} // Signal to stop goroutines
}

// NewClient creates a new WebSocket client
func NewClient(conn *websocket.Conn) *Client {
    return &Client{
        conn: conn,
        done: make(chan struct{}),
    }
}

// sendResponse sends a response back to the client
func (c *Client) sendResponse(response string) error {
    c.mu.Lock()
    defer c.mu.Unlock()
    
    message := map[string]interface{}{
        "type": "response",
        "text": response,
    }
    
    return c.conn.WriteJSON(message)
}

// processAudioData handles incoming audio data and streams to Gemini API
func (c *Client) processAudioData(data []byte) error {
    // Convert incoming Int16 PCM data to float32
    samples := make([]float32, len(data)/2)
    for i := 0; i < len(data); i += 2 {
        sample := float32(int16(binary.LittleEndian.Uint16(data[i:]))) / 32768.0
        samples[i/2] = sample
    }
    
    geminiLogger.Audio(fmt.Sprintf("Converted %d samples", len(samples)))
    
    // TODO: Add Gemini API streaming implementation here
    // This would involve:
    // 1. Preparing the audio data for Gemini API
    // 2. Streaming to Gemini API
    // 3. Receiving streaming responses
    // 4. Sending responses back to client via sendResponse()
    
    return nil
}

// HandleWebSocket handles a single WebSocket connection
func HandleWebSocket(w http.ResponseWriter, r *http.Request) {
    geminiLogger.WebSocket("New WebSocket connection request")
    
    conn, err := upgrader.Upgrade(w, r, nil)
    if err != nil {
        geminiLogger.Error(fmt.Sprintf("Failed to upgrade connection: %v", err))
        return
    }
    
    client := NewClient(conn)
    
    // Cleanup on exit
    defer func() {
        close(client.done)
        conn.Close()
        geminiLogger.Cleanup("Cleaning up WebSocket connection")
    }()
    
    geminiLogger.Success("WebSocket connection established")
    
    // Main message handling loop
    for {
        messageType, data, err := conn.ReadMessage()
        if err != nil {
            if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
                geminiLogger.Error(fmt.Sprintf("WebSocket error: %v", err))
            } else {
                geminiLogger.Info("WebSocket connection closed normally")
            }
            break
        }
        
        // Handle binary messages (audio data)
        if messageType == websocket.BinaryMessage {
            geminiLogger.Audio(fmt.Sprintf("Received binary message: %d bytes", len(data)))
            if err := client.processAudioData(data); err != nil {
                client.sendResponse(fmt.Sprintf("Error processing audio: %v", err))
                continue
            }
        } else {
            geminiLogger.Warning(fmt.Sprintf("Received unexpected message type: %d", messageType))
        }
    }
}