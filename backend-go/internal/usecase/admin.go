package usecase

import (
	"context"

	"github.com/portfolio/backend-go/internal/domain"
)

// Pagination bounds for the admin contact-messages listing.
const (
	DefaultPageSize = 20
	MaxPageSize     = 100
)

// AdminMessages implements the admin use case that lists received contact
// messages (read-only, Django owns the writes).
type AdminMessages struct {
	messages domain.ContactMessageRepository
}

// NewAdminMessages wires the admin messages use case.
func NewAdminMessages(messages domain.ContactMessageRepository) *AdminMessages {
	return &AdminMessages{messages: messages}
}

// List returns one normalized page of contact messages plus page metadata.
// page < 1 becomes 1; pageSize < 1 becomes DefaultPageSize; pageSize is
// capped at MaxPageSize.
func (u *AdminMessages) List(ctx context.Context, page, pageSize int) ([]domain.ContactMessage, domain.Page, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = DefaultPageSize
	}
	if pageSize > MaxPageSize {
		pageSize = MaxPageSize
	}

	offset := (page - 1) * pageSize
	items, total, err := u.messages.List(ctx, pageSize, offset)
	if err != nil {
		return nil, domain.Page{}, err
	}

	totalPages := int((total + int64(pageSize) - 1) / int64(pageSize))
	return items, domain.Page{
		Number:     page,
		Size:       pageSize,
		TotalItems: total,
		TotalPages: totalPages,
	}, nil
}
