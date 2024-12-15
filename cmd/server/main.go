// cmd/server/main.go
package main

import (
    "html/template"
    "log"
    "net/http"
    "os"
    "path/filepath"
    
    "github.com/joho/godotenv"
    "github.com/David-Botos/BearHug/internal/handlers"
    "github.com/David-Botos/BearHug/internal/bearHugAudioSocket"
    "github.com/David-Botos/BearHug/internal/gemini"
)

func init() {
    // Load .env file if it exists
    if err := godotenv.Load(); err != nil {
        log.Printf("No .env file found: %v", err)
    }
}

// setupStaticFileServer creates a handler for serving static files based on environment
func setupStaticFileServer(isDev bool) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        if isDev {
            // Try web/static first
            if file, err := os.Open(filepath.Join("web/static", r.URL.Path)); err == nil {
                file.Close()
                http.FileServer(http.Dir("web/static")).ServeHTTP(w, r)
                return
            }
            // Then try cmd/web/static
            if file, err := os.Open(filepath.Join("cmd/web/static", r.URL.Path)); err == nil {
                file.Close()
                http.FileServer(http.Dir("cmd/web/static")).ServeHTTP(w, r)
                return
            }
            http.NotFound(w, r)
            return
        }
        // TODO: Production mode: only serve from web/static
        http.FileServer(http.Dir("web/static")).ServeHTTP(w, r)
    })
}

// handleIndex serves the main template
func handleIndex(w http.ResponseWriter, r *http.Request) {
    // Only handle the root path
    if r.URL.Path != "/" {
        http.NotFound(w, r)
        return
    }
    
    // Get working directory for template path
    wd, err := os.Getwd()
    if err != nil {
        log.Printf("Error getting working directory: %v", err)
        http.Error(w, "Internal Server Error", http.StatusInternalServerError)
        return
    }
    
    templatePath := filepath.Join(wd, "web", "templates", "index.html")
    
    // Verify template exists
    if _, err := os.Stat(templatePath); os.IsNotExist(err) {
        log.Printf("Template file does not exist at %s: %v", templatePath, err)
        http.Error(w, "Template not found", http.StatusInternalServerError)
        return
    }
    
    // Parse and execute template
    tmpl, err := template.ParseFiles(templatePath)
    if err != nil {
        log.Printf("Error parsing template: %v", err)
        http.Error(w, "Internal Server Error", http.StatusInternalServerError)
        return
    }
    
    if err := tmpl.Execute(w, nil); err != nil {
        log.Printf("Error executing template: %v", err)
        http.Error(w, "Internal Server Error", http.StatusInternalServerError)
        return
    }
}

func main() {
    // Setup logging
    log.SetFlags(log.Lshortfile | log.LstdFlags)
    
    // Get port from environment variable or default to 8080
    port := os.Getenv("PORT")
    if port == "" {
        port = "8080"
    }
    
    // Check development mode
    isDev := os.Getenv("GO_ENV") == "development"
    
    // Initialize routes
    mux := http.NewServeMux()
    
    // Setup static file serving
    staticHandler := http.StripPrefix("/static/", setupStaticFileServer(isDev))
    mux.Handle("/static/", staticHandler)
    
    // Health check endpoint
    mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
        w.Write([]byte("OK"))
    })
    
    // Root handler for serving the index template
    mux.HandleFunc("/", handleIndex)
    
    // Initialize WebSocket hub
    hub := bearHugAudioSocket.NewHub()
    go hub.Run()
    
    // Initialize Gemini configuration
    geminiConfig := gemini.LoadConfigFromEnv()
    
    // Create audio handler with both hub and Gemini
    audioHandler, err := handlers.NewAudioHandler(hub, geminiConfig)
    if err != nil {
        log.Fatal(err)
    }
    
    // Setup WebSocket endpoint
    mux.HandleFunc("/ws", audioHandler.HandleWebSocket)
    
    // Start server
    log.Printf("Starting server on port %s (Development mode: %v)", port, isDev)
    if err := http.ListenAndServe(":"+port, mux); err != nil {
        log.Fatal(err)
    }
}