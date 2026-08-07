package postgres

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/portfolio/backend-go/internal/domain"
)

const queryExperience = `
SELECT id::text, company, role, COALESCE(location, ''), start_date, end_date,
       COALESCE(description, ''), COALESCE(achievements, '[]'::jsonb),
       COALESCE(tech, '[]'::jsonb), display_order
FROM experience
WHERE deleted_at IS NULL
ORDER BY (end_date IS NULL) DESC, start_date DESC, display_order`

// ExperienceRepo implements domain.ExperienceRepository.
type ExperienceRepo struct {
	pool *pgxpool.Pool
}

// NewExperienceRepo builds the repository.
func NewExperienceRepo(pool *pgxpool.Pool) *ExperienceRepo {
	return &ExperienceRepo{pool: pool}
}

// List returns experience entries, current position first, then most recent.
func (r *ExperienceRepo) List(ctx context.Context) ([]domain.Experience, error) {
	rows, err := r.pool.Query(ctx, queryExperience)
	if err != nil {
		return nil, fmt.Errorf("querying experience: %w", err)
	}
	defer rows.Close()

	items := make([]domain.Experience, 0)
	for rows.Next() {
		var e domain.Experience
		if err := rows.Scan(
			&e.ID, &e.Company, &e.Role, &e.Location, &e.StartDate, &e.EndDate,
			&e.Description, &e.Achievements, &e.Tech, &e.DisplayOrder,
		); err != nil {
			return nil, fmt.Errorf("scanning experience: %w", err)
		}
		if e.Achievements == nil {
			e.Achievements = []string{}
		}
		if e.Tech == nil {
			e.Tech = []string{}
		}
		items = append(items, e)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating experience: %w", err)
	}
	return items, nil
}
