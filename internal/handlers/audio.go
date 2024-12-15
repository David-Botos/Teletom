// internal/handlers/audio.go
package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/David-Botos/BearHug/internal/bearHugAudioSocket"
	"github.com/David-Botos/BearHug/internal/gemini"
	"github.com/gorilla/websocket"
)

// AudioHandler manages WebSocket connections and Gemini integration
type AudioHandler struct {
    hub          *bearHugAudioSocket.Hub
    geminiClient gemini.GeminiClient
    config       *gemini.Config
}

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
    Type    string          `json:"type"`
    Content json.RawMessage `json:"content"`
}

// NewAudioHandler creates a new audio handler with both WebSocket hub and Gemini client
func NewAudioHandler(hub *bearHugAudioSocket.Hub, geminiConfig *gemini.Config) (*AudioHandler, error) {
    if geminiConfig == nil {
        geminiConfig = gemini.DefaultConfig()
    }
    
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
        config:       geminiConfig,
    }, nil
}

// HandleWebSocket creates a WebSocket handler that manages client connections
func (h *AudioHandler) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
    log.Printf("New WebSocket connection attempt from %s", r.RemoteAddr)
    
    conn, err := upgrader.Upgrade(w, r, nil)
    if err != nil {
        log.Printf("Failed to upgrade connection from %s: %v", r.RemoteAddr, err)
        return
    }
    
    // Create new Gemini session using the existing config
    session, err := gemini.NewSession(h.geminiClient, h.config)
    if err != nil {
        log.Printf("Failed to create Gemini session for %s: %v", r.RemoteAddr, err)
        conn.Close()
        return
    }
    
    client := &bearHugAudioSocket.Client{
        Hub:           h.hub,
        Conn:          conn,
        Send:          make(chan []byte, 256),
        GeminiSession: session,
    }
    
    client.Hub.Register <- client
    
    // Start handlers for responses and errors
    go handleGeminiResponses(client)
    go handleGeminiErrors(client)
    go handleAudioStream(client)
    go handleMessages(client)
}

// handleGeminiResponses processes responses from the Gemini API
func handleGeminiResponses(client *bearHugAudioSocket.Client) {
    clientAddr := client.Conn.RemoteAddr().String()
    
    for response := range client.GeminiSession.GetResponses() {
        if response == nil || len(response.ModelTurn.Parts) == 0 {
            continue
        }

        message := Message{
            Type: "transcript",
            Content: json.RawMessage(response.ModelTurn.Parts[0].Text),
        }
        
        responseJSON, err := json.Marshal(message)
        if err != nil {
            log.Printf("Error marshaling Gemini response for client %s: %v", clientAddr, err)
            continue
        }
        
        select {
        case client.Send <- responseJSON:
            log.Printf("Sent Gemini response to client %s", clientAddr)
        default:
            log.Printf("Warning: Send buffer full for client %s, dropping response", clientAddr)
        }
    }
}

// handleGeminiErrors processes errors from the Gemini session
func handleGeminiErrors(client *bearHugAudioSocket.Client) {
    clientAddr := client.Conn.RemoteAddr().String()
    
    for err := range client.GeminiSession.GetErrors() {
        log.Printf("Gemini error for client %s: %v", clientAddr, err)
        
        message := Message{
            Type:    "error",
            Content: json.RawMessage(`"` + err.Error() + `"`),
        }
        
        errorJSON, err := json.Marshal(message)
        if err != nil {
            log.Printf("Error marshaling error message for client %s: %v", clientAddr, err)
            continue
        }
        
        select {
        case client.Send <- errorJSON:
        default:
            log.Printf("Warning: Send buffer full for client %s, dropping error message", clientAddr)
        }
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
            }
            return
        }
        
        if messageType == websocket.BinaryMessage {
            if err := client.GeminiSession.HandleIncomingAudio(rawData); err != nil {
                if err == gemini.ErrBufferFull {
                    log.Printf("Audio buffer full for client %s, applying backpressure", clientAddr)
                    continue
                }
                log.Printf("Error processing audio for client %s: %v", clientAddr, err)
            }
        }
    }
}

// handleMessages manages sending messages back to the client
func handleMessages(client *bearHugAudioSocket.Client) {
    clientAddr := client.Conn.RemoteAddr().String()
    
    defer func() {
        client.Conn.Close()
    }()
    
    for {
        select {
        case message, ok := <-client.Send:
            if !ok {
                client.Conn.WriteMessage(websocket.CloseMessage, []byte{})
                return
            }
            
            if err := client.Conn.WriteMessage(websocket.TextMessage, message); err != nil {
                log.Printf("Error writing to client %s: %v", clientAddr, err)
                return
            }
        }
    }
}