package httpapi

import (
	"context"
	"errors"
	"log/slog"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/portfolio/backend-go/internal/domain"
	"github.com/portfolio/backend-go/internal/usecase"
)

// Handlers groups every HTTP handler with its use case dependencies.
type Handlers struct {
	content *usecase.Content
	contact *usecase.Contact
	auth    *usecase.Auth
	admin   *usecase.AdminMessages
	pool    *pgxpool.Pool
	log     *slog.Logger
}

// NewHandlers wires the handler set (manual constructor DI).
func NewHandlers(
	content *usecase.Content,
	contact *usecase.Contact,
	auth *usecase.Auth,
	admin *usecase.AdminMessages,
	pool *pgxpool.Pool,
	log *slog.Logger,
) *Handlers {
	return &Handlers{content: content, contact: contact, auth: auth, admin: admin, pool: pool, log: log}
}

// fail maps domain errors to RFC 7807 responses.
func (h *Handlers) fail(c *gin.Context, err error) {
	var verr *domain.ValidationError
	switch {
	case errors.As(err, &verr):
		writeProblemFields(c, 422, "Unprocessable Entity", "one or more fields are invalid", verr.Fields)
	case errors.Is(err, domain.ErrNotFound):
		writeProblem(c, 404, "Not Found", "the requested resource does not exist")
	case errors.Is(err, domain.ErrInvalidCredentials):
		writeProblem(c, 401, "Unauthorized", "invalid credentials")
	case errors.Is(err, domain.ErrUpstreamUnavailable):
		writeProblem(c, 503, "Service Unavailable", "the message service is temporarily unavailable, please retry later")
	case errors.Is(err, domain.ErrUpstreamRejected):
		writeProblem(c, 502, "Bad Gateway", "the message service rejected the request")
	case errors.Is(err, context.DeadlineExceeded), errors.Is(err, context.Canceled):
		writeProblem(c, 503, "Service Unavailable", "the request timed out")
	default:
		h.log.ErrorContext(c.Request.Context(), "unhandled error",
			"request_id", c.GetString(requestIDKey), "error", err.Error())
		writeProblem(c, 500, "Internal Server Error", "an unexpected error occurred")
	}
}

// ---------------------------------------------------------------- content --

// GetProfile handles GET /api/v1/profile.
func (h *Handlers) GetProfile(c *gin.Context) {
	profile, err := h.content.GetProfile(c.Request.Context())
	if err != nil {
		h.fail(c, err)
		return
	}
	writeData(c, 200, toProfileDTO(profile))
}

// ListProjects handles GET /api/v1/projects[?featured=true].
func (h *Handlers) ListProjects(c *gin.Context) {
	featured := strings.EqualFold(c.Query("featured"), "true")
	projects, err := h.content.ListProjects(c.Request.Context(), featured)
	if err != nil {
		h.fail(c, err)
		return
	}
	writeData(c, 200, toProjectListDTO(projects))
}

// GetProject handles GET /api/v1/projects/:slug (detail with gallery).
func (h *Handlers) GetProject(c *gin.Context) {
	project, err := h.content.GetProject(c.Request.Context(), c.Param("slug"))
	if err != nil {
		h.fail(c, err)
		return
	}
	writeData(c, 200, toProjectDTO(project, true))
}

// ListSkills handles GET /api/v1/skills (categories with nested skills).
func (h *Handlers) ListSkills(c *gin.Context) {
	categories, err := h.content.ListSkillCategories(c.Request.Context())
	if err != nil {
		h.fail(c, err)
		return
	}
	writeData(c, 200, toSkillCategoriesDTO(categories))
}

// ListExperience handles GET /api/v1/experience.
func (h *Handlers) ListExperience(c *gin.Context) {
	items, err := h.content.ListExperience(c.Request.Context())
	if err != nil {
		h.fail(c, err)
		return
	}
	writeData(c, 200, toExperienceDTO(items))
}

// ListCertifications handles GET /api/v1/certifications.
func (h *Handlers) ListCertifications(c *gin.Context) {
	items, err := h.content.ListCertifications(c.Request.Context())
	if err != nil {
		h.fail(c, err)
		return
	}
	writeData(c, 200, toCertificationsDTO(items))
}

// ListEducation handles GET /api/v1/education.
func (h *Handlers) ListEducation(c *gin.Context) {
	items, err := h.content.ListEducation(c.Request.Context())
	if err != nil {
		h.fail(c, err)
		return
	}
	writeData(c, 200, toEducationDTO(items))
}

// ListArchitecture handles GET /api/v1/architecture.
func (h *Handlers) ListArchitecture(c *gin.Context) {
	items, err := h.content.ListArchitectureTopics(c.Request.Context())
	if err != nil {
		h.fail(c, err)
		return
	}
	writeData(c, 200, toArchitectureTopicsDTO(items))
}

// ---------------------------------------------------------------- contact --

// SubmitContact handles POST /api/v1/contact. It validates and delegates to
// Django via the notifier port; it never writes to PostgreSQL (ADR-0003).
func (h *Handlers) SubmitContact(c *gin.Context) {
	var req contactRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		writeProblem(c, 400, "Bad Request", "invalid request body: "+err.Error())
		return
	}

	submission := domain.ContactSubmission{
		Name:      req.Name,
		Email:     req.Email,
		Subject:   req.Subject,
		Message:   req.Message,
		IPAddress: clientIPFromForwarded(c),
		UserAgent: c.Request.UserAgent(),
	}

	id, err := h.contact.Submit(c.Request.Context(), submission)
	if err != nil {
		h.fail(c, err)
		return
	}
	writeData(c, 202, contactAcceptedDTO{ID: id, Status: "accepted"})
}

// clientIPFromForwarded returns the first X-Forwarded-For hop (set by the
// edge) or falls back to the direct peer address.
func clientIPFromForwarded(c *gin.Context) string {
	if xff := c.GetHeader("X-Forwarded-For"); xff != "" {
		first := strings.TrimSpace(strings.Split(xff, ",")[0])
		if first != "" {
			return first
		}
	}
	return c.ClientIP()
}

// ------------------------------------------------------------------- auth --

// Login handles POST /api/v1/auth/login.
func (h *Handlers) Login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		writeProblem(c, 400, "Bad Request", "invalid request body: username and password are required")
		return
	}

	result, err := h.auth.Login(c.Request.Context(), req.Username, req.Password)
	if err != nil {
		h.fail(c, err)
		return
	}
	writeData(c, 200, loginResponseDTO{Token: result.Token, TokenType: "Bearer", ExpiresIn: result.ExpiresIn})
}

// ------------------------------------------------------------------ admin --

// ListContactMessages handles GET /api/v1/admin/contact-messages.
func (h *Handlers) ListContactMessages(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", strconv.Itoa(usecase.DefaultPageSize)))

	items, pageInfo, err := h.admin.List(c.Request.Context(), page, pageSize)
	if err != nil {
		h.fail(c, err)
		return
	}
	writePage(c, 200, toContactMessagesDTO(items), paginationMeta{
		Page:       pageInfo.Number,
		PageSize:   pageInfo.Size,
		TotalItems: pageInfo.TotalItems,
		TotalPages: pageInfo.TotalPages,
	})
}

// ----------------------------------------------------------------- health --

// Healthz handles GET /healthz (liveness).
func (h *Handlers) Healthz(c *gin.Context) {
	c.JSON(200, gin.H{"status": "ok"})
}

// Readyz handles GET /readyz (readiness: PostgreSQL reachable).
func (h *Handlers) Readyz(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
	defer cancel()

	if err := h.pool.Ping(ctx); err != nil {
		writeProblem(c, 503, "Service Unavailable", "database not reachable")
		return
	}
	c.JSON(200, gin.H{"status": "ready"})
}
