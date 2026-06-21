# --- Stage 1: build the React frontend -------------------------------------
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json ./
RUN npm install
COPY frontend/ ./
# Same-origin deploy: API and frontend are served by the same Go server,
# so requests stay relative ("/api/orders") instead of hardcoding a host.
ENV VITE_API_URL=""
RUN npm run build

# --- Stage 2: build the Go backend ------------------------------------------
FROM golang:1.22-alpine AS backend-build
WORKDIR /app/backend
COPY backend/go.mod ./
COPY backend/ ./
RUN go build -o /app/server ./cmd/server

# --- Stage 3: final runtime image -------------------------------------------
FROM alpine:3.20
WORKDIR /app
COPY --from=backend-build /app/server ./server
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

ENV FRONTEND_DIST=/app/frontend/dist
ENV DATA_FILE=/app/data/orders.json

EXPOSE 8080
CMD ["./server"]
