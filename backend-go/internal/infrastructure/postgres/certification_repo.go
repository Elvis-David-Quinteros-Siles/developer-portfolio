package postgres

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/portfolio/backend-go/internal/domain"
)

const queryCertifications = `
SELECT id::text, name, issuer, issue_date, expires_at,
       COALESCE(credential_id, ''), COALESCE(credential_url, ''), COALESCE(badge_url, '')
FROM certification
WHERE deleted_at IS NULL
ORDER BY issue_date DESC, name`

// CertificationRepo implements domain.CertificationRepository.
type CertificationRepo struct {
	pool *pgxpool.Pool
}

// NewCertificationRepo builds the repository.
func NewCertificationRepo(pool *pgxpool.Pool) *CertificationRepo {
	return &CertificationRepo{pool: pool}
}

// List returns certifications, most recent first.
func (r *CertificationRepo) List(ctx context.Context) ([]domain.Certification, error) {
	rows, err := r.pool.Query(ctx, queryCertifications)
	if err != nil {
		return nil, fmt.Errorf("querying certifications: %w", err)
	}
	defer rows.Close()

	items := make([]domain.Certification, 0)
	for rows.Next() {
		var c domain.Certification
		if err := rows.Scan(
			&c.ID, &c.Name, &c.Issuer, &c.IssueDate, &c.ExpiresAt,
			&c.CredentialID, &c.CredentialURL, &c.BadgeURL,
		); err != nil {
			return nil, fmt.Errorf("scanning certification: %w", err)
		}
		items = append(items, c)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating certifications: %w", err)
	}
	return items, nil
}
