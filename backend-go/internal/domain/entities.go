// Package domain contains the enterprise entities and the ports (repository
// and notifier interfaces) of the go-api service. It has ZERO third-party
// dependencies: only the Go standard library is allowed here.
package domain

import "time"

// Profile is the logical-singleton personal profile.
type Profile struct {
	ID          string
	FullName    string
	Headline    string
	Bio         string
	PhotoURL    string
	CVURL       string
	GithubURL   string
	LinkedinURL string
	Email       string
	Location    string
	Philosophy  string
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

// SkillCategory groups skills; Skills is the nested composition.
type SkillCategory struct {
	ID           string
	Name         string
	Slug         string
	DisplayOrder int
	Skills       []Skill
}

// Skill belongs to exactly one SkillCategory.
type Skill struct {
	ID           string
	Name         string
	Icon         string
	Level        int
	Years        float64
	Description  string
	DisplayOrder int
}

// Project is a portfolio project. Images holds the project_image gallery.
type Project struct {
	ID                     string
	Slug                   string
	Title                  string
	Summary                string
	Description            string
	Problem                string
	Solution               string
	Outcome                string
	Stack                  []string
	ImageURL               string
	ArchitectureDiagramURL string
	GithubURL              string
	DemoURL                string
	VideoURL               string
	Featured               bool
	DisplayOrder           int
	CreatedAt              time.Time
	UpdatedAt              time.Time
	Images                 []ProjectImage
}

// ProjectImage is one gallery item of a Project.
type ProjectImage struct {
	ID           string
	URL          string
	Caption      string
	DisplayOrder int
}

// Experience is a professional experience entry. EndDate == nil means current.
type Experience struct {
	ID           string
	Company      string
	Role         string
	Location     string
	StartDate    time.Time
	EndDate      *time.Time
	Description  string
	Achievements []string
	Tech         []string
	DisplayOrder int
}

// Certification is a professional certification. ExpiresAt == nil means it
// does not expire.
type Certification struct {
	ID            string
	Name          string
	Issuer        string
	IssueDate     time.Time
	ExpiresAt     *time.Time
	CredentialID  string
	CredentialURL string
	BadgeURL      string
}

// Education is an academic record. EndDate == nil means in progress.
type Education struct {
	ID          string
	Institution string
	Degree      string
	Field       string
	StartDate   time.Time
	EndDate     *time.Time
	Description string
}

// ArchitectureTopic is an architecture showcase topic.
type ArchitectureTopic struct {
	ID           string
	Slug         string
	Title        string
	Category     string
	Description  string
	DiagramURL   string
	DisplayOrder int
}

// ContactMessage is a received contact message (read-only view; writes are
// owned by Django, see ADR-0003).
type ContactMessage struct {
	ID        string
	Name      string
	Email     string
	Subject   string
	Message   string
	IPAddress string // empty when NULL in the database
	UserAgent string
	Status    string
	CreatedAt time.Time
}

// Page describes the pagination of a listed result set.
type Page struct {
	Number     int
	Size       int
	TotalItems int64
	TotalPages int
}
