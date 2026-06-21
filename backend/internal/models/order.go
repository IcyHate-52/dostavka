package models

import "time"

// Status values match the dispatcher board columns exactly (in order).
const (
	StatusNew        = "Новый"
	StatusPreparing  = "Готовится"
	StatusInTransit  = "В пути"
	StatusDelivered  = "Доставлен"
)

// StatusOrder defines the only allowed sequence of transitions.
// A card may only move one step left or right inside this list.
var StatusOrder = []string{StatusNew, StatusPreparing, StatusInTransit, StatusDelivered}

func StatusIndex(status string) int {
	for i, s := range StatusOrder {
		if s == status {
			return i
		}
	}
	return -1
}

// Order is the core entity. Field names/JSON tags follow the structure
// fixed in the spec so the frontend contract doesn't change if the
// storage layer is swapped later (JSON file -> Postgres/Mongo etc).
type Order struct {
	ID              int       `json:"id"`
	ClientName      string    `json:"clientName"`
	Address         string    `json:"address"`
	Sum             float64   `json:"sum"`
	Comment         string    `json:"comment,omitempty"`
	Status          string    `json:"status"`
	CreatedAt       time.Time `json:"createdAt"`
	StatusChangedAt time.Time `json:"statusChangedAt"`
}

// CreateOrderInput is the payload accepted from the "Создать заказ" modal.
type CreateOrderInput struct {
	ClientName string  `json:"clientName"`
	Address    string  `json:"address"`
	Sum        float64 `json:"sum"`
	Comment    string  `json:"comment"`
}

// MoveDirection is sent by the "→" / "←" buttons or by a drag-and-drop
// release onto an adjacent column.
type MoveRequest struct {
	Direction string `json:"direction"` // "forward" or "backward"
}
