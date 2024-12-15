// internal/gemini/session.go
package gemini

import (
	"context"
	"errors"
	"fmt"
	"log"
	"math/rand"
	"sync"
	"time"
)

// NewSession creates a new conversation session
func NewSession(client GeminiClient, config *Config, options ...SessionOption) (*Session, error) {
	if client == nil {
		return nil, errors.New("client cannot be nil")
	}

	if config == nil {
		config = DefaultConfig()
	}

	ctx, cancel := context.WithCancel(context.Background())
	session := &Session{
		ID:            generateSessionID(),
		client:        client,
		audioProc:     NewAudioProcessor(config),
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
	go session.handleAudioPipeline()

	return session, nil
}

// HandleIncomingAudio is the public API for submitting raw audio data for processing
func (s *Session) HandleIncomingAudio(rawAudio []byte) error {
	s.mu.RLock()
	isActive := s.isActive
	s.mu.RUnlock()

	if !isActive {
		return errors.New("session is not active")
	}

	processedChunk, err := s.audioProc.ProcessAudioChunk(rawAudio)
	if err != nil {
		return fmt.Errorf("audio processing error: %w", err)
	}

	return s.client.ProcessAudio(processedChunk.Data)
}

// handleAudioPipeline is the internal goroutine that manages the continuous
// flow of audio data through the processing pipeline
func (s *Session) handleAudioPipeline() {
	for {
		select {
		case <-s.context.Done():
			return
		case err := <-s.audioProc.GetErrorChan():
			s.errorsChan <- fmt.Errorf("audio pipeline error: %w", err)
		case chunk := <-s.audioProc.GetProcessedChan():
			if err := s.client.ProcessAudio(chunk.Data); err != nil {
				s.errorsChan <- fmt.Errorf("audio transmission error: %w", err)
			}
		}
	}
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
