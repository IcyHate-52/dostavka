package store

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"sort"
	"sync"
	"time"

	"dispatch-board-backend/internal/models"
)

var (
	ErrNotFound      = errors.New("order not found")
	ErrInvalidMove   = errors.New("cannot skip a column: move one step at a time")
	ErrAtBoundary    = errors.New("order is already at the first/last column")
	ErrValidation    = errors.New("validation error")
)

// Store is the contract the HTTP handlers depend on. Today it's backed by
// a JSON file; swapping to Postgres/Mongo later only means writing a new
// implementation of this interface — handlers and the frontend contract
// don't change.
type Store interface {
	List() []models.Order
	Create(input models.CreateOrderInput) (models.Order, error)
	Move(id int, direction string) (models.Order, error)
	Delete(id int) error
	ArchiveExpired() int
}

type fileState struct {
	NextID  int            `json:"nextId"`
	Orders  []models.Order `json:"orders"`
	Archive []models.Order `json:"archive"`
}

type JSONFileStore struct {
	mu      sync.Mutex
	path    string
	nextID  int
	orders  []models.Order
	archive []models.Order
}

func NewJSONFileStore(path string) (*JSONFileStore, error) {
	s := &JSONFileStore{path: path}
	if err := s.load(); err != nil {
		return nil, err
	}
	return s, nil
}

func (s *JSONFileStore) load() error {
	data, err := os.ReadFile(s.path)
	if errors.Is(err, os.ErrNotExist) {
		s.nextID = 1424
		return nil
	}
	if err != nil {
		return err
	}
	var state fileState
	if err := json.Unmarshal(data, &state); err != nil {
		return err
	}
	s.nextID = state.NextID
	s.orders = state.Orders
	s.archive = state.Archive
	if s.nextID == 0 {
		s.nextID = 1424
	}
	return nil
}

func (s *JSONFileStore) persist() error {
	state := fileState{NextID: s.nextID, Orders: s.orders, Archive: s.archive}
	data, err := json.MarshalIndent(state, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(s.path, data, 0644)
}

func (s *JSONFileStore) List() []models.Order {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := make([]models.Order, len(s.orders))
	copy(out, s.orders)
	// "Новый": oldest on top (first in queue). Other columns: newest on top.
	sort.SliceStable(out, func(i, j int) bool {
		a, b := out[i], out[j]
		if a.Status != b.Status {
			return false // grouping by status handled by frontend per column
		}
		if a.Status == models.StatusNew {
			return a.CreatedAt.Before(b.CreatedAt)
		}
		return a.StatusChangedAt.After(b.StatusChangedAt)
	})
	return out
}

func (s *JSONFileStore) Create(input models.CreateOrderInput) (models.Order, error) {
	if input.ClientName == "" || input.Address == "" {
		return models.Order{}, fmt.Errorf("%w: clientName and address are required", ErrValidation)
	}
	if input.Sum <= 0 {
		return models.Order{}, fmt.Errorf("%w: sum must be a positive number", ErrValidation)
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now()
	order := models.Order{
		ID:              s.nextID,
		ClientName:      input.ClientName,
		Address:         input.Address,
		Sum:             input.Sum,
		Comment:         input.Comment,
		Status:          models.StatusNew,
		CreatedAt:       now,
		StatusChangedAt: now,
	}
	s.nextID++
	s.orders = append(s.orders, order)
	if err := s.persist(); err != nil {
		return models.Order{}, err
	}
	return order, nil
}

func (s *JSONFileStore) Move(id int, direction string) (models.Order, error) {
	if direction != "forward" && direction != "backward" {
		return models.Order{}, fmt.Errorf("%w: direction must be forward or backward", ErrValidation)
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	for i := range s.orders {
		if s.orders[i].ID != id {
			continue
		}
		cur := models.StatusIndex(s.orders[i].Status)
		next := cur
		if direction == "forward" {
			next = cur + 1
		} else {
			next = cur - 1
		}
		if next < 0 || next >= len(models.StatusOrder) {
			return models.Order{}, ErrAtBoundary
		}
		s.orders[i].Status = models.StatusOrder[next]
		s.orders[i].StatusChangedAt = time.Now()
		if err := s.persist(); err != nil {
			return models.Order{}, err
		}
		return s.orders[i], nil
	}
	return models.Order{}, ErrNotFound
}

// Delete permanently removes an order from the active board (used by the
// "Удалить" button — the dispatcher cancelled or mis-entered an order).
func (s *JSONFileStore) Delete(id int) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	for i, o := range s.orders {
		if o.ID == id {
			s.orders = append(s.orders[:i], s.orders[i+1:]...)
			return s.persist()
		}
	}
	return ErrNotFound
}

// ArchiveExpired moves orders that have been "Доставлен" for more than one
// minute out of the active board into the archive (kept on disk, never
// shown on the board again). Returns how many were archived.
func (s *JSONFileStore) ArchiveExpired() int {
	s.mu.Lock()
	defer s.mu.Unlock()

	cutoff := time.Now().Add(-1 * time.Minute)
	var keep []models.Order
	archived := 0
	for _, o := range s.orders {
		if o.Status == models.StatusDelivered && o.StatusChangedAt.Before(cutoff) {
			s.archive = append(s.archive, o)
			archived++
			continue
		}
		keep = append(keep, o)
	}
	if archived > 0 {
		s.orders = keep
		_ = s.persist()
	}
	return archived
}
