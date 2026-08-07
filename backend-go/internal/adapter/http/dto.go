package httpapi

import (
	"time"

	"github.com/portfolio/backend-go/internal/domain"
)

const dateLayout = "2006-01-02"

func formatDate(t time.Time) string { return t.Format(dateLayout) }

func formatDatePtr(t *time.Time) *string {
	if t == nil {
		return nil
	}
	s := t.Format(dateLayout)
	return &s
}

// ---------------------------------------------------------------- profile --

type profileDTO struct {
	ID          string `json:"id"`
	FullName    string `json:"full_name"`
	Headline    string `json:"headline"`
	Bio         string `json:"bio"`
	PhotoURL    string `json:"photo_url"`
	CVURL       string `json:"cv_url"`
	GithubURL   string `json:"github_url"`
	LinkedinURL string `json:"linkedin_url"`
	Email       string `json:"email"`
	Location    string `json:"location"`
	Philosophy  string `json:"philosophy"`
	UpdatedAt   string `json:"updated_at"`
}

func toProfileDTO(p *domain.Profile) profileDTO {
	return profileDTO{
		ID:          p.ID,
		FullName:    p.FullName,
		Headline:    p.Headline,
		Bio:         p.Bio,
		PhotoURL:    p.PhotoURL,
		CVURL:       p.CVURL,
		GithubURL:   p.GithubURL,
		LinkedinURL: p.LinkedinURL,
		Email:       p.Email,
		Location:    p.Location,
		Philosophy:  p.Philosophy,
		UpdatedAt:   p.UpdatedAt.UTC().Format(time.RFC3339),
	}
}

// --------------------------------------------------------------- projects --

type projectImageDTO struct {
	ID           string `json:"id"`
	URL          string `json:"url"`
	Caption      string `json:"caption"`
	DisplayOrder int    `json:"display_order"`
}

type projectDTO struct {
	ID                     string            `json:"id"`
	Slug                   string            `json:"slug"`
	Title                  string            `json:"title"`
	Summary                string            `json:"summary"`
	Description            string            `json:"description,omitempty"`
	Problem                string            `json:"problem,omitempty"`
	Solution               string            `json:"solution,omitempty"`
	Outcome                string            `json:"outcome,omitempty"`
	Stack                  []string          `json:"stack"`
	ImageURL               string            `json:"image_url"`
	ArchitectureDiagramURL string            `json:"architecture_diagram_url"`
	GithubURL              string            `json:"github_url"`
	DemoURL                string            `json:"demo_url"`
	VideoURL               string            `json:"video_url"`
	Featured               bool              `json:"featured"`
	DisplayOrder           int               `json:"display_order"`
	Images                 []projectImageDTO `json:"images,omitempty"`
}

func toProjectDTO(p *domain.Project, includeDetail bool) projectDTO {
	dto := projectDTO{
		ID:                     p.ID,
		Slug:                   p.Slug,
		Title:                  p.Title,
		Summary:                p.Summary,
		Stack:                  p.Stack,
		ImageURL:               p.ImageURL,
		ArchitectureDiagramURL: p.ArchitectureDiagramURL,
		GithubURL:              p.GithubURL,
		DemoURL:                p.DemoURL,
		VideoURL:               p.VideoURL,
		Featured:               p.Featured,
		DisplayOrder:           p.DisplayOrder,
	}
	if dto.Stack == nil {
		dto.Stack = []string{}
	}
	if includeDetail {
		dto.Description = p.Description
		dto.Problem = p.Problem
		dto.Solution = p.Solution
		dto.Outcome = p.Outcome
		dto.Images = make([]projectImageDTO, 0, len(p.Images))
		for _, img := range p.Images {
			dto.Images = append(dto.Images, projectImageDTO{
				ID:           img.ID,
				URL:          img.URL,
				Caption:      img.Caption,
				DisplayOrder: img.DisplayOrder,
			})
		}
	}
	return dto
}

func toProjectListDTO(projects []domain.Project) []projectDTO {
	out := make([]projectDTO, 0, len(projects))
	for i := range projects {
		out = append(out, toProjectDTO(&projects[i], false))
	}
	return out
}

// ----------------------------------------------------------------- skills --

type skillDTO struct {
	ID           string  `json:"id"`
	Name         string  `json:"name"`
	Icon         string  `json:"icon"`
	Level        int     `json:"level"`
	Years        float64 `json:"years"`
	Description  string  `json:"description"`
	DisplayOrder int     `json:"display_order"`
}

type skillCategoryDTO struct {
	ID           string     `json:"id"`
	Name         string     `json:"name"`
	Slug         string     `json:"slug"`
	DisplayOrder int        `json:"display_order"`
	Skills       []skillDTO `json:"skills"`
}

func toSkillCategoriesDTO(categories []domain.SkillCategory) []skillCategoryDTO {
	out := make([]skillCategoryDTO, 0, len(categories))
	for _, c := range categories {
		skills := make([]skillDTO, 0, len(c.Skills))
		for _, s := range c.Skills {
			skills = append(skills, skillDTO{
				ID:           s.ID,
				Name:         s.Name,
				Icon:         s.Icon,
				Level:        s.Level,
				Years:        s.Years,
				Description:  s.Description,
				DisplayOrder: s.DisplayOrder,
			})
		}
		out = append(out, skillCategoryDTO{
			ID:           c.ID,
			Name:         c.Name,
			Slug:         c.Slug,
			DisplayOrder: c.DisplayOrder,
			Skills:       skills,
		})
	}
	return out
}

// ------------------------------------------------------------- experience --

type experienceDTO struct {
	ID           string   `json:"id"`
	Company      string   `json:"company"`
	Role         string   `json:"role"`
	Location     string   `json:"location"`
	StartDate    string   `json:"start_date"`
	EndDate      *string  `json:"end_date"`
	Description  string   `json:"description"`
	Achievements []string `json:"achievements"`
	Tech         []string `json:"tech"`
	DisplayOrder int      `json:"display_order"`
}

func toExperienceDTO(items []domain.Experience) []experienceDTO {
	out := make([]experienceDTO, 0, len(items))
	for _, e := range items {
		out = append(out, experienceDTO{
			ID:           e.ID,
			Company:      e.Company,
			Role:         e.Role,
			Location:     e.Location,
			StartDate:    formatDate(e.StartDate),
			EndDate:      formatDatePtr(e.EndDate),
			Description:  e.Description,
			Achievements: e.Achievements,
			Tech:         e.Tech,
			DisplayOrder: e.DisplayOrder,
		})
	}
	return out
}

// ---------------------------------------------------------- certification --

type certificationDTO struct {
	ID            string  `json:"id"`
	Name          string  `json:"name"`
	Issuer        string  `json:"issuer"`
	IssueDate     string  `json:"issue_date"`
	ExpiresAt     *string `json:"expires_at"`
	CredentialID  string  `json:"credential_id"`
	CredentialURL string  `json:"credential_url"`
	BadgeURL      string  `json:"badge_url"`
}

func toCertificationsDTO(items []domain.Certification) []certificationDTO {
	out := make([]certificationDTO, 0, len(items))
	for _, c := range items {
		out = append(out, certificationDTO{
			ID:            c.ID,
			Name:          c.Name,
			Issuer:        c.Issuer,
			IssueDate:     formatDate(c.IssueDate),
			ExpiresAt:     formatDatePtr(c.ExpiresAt),
			CredentialID:  c.CredentialID,
			CredentialURL: c.CredentialURL,
			BadgeURL:      c.BadgeURL,
		})
	}
	return out
}

// -------------------------------------------------------------- education --

type educationDTO struct {
	ID          string  `json:"id"`
	Institution string  `json:"institution"`
	Degree      string  `json:"degree"`
	Field       string  `json:"field"`
	StartDate   string  `json:"start_date"`
	EndDate     *string `json:"end_date"`
	Description string  `json:"description"`
}

func toEducationDTO(items []domain.Education) []educationDTO {
	out := make([]educationDTO, 0, len(items))
	for _, e := range items {
		out = append(out, educationDTO{
			ID:          e.ID,
			Institution: e.Institution,
			Degree:      e.Degree,
			Field:       e.Field,
			StartDate:   formatDate(e.StartDate),
			EndDate:     formatDatePtr(e.EndDate),
			Description: e.Description,
		})
	}
	return out
}

// ----------------------------------------------------------- architecture --

type architectureTopicDTO struct {
	ID           string `json:"id"`
	Slug         string `json:"slug"`
	Title        string `json:"title"`
	Category     string `json:"category"`
	Description  string `json:"description"`
	DiagramURL   string `json:"diagram_url"`
	DisplayOrder int    `json:"display_order"`
}

func toArchitectureTopicsDTO(items []domain.ArchitectureTopic) []architectureTopicDTO {
	out := make([]architectureTopicDTO, 0, len(items))
	for _, t := range items {
		out = append(out, architectureTopicDTO{
			ID:           t.ID,
			Slug:         t.Slug,
			Title:        t.Title,
			Category:     t.Category,
			Description:  t.Description,
			DiagramURL:   t.DiagramURL,
			DisplayOrder: t.DisplayOrder,
		})
	}
	return out
}

// ---------------------------------------------------------------- contact --

type contactRequest struct {
	Name    string `json:"name" binding:"required,min=2,max=120"`
	Email   string `json:"email" binding:"required,email,max=254"`
	Subject string `json:"subject" binding:"required,min=3,max=200"`
	Message string `json:"message" binding:"required,min=10,max=5000"`
}

type contactAcceptedDTO struct {
	ID     string `json:"id"`
	Status string `json:"status"`
}

// ------------------------------------------------------------------- auth --

type loginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type loginResponseDTO struct {
	Token     string `json:"token"`
	TokenType string `json:"token_type"`
	ExpiresIn int64  `json:"expires_in"`
}

// ------------------------------------------------------- contact messages --

type contactMessageDTO struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Email     string `json:"email"`
	Subject   string `json:"subject"`
	Message   string `json:"message"`
	IPAddress string `json:"ip_address"`
	UserAgent string `json:"user_agent"`
	Status    string `json:"status"`
	CreatedAt string `json:"created_at"`
}

func toContactMessagesDTO(items []domain.ContactMessage) []contactMessageDTO {
	out := make([]contactMessageDTO, 0, len(items))
	for _, m := range items {
		out = append(out, contactMessageDTO{
			ID:        m.ID,
			Name:      m.Name,
			Email:     m.Email,
			Subject:   m.Subject,
			Message:   m.Message,
			IPAddress: m.IPAddress,
			UserAgent: m.UserAgent,
			Status:    m.Status,
			CreatedAt: m.CreatedAt.UTC().Format(time.RFC3339),
		})
	}
	return out
}
