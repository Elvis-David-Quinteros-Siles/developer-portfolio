package postgres

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/portfolio/backend-go/internal/domain"
)

const queryContactMessages = `
SELECT id::text, name, email, subject, message,
       COALESCE(ip_address::text, ''), COALESCE(user_agent, ''), status, created_at
FROM contact_message
WHERE deleted_at IS NULL
ORDER BY created_at DESC
LIMIT $1 OFFSET $2`

const queryCountContactMessages = `
SELECT COUNT(*)
FROM contact_message
WHERE deleted_at IS NULL`

// ContactMessageRepo implements domain.ContactMessageRepository (read-only;
// contact_message rows are written exclusively by Django, ADR-0003).
type ContactMessageRepo struct {
	pool *pgxpool.Pool
}

// NewContactMessageRepo builds the repository.
func NewContactMessageRepo(pool *pgxpool.Pool) *ContactMessageRepo {
	return &ContactMessageRepo{pool: pool}
}

// List returns one page of messages (created_at DESC) and the live total.
func (r *ContactMessageRepo) List(ctx context.Context, limit, offset int) ([]domain.ContactMessage, int64, error) {
	var total int64
	if err := r.pool.QueryRow(ctx, queryCountContactMessages).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("counting contact messages: %w", err)
	}

	rows, err := r.pool.Query(ctx, queryContactMessages, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("querying contact messages: %w", err)
	}
	defer rows.Close()

	items := make([]domain.ContactMessage, 0)
	for rows.Next() {
		var m domain.ContactMessage
		if err := rows.Scan(
			&m.ID, &m.Name, &m.Email, &m.Subject, &m.Message,
			&m.IPAddress, &m.UserAgent, &m.Status, &m.CreatedAt,
		); err != nil {
			return nil, 0, fmt.Errorf("scanning contact message: %w", err)
		}
		items = append(items, m)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterating contact messages: %w", err)
	}
	return items, total, nil
}
