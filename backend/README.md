# dispatch-board — backend (Go)

Plain `net/http` REST API, no external dependencies. Orders are persisted to a
JSON file (`data/orders.json`) behind a `Store` interface — swap in Postgres
or MongoDB later by writing a new implementation of `internal/store.Store`;
nothing else needs to change.

## Run

```bash
cd backend
go run ./cmd/server
# listening on :8080, board starts empty (no demo orders)
```

Env vars (optional):
- `ADDR` — listen address, default `:8080`
- `DATA_FILE` — path to the JSON storage file, default `data/orders.json`

## API

| Method | Path                     | Body                                  | Notes |
|--------|--------------------------|----------------------------------------|-------|
| GET    | `/api/orders`            | —                                       | List all active (non-archived) orders |
| POST   | `/api/orders`            | `{clientName, address, sum, comment?}` | Creates order in status "Новый" |
| PATCH  | `/api/orders/{id}/move`  | `{"direction": "forward"\|"backward"}` | Moves exactly one column; 409 at the edge |
| DELETE | `/api/orders/{id}`       | —                                       | Permanently removes the order (dispatcher cancel) |
| GET    | `/api/health`            | —                                       | Liveness check |

Statuses, in order: `Новый → Готовится → В пути → Доставлен`. The API
rejects any attempt to skip a column (e.g. straight from "Новый" to
"Доставлен") at the store layer, so the frontend can't bypass it even with
a malformed drag-and-drop drop.

The board starts **empty** — no demo/seed orders. Every order on the board
was either created through "+ Создать заказ" or already existed in
`data/orders.json` from a previous run.

A background goroutine sweeps every 15 seconds and moves orders that have
been "Доставлен" for more than **1 minute** into the archive (kept on disk
in `data/orders.json`, no longer returned by `GET /api/orders`).
