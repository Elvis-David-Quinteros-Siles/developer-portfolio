package httpapi

import (
	"log/slog"

	"github.com/gin-gonic/gin"
)

// NewRouter builds the Gin engine with the middleware chain and every route
// from CONTRACTS §3. jwtSecret is used by the admin JWT middleware
// (defense in depth, ADR-0004).
func NewRouter(h *Handlers, log *slog.Logger, jwtSecret string) *gin.Engine {
	r := gin.New()
	r.RedirectTrailingSlash = true

	r.Use(RequestID(), Logging(log), Recovery(log))

	r.NoRoute(func(c *gin.Context) {
		writeProblem(c, 404, "Not Found", "the requested route does not exist")
	})
	r.HandleMethodNotAllowed = true
	r.NoMethod(func(c *gin.Context) {
		writeProblem(c, 405, "Method Not Allowed", "the method is not allowed on this route")
	})

	// Health probes live outside /api/v1 (CONTRACTS §3).
	r.GET("/healthz", h.Healthz)
	r.GET("/readyz", h.Readyz)

	v1 := r.Group("/api/v1")
	{
		v1.GET("/profile", h.GetProfile)
		v1.GET("/projects", h.ListProjects)
		v1.GET("/projects/:slug", h.GetProject)
		v1.GET("/skills", h.ListSkills)
		v1.GET("/experience", h.ListExperience)
		v1.GET("/architecture", h.ListArchitecture)
		v1.GET("/certifications", h.ListCertifications)
		v1.GET("/education", h.ListEducation)
		v1.POST("/contact", h.SubmitContact)
		v1.POST("/auth/login", h.Login)

		v1.GET("/openapi.yaml", h.OpenAPISpec)
		v1.GET("/docs", h.SwaggerUI)

		admin := v1.Group("/admin", JWTAuth(jwtSecret))
		{
			admin.GET("/contact-messages", h.ListContactMessages)
		}
	}

	return r
}
