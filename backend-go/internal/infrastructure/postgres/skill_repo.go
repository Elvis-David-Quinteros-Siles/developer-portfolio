package postgres

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/portfolio/backend-go/internal/domain"
)

// One JOIN query; grouping into categories happens in Go (no N+1).
const querySkillCategories = `
SELECT c.id::text, c.name, c.slug, c.display_order,
       s.id::text, s.name, COALESCE(s.icon, ''), s.level, s.years,
       COALESCE(s.description, ''), s.display_order
FROM skill_category c
LEFT JOIN skill s ON s.category_id = c.id AND s.deleted_at IS NULL
WHERE c.deleted_at IS NULL
ORDER BY c.display_order, c.name, s.display_order, s.name`

// SkillRepo implements domain.SkillRepository.
type SkillRepo struct {
	pool *pgxpool.Pool
}

// NewSkillRepo builds the repository.
func NewSkillRepo(pool *pgxpool.Pool) *SkillRepo {
	return &SkillRepo{pool: pool}
}

// ListCategories returns every live category with its nested live skills,
// grouped from a single JOIN query.
func (r *SkillRepo) ListCategories(ctx context.Context) ([]domain.SkillCategory, error) {
	rows, err := r.pool.Query(ctx, querySkillCategories)
	if err != nil {
		return nil, fmt.Errorf("querying skill categories: %w", err)
	}
	defer rows.Close()

	categories := make([]domain.SkillCategory, 0)
	index := map[string]int{} // category id -> position in categories

	for rows.Next() {
		var (
			cat domain.SkillCategory
			// LEFT JOIN: skill columns are NULL for empty categories.
			skillID, skillName, skillIcon, skillDesc *string
			skillLevel, skillOrder                   *int
			skillYears                               *float64
		)
		if err := rows.Scan(
			&cat.ID, &cat.Name, &cat.Slug, &cat.DisplayOrder,
			&skillID, &skillName, &skillIcon, &skillLevel, &skillYears,
			&skillDesc, &skillOrder,
		); err != nil {
			return nil, fmt.Errorf("scanning skill row: %w", err)
		}

		pos, seen := index[cat.ID]
		if !seen {
			cat.Skills = make([]domain.Skill, 0)
			categories = append(categories, cat)
			pos = len(categories) - 1
			index[cat.ID] = pos
		}

		if skillID != nil {
			skill := domain.Skill{ID: *skillID, Name: deref(skillName), Icon: deref(skillIcon)}
			if skillLevel != nil {
				skill.Level = *skillLevel
			}
			if skillYears != nil {
				skill.Years = *skillYears
			}
			skill.Description = deref(skillDesc)
			if skillOrder != nil {
				skill.DisplayOrder = *skillOrder
			}
			categories[pos].Skills = append(categories[pos].Skills, skill)
		}
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating skill rows: %w", err)
	}
	return categories, nil
}

func deref(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
