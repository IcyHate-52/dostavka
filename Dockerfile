# --- Stage 1: build the frontend ---------------------------------------------
FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend

# Копируем package.json и устанавливаем зависимости
COPY frontend/package*.json ./
RUN npm install

# УСТАНАВЛИВАЕМ ТИПЫ ДЛЯ NODE.JS
RUN npm install --save-dev @types/node

# Копируем исходники и собираем
COPY frontend/ ./
RUN npm run build

# --- Stage 2: build the Go backend -------------------------------------------
FROM golang:1.22-alpine AS backend-build
WORKDIR /app/backend

COPY backend/go.mod ./
RUN go mod download

COPY backend/ ./
RUN go build -o /app/server ./cmd/server

# --- Stage 3: final runtime --------------------------------------------------
FROM alpine:latest
WORKDIR /app

RUN apk add --no-cache ca-certificates

COPY --from=frontend-build /app/frontend/dist ./frontend/dist
COPY --from=backend-build /app/server ./server

RUN chmod +x ./server

EXPOSE 8080
CMD ["./server"]
