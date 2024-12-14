// TODO: Add tests to accomodate new gemini integration
// TODO: Make test pass
// internal/bearHugAudioSocket/tests/hub_test.go
package bearHugAudioSocket_test

import (
    "net"
    "testing"
    "time"
    "github.com/David-Botos/BearHug/internal/bearHugAudioSocket"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

// MockAddr implements net.Addr for testing
type MockAddr struct{}

func (ma MockAddr) Network() string { return "mock" }
func (ma MockAddr) String() string  { return "mock-addr" }

// MockConn implements WSConn interface for testing
type MockConn struct {
    mockAddr MockAddr
}

func NewMockConn() *MockConn {
    return &MockConn{
        mockAddr: MockAddr{},
    }
}

// Implement required interface methods
func (c *MockConn) RemoteAddr() net.Addr                            { return c.mockAddr }
func (c *MockConn) WriteMessage(messageType int, data []byte) error { return nil }
func (c *MockConn) ReadMessage() (messageType int, p []byte, err error) { return 1, nil, nil }
func (c *MockConn) Close() error                                    { return nil }

func TestHubClientRegistration(t *testing.T) {
    hub := bearHugAudioSocket.NewHub()
    go hub.Run()
    defer hub.Stop()

    // Create a mock connection
    mockConn := NewMockConn()
    
    // Create a test client using the constructor
    client := bearHugAudioSocket.NewClient(hub, mockConn)
    require.NotNil(t, client, "Client should not be nil")
    require.NotNil(t, client.Send, "Client send channel should be initialized")

    // Test registration
    hub.Register <- client
    time.Sleep(100 * time.Millisecond)
    assert.True(t, hub.HasClient(client), "Client should be registered")
    assert.Equal(t, 1, hub.ClientCount(), "Hub should have exactly one client")

    // Test duplicate registration
    hub.Register <- client
    time.Sleep(100 * time.Millisecond)
    assert.Equal(t, 1, hub.ClientCount(), "Hub should still have exactly one client")

    // Test unregistration
    hub.Unregister <- client
    time.Sleep(100 * time.Millisecond)
    assert.False(t, hub.HasClient(client), "Client should be unregistered")
    assert.Equal(t, 0, hub.ClientCount(), "Hub should have no clients")
}

func TestHubBroadcast(t *testing.T) {
    hub := bearHugAudioSocket.NewHub()
    go hub.Run()
    defer hub.Stop()

    // Create mock connections
    mockConn1 := NewMockConn()
    mockConn2 := NewMockConn()

    // Create test clients
    client1 := bearHugAudioSocket.NewClient(hub, mockConn1)
    client2 := bearHugAudioSocket.NewClient(hub, mockConn2)
    
    require.NotNil(t, client1, "Client1 should not be nil")
    require.NotNil(t, client2, "Client2 should not be nil")

    // Register both clients
    hub.Register <- client1
    hub.Register <- client2
    time.Sleep(100 * time.Millisecond)
    
    assert.Equal(t, 2, hub.ClientCount(), "Hub should have exactly two clients")

    // Test broadcasting
    testMessage := []byte("test message")
    hub.Broadcast <- testMessage

    // Helper function to verify message receipt
    receiveWithTimeout := func(client *bearHugAudioSocket.Client) ([]byte, bool) {
        select {
        case msg := <-client.Send:
            return msg, true
        case <-time.After(time.Second):
            return nil, false
        }
    }

    // Verify both clients receive the message
    msg1, ok1 := receiveWithTimeout(client1)
    assert.True(t, ok1, "Client1 should receive message")
    assert.Equal(t, testMessage, msg1, "Client1 should receive correct message")

    msg2, ok2 := receiveWithTimeout(client2)
    assert.True(t, ok2, "Client2 should receive message")
    assert.Equal(t, testMessage, msg2, "Client2 should receive correct message")
}

func TestHubCleanup(t *testing.T) {
    hub := bearHugAudioSocket.NewHub()
    go hub.Run()

    // Create mock connections
    mockConn1 := NewMockConn()
    mockConn2 := NewMockConn()

    // Create and verify clients
    client1 := bearHugAudioSocket.NewClient(hub, mockConn1)
    client2 := bearHugAudioSocket.NewClient(hub, mockConn2)
    
    require.NotNil(t, client1, "Client1 should be created successfully")
    require.NotNil(t, client2, "Client2 should be created successfully")
    
    hub.Register <- client1
    hub.Register <- client2
    time.Sleep(100 * time.Millisecond)
    
    assert.Equal(t, 2, hub.ClientCount(), "Should have two clients before cleanup")
    
    hub.Stop()
    time.Sleep(100 * time.Millisecond)
    
    assert.Equal(t, 0, hub.ClientCount(), "Should have no clients after cleanup")
    
    isChannelClosed := func(ch chan []byte) bool {
        select {
        case _, ok := <-ch:
            return !ok
        default:
            return false
        }
    }
    
    assert.True(t, isChannelClosed(client1.Send), 
        "Client1's send channel should be closed after cleanup")
    assert.True(t, isChannelClosed(client2.Send), 
        "Client2's send channel should be closed after cleanup")
}