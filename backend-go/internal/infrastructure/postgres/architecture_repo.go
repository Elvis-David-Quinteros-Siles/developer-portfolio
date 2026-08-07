package postgres

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/portfolio/backend-go/internal/domain"
)

const queryArchitectureTopics = `
SELECT id::text, slug, title, category, COALESCE(description, ''),
       COALESCE(diagram_url, ''), display_order
FROM architecture_topic
WHERE deleted_at IS NULL
ORDER BY display_order, title`

// ArchitectureRepo implements domain.ArchitectureTopicRepository.
type ArchitectureRepo struct {
	pool *pgxpool.Pool
}

// NewArchitectureRepo builds the repository.
func NewArchitectureRepo(pool *pgxpool.Pool) *ArchitectureRepo {
	return &ArchitectureRepo{pool: pool}
}

// List returns the architecture topics ordered for display.
func (r *ArchitectureRepo) List(ctx context.Context) ([]domain.ArchitectureTopic, error) {
	rows, err := r.pool.Query(ctx, queryArchitectureTopics)
	if err != nil {
		return nil, fmt.Errorf("querying architecture topics: %w", err)
	}
	defer rows.Close()

	items := make([]domain.ArchitectureTopic, 0)
	for rows.Next() {
		var t domain.ArchitectureTopic
		if err := rows.Scan(
			&t.ID, &t.Slug, &t.Title, &t.Category, &t.Description,
			&t.DiagramURL, &t.DisplayOrder,
		); err != nil {
			return nil, fmt.Errorf("scanning architecture topic: %w", err)
		}
		items = append(items, t)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating architecture topics: %w", err)
	}
	return items, nil
}
