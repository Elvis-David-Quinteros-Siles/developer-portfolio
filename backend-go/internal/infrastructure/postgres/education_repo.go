package postgres

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/portfolio/backend-go/internal/domain"
)

const queryEducation = `
SELECT id::text, institution, degree, COALESCE(field, ''), start_date, end_date,
       COALESCE(description, '')
FROM education
WHERE deleted_at IS NULL
ORDER BY (end_date IS NULL) DESC, start_date DESC`

// EducationRepo implements domain.EducationRepository.
type EducationRepo struct {
	pool *pgxpool.Pool
}

// NewEducationRepo builds the repository.
func NewEducationRepo(pool *pgxpool.Pool) *EducationRepo {
	return &EducationRepo{pool: pool}
}

// List returns education entries, in-progress first, then most recent.
func (r *EducationRepo) List(ctx context.Context) ([]domain.Education, error) {
	rows, err := r.pool.Query(ctx, queryEducation)
	if err != nil {
		return nil, fmt.Errorf("querying education: %w", err)
	}
	defer rows.Close()

	items := make([]domain.Education, 0)
	for rows.Next() {
		var e domain.Education
		if err := rows.Scan(
			&e.ID, &e.Institution, &e.Degree, &e.Field, &e.StartDate, &e.EndDate,
			&e.Description,
		); err != nil {
			return nil, fmt.Errorf("scanning education: %w", err)
		}
		items = append(items, e)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating education: %w", err)
	}
	return items, nil
}
