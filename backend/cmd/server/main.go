package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"dispatch-board-backend/internal/handlers"
	"dispatch-board-backend/internal/store"
)

// spaHandler serves the built frontend (frontend/dist) and falls back to
// index.html for unknown paths, so a browser refresh on any route works.
// If the dist folder doesn't exist (e.g. running backend-only locally),
// it serves nothing and lets API routes work as usual.
func spaHandler(distDir string) http.Handler {
	fs := http.FileServer(http.Dir(distDir))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fullPath := filepath.Join(distDir, filepath.Clean(r.URL.Path))
		if _, err := os.Stat(fullPath); os.IsNotExist(err) {
			http.ServeFile(w, r, filepath.Join(distDir, "index.html"))
			return
		}
		fs.ServeHTTP(w, r)
	})
}

func main() {
	dataPath := os.Getenv("DATA_FILE")
	if dataPath == "" {
		dataPath = "data/orders.json"
	}
	if dir := filepath.Dir(dataPath); dir != "." {
		_ = os.MkdirAll(dir, 0755)
	}

	s, err := store.NewJSONFileStore(dataPath)
	if err != nil {
		log.Fatalf("failed to init store: %v", err)
	}

	// Sweep periodically and move orders that have been "Доставлен" for
	// more than 1 minute into the archive.
	go func() {
		ticker := time.NewTicker(15 * time.Second)
		defer ticker.Stop()
		for range ticker.C {
			if n := s.ArchiveExpired(); n > 0 {
				log.Printf("archived %d delivered order(s)", n)
			}
		}
	}()

	h := handlers.NewOrdersHandler(s)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/orders", h.List)
	mux.HandleFunc("POST /api/orders", h.Create)
	mux.HandleFunc("PATCH /api/orders/{id}/move", h.Move)
	mux.HandleFunc("DELETE /api/orders/{id}", h.Delete)
	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	// Serve the built React app for everything else (same-origin deploy,
	// e.g. on Render). Harmless to register even if the folder is empty.
	distDir := os.Getenv("FRONTEND_DIST")
	if distDir == "" {
		distDir = "frontend/dist"
	}
	if _, err := os.Stat(distDir); err == nil {
		mux.Handle("/", spaHandler(distDir))
	}

	// Render (and most PaaS) inject PORT; fall back to ADDR/8080 for local runs.
	addr := os.Getenv("ADDR")
	if addr == "" {
		if port := os.Getenv("PORT"); port != "" {
			addr = ":" + port
		} else {
			addr = ":8080"
		}
	}

	log.Printf("dispatch-board backend listening on %s", addr)
	if err := http.ListenAndServe(addr, handlers.CORS(mux)); err != nil {
		log.Fatal(err)
	}
}
