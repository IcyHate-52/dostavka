# --- Stage 1: build the frontend ---------------------------------------------
FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend

# Копируем package.json и устанавливаем зависимости
COPY frontend/package*.json ./
RUN npm install

# Устанавливаем типы для Node.js (уже есть в package.json, но на всякий случай)
RUN npm install --save-dev @types/node

# Копируем исходники и собираем
COPY frontend/ ./
RUN npm run build

# Проверяем, что сборка прошла успешно
RUN ls -la /app/frontend/dist || echo "❌ Dist folder not found!"

# --- Stage 2: build the Go backend -------------------------------------------
FROM golang:1.22-alpine AS backend-build
WORKDIR /app/backend

# Копируем go.mod и скачиваем зависимости
COPY backend/go.mod ./
RUN go mod download

# Копируем исходники
COPY backend/ ./

# Собираем бекенд
RUN go build -o /app/server ./cmd/server

# --- Stage 3: final runtime --------------------------------------------------
FROM alpine:latest
WORKDIR /app

# Устанавливаем необходимые пакеты
RUN apk add --no-cache ca-certificates

# Копируем собранный фронтенд
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Копируем бекенд
COPY --from=backend-build /app/server ./server

# Делаем сервер исполняемым
RUN chmod +x ./server

# Проверяем, что фронтенд скопировался
RUN ls -la /app/frontend/dist/ || echo "❌ Frontend dist not found in final stage!"

# Открываем порт
EXPOSE 8080

# Запускаем сервер
CMD ["./server"]
