package usecase_test

import (
	"context"
	"errors"
	"testing"

	"github.com/portfolio/backend-go/internal/domain"
	"github.com/portfolio/backend-go/internal/usecase"
)

type fakeProjectRepo struct {
	listFeatured *bool
	projects     []domain.Project
	project      *domain.Project
	err          error
}

func (f *fakeProjectRepo) List(_ context.Context, featuredOnly bool) ([]domain.Project, error) {
	f.listFeatured = &featuredOnly
	return f.projects, f.err
}

func (f *fakeProjectRepo) GetBySlug(_ context.Context, _ string) (*domain.Project, error) {
	return f.project, f.err
}

type fakeProfileRepo struct{ profile *domain.Profile }

func (f *fakeProfileRepo) Get(_ context.Context) (*domain.Profile, error) {
	if f.profile == nil {
		return nil, domain.ErrNotFound
	}
	return f.profile, nil
}

type fakeSkillRepo struct{ categories []domain.SkillCategory }

func (f *fakeSkillRepo) ListCategories(_ context.Context) ([]domain.SkillCategory, error) {
	return f.categories, nil
}

type noopExperienceRepo struct{}

func (noopExperienceRepo) List(_ context.Context) ([]domain.Experience, error) { return nil, nil }

type noopCertificationRepo struct{}

func (noopCertificationRepo) List(_ context.Context) ([]domain.Certification, error) {
	return nil, nil
}

type noopEducationRepo struct{}

func (noopEducationRepo) List(_ context.Context) ([]domain.Education, error) { return nil, nil }

type noopArchitectureRepo struct{}

func (noopArchitectureRepo) List(_ context.Context) ([]domain.ArchitectureTopic, error) {
	return nil, nil
}

func newContent(projects *fakeProjectRepo, profile *fakeProfileRepo) *usecase.Content {
	return usecase.NewContent(
		profile,
		projects,
		&fakeSkillRepo{},
		noopExperienceRepo{},
		noopCertificationRepo{},
		noopEducationRepo{},
		noopArchitectureRepo{},
	)
}

func TestListProjects_FeaturedFlagPropagates(t *testing.T) {
	tests := []struct {
		name     string
		featured bool
	}{
		{"all projects", false},
		{"featured only", true},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			repo := &fakeProjectRepo{}
			uc := newContent(repo, &fakeProfileRepo{profile: &domain.Profile{}})

			if _, err := uc.ListProjects(context.Background(), tc.featured); err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if repo.listFeatured == nil || *repo.listFeatured != tc.featured {
				t.Fatalf("repo received featured=%v, want %v", repo.listFeatured, tc.featured)
			}
		})
	}
}

func TestGetProject_NotFoundPropagates(t *testing.T) {
	repo := &fakeProjectRepo{err: domain.ErrNotFound}
	uc := newContent(repo, &fakeProfileRepo{})

	_, err := uc.GetProject(context.Background(), "missing")
	if !errors.Is(err, domain.ErrNotFound) {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
}

func TestGetProfile_NotFoundPropagates(t *testing.T) {
	uc := newContent(&fakeProjectRepo{}, &fakeProfileRepo{profile: nil})

	_, err := uc.GetProfile(context.Background())
	if !errors.Is(err, domain.ErrNotFound) {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
}
