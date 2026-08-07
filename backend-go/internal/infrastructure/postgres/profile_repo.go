package postgres

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/portfolio/backend-go/internal/domain"
)

const queryProfile = `
SELECT id::text, full_name, headline, bio,
       COALESCE(photo_url, ''), COALESCE(cv_url, ''), COALESCE(github_url, ''),
       COALESCE(linkedin_url, ''), email, COALESCE(location, ''), COALESCE(philosophy, ''),
       created_at, updated_at
FROM profile
WHERE deleted_at IS NULL
ORDER BY created_at
LIMIT 1`

// ProfileRepo implements domain.ProfileRepository.
type ProfileRepo struct {
	pool *pgxpool.Pool
}

// NewProfileRepo builds the repository.
func NewProfileRepo(pool *pgxpool.Pool) *ProfileRepo {
	return &ProfileRepo{pool: pool}
}

// Get returns the singleton profile or domain.ErrNotFound.
func (r *ProfileRepo) Get(ctx context.Context) (*domain.Profile, error) {
	var p domain.Profile
	err := r.pool.QueryRow(ctx, queryProfile).Scan(
		&p.ID, &p.FullName, &p.Headline, &p.Bio,
		&p.PhotoURL, &p.CVURL, &p.GithubURL,
		&p.LinkedinURL, &p.Email, &p.Location, &p.Philosophy,
		&p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("querying profile: %w", err)
	}
	return &p, nil
}
