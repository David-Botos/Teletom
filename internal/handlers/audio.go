// internal/handlers/audio.go
package handlers

import (
    "encoding/json"
    "log"
    "net/http"
    
    "github.com/gorilla/websocket"
    "github.com/David-Botos/BearHug/internal/bearHugAudioSocket"
    "github.com/David-Botos/BearHug/internal/gemini"
)

type GeminiClient interface {
    Connect() error
    Close() error
    ProcessAudio(data []byte) error
    GetResponses() <-chan *gemini.ServerResponse
}

// AudioHandler manages WebSocket connections and Gemini integration
type AudioHandler struct {
    hub          *bearHugAudioSocket.Hub
    geminiClient GeminiClient
}

// upgrader configures the WebSocket connection parameters
var upgrader = websocket.Upgrader{
    ReadBufferSize:  1024,
    WriteBufferSize: 1024,
    CheckOrigin: func(r *http.Request) bool {
        // TODO: In production, implement proper origin checking
        return true
    },
}

// Message represents the structure of WebSocket communication
type Message struct {
    Type string `json:"type"` // Type of message (e.g., "transcript")
    Text string `json:"text"` // Content of the message
}

// NewAudioHandler creates a new audio handler with both WebSocket hub and Gemini client
func NewAudioHandler(hub *bearHugAudioSocket.Hub, geminiConfig *gemini.Config) (*AudioHandler, error) {
    geminiClient, err := gemini.NewClient(geminiConfig)
    if err != nil {
        return nil, err
    }
    
    if err := geminiClient.Connect(); err != nil {
        return nil, err
    }
    
    return &AudioHandler{
        hub:          hub,
        geminiClient: geminiClient,
    }, nil
}

func NewAudioHandlerWithClient(hub *bearHugAudioSocket.Hub, client GeminiClient) *AudioHandler {
    return &AudioHandler{
        hub:          hub,
        geminiClient: client,
    }
}

// HandleWebSocket creates a WebSocket handler that manages client connections
func (h *AudioHandler) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
    log.Printf("New WebSocket connection attempt from %s", r.RemoteAddr)
    
    // Upgrade HTTP connection to WebSocket
    conn, err := upgrader.Upgrade(w, r, nil)
    if err != nil {
        log.Printf("Failed to upgrade connection from %s: %v", r.RemoteAddr, err)
        return
    }
    
    // Create new Gemini session for this client
    session, err := gemini.NewSession(h.geminiClient)
    if err != nil {
        log.Printf("Failed to create Gemini session for %s: %v", r.RemoteAddr, err)
        conn.Close()
        return
    }
    
    log.Printf("Successfully established WebSocket connection with %s", r.RemoteAddr)
    
    // Initialize new client with both WebSocket and Gemini session
    client := &bearHugAudioSocket.Client{
        Hub:           h.hub,
        Conn:          conn,
        Send:          make(chan []byte, 256),
        GeminiSession: session,
    }
    
    // Register client with the hub
    client.Hub.Register <- client
    log.Printf("Client %s registered with hub", r.RemoteAddr)
    
    // Start Gemini response handler
    go handleGeminiResponses(client)
    
    // Launch goroutines for handling bidirectional communication
    go handleAudioStream(client)
    go handleMessages(client)
}

// handleGeminiResponses processes responses from the Gemini API
func handleGeminiResponses(client *bearHugAudioSocket.Client) {
    clientAddr := client.Conn.RemoteAddr().String()
    
    for response := range client.GeminiSession.GetResponses() {
        // Convert Gemini response to client message format
        message := Message{
            Type: "transcript",
            Text: response.ModelTurn.Parts[0].Text,
        }
        
        responseJSON, err := json.Marshal(message)
        if err != nil {
            log.Printf("Error marshaling Gemini response for client %s: %v", clientAddr, err)
            continue
        }
        
        client.Send <- responseJSON
        log.Printf("Sent Gemini response to client %s", clientAddr)
    }
}

// handleAudioStream processes incoming audio data from the client
func handleAudioStream(client *bearHugAudioSocket.Client) {
    clientAddr := client.Conn.RemoteAddr().String()
    log.Printf("Starting audio stream handler for client %s", clientAddr)
    
    defer func() {
        log.Printf("Cleaning up connection for client %s", clientAddr)
        client.Hub.Unregister <- client
        client.GeminiSession.Close()
        client.Conn.Close()
    }()
    
    for {
        messageType, rawData, err := client.Conn.ReadMessage()
        if err != nil {
            if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
                log.Printf("Error reading from client %s: %v", clientAddr, err)
            } else {
                log.Printf("Client %s disconnected normally", clientAddr)
            }
            break
        }
        
        if messageType == websocket.BinaryMessage {
            log.Printf("Received audio data from client %s, size: %d bytes", clientAddr, len(rawData))
            
            // Process audio through Gemini
            if err := client.GeminiSession.ProcessAudio(rawData); err != nil {
                log.Printf("Error processing audio for client %s: %v", clientAddr, err)
                continue
            }
        }
    }
}

// handleMessages manages sending messages back to the client
func handleMessages(client *bearHugAudioSocket.Client) {
    clientAddr := client.Conn.RemoteAddr().String()
    log.Printf("Starting message handler for client %s", clientAddr)
    
    defer func() {
        log.Printf("Closing connection for client %s", clientAddr)
        client.Conn.Close()
    }()
    
    for {
        select {
        case message, ok := <-client.Send:
            if !ok {
                log.Printf("Send channel closed for client %s", clientAddr)
                client.Conn.WriteMessage(websocket.CloseMessage, []byte{})
                return
            }
            
            err := client.Conn.WriteMessage(websocket.TextMessage, message)
            if err != nil {
                log.Printf("Error writing to client %s: %v", clientAddr, err)
                return
            }
            
            log.Printf("Successfully sent message to client %s", clientAddr)
        }
    }
}