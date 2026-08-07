package httpapi

import (
	_ "embed"

	"github.com/gin-gonic/gin"

	"github.com/portfolio/backend-go/api"
)

// swaggerHTML is a minimal, embedded Swagger UI page. The swagger-ui assets
// are loaded from the unpkg CDN at runtime, which is acceptable for a
// documentation-only endpoint.
//
//go:embed swagger.html
var swaggerHTML []byte

// OpenAPISpec serves the hand-written OpenAPI 3 document.
func (h *Handlers) OpenAPISpec(c *gin.Context) {
	c.Data(200, "application/yaml", api.OpenAPISpec)
}

// SwaggerUI serves the embedded Swagger UI page.
func (h *Handlers) SwaggerUI(c *gin.Context) {
	c.Data(200, "text/html; charset=utf-8", swaggerHTML)
}
