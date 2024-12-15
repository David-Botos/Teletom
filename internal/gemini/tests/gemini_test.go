// internal/gemini/tests/gemini_test.go
package gemini_test

import (
    "bytes"
    "encoding/binary"
    "math"
    "testing"
    "time"

    "github.com/David-Botos/BearHug/internal/gemini"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/mock"
)

// MockGeminiClient implements the GeminiClient interface for testing
type MockGeminiClient struct {
    mock.Mock
}

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
    return args.Get(0).(<-chan *gemini.ServerResponse)
}

// Test AudioProcessor
func TestAudioProcessor(t *testing.T) {
    t.Run("ProcessAudioChunk handles valid input", func(t *testing.T) {
        processor := gemini.NewAudioProcessor(16000, 24000)
        
        // Create test audio data (1 second of 440Hz sine wave)
        sampleRate := 16000
        duration := time.Second
        numSamples := int(duration.Seconds() * float64(sampleRate))
        samples := make([]int16, numSamples)
        
        for i := 0; i < numSamples; i++ {
            t := float64(i) / float64(sampleRate)
            samples[i] = int16(32767 * math.Sin(2*math.Pi*440*t))
        }
        
        // Convert samples to bytes
        buf := new(bytes.Buffer)
        err := binary.Write(buf, binary.LittleEndian, samples)
        assert.NoError(t, err)
        
        chunk, err := processor.ProcessAudioChunk(buf.Bytes())
        assert.NoError(t, err)
        assert.NotNil(t, chunk)
        assert.Equal(t, 24000, chunk.SampleRate)
        assert.Equal(t, "LINEAR16", chunk.Format)
        assert.Equal(t, 1, chunk.Channels)
        
        // Verify output length matches expected resampled length
        expectedSamples := int(float64(numSamples) * float64(24000) / float64(16000))
        assert.Equal(t, expectedSamples*2, len(chunk.Data)) // *2 because 16-bit samples
    })

    t.Run("ProcessAudioChunk rejects invalid input length", func(t *testing.T) {
        processor := gemini.NewAudioProcessor(16000, 24000)
        invalidData := []byte{1, 2, 3} // Not divisible by 2 (16-bit samples)
        
        chunk, err := processor.ProcessAudioChunk(invalidData)
        assert.Error(t, err)
        assert.Nil(t, chunk)
        assert.Contains(t, err.Error(), "invalid audio data length")
    })
}

// Test AudioBuffer
func TestAudioBuffer(t *testing.T) {
    t.Run("Write returns complete chunks", func(t *testing.T) {
        buffer := gemini.NewAudioBuffer(512)
        testData := make([]byte, 1000)
        
        chunks, err := buffer.Write(testData)
        assert.NoError(t, err)
        assert.Equal(t, 1, len(chunks))
        assert.Equal(t, 512, len(chunks[0]))
    })

    t.Run("Write handles multiple chunks", func(t *testing.T) {
        buffer := gemini.NewAudioBuffer(512)
        testData := make([]byte, 1024)
        
        chunks, err := buffer.Write(testData)
        assert.NoError(t, err)
        assert.Equal(t, 2, len(chunks))
        assert.Equal(t, 512, len(chunks[0]))
        assert.Equal(t, 512, len(chunks[1]))
    })

    t.Run("Write handles remainder data", func(t *testing.T) {
        buffer := gemini.NewAudioBuffer(512)
        testData := make([]byte, 600) // More than one chunk but not complete
        
        chunks, err := buffer.Write(testData)
        assert.NoError(t, err)
        assert.Equal(t, 1, len(chunks))
        
        // Write more data to complete a chunk
        moreData := make([]byte, 424)
        chunks, err = buffer.Write(moreData)
        assert.NoError(t, err)
        assert.Equal(t, 1, len(chunks))
    })
}

// Test Session
func TestSession(t *testing.T) {
    t.Run("NewSession validation", func(t *testing.T) {
        mockClient := new(MockGeminiClient)
        responseChan := make(chan *gemini.ServerResponse)
        mockClient.On("GetResponses").Return(responseChan)
        
        session, err := gemini.NewSession(mockClient)
        assert.NoError(t, err)
        assert.NotNil(t, session)
        
        // Test with nil client
        session, err = gemini.NewSession(nil)
        assert.Error(t, err)
        assert.Nil(t, session)
    })

    t.Run("Session processes audio correctly", func(t *testing.T) {
        mockClient := new(MockGeminiClient)
        responseChan := make(chan *gemini.ServerResponse)
        mockClient.On("GetResponses").Return(responseChan)
        mockClient.On("ProcessAudio", mock.Anything).Return(nil)
        
        session, err := gemini.NewSession(mockClient)
        assert.NoError(t, err)
        
        testData := make([]byte, 1024)
        err = session.ProcessAudio(testData)
        assert.NoError(t, err)
        mockClient.AssertExpectations(t)
    })

    t.Run("Session cleanup on close", func(t *testing.T) {
        mockClient := new(MockGeminiClient)
        responseChan := make(chan *gemini.ServerResponse)
        mockClient.On("GetResponses").Return(responseChan)
        mockClient.On("Close").Return(nil)
        
        session, _ := gemini.NewSession(mockClient)
        
        err := session.Close()
        assert.NoError(t, err)
        
        // Verify session rejects audio after close
        err = session.ProcessAudio(make([]byte, 512))
        assert.Error(t, err)
        assert.Contains(t, err.Error(), "session is not active")
    })

    t.Run("Session handles response processing", func(t *testing.T) {
        mockClient := new(MockGeminiClient)
        responseChan := make(chan *gemini.ServerResponse, 1)
        mockClient.On("GetResponses").Return(responseChan)
        
        session, _ := gemini.NewSession(mockClient)
        
        // Send test response
        testResponse := &gemini.ServerResponse{
            TurnComplete: true,
            ModelTurn: gemini.Content{
                Role: "assistant",
                Parts: []gemini.Part{{Text: "Test response"}},
            },
        }
        
        go func() {
            responseChan <- testResponse
            close(responseChan)
        }()
        
        // Verify response is received
        select {
        case resp := <-session.GetResponses():
            assert.Equal(t, testResponse.ModelTurn.Parts[0].Text, resp.ModelTurn.Parts[0].Text)
        case <-time.After(time.Second):
            t.Fatal("Timeout waiting for response")
        }
    })
}

// Test Client
func TestClient(t *testing.T) {
    t.Run("NewClient validation", func(t *testing.T) {
        config := &gemini.Config{
            APIKey:      "test-key",
            WebSocketURL: "ws://test.example.com",
        }
        
        client, err := gemini.NewClient(config)
        assert.NoError(t, err)
        assert.NotNil(t, client)
        
        // Test with nil config
        client, err = gemini.NewClient(nil)
        assert.Error(t, err)
        assert.Nil(t, client)
    })

    t.Run("Client handles connection errors", func(t *testing.T) {
        config := &gemini.Config{
            APIKey:      "test-key",
            WebSocketURL: "ws://invalid.example.com",
        }
        
        client, _ := gemini.NewClient(config)
        err := client.Connect()
        assert.Error(t, err)
    })

    t.Run("Client properly closes", func(t *testing.T) {
        config := &gemini.Config{
            APIKey:      "test-key",
            WebSocketURL: "ws://test.example.com",
        }
        
        client, _ := gemini.NewClient(config)
        err := client.Close()
        assert.NoError(t, err)
    })
}

// Test Config
func TestConfig(t *testing.T) {
    t.Run("DefaultConfig provides valid defaults", func(t *testing.T) {
        config := gemini.DefaultConfig()
        
        assert.Equal(t, 16000, config.InputSampleRate)
        assert.Equal(t, 24000, config.OutputSampleRate)
        assert.Equal(t, 512, config.AudioBuffer)
        assert.Equal(t, "gemini-pro-vision", config.Model)
        assert.Equal(t, "LINEAR16", config.Generation.SpeechConfig.Encoding)
    })

    t.Run("LoadConfigFromEnv overrides defaults", func(t *testing.T) {
        t.Setenv("GEMINI_INPUT_SAMPLE_RATE", "48000")
        t.Setenv("GEMINI_MODEL", "custom-model")
        t.Setenv("GEMINI_TEMPERATURE", "0.8")
        
        config := gemini.LoadConfigFromEnv()
        assert.Equal(t, 48000, config.InputSampleRate)
        assert.Equal(t, "custom-model", config.Model)
        assert.Equal(t, 0.8, config.Generation.Temperature)
    })

    t.Run("LoadConfigFromEnv handles invalid values", func(t *testing.T) {
        t.Setenv("GEMINI_INPUT_SAMPLE_RATE", "invalid")
        t.Setenv("GEMINI_TEMPERATURE", "invalid")
        
        config := gemini.LoadConfigFromEnv()
        // Should fall back to defaults for invalid values
        assert.Equal(t, 16000, config.InputSampleRate)
        assert.Equal(t, 0.7, config.Generation.Temperature)
    })
}