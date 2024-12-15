// internal/gemini/audio.go
package gemini

import (
	"context"
	"encoding/binary"
	"errors"
	"fmt"
	"io"
	"sync"
	"time"
    "bytes"

	"github.com/smallnest/ringbuffer"
)

var (
    ErrBufferFull = errors.New("buffer full - applying backpressure")
    ErrEmptyChunk = errors.New("empty audio chunk")
)

// AudioProcessor handles real-time audio processing and buffering
type AudioProcessor struct {
    buffer           *ringbuffer.RingBuffer
    inputSampleRate  int
    outputSampleRate int
    bytesPerSample   int
    processedChan    chan *AudioChunk
    errorChan        chan error
    ctx              context.Context
    cancel           context.CancelFunc
    mu               sync.Mutex
}

// NewAudioProcessor creates a new audio processor using the provided config
func NewAudioProcessor(config *Config) *AudioProcessor {
    if config == nil {
        config = DefaultConfig()
    }
    
    ctx, cancel := context.WithCancel(context.Background())
    
    return &AudioProcessor{
        buffer:           ringbuffer.New(config.AudioBuffer).SetBlocking(true),
        inputSampleRate:  config.InputSampleRate,
        outputSampleRate: config.OutputSampleRate,
        bytesPerSample:   2, // 16-bit PCM
        processedChan:    make(chan *AudioChunk, 10),
        errorChan:        make(chan error, 10),
        ctx:              ctx,
        cancel:          cancel,
    }
}

// ProcessAudioChunk processes incoming audio data
func (ap *AudioProcessor) ProcessAudioChunk(data []byte) (*AudioChunk, error) {
    if len(data) == 0 {
        return nil, ErrEmptyChunk
    }

    if len(data)%ap.bytesPerSample != 0 {
        return nil, fmt.Errorf("invalid audio chunk size: %d bytes (must be multiple of %d)", len(data), ap.bytesPerSample)
    }

    // Convert to samples for processing
    samples := make([]int16, len(data)/ap.bytesPerSample)
    if err := binary.Read(bytes.NewReader(data), binary.LittleEndian, &samples); err != nil {
        return nil, fmt.Errorf("failed to convert bytes to samples: %w", err)
    }

    // Resample if necessary
    if ap.inputSampleRate != ap.outputSampleRate {
        samples = ap.resample(samples)
    }

    // Convert back to bytes
    processedData := make([]byte, len(samples)*ap.bytesPerSample)
    for i, sample := range samples {
        binary.LittleEndian.PutUint16(processedData[i*ap.bytesPerSample:], uint16(sample))
    }

    // Write to buffer
    n, err := ap.buffer.TryWrite(processedData)
    if err != nil || n < len(processedData) {
        // If non-blocking write fails, try blocking write
        n, err = ap.buffer.Write(processedData)
        if err != nil {
            return nil, fmt.Errorf("failed to write to buffer: %w", err)
        }
        if n < len(processedData) {
            return nil, ErrBufferFull
        }
    }

    return &AudioChunk{
        Data:       processedData,
        SampleRate: ap.outputSampleRate,
        Channels:   1,
        Format:     "LINEAR16",
    }, nil
}

// ReadProcessedAudio reads and processes audio from the buffer
func (ap *AudioProcessor) ReadProcessedAudio(chunkSize int) (*AudioChunk, error) {
    if ap.buffer.Length() < chunkSize {
        return nil, io.EOF
    }

    data := make([]byte, chunkSize)
    n, err := ap.buffer.Read(data)
    if err != nil {
        return nil, fmt.Errorf("failed to read from buffer: %w", err)
    }
    if n < chunkSize {
        return nil, io.ErrShortBuffer
    }

    // Convert to samples for processing
    samples := make([]int16, n/ap.bytesPerSample)
    err = binary.Read(bytes.NewReader(data[:n]), binary.LittleEndian, &samples)
    if err != nil {
        return nil, fmt.Errorf("failed to convert bytes to samples: %w", err)
    }

    // Resample if necessary
    if ap.inputSampleRate != ap.outputSampleRate {
        samples = ap.resample(samples)
    }

    // Convert back to bytes
    processedData := make([]byte, len(samples)*ap.bytesPerSample)
    for i, sample := range samples {
        binary.LittleEndian.PutUint16(processedData[i*ap.bytesPerSample:], uint16(sample))
    }

    return &AudioChunk{
        Data:       processedData,
        SampleRate: ap.outputSampleRate,
        Channels:   1,
        Format:     "LINEAR16",
    }, nil
}


// resample performs linear interpolation resampling
func (ap *AudioProcessor) resample(samples []int16) []int16 {
	ratio := float64(ap.outputSampleRate) / float64(ap.inputSampleRate)
	outputLength := int(float64(len(samples)) * ratio)
	output := make([]int16, outputLength)

	for i := range output {
		position := float64(i) / ratio
		index := int(position)
		
		if index >= len(samples)-1 {
			output[i] = samples[len(samples)-1]
			continue
		}

		fraction := position - float64(index)
		sample1 := float64(samples[index])
		sample2 := float64(samples[index+1])
		interpolated := sample1 + (sample2-sample1)*fraction
		output[i] = int16(interpolated)
	}

	return output
}

// Start begins processing audio in a separate goroutine
func (ap *AudioProcessor) Start(chunkSize int) {
	go func() {
		defer ap.cancel()

		for {
			select {
			case <-ap.ctx.Done():
				return
			default:
				chunk, err := ap.ReadProcessedAudio(chunkSize)
				if err != nil {
					if !errors.Is(err, io.EOF) {
						ap.errorChan <- err
					}
					time.Sleep(10 * time.Millisecond) // Prevent tight loop when buffer is empty
					continue
				}

				select {
				case ap.processedChan <- chunk:
				default:
					// Channel is full, apply backpressure
					ap.errorChan <- errors.New("processing pipeline full - dropping chunk")
				}
			}
		}
	}()
}

// Stop gracefully stops the audio processor
func (ap *AudioProcessor) Stop() {
	ap.mu.Lock()
	defer ap.mu.Unlock()

	ap.cancel()
	ap.buffer.CloseWriter()
}

// GetProcessedChan returns the channel for processed audio chunks
func (ap *AudioProcessor) GetProcessedChan() <-chan *AudioChunk {
	return ap.processedChan
}

// GetErrorChan returns the channel for processing errors
func (ap *AudioProcessor) GetErrorChan() <-chan error {
	return ap.errorChan
}

// Reset clears the buffer and resets the processor state
func (ap *AudioProcessor) Reset() {
	ap.mu.Lock()
	defer ap.mu.Unlock()

	ap.buffer.Reset()
}