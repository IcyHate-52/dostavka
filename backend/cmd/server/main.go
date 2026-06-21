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
		// Проверяем, существует ли запрошенный файл
		fullPath := filepath.Join(distDir, filepath.Clean(r.URL.Path))
		if _, err := os.Stat(fullPath); os.IsNotExist(err) {
			// Если файл не найден - отдаем index.html (для SPA маршрутизации)
			http.ServeFile(w, r, filepath.Join(distDir, "index.html"))
			return
		}
		fs.ServeHTTP(w, r)
	})
}

func main() {
	// Настройка хранилища данных
	dataPath := os.Getenv("DATA_FILE")
	if dataPath == "" {
		dataPath = "data/orders.json"
	}
	if dir := filepath.Dir(dataPath); dir != "." {
		_ = os.MkdirAll(dir, 0755)
	}

	// Инициализация хранилища
	s, err := store.NewJSONFileStore(dataPath)
	if err != nil {
		log.Fatalf("failed to init store: %v", err)
	}

	// Периодическая архивация доставленных заказов
	go func() {
		ticker := time.NewTicker(15 * time.Second)
		defer ticker.Stop()
		for range ticker.C {
			if n := s.ArchiveExpired(); n > 0 {
				log.Printf("archived %d delivered order(s)", n)
			}
		}
	}()

	// Создаем обработчики
	h := handlers.NewOrdersHandler(s)

	// Настраиваем маршруты
	mux := http.NewServeMux()
	
	// API маршруты
	mux.HandleFunc("GET /api/orders", h.List)
	mux.HandleFunc("POST /api/orders", h.Create)
	mux.HandleFunc("PATCH /api/orders/{id}/move", h.Move)
	mux.HandleFunc("DELETE /api/orders/{id}", h.Delete)
	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	})

	// Обслуживание статики фронтенда
	// ВАЖНО: проверяем несколько возможных путей для фронтенда
	distDir := os.Getenv("FRONTEND_DIST")
	if distDir == "" {
		// Пробуем разные возможные пути
		possiblePaths := []string{
			"frontend/dist",
			"../frontend/dist",
			"/app/frontend/dist", // для Docker
		}
		
		for _, path := range possiblePaths {
			if _, err := os.Stat(path); err == nil {
				distDir = path
				break
			}
		}
		
		// Если не нашли - используем путь по умолчанию
		if distDir == "" {
			distDir = "frontend/dist"
		}
	}
	
	// Проверяем наличие папки с фронтендом
	if _, err := os.Stat(distDir); err == nil {
		log.Printf("✅ Serving frontend from: %s", distDir)
		mux.Handle("/", spaHandler(distDir))
	} else {
		log.Printf("⚠️  Frontend dist not found at %s, serving API only", distDir)
		log.Printf("   Current working directory: %s", getWorkingDir())
	}

	// Настройка адреса для прослушивания
	addr := os.Getenv("ADDR")
	if addr == "" {
		if port := os.Getenv("PORT"); port != "" {
			addr = ":" + port
		} else {
			addr = ":8080"
		}
	}

	// Запускаем сервер с CORS middleware
	log.Printf("🚀 Server starting on %s", addr)
	log.Printf("📡 API available at http://localhost%s/api/orders", addr)
	if distDir != "" {
		log.Printf("🌐 Frontend available at http://localhost%s", addr)
	}
	
	if err := http.ListenAndServe(addr, handlers.CORS(mux)); err != nil {
		log.Fatal(err)
	}
}

// Вспомогательная функция для отладки
func getWorkingDir() string {
	dir, err := os.Getwd()
	if err != nil {
		return "unknown"
	}
	return dir
}
