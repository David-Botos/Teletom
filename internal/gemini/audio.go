// internal/gemini/audio.go
package gemini

import (
    "bytes"
    "encoding/binary"
    "errors"
    "io"
)

// AudioProcessor handles audio format conversion and processing
type AudioProcessor struct {
    inputSampleRate  int
    outputSampleRate int
    buffer          *bytes.Buffer
    bytesPerSample  int
}

// NewAudioProcessor creates a new audio processor with specified sample rates
func NewAudioProcessor(inputSampleRate, outputSampleRate int) *AudioProcessor {
    return &AudioProcessor{
        inputSampleRate:  inputSampleRate,
        outputSampleRate: outputSampleRate,
        buffer:          bytes.NewBuffer(nil),
        bytesPerSample:  2, // 16-bit PCM
    }
}

// ProcessAudioChunk converts audio data to the required format
func (ap *AudioProcessor) ProcessAudioChunk(data []byte) (*AudioChunk, error) {
    if len(data)%ap.bytesPerSample != 0 {
        return nil, errors.New("invalid audio data length")
    }

    // Convert to int16 samples
    samples := make([]int16, len(data)/ap.bytesPerSample)
    if err := binary.Read(bytes.NewReader(data), binary.LittleEndian, &samples); err != nil {
        return nil, err
    }

    // Resample if necessary
    if ap.inputSampleRate != ap.outputSampleRate {
        samples = ap.resample(samples)
    }

    // Convert back to bytes
    processedData := make([]byte, len(samples)*ap.bytesPerSample)
    buffer := bytes.NewBuffer(processedData[:0])
    for _, sample := range samples {
        binary.Write(buffer, binary.LittleEndian, sample)
    }

    return &AudioChunk{
        Data:       buffer.Bytes(),
        SampleRate: ap.outputSampleRate,
        Channels:   1, // Mono
        Format:     "LINEAR16",
    }, nil
}

// resample performs simple linear interpolation resampling
// TODO: For production, consider using a more sophisticated resampling algorithm
// TODO: Options include a higher quality resampling algorithm like Sinc interpolation or the Lanczos algorithm
// TODO: Or better yet, use an established audio processing library like github.com/hajimehoshi/go-mp3 or github.com/gordonklaus/portaudio
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

// AudioBuffer manages buffering of incoming audio data
type AudioBuffer struct {
    buffer    *bytes.Buffer
    chunkSize int
}

// NewAudioBuffer creates a new audio buffer with specified chunk size
func NewAudioBuffer(chunkSize int) *AudioBuffer {
    return &AudioBuffer{
        buffer:    bytes.NewBuffer(nil),
        chunkSize: chunkSize,
    }
}

// Write adds data to the buffer and returns complete chunks
func (ab *AudioBuffer) Write(data []byte) ([][]byte, error) {
    _, err := ab.buffer.Write(data)
    if err != nil {
        return nil, err
    }

    var chunks [][]byte
    for ab.buffer.Len() >= ab.chunkSize {
        chunk := make([]byte, ab.chunkSize)
        _, err := io.ReadFull(ab.buffer, chunk)
        if err != nil {
            return chunks, err
        }
        chunks = append(chunks, chunk)
    }

    return chunks, nil
}