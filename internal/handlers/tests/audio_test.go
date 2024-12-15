package handlers_test

import (
    "context"
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "strings"
    "testing"
    "time"
    "errors"
    "sync"

    "github.com/gorilla/websocket"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/mock"
    
    "github.com/David-Botos/BearHug/internal/bearHugAudioSocket"
    "github.com/David-Botos/BearHug/internal/gemini"
    "github.com/David-Botos/BearHug/internal/handlers"
)

// MockGeminiClient implements GeminiClient for testing
// MockGeminiClient implements GeminiClient for testing
type MockGeminiClient struct {
    mock.Mock
    responseChan chan *gemini.ServerResponse
    closed       bool
    mu           sync.Mutex
    ctx          context.Context
    cancel       context.CancelFunc
}

// NewMockGeminiClient creates a new mock client without any expectations
func NewMockGeminiClient() *MockGeminiClient {
    ctx, cancel := context.WithCancel(context.Background())
    return &MockGeminiClient{
        responseChan: make(chan *gemini.ServerResponse, 10),
        ctx:          ctx,
        cancel:       cancel,
        closed:       false,
    }
}

// NewMockGeminiClientWithExpectations creates a new mock client with basic expectations
func NewMockGeminiClientWithExpectations() *MockGeminiClient {
    client := NewMockGeminiClient()
    setupMockExpectations(client)
    return client
}

func (m *MockGeminiClient) Connect() error {
    m.mu.Lock()
    defer m.mu.Unlock()
    return m.Called().Error(0)
}

func (m *MockGeminiClient) Close() error {
    m.mu.Lock()
    defer m.mu.Unlock()
    
    if !m.closed {
        m.closed = true
        if m.cancel != nil {
            m.cancel()
        }
        close(m.responseChan)
    }
    return m.Called().Error(0)
}

func (m *MockGeminiClient) ProcessAudio(data []byte) error {
    m.mu.Lock()
    defer m.mu.Unlock()
    return m.Called(data).Error(0)
}

func (m *MockGeminiClient) GetResponses() <-chan *gemini.ServerResponse {
    m.mu.Lock()
    defer m.mu.Unlock()
    return m.responseChan
}

// setupMockExpectations sets up the basic expectations for the mock client
func setupMockExpectations(m *MockGeminiClient) {
    // Set up expectations with explicit Once() calls
    m.On("Connect").Return(nil).Once()
    m.On("Close").Return(nil).Once()
    m.On("ProcessAudio", mock.AnythingOfType("[]uint8")).Return(nil).Once()
}

// setupErrorExpectations sets up expectations for error testing
func setupErrorExpectations(m *MockGeminiClient) {
    m.On("Connect").Return(nil).Once()
    m.On("ProcessAudio", mock.AnythingOfType("[]uint8")).Return(errors.New("processing failed")).Once()
    m.On("Close").Return(nil).Once()
}
// TestConfig holds the test environment configuration
type TestConfig struct {
    server  *httptest.Server
    hub     *bearHugAudioSocket.Hub
    gemini  *MockGeminiClient
    handler *handlers.AudioHandler
    cleanup func()
}

// setupTest creates a new test environment
func setupTest(t *testing.T) *TestConfig {
    hub := bearHugAudioSocket.NewHub()
    go hub.Run()

    mockClient := NewMockGeminiClient()
    setupMockExpectations(mockClient)
    
    handler := handlers.NewAudioHandlerWithClient(hub, mockClient)
    server := httptest.NewServer(http.HandlerFunc(handler.HandleWebSocket))

    return &TestConfig{
        server:  server,
        hub:     hub,
        gemini:  mockClient,
        handler: handler,
        cleanup: func() {
            server.Close()
            hub.Stop()
            // Wait for cleanup to complete
            time.Sleep(100 * time.Millisecond)
        },
    }
}

// setupWebSocketConnection establishes a WebSocket connection for testing
func setupWebSocketConnection(t *testing.T, serverURL string) (*websocket.Conn, func()) {
    wsURL := "ws" + strings.TrimPrefix(serverURL, "http")
    ws, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
    assert.NoError(t, err, "Should connect successfully")
    
    cleanup := func() {
        if ws != nil {
            ws.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseNormalClosure, ""))
            time.Sleep(50 * time.Millisecond)
            ws.Close()
        }
    }
    
    return ws, cleanup
}

func TestWebSocketConnection(t *testing.T) {
    config := setupTest(t)
    defer config.cleanup()

    conn, cleanup := setupWebSocketConnection(t, config.server.URL)
    defer cleanup()

    time.Sleep(100 * time.Millisecond)
    assert.Equal(t, 1, config.hub.ClientCount())
    
    conn.Close()
}

func TestAudioProcessing(t *testing.T) {
    // Create hub
    hub := bearHugAudioSocket.NewHub()
    go hub.Run()
    defer hub.Stop()

    // Create mock client with minimal but necessary expectations
    mockClient := NewMockGeminiClient()
    mockClient.On("ProcessAudio", mock.AnythingOfType("[]uint8")).Return(nil)
    mockClient.On("Connect").Return(nil)  // Needed for session creation
    mockClient.On("Close").Return(nil)    // Needed for cleanup
    
    // Create handler
    handler := handlers.NewAudioHandlerWithClient(hub, mockClient)
    server := httptest.NewServer(http.HandlerFunc(handler.HandleWebSocket))
    defer server.Close()

    // Setup WebSocket connection
    wsURL := "ws" + strings.TrimPrefix(server.URL, "http")
    conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
    assert.NoError(t, err)

    // Ensure proper connection cleanup
    defer func() {
        conn.WriteMessage(websocket.CloseMessage, 
            websocket.FormatCloseMessage(websocket.CloseNormalClosure, ""))
        time.Sleep(100 * time.Millisecond)
        conn.Close()
    }()

    // Wait for connection setup to complete
    time.Sleep(100 * time.Millisecond)

    // Send test audio
    testAudio := []byte("test audio data")
    err = conn.WriteMessage(websocket.BinaryMessage, testAudio)
    assert.NoError(t, err)

    // Wait for processing
    time.Sleep(200 * time.Millisecond)

    // Verify the audio was processed
    mockClient.AssertExpectations(t)
}

func TestGeminiResponse(t *testing.T) {
    config := setupTest(t)
    defer config.cleanup()

    conn, cleanup := setupWebSocketConnection(t, config.server.URL)
    defer cleanup()

    testResponse := &gemini.ServerResponse{
        ModelTurn: gemini.Content{
            Parts: []gemini.Part{{Text: "Test transcription"}},
        },
    }

    // Send response after connection is established
    go func() {
        time.Sleep(100 * time.Millisecond)
        config.gemini.responseChan <- testResponse
    }()

    // Read response
    _, message, err := conn.ReadMessage()
    assert.NoError(t, err)

    var response handlers.Message
    err = json.Unmarshal(message, &response)
    assert.NoError(t, err)
    assert.Equal(t, "transcript", response.Type)
    assert.Equal(t, "Test transcription", response.Text)
}

func TestErrorHandling(t *testing.T) {
    t.Run("Gemini Processing Error", func(t *testing.T) {
        // Create hub
        hub := bearHugAudioSocket.NewHub()
        go hub.Run()
        defer hub.Stop()

        // Create mock client
        mockClient := NewMockGeminiClient()
        
        // Set up expectations
        mockClient.On("Connect").Return(nil).Once()
        mockClient.On("ProcessAudio", mock.AnythingOfType("[]uint8")).Return(
            errors.New("processing failed")).Once()
        mockClient.On("Close").Return(nil).Once()

        // Create handler
        handler := handlers.NewAudioHandlerWithClient(hub, mockClient)
        server := httptest.NewServer(http.HandlerFunc(handler.HandleWebSocket))
        defer server.Close()

        // Setup WebSocket connection
        wsURL := "ws" + strings.TrimPrefix(server.URL, "http")
        conn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
        assert.NoError(t, err)
        defer func() {
            conn.WriteMessage(websocket.CloseMessage, 
                websocket.FormatCloseMessage(websocket.CloseNormalClosure, ""))
            conn.Close()
        }()

        // Wait for connection to establish
        time.Sleep(100 * time.Millisecond)

        // Send test audio
        err = conn.WriteMessage(websocket.BinaryMessage, []byte("test audio"))
        assert.NoError(t, err)

        // Wait for error processing
        time.Sleep(200 * time.Millisecond)

        // Verify expectations
        mockClient.AssertExpectations(t)
    })

    t.Run("Invalid WebSocket Request", func(t *testing.T) {
        config := setupTest(t)
        defer config.cleanup()

        resp, err := http.Get(config.server.URL)
        assert.NoError(t, err)
        assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
    })
}

func TestClientDisconnection(t *testing.T) {
    config := setupTest(t)
    defer config.cleanup()

    conn, cleanup := setupWebSocketConnection(t, config.server.URL)
    defer cleanup()

    time.Sleep(100 * time.Millisecond)
    assert.Equal(t, 1, config.hub.ClientCount())

    // Explicitly close the connection to test disconnection
    conn.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseNormalClosure, ""))
    conn.Close()

    time.Sleep(100 * time.Millisecond)
    assert.Equal(t, 0, config.hub.ClientCount())
}

func TestConcurrentConnections(t *testing.T) {
    config := setupTest(t)
    defer config.cleanup()

    numClients := 5
    var wg sync.WaitGroup
    wg.Add(numClients)

    var cleanups []func()
    var conns []*websocket.Conn
    
    for i := 0; i < numClients; i++ {
        go func() {
            defer wg.Done()
            conn, cleanup := setupWebSocketConnection(t, config.server.URL)
            cleanups = append(cleanups, cleanup)
            conns = append(conns, conn)
            
            err := conn.WriteMessage(websocket.BinaryMessage, []byte("test audio"))
            assert.NoError(t, err)
        }()
    }

    wg.Wait()
    time.Sleep(200 * time.Millisecond)
    assert.Equal(t, numClients, config.hub.ClientCount())

    // Clean up all connections
    for _, cleanup := range cleanups {
        cleanup()
    }
}