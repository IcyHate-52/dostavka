package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"dispatch-board-backend/internal/models"
	"dispatch-board-backend/internal/store"
)

type OrdersHandler struct {
	Store store.Store
}

func NewOrdersHandler(s store.Store) *OrdersHandler {
	return &OrdersHandler{Store: s}
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

// CORS настройка для продакшена
func CORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Для продакшена - указываем конкретный домен
		// Для разработки - можно использовать "*"
		origin := r.Header.Get("Origin")
		
		// Список разрешенных доменов
		allowedOrigins := []string{
			"http://localhost:5173",        // Vite dev server
			"http://localhost:8080",         // Local backend
			"https://your-app.onrender.com", // Замените на ваш Render URL
		}
		
		// Проверяем, разрешен ли origin
		allowed := false
		for _, o := range allowedOrigins {
			if o == origin {
				allowed = true
				break
			}
		}
		
		// Если origin разрешен - устанавливаем его
		if allowed {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		} else {
			// Для разработки можно разрешить все
			w.Header().Set("Access-Control-Allow-Origin", "*")
		}
		
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
		w.Header().Set("Access-Control-Expose-Headers", "Content-Length, Content-Type")
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		
		// Обработка preflight запросов
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		
		next.ServeHTTP(w, r)
	})
}

// Упрощенная версия для разработки (если не хотите заморачиваться)
func CORSDev(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		
		next.ServeHTTP(w, r)
	})
}

// GET /api/orders
func (h *OrdersHandler) List(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, h.Store.List())
}

// POST /api/orders
func (h *OrdersHandler) Create(w http.ResponseWriter, r *http.Request) {
	var input models.CreateOrderInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	order, err := h.Store.Create(input)
	if err != nil {
		if errors.Is(err, store.ErrValidation) {
			writeError(w, http.StatusUnprocessableEntity, err.Error())
			return
		}
		writeError(w, http.StatusInternalServerError, "could not create order")
		return
	}
	writeJSON(w, http.StatusCreated, order)
}

// PATCH /api/orders/{id}/move  body: {"direction":"forward"|"backward"}
func (h *OrdersHandler) Move(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid order id")
		return
	}
	var body models.MoveRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body")
		return
	}
	order, err := h.Store.Move(id, body.Direction)
	if err != nil {
		switch {
		case errors.Is(err, store.ErrNotFound):
			writeError(w, http.StatusNotFound, "order not found")
		case errors.Is(err, store.ErrAtBoundary):
			writeError(w, http.StatusConflict, "order is already at the first/last column")
		case errors.Is(err, store.ErrValidation):
			writeError(w, http.StatusUnprocessableEntity, err.Error())
		default:
			writeError(w, http.StatusInternalServerError, "could not move order")
		}
		return
	}
	writeJSON(w, http.StatusOK, order)
}

// DELETE /api/orders/{id}
func (h *OrdersHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid order id")
		return
	}
	if err := h.Store.Delete(id); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			writeError(w, http.StatusNotFound, "order not found")
			return
		}
		writeError(w, http.StatusInternalServerError, "could not delete order")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
