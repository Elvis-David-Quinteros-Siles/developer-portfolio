package domain

import "context"

// All repositories are READ-ONLY: Django owns the schema and every write
// (ADR-0003). Implementations must always filter deleted_at IS NULL.

// ProfileRepository reads the singleton profile.
type ProfileRepository interface {
	Get(ctx context.Context) (*Profile, error)
}

// ProjectRepository reads projects and their image gallery.
type ProjectRepository interface {
	// List returns projects ordered for display. When featuredOnly is true
	// only featured projects are returned.
	List(ctx context.Context, featuredOnly bool) ([]Project, error)
	// GetBySlug returns one project with its project_image gallery loaded,
	// or ErrNotFound.
	GetBySlug(ctx context.Context, slug string) (*Project, error)
}

// SkillRepository reads skill categories with their nested skills.
type SkillRepository interface {
	ListCategories(ctx context.Context) ([]SkillCategory, error)
}

// ExperienceRepository reads professional experience, most recent first.
type ExperienceRepository interface {
	List(ctx context.Context) ([]Experience, error)
}

// CertificationRepository reads certifications, most recent first.
type CertificationRepository interface {
	List(ctx context.Context) ([]Certification, error)
}

// EducationRepository reads education entries, most recent first.
type EducationRepository interface {
	List(ctx context.Context) ([]Education, error)
}

// ArchitectureTopicRepository reads architecture topics.
type ArchitectureTopicRepository interface {
	List(ctx context.Context) ([]ArchitectureTopic, error)
}

// ContactMessageRepository reads received contact messages (admin only).
type ContactMessageRepository interface {
	// List returns one page (limit/offset) of messages ordered by
	// created_at DESC, plus the total number of live messages.
	List(ctx context.Context, limit, offset int) ([]ContactMessage, int64, error)
}

// ContactNotifier is the outbound port used to delegate a contact submission
// to the write side (Django submitContact mutation). It returns the id of the
// persisted message.
type ContactNotifier interface {
	SubmitContact(ctx context.Context, submission ContactSubmission) (string, error)
}
