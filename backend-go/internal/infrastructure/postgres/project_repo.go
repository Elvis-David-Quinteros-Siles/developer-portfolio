package postgres

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/portfolio/backend-go/internal/domain"
)

const projectColumns = `
       id::text, slug, title, COALESCE(summary, ''), COALESCE(description, ''),
       COALESCE(problem, ''), COALESCE(solution, ''), COALESCE(outcome, ''),
       COALESCE(stack, '[]'::jsonb), COALESCE(image_url, ''),
       COALESCE(architecture_diagram_url, ''), COALESCE(github_url, ''),
       COALESCE(demo_url, ''), COALESCE(video_url, ''),
       featured, display_order, created_at, updated_at`

const queryProjects = `
SELECT` + projectColumns + `
FROM project
WHERE deleted_at IS NULL
ORDER BY display_order, created_at DESC`

const queryFeaturedProjects = `
SELECT` + projectColumns + `
FROM project
WHERE deleted_at IS NULL AND featured
ORDER BY display_order, created_at DESC`

const queryProjectBySlug = `
SELECT` + projectColumns + `
FROM project
WHERE deleted_at IS NULL AND slug = $1`

const queryProjectImages = `
SELECT id::text, COALESCE(url, ''), COALESCE(caption, ''), display_order
FROM project_image
WHERE deleted_at IS NULL AND project_id = $1::uuid
ORDER BY display_order, created_at`

// ProjectRepo implements domain.ProjectRepository.
type ProjectRepo struct {
	pool *pgxpool.Pool
}

// NewProjectRepo builds the repository.
func NewProjectRepo(pool *pgxpool.Pool) *ProjectRepo {
	return &ProjectRepo{pool: pool}
}

// List returns projects ordered for display, optionally only featured ones.
func (r *ProjectRepo) List(ctx context.Context, featuredOnly bool) ([]domain.Project, error) {
	query := queryProjects
	if featuredOnly {
		query = queryFeaturedProjects
	}

	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("querying projects: %w", err)
	}
	defer rows.Close()

	projects := make([]domain.Project, 0)
	for rows.Next() {
		p, err := scanProject(rows)
		if err != nil {
			return nil, fmt.Errorf("scanning project: %w", err)
		}
		projects = append(projects, *p)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating projects: %w", err)
	}
	return projects, nil
}

// GetBySlug returns one project with its project_image gallery loaded.
func (r *ProjectRepo) GetBySlug(ctx context.Context, slug string) (*domain.Project, error) {
	rows, err := r.pool.Query(ctx, queryProjectBySlug, slug)
	if err != nil {
		return nil, fmt.Errorf("querying project %q: %w", slug, err)
	}
	project, err := pgx.CollectOneRow(rows, func(row pgx.CollectableRow) (*domain.Project, error) {
		return scanProject(row)
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("scanning project %q: %w", slug, err)
	}

	images, err := r.listImages(ctx, project.ID)
	if err != nil {
		return nil, err
	}
	project.Images = images
	return project, nil
}

func (r *ProjectRepo) listImages(ctx context.Context, projectID string) ([]domain.ProjectImage, error) {
	rows, err := r.pool.Query(ctx, queryProjectImages, projectID)
	if err != nil {
		return nil, fmt.Errorf("querying project images: %w", err)
	}
	defer rows.Close()

	images := make([]domain.ProjectImage, 0)
	for rows.Next() {
		var img domain.ProjectImage
		if err := rows.Scan(&img.ID, &img.URL, &img.Caption, &img.DisplayOrder); err != nil {
			return nil, fmt.Errorf("scanning project image: %w", err)
		}
		images = append(images, img)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating project images: %w", err)
	}
	return images, nil
}

func scanProject(row pgx.Row) (*domain.Project, error) {
	var p domain.Project
	err := row.Scan(
		&p.ID, &p.Slug, &p.Title, &p.Summary, &p.Description,
		&p.Problem, &p.Solution, &p.Outcome,
		&p.Stack, &p.ImageURL,
		&p.ArchitectureDiagramURL, &p.GithubURL,
		&p.DemoURL, &p.VideoURL,
		&p.Featured, &p.DisplayOrder, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	p.Images = make([]domain.ProjectImage, 0)
	return &p, nil
}
