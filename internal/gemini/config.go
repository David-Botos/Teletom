// internal/gemini/config.go
package gemini

import (
    "os"
    "strconv"
)

// Config holds all configuration for the Gemini client
type Config struct {
    APIKey           string
    WebSocketURL     string
    InputSampleRate  int
    OutputSampleRate int
    Model           string
    Generation     GenerationConfig
}

// DefaultConfig returns a configuration with sensible defaults
func DefaultConfig() *Config {
    return &Config{
        APIKey:           os.Getenv("GEMINI_API_KEY"),
        WebSocketURL:     os.Getenv("GEMINI_WS_URL"),
        InputSampleRate:  16000,
        OutputSampleRate: 24000,
        Model:           "gemini-pro-vision",
        Generation: GenerationConfig{
            CandidateCount:    1,
            MaxOutputTokens:   1024,
            Temperature:       0.7,
            TopP:             0.8,
            TopK:             40,
            PresencePenalty:  0.0,
            FrequencyPenalty: 0.0,
            ResponseModality: "text,speech",
            SpeechConfig: struct {
                SampleRateHertz int    `json:"sample_rate_hertz"`
                Encoding        string `json:"encoding"`
            }{
                SampleRateHertz: 24000,
                Encoding:        "LINEAR16",
            },
        },
    }
}

// LoadConfigFromEnv loads configuration from environment variables
func LoadConfigFromEnv() *Config {
    config := DefaultConfig()
    
    if wsURL := os.Getenv("GEMINI_WS_URL"); wsURL != "" {
        config.WebSocketURL = wsURL
    }
    
    if sampleRate := os.Getenv("GEMINI_INPUT_SAMPLE_RATE"); sampleRate != "" {
        if rate, err := strconv.Atoi(sampleRate); err == nil {
            config.InputSampleRate = rate
        }
    }
    
    if model := os.Getenv("GEMINI_MODEL"); model != "" {
        config.Model = model
    }
    
    if temp := os.Getenv("GEMINI_TEMPERATURE"); temp != "" {
        if t, err := strconv.ParseFloat(temp, 64); err == nil {
            config.Generation.Temperature = t
        }
    }
    
    return config
}
