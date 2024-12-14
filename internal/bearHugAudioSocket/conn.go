package bearHugAudioSocket

import (
    "net"
    "sync"
    "github.com/gorilla/websocket"
    "github.com/David-Botos/BearHug/internal/gemini"
)

// WSConn defines the WebSocket connection interface needed by our hub
type WSConn interface {
    RemoteAddr() net.Addr
    WriteMessage(messageType int, data []byte) error
    ReadMessage() (messageType int, p []byte, err error)
    Close() error
}

// Client represents a connected WebSocket client. Each client maintains its own
// connection to the hub and a buffered channel for outgoing messages.
type Client struct {
    Hub           *Hub             // Reference to the hub managing this client
    Conn          WSConn          // The WebSocket connection
    Send          chan []byte      // Buffered channel of outbound messages
    GeminiSession *gemini.Session  // Gemini session for this client
    closed        sync.Once        // Ensures the client cleanup happens exactly once
}

// Ensure *websocket.Conn implements WSConn
var _ WSConn = (*websocket.Conn)(nil)