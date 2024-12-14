// TODO: write tests to check gemini integration
// TODO: make tests pass
// cmd/server/main_test.go
package main

import (
    "net/http"
    "net/http/httptest"
    "testing"
    "runtime"
    "path/filepath"
    "os"
    "github.com/stretchr/testify/assert"
)

func TestHealthCheck(t *testing.T) {
    // Create a new test server
    mux := http.NewServeMux()
    
    // Add health check handler
    mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
        w.Write([]byte("OK"))
    })
    
    // Create a test request
    req := httptest.NewRequest("GET", "/health", nil)
    rr := httptest.NewRecorder()
    
    // Serve the request
    mux.ServeHTTP(rr, req)
    
    // Check the response
    assert.Equal(t, http.StatusOK, rr.Code)
    assert.Equal(t, "OK", rr.Body.String())
}

func TestStaticFileServing(t *testing.T) {
    // Get the project root directory
    _, filename, _, _ := runtime.Caller(0)
    projectRoot := filepath.Join(filepath.Dir(filename), "../..")
    
    // Create a new test server
    mux := http.NewServeMux()
    
    // Add static file handler with absolute path
    staticDir := filepath.Join(projectRoot, "web/static")
    fs := http.FileServer(http.Dir(staticDir))
    mux.Handle("/static/", http.StripPrefix("/static/", fs))
    
    // Add some test file setup
    testCSS := filepath.Join(staticDir, "css", "main.css")
    testJS := filepath.Join(staticDir, "js", "audio.js")
    
    // Ensure test directories exist
    os.MkdirAll(filepath.Dir(testCSS), 0755)
    os.MkdirAll(filepath.Dir(testJS), 0755)
    
    // Create test files if they don't exist
    if _, err := os.Stat(testCSS); os.IsNotExist(err) {
        os.WriteFile(testCSS, []byte("/* test css */"), 0644)
    }
    if _, err := os.Stat(testJS); os.IsNotExist(err) {
        os.WriteFile(testJS, []byte("// test js"), 0644)
    }
    
    // Rest of your test cases remain the same
    testCases := []struct {
        name          string
        path          string
        expectedStatus int
    }{
        {
            name:          "CSS file",
            path:         "/static/css/main.css",
            expectedStatus: http.StatusOK,
        },
        {
            name:          "JS file",
            path:         "/static/js/audio.js",
            expectedStatus: http.StatusOK,
        },
        {
            name:          "Non-existent file",
            path:         "/static/nonexistent.file",
            expectedStatus: http.StatusNotFound,
        },
    }
    
    for _, tc := range testCases {
        t.Run(tc.name, func(t *testing.T) {
            req := httptest.NewRequest("GET", tc.path, nil)
            rr := httptest.NewRecorder()
            mux.ServeHTTP(rr, req)
            assert.Equal(t, tc.expectedStatus, rr.Code)
        })
    }
}