// internal/bearHugAudioSocket/hub.go
package bearHugAudioSocket

import (
    "log"
    "sync"
)

// NewClient creates and initializes a new client instance with proper defaults.
// This ensures all clients are created with consistent initialization.
// NewClient creates and initializes a new client instance with proper defaults.
func NewClient(hub *Hub, conn WSConn) *Client {
    if hub == nil {
        return nil
    }
    
    // Create a new client with initialized channels
    client := &Client{
        Hub:           hub,
        Conn:          conn,
        Send:          make(chan []byte, 256),
        GeminiSession: nil,  // This will be set by the audio handler
    }
    
    return client
}

// SafeClose ensures that a client's resources are cleaned up exactly once.
// This prevents panic conditions from multiple close attempts on the Send channel.
func (c *Client) SafeClose() {
    c.closed.Do(func() {
        if c.Send != nil {
            log.Printf("Safely closing client send channel for %s", c.Conn.RemoteAddr().String())
            close(c.Send)
        }
    })
}

// Hub manages all active WebSocket clients and coordinates message broadcasting.
// It provides thread-safe operations for client registration and message distribution.
type Hub struct {
    clients    map[*Client]bool // Map of all connected clients
    Broadcast  chan []byte      // Channel for messages to be broadcast to all clients
    Register   chan *Client     // Channel for registering new clients
    Unregister chan *Client     // Channel for unregistering clients
    mu         sync.Mutex       // Mutex for thread-safe client map access
    done       chan struct{}    // Channel for signaling hub shutdown
}

// NewHub creates and initializes a new Hub instance with all required channels
// and data structures. The hub must be started by calling Run() in a goroutine.
func NewHub() *Hub {
    log.Println("Creating new WebSocket hub")
    return &Hub{
        clients:    make(map[*Client]bool),
        Broadcast:  make(chan []byte),
        Register:   make(chan *Client),
        Unregister: make(chan *Client),
        done:       make(chan struct{}),
    }
}

// ClientCount returns the current number of connected clients in a thread-safe manner.
// This method is useful for monitoring and debugging purposes.
func (h *Hub) ClientCount() int {
    h.mu.Lock()
    defer h.mu.Unlock()
    count := len(h.clients)
    log.Printf("Current client count: %d", count)
    return count
}

// HasClient safely checks if a specific client is registered with the hub.
// This method is thread-safe and handles nil client checks.
func (h *Hub) HasClient(client *Client) bool {
    if client == nil {
        log.Println("HasClient check called with nil client")
        return false
    }
    h.mu.Lock()
    defer h.mu.Unlock()
    exists := h.clients[client]
    log.Printf("Client existence check for %s - exists: %v", 
        client.Conn.RemoteAddr().String(), exists)
    return exists
}

// Stop initiates a graceful shutdown of the hub.
// This will trigger cleanup of all connected clients and channels.
func (h *Hub) Stop() {
    log.Println("Initiating hub shutdown")
    close(h.done)
}

// Run starts the hub's main event loop. This method should be called in a separate
// goroutine as it runs indefinitely until Stop() is called.
func (h *Hub) Run() {
    log.Println("Starting hub event loop")
    defer log.Println("Hub event loop stopped")
    
    for {
        select {
        case <-h.done:
            log.Println("Hub shutdown signal received, starting cleanup")
            h.cleanup()
            return
            
        case client := <-h.Register:
            if client == nil {
                log.Println("WARNING: Attempted to register nil client - ignoring")
                continue
            }
            h.mu.Lock()
            clientAddr := client.Conn.RemoteAddr().String()
            if !h.clients[client] {
                h.clients[client] = true
                log.Printf("New client %s registered. Total clients: %d", 
                    clientAddr, len(h.clients))
            } else {
                log.Printf("Client %s already registered. Total clients: %d", 
                    clientAddr, len(h.clients))
            }
            h.mu.Unlock()

        case client := <-h.Unregister:
            if client == nil {
                log.Println("WARNING: Attempted to unregister nil client - ignoring")
                continue
            }
            h.mu.Lock()
            clientAddr := client.Conn.RemoteAddr().String()
            if _, ok := h.clients[client]; ok {
                delete(h.clients, client)
                client.SafeClose()
                log.Printf("Client %s unregistered and cleaned up. Total clients: %d", 
                    clientAddr, len(h.clients))
            }
            h.mu.Unlock()

        case message := <-h.Broadcast:
            h.mu.Lock()
            log.Printf("Broadcasting message of size %d bytes to %d clients", 
                len(message), len(h.clients))
            
            for client := range h.clients {
                if client == nil || client.Send == nil {
                    log.Println("Found invalid client during broadcast - removing")
                    delete(h.clients, client)
                    continue
                }
                
                select {
                case client.Send <- message:
                    log.Printf("Successfully sent message to client %s", 
                        client.Conn.RemoteAddr().String())
                default:
                    log.Printf("Client %s send buffer full - removing client", 
                        client.Conn.RemoteAddr().String())
                    delete(h.clients, client)
                    client.SafeClose()
                }
            }
            h.mu.Unlock()
        }
    }
}

// cleanup performs a thorough cleanup of the hub's resources when shutting down.
// This includes closing all client connections and channels.
func (h *Hub) cleanup() {
    log.Println("Starting hub cleanup process")
    h.mu.Lock()
    defer h.mu.Unlock()
    
    for client := range h.clients {
        if client != nil && client.Conn != nil {
            log.Printf("Cleaning up client %s", client.Conn.RemoteAddr().String())
            client.SafeClose()
            delete(h.clients, client)
        }
    }
    
    log.Println("Closing hub channels")
    close(h.Register)
    close(h.Unregister)
    close(h.Broadcast)
    
    log.Println("Hub cleanup complete")
}