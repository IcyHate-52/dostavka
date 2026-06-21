# --- Stage 1: build the frontend ---------------------------------------------
FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

# ✅ ВАЖНО: устанавливаем типы для Node.js
RUN npm install --save-dev @types/node

COPY frontend/ ./

# Собираем фронтенд
RUN npm run build

# Проверяем, что сборка прошла успешно
RUN if [ -d "/app/frontend/dist" ]; then \
        echo "✅ Frontend built successfully!"; \
        echo "📁 Contents of dist:"; \
        ls -la /app/frontend/dist/; \
    else \
        echo "❌ Frontend build failed - dist folder not found!"; \
        exit 1; \
    fi

# --- Stage 2: build the Go backend -------------------------------------------
FROM golang:1.22-alpine AS backend-build
WORKDIR /app/backend

COPY backend/go.mod ./
RUN go mod download

COPY backend/ ./
RUN go build -o /app/server ./cmd/server

# Проверяем, что сервер собрался
RUN if [ -f "/app/server" ]; then \
        echo "✅ Backend built successfully!"; \
    else \
        echo "❌ Backend build failed!"; \
        exit 1; \
    fi

# --- Stage 3: final runtime --------------------------------------------------
FROM alpine:latest
WORKDIR /app

RUN apk add --no-cache ca-certificates

# Копируем фронтенд
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Копируем бекенд
COPY --from=backend-build /app/server ./server

RUN chmod +x ./server

# Проверяем финальный образ
RUN if [ -d "/app/frontend/dist" ] && [ -f "/app/frontend/dist/index.html" ]; then \
        echo "✅ All files copied successfully!"; \
        echo "📁 Final directory structure:"; \
        ls -la /app/; \
        echo "📁 Frontend dist:"; \
        ls -la /app/frontend/dist/; \
    else \
        echo "❌ Frontend dist not found in final stage!"; \
        echo "📁 Current directory contents:"; \
        ls -la /app/; \
        exit 1; \
    fi

EXPOSE 8080
CMD ["./server"]
