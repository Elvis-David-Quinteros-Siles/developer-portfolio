// Package usecase contains the application use cases. It depends only on the
// domain package and the Go standard library.
package usecase

import (
	"context"

	"github.com/portfolio/backend-go/internal/domain"
)

// Content exposes the read-side use cases of the portfolio (CQRS read side,
// ADR-0003).
type Content struct {
	profiles       domain.ProfileRepository
	projects       domain.ProjectRepository
	skills         domain.SkillRepository
	experience     domain.ExperienceRepository
	certifications domain.CertificationRepository
	education      domain.EducationRepository
	architecture   domain.ArchitectureTopicRepository
}

// NewContent wires the read use cases with their repositories.
func NewContent(
	profiles domain.ProfileRepository,
	projects domain.ProjectRepository,
	skills domain.SkillRepository,
	experience domain.ExperienceRepository,
	certifications domain.CertificationRepository,
	education domain.EducationRepository,
	architecture domain.ArchitectureTopicRepository,
) *Content {
	return &Content{
		profiles:       profiles,
		projects:       projects,
		skills:         skills,
		experience:     experience,
		certifications: certifications,
		education:      education,
		architecture:   architecture,
	}
}

// GetProfile returns the singleton profile or domain.ErrNotFound.
func (c *Content) GetProfile(ctx context.Context) (*domain.Profile, error) {
	return c.profiles.Get(ctx)
}

// ListProjects returns the projects, optionally only the featured ones.
func (c *Content) ListProjects(ctx context.Context, featuredOnly bool) ([]domain.Project, error) {
	return c.projects.List(ctx, featuredOnly)
}

// GetProject returns one project (with gallery) by slug or domain.ErrNotFound.
func (c *Content) GetProject(ctx context.Context, slug string) (*domain.Project, error) {
	return c.projects.GetBySlug(ctx, slug)
}

// ListSkillCategories returns skill categories with nested skills.
func (c *Content) ListSkillCategories(ctx context.Context) ([]domain.SkillCategory, error) {
	return c.skills.ListCategories(ctx)
}

// ListExperience returns professional experience, most recent first.
func (c *Content) ListExperience(ctx context.Context) ([]domain.Experience, error) {
	return c.experience.List(ctx)
}

// ListCertifications returns certifications, most recent first.
func (c *Content) ListCertifications(ctx context.Context) ([]domain.Certification, error) {
	return c.certifications.List(ctx)
}

// ListEducation returns education entries, most recent first.
func (c *Content) ListEducation(ctx context.Context) ([]domain.Education, error) {
	return c.education.List(ctx)
}

// ListArchitectureTopics returns the architecture showcase topics.
func (c *Content) ListArchitectureTopics(ctx context.Context) ([]domain.ArchitectureTopic, error) {
	return c.architecture.List(ctx)
}
