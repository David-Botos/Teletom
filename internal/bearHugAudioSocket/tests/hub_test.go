// internal/bearHugAudioSocket/tests/hub_test.go
package bearHugAudioSocket_test

import (
	"errors"
	"net"
	"sync"
	"testing"
	"time"
    "context"

	"github.com/David-Botos/BearHug/internal/bearHugAudioSocket"
	"github.com/David-Botos/BearHug/internal/gemini"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

// MockAddr implements net.Addr for testing
type MockAddr struct{}

func (ma MockAddr) Network() string { return "mock" }
func (ma MockAddr) String() string  { return "mock-addr" }

// MockConn implements WSConn interface for testing
type MockConn struct {
	mock.Mock
	mockAddr MockAddr
}

func NewMockConn() *MockConn {
	return &MockConn{
		mockAddr: MockAddr{},
	}
}

func (c *MockConn) RemoteAddr() net.Addr { return c.mockAddr }
func (c *MockConn) WriteMessage(messageType int, data []byte) error {
	args := c.Called(messageType, data)
	return args.Error(0)
}
func (c *MockConn) ReadMessage() (messageType int, p []byte, err error) {
	args := c.Called()
	return args.Int(0), args.Get(1).([]byte), args.Error(2)
}
func (c *MockConn) Close() error {
	args := c.Called()
	return args.Error(0)
}

// MockGeminiClient implements GeminiClient for creating test sessions
type MockGeminiClient struct {
    mock.Mock
    responseChan chan *gemini.ServerResponse
    closed       bool
    mu           sync.Mutex
    ctx          context.Context
    cancel       context.CancelFunc
}

func NewMockGeminiClient() *MockGeminiClient {
    ctx, cancel := context.WithCancel(context.Background())
    client := &MockGeminiClient{
        responseChan: make(chan *gemini.ServerResponse, 10),
        ctx:          ctx,
        cancel:       cancel,
    }
    return client
}

func (m *MockGeminiClient) Connect() error {
	args := m.Called()
	return args.Error(0)
}

func (m *MockGeminiClient) Close() error {
    m.mu.Lock()
    defer m.mu.Unlock()
    
    // Call mock first to record the call
    args := m.Called()
    
    if !m.closed {
        if m.cancel != nil {
            m.cancel()
        }
        if m.responseChan != nil {
            close(m.responseChan)
            m.responseChan = nil
        }
        m.closed = true
    }
    
    return args.Error(0)
}

func (m *MockGeminiClient) ProcessAudio(data []byte) error {
	args := m.Called(data)
	return args.Error(0)
}

func (m *MockGeminiClient) GetResponses() <-chan *gemini.ServerResponse {
    m.mu.Lock()
    defer m.mu.Unlock()
    
    // If client is closed or channel is nil, return a closed channel
    if m.closed || m.responseChan == nil {
        ch := make(chan *gemini.ServerResponse)
        close(ch)
        return ch
    }
    
    return m.responseChan
}

// Helper function to create a mock session for cleanup testing
func newMockSessionForCleanup(t *testing.T) (*gemini.Session, *MockGeminiClient) {
    mockClient := NewMockGeminiClient()
    // Only set up Close expectation for cleanup testing
    mockClient.On("Close").Return(nil)
    
    session, err := gemini.NewSession(mockClient)
    require.NoError(t, err, "Failed to create mock session")
    
    return session, mockClient
}

// Helper function to create a mock session for integration testing
func newMockSessionForIntegration(t *testing.T) (*gemini.Session, *MockGeminiClient) {
    mockClient := NewMockGeminiClient()
    // Set up all expectations needed for integration testing
    mockClient.On("ProcessAudio", mock.Anything).Return(nil)
    mockClient.On("Connect").Return(nil)
    mockClient.On("Close").Return(nil)
    
    session, err := gemini.NewSession(mockClient)
    require.NoError(t, err, "Failed to create mock session")
    
    return session, mockClient
}

func (m *MockGeminiClient) SimulateResponse(response *gemini.ServerResponse) error {
    m.mu.Lock()
    defer m.mu.Unlock()
    
    if m.closed || m.responseChan == nil {
        return errors.New("client is closed")
    }
    
    select {
    case m.responseChan <- response:
        return nil
    default:
        return errors.New("response channel is full")
    }
}

func TestHubClientRegistration(t *testing.T) {
	hub := bearHugAudioSocket.NewHub()
	go hub.Run()
	defer hub.Stop()

	mockConn := NewMockConn()
	mockConn.On("Close").Return(nil)

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

	mockConn1 := NewMockConn()
	mockConn2 := NewMockConn()

	mockConn1.On("Close").Return(nil)
	mockConn2.On("Close").Return(nil)

	client1 := bearHugAudioSocket.NewClient(hub, mockConn1)
	client2 := bearHugAudioSocket.NewClient(hub, mockConn2)

	require.NotNil(t, client1, "Client1 should not be nil")
	require.NotNil(t, client2, "Client2 should not be nil")

	hub.Register <- client1
	hub.Register <- client2
	time.Sleep(100 * time.Millisecond)

	assert.Equal(t, 2, hub.ClientCount(), "Hub should have exactly two clients")

	testMessage := []byte("test message")
	hub.Broadcast <- testMessage

	receiveWithTimeout := func(client *bearHugAudioSocket.Client) ([]byte, bool) {
		select {
		case msg := <-client.Send:
			return msg, true
		case <-time.After(time.Second):
			return nil, false
		}
	}

	msg1, ok1 := receiveWithTimeout(client1)
	assert.True(t, ok1, "Client1 should receive message")
	assert.Equal(t, testMessage, msg1, "Client1 should receive correct message")

	msg2, ok2 := receiveWithTimeout(client2)
	assert.True(t, ok2, "Client2 should receive message")
	assert.Equal(t, testMessage, msg2, "Client2 should receive correct message")
}

func TestGeminiSessionIntegration(t *testing.T) {
	hub := bearHugAudioSocket.NewHub()
	go hub.Run()
	defer hub.Stop()

	mockConn := NewMockConn()
	mockConn.On("Close").Return(nil)

	mockSession, mockClient := newMockSessionForIntegration(t)

	client := bearHugAudioSocket.NewClient(hub, mockConn)
	client.GeminiSession = mockSession

	hub.Register <- client
	time.Sleep(100 * time.Millisecond)

	// Test audio processing
	testAudio := []byte("test audio data")
	err := client.GeminiSession.ProcessAudio(testAudio)
	assert.NoError(t, err)

	// Test response handling by sending through the mock client
	sessionResp := &gemini.ServerResponse{
		TurnComplete: true,
		ModelTurn: gemini.Content{
			Role:  "assistant",
			Parts: []gemini.Part{{Text: "Test response"}},
		},
	}

	go func() {
		mockClient.responseChan <- sessionResp
	}()

	select {
	case resp := <-client.GeminiSession.GetResponses():
		assert.NotNil(t, resp)
		assert.Equal(t, "Test response", resp.ModelTurn.Parts[0].Text)
	case <-time.After(time.Second):
		t.Fatal("Timeout waiting for response")
	}

	// Test cleanup
	hub.Unregister <- client
	time.Sleep(100 * time.Millisecond)
	assert.False(t, hub.HasClient(client))
}

func TestGeminiSessionErrorHandling(t *testing.T) {
	hub := bearHugAudioSocket.NewHub()
	go hub.Run()
	defer hub.Stop()

	mockConn := NewMockConn()
	// Expect Close() to be called exactly once during cleanup
	mockConn.On("Close").Return(nil).Once()

	testData := make([]byte, gemini.DefaultConfig().AudioBuffer*2)
	testError := errors.New("audio processing failed")

	mockClient := NewMockGeminiClient()
	// Expect ProcessAudio to be called and return error
	mockClient.On("ProcessAudio", mock.MatchedBy(func(data []byte) bool {
		return len(data) > 0
	})).Return(testError)

	// Expect Close() to be called exactly once during cleanup
	mockClient.On("Close").Return(nil).Once()

	session, err := gemini.NewSession(mockClient)
	require.NoError(t, err, "Failed to create mock session")

	client := bearHugAudioSocket.NewClient(hub, mockConn)
	client.GeminiSession = session

	// Test audio processing error
	err = client.GeminiSession.ProcessAudio(testData)
	assert.Error(t, err, "Expected an error from ProcessAudio")
	assert.Contains(t, err.Error(), testError.Error(), "Error should contain our test error")

	// Test registration and cleanup
	hub.Register <- client
	time.Sleep(100 * time.Millisecond)
	assert.True(t, hub.HasClient(client), "Client should be registered")

	hub.Unregister <- client
	time.Sleep(100 * time.Millisecond)
	assert.False(t, hub.HasClient(client), "Client should be unregistered")

	// Give time for cleanup goroutines to complete
	time.Sleep(100 * time.Millisecond)

	// Verify all mock expectations were met
	mockClient.AssertExpectations(t)
	mockConn.AssertExpectations(t)
}

func TestHubCleanup(t *testing.T) {
	hub := bearHugAudioSocket.NewHub()

	var wg sync.WaitGroup
	wg.Add(1)
	go func() {
		defer wg.Done()
		hub.Run()
	}()

	mockConn1 := NewMockConn()
	mockConn2 := NewMockConn()
	mockConn1.On("Close").Return(nil)
	mockConn2.On("Close").Return(nil)

	// Use cleanup-specific mock session creation
	mockSession1, mockClient1 := newMockSessionForCleanup(t)
	mockSession2, mockClient2 := newMockSessionForCleanup(t)

	client1 := bearHugAudioSocket.NewClient(hub, mockConn1)
	client2 := bearHugAudioSocket.NewClient(hub, mockConn2)
	client1.GeminiSession = mockSession1
	client2.GeminiSession = mockSession2

	require.NotNil(t, client1, "Client1 should be created successfully")
	require.NotNil(t, client2, "Client2 should be created successfully")

	registrationDone := make(chan struct{})
	go func() {
		hub.Register <- client1
		hub.Register <- client2

		for {
			if hub.HasClient(client1) && hub.HasClient(client2) {
				close(registrationDone)
				return
			}
			time.Sleep(10 * time.Millisecond)
		}
	}()

	select {
	case <-registrationDone:
	case <-time.After(time.Second):
		t.Fatal("Timeout waiting for client registration")
	}

	assert.Equal(t, 2, hub.ClientCount(), "Should have two clients before cleanup")
	assert.True(t, hub.HasClient(client1), "Client1 should be registered")
	assert.True(t, hub.HasClient(client2), "Client2 should be registered")

	hub.Stop()
	wg.Wait()

	assert.Equal(t, 0, hub.ClientCount(), "Should have no clients after cleanup")

	isChannelClosed := func(ch chan []byte) bool {
		select {
		case _, ok := <-ch:
			return !ok
		case <-time.After(100 * time.Millisecond):
			return false
		}
	}

	assert.True(t, isChannelClosed(client1.Send),
		"Client1's send channel should be closed after cleanup")
	assert.True(t, isChannelClosed(client2.Send),
		"Client2's send channel should be closed after cleanup")

	isResponseChannelClosed := func(ch <-chan *gemini.ServerResponse) bool {
		select {
		case _, ok := <-ch:
			return !ok
		case <-time.After(100 * time.Millisecond):
			return false
		}
	}

	assert.True(t, isResponseChannelClosed(mockClient1.GetResponses()),
		"Client1's Gemini response channel should be closed after cleanup")
	assert.True(t, isResponseChannelClosed(mockClient2.GetResponses()),
		"Client2's Gemini response channel should be closed after cleanup")

	mockConn1.AssertExpectations(t)
	mockConn2.AssertExpectations(t)
	mockClient1.AssertExpectations(t)
	mockClient2.AssertExpectations(t)
}