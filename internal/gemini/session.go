// internal/gemini/session.go
package gemini

import (
	"context"
	"errors"
	"log"
	"math/rand"
	"sync"
	"time"
    "fmt"
)

// Session represents a single conversation session with Gemini
type Session struct {
	ID            string
	client        GeminiClient
	audioProc     *AudioProcessor
	audioBuffer   *AudioBuffer
	context       context.Context
	cancel        context.CancelFunc
	responsesChan chan *ServerResponse
	errorsChan    chan error
	mu            sync.RWMutex
	turns         []Turn
	isActive      bool
}

// SessionOption allows for optional session configuration
type SessionOption func(*Session)

// NewSession creates a new conversation session
func NewSession(client GeminiClient, options ...SessionOption) (*Session, error) {
	if client == nil {
		return nil, errors.New("client cannot be nil")
	}

	ctx, cancel := context.WithCancel(context.Background())
	session := &Session{
		ID:            generateSessionID(),
		client:        client,
		audioProc:     NewAudioProcessor(DefaultConfig().InputSampleRate, DefaultConfig().OutputSampleRate),
		audioBuffer:   NewAudioBuffer(DefaultConfig().AudioBuffer),
		context:       ctx,
		cancel:        cancel,
		responsesChan: make(chan *ServerResponse, 10),
		errorsChan:    make(chan error, 10),
		isActive:      true,
	}

	for _, option := range options {
		option(session)
	}

	go session.processResponses()

	return session, nil
}

// ProcessAudio handles incoming audio data
func (s *Session) ProcessAudio(data []byte) error {
    s.mu.RLock()
    if !s.isActive {
        s.mu.RUnlock()
        return errors.New("session is not active")
    }
    s.mu.RUnlock()

    // Write to buffer and get chunks
    chunks, err := s.audioBuffer.Write(data)
    if err != nil {
        return fmt.Errorf("buffer write error: %w", err)
    }

    // Process each chunk, but return on first error
    for _, chunk := range chunks {
        // Process the audio chunk
        processedChunk, err := s.audioProc.ProcessAudioChunk(chunk)
        if err != nil {
            return fmt.Errorf("chunk processing error: %w", err)
        }

        // Send to client
        if err := s.client.ProcessAudio(processedChunk.Data); err != nil {
            return fmt.Errorf("client processing error: %w", err)
        }
    }

    return nil
}

// AddContextMessage adds a message to the conversation context
func (s *Session) AddContextMessage(role string, text string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.turns = append(s.turns, Turn{
		Role: role,
		Parts: []Part{{
			Text: text,
		}},
	})

	return s.client.ProcessAudio([]byte(text)) // Send as text input instead
}

// GetResponses returns a channel for receiving model responses
func (s *Session) GetResponses() <-chan *ServerResponse {
	return s.responsesChan
}

// GetErrors returns a channel for receiving session errors
func (s *Session) GetErrors() <-chan error {
	return s.errorsChan
}

// Close ends the session and cleans up resources
func (s *Session) Close() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if !s.isActive {
		return nil
	}

	s.isActive = false
	s.cancel()
	close(s.responsesChan)
	close(s.errorsChan)

	return s.client.Close()
}

// processResponses handles incoming server responses
func (s *Session) processResponses() {
	responseChan := s.client.GetResponses()
	for {
		select {
		case <-s.context.Done():
			return
		case response, ok := <-responseChan:
			if !ok {
				return
			}
			s.handleResponse(response)
		}
	}
}

// handleResponse processes server responses and updates session state
func (s *Session) handleResponse(response *ServerResponse) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if !s.isActive {
		return
	}

	// Add model response to conversation context
	if response != nil && response.ModelTurn.Role != "" {
		s.turns = append(s.turns, Turn{
			Role:  response.ModelTurn.Role,
			Parts: response.ModelTurn.Parts,
		})
	}

	// Send response to client
	select {
	case s.responsesChan <- response:
	default:
		log.Printf("Warning: Response channel full, dropping response")
	}
}

// generateSessionID creates a unique session identifier
func generateSessionID() string {
	return time.Now().Format("20060102150405") + "-" + randomString(6)
}

// Random string generation
var randSource = rand.NewSource(time.Now().UnixNano())
var randGenerator = rand.New(randSource)
var randMutex sync.Mutex

func randomString(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, length)

	randMutex.Lock()
	defer randMutex.Unlock()

	for i := range b {
		b[i] = charset[randGenerator.Intn(len(charset))]
	}
	return string(b)
}
