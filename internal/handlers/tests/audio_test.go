// TODO: Make test pass
// internal/handlers/tests/audio_test.go
package handlers_test

import (
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "strings"
    "testing"
    "errors"

    "github.com/gorilla/websocket"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/mock"
    
    "github.com/David-Botos/BearHug/internal/bearHugAudioSocket"
    "github.com/David-Botos/BearHug/internal/gemini"
    "github.com/David-Botos/BearHug/internal/handlers"
)

// MockGeminiClient implements a mock Gemini client for testing
type MockGeminiClient struct {
    mock.Mock
}

var _ gemini.GeminiClient = (*MockGeminiClient)(nil)

func (m *MockGeminiClient) Connect() error {
    args := m.Called()
    return args.Error(0)
}

func (m *MockGeminiClient) Close() error {
    args := m.Called()
    return args.Error(0)
}

func (m *MockGeminiClient) ProcessAudio(data []byte) error {
    args := m.Called(data)
    return args.Error(0)
}

func (m *MockGeminiClient) GetResponses() <-chan *gemini.ServerResponse {
    args := m.Called()
    return args.Get(0).(chan *gemini.ServerResponse)
}

// TestConfig provides test configuration
type TestConfig struct {
    server  *httptest.Server
    hub     *bearHugAudioSocket.Hub
    gemini  *MockGeminiClient
    handler *handlers.AudioHandler
    cleanup func()
}

// setupTest creates a test environment
func setupTest(t *testing.T) (*TestConfig, error) {
    hub := bearHugAudioSocket.NewHub()
    go hub.Run()

    mockClient := new(MockGeminiClient)
    mockClient.On("Connect").Return(nil)
    
    // Use the new constructor
    handler := handlers.NewAudioHandlerWithClient(hub, mockClient)

    server := httptest.NewServer(http.HandlerFunc(handler.HandleWebSocket))

    cleanup := func() {
        server.Close()
        hub.Stop()
    }

    return &TestConfig{
        server:  server,
        hub:     hub,
        gemini:  mockClient,
        handler: handler,
        cleanup: cleanup,
    }, nil
}

// TestHandleWebSocket verifies the WebSocket connection and Gemini integration
func TestHandleWebSocket(t *testing.T) {
    config, err := setupTest(t)
    if err != nil {
        t.Fatalf("Failed to setup test: %v", err)
    }
    defer config.cleanup()

    // Setup mock response channel
    responseChan := make(chan *gemini.ServerResponse, 1)
    config.gemini.On("GetResponses").Return(responseChan)
    config.gemini.On("ProcessAudio", mock.Anything).Return(nil)

    // Connect to WebSocket
    wsURL := "ws" + strings.TrimPrefix(config.server.URL, "http")
    ws, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
    assert.NoError(t, err, "Should establish WebSocket connection")
    defer ws.Close()

    // Send test audio data
    testData := []byte("test audio data")
    err = ws.WriteMessage(websocket.BinaryMessage, testData)
    assert.NoError(t, err, "Should send audio data")

    // Simulate Gemini response
    go func() {
        responseChan <- &gemini.ServerResponse{
            ModelTurn: gemini.Content{
                Parts: []gemini.Part{{
                    Text: "Test transcription",
                }},
            },
        }
    }()

    // Verify response
    messageType, response, err := ws.ReadMessage()
    assert.NoError(t, err, "Should receive response")
    assert.Equal(t, websocket.TextMessage, messageType)

    var msg handlers.Message
    err = json.Unmarshal(response, &msg)
    assert.NoError(t, err, "Should parse JSON response")
    assert.Equal(t, "transcript", msg.Type)
    assert.Equal(t, "Test transcription", msg.Text)

    config.gemini.AssertExpectations(t)
}

// TestWebSocketUpgradeFailure verifies proper handling of connection failures
func TestWebSocketUpgradeFailure(t *testing.T) {
    config, err := setupTest(t)
    if err != nil {
        t.Fatalf("Failed to setup test: %v", err)
    }
    defer config.cleanup()

    // Attempt regular HTTP request
    req := httptest.NewRequest("GET", "/ws", nil)
    rr := httptest.NewRecorder()

    config.handler.HandleWebSocket(rr, req)
    assert.NotEqual(t, http.StatusOK, rr.Code)
}

// TestGeminiFailure verifies proper error handling when Gemini processing fails
func TestGeminiFailure(t *testing.T) {
    config, err := setupTest(t)
    if err != nil {
        t.Fatalf("Failed to setup test: %v", err)
    }
    defer config.cleanup()

    // Setup Gemini mock to return error
    config.gemini.On("GetResponses").Return(make(chan *gemini.ServerResponse))
    config.gemini.On("ProcessAudio", mock.Anything).Return(errors.New("processing failed"))

    // Connect client
    wsURL := "ws" + strings.TrimPrefix(config.server.URL, "http")
    ws, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
    assert.NoError(t, err)
    defer ws.Close()

    // Send audio data
    err = ws.WriteMessage(websocket.BinaryMessage, []byte("test audio"))
    assert.NoError(t, err)

    // Verify error response
    _, response, err := ws.ReadMessage()
    assert.NoError(t, err)

    var msg handlers.Message
    err = json.Unmarshal(response, &msg)
    assert.NoError(t, err)
    assert.Equal(t, "error", msg.Type)
    assert.Contains(t, msg.Text, "processing failed")

    config.gemini.AssertExpectations(t)
}