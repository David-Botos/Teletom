package logger

import (
	"fmt"
	"log"
	"time"
)

// Logger provides consistent formatted logging across the application
type Logger struct {
	prefix string
}

// NewLogger creates a new logger instance
func NewLogger(prefix string) *Logger {
	return &Logger{prefix: prefix}
}

func (l *Logger) log(icon, level, message string) {
	timestamp := time.Now().Format("15:04:05.000")
	formatted := fmt.Sprintf("%s %s %s: %s", timestamp, icon, level, message)
	log.Println(formatted)
}

func (l *Logger) Init(message string) {
	l.log("🚀", "INIT", message)
}

func (l *Logger) Success(message string) {
	l.log("✅", "SUCCESS", message)
}

func (l *Logger) Error(message string) {
	l.log("❌", "ERROR", message)
}

func (l *Logger) Warning(message string) {
	l.log("⚠️", "WARNING", message)
}

func (l *Logger) Info(message string) {
	l.log("ℹ️", "INFO", message)
}

func (l *Logger) Audio(message string) {
	l.log("🎤", "AUDIO", message)
}

func (l *Logger) WebSocket(message string) {
	l.log("🔌", "WEBSOCKET", message)
}

func (l *Logger) Processing(message string) {
	l.log("⚙️", "PROCESSING", message)
}

func (l *Logger) Transcript(message string) {
	l.log("📝", "TRANSCRIPT", message)
}

func (l *Logger) Cleanup(message string) {
	l.log("🧹", "CLEANUP", message)
}
