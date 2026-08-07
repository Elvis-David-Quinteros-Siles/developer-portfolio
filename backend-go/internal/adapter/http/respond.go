// Package httpapi is the HTTP adapter: Gin handlers, DTOs and middleware.
// It translates transport concerns to/from use case calls and never contains
// business rules.
package httpapi

import (
	"time"

	"github.com/gin-gonic/gin"
)

// requestIDKey is the gin-context key where the middleware stores the id.
const requestIDKey = "request_id"

type paginationMeta struct {
	Page       int   `json:"page"`
	PageSize   int   `json:"page_size"`
	TotalItems int64 `json:"total_items"`
	TotalPages int   `json:"total_pages"`
}

type meta struct {
	RequestID  string          `json:"request_id"`
	Timestamp  string          `json:"timestamp"`
	Pagination *paginationMeta `json:"pagination,omitempty"`
}

type envelope struct {
	Data any  `json:"data"`
	Meta meta `json:"meta"`
}

// problem is an RFC 7807 problem details body. Errors is an extension member
// used for per-field validation failures.
type problem struct {
	Type     string            `json:"type"`
	Title    string            `json:"title"`
	Status   int               `json:"status"`
	Detail   string            `json:"detail,omitempty"`
	Instance string            `json:"instance,omitempty"`
	Errors   map[string]string `json:"errors,omitempty"`
}

func newMeta(c *gin.Context) meta {
	return meta{
		RequestID: c.GetString(requestIDKey),
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	}
}

// writeData writes the success envelope {data, meta}.
func writeData(c *gin.Context, status int, data any) {
	c.JSON(status, envelope{Data: data, Meta: newMeta(c)})
}

// writePage writes the success envelope with pagination metadata.
func writePage(c *gin.Context, status int, data any, p paginationMeta) {
	m := newMeta(c)
	m.Pagination = &p
	c.JSON(status, envelope{Data: data, Meta: m})
}

// writeProblem writes an RFC 7807 error with Content-Type
// application/problem+json.
func writeProblem(c *gin.Context, status int, title, detail string) {
	writeProblemFields(c, status, title, detail, nil)
}

func writeProblemFields(c *gin.Context, status int, title, detail string, fields map[string]string) {
	c.Header("Content-Type", "application/problem+json")
	c.Abort()
	c.JSON(status, problem{
		Type:     "about:blank",
		Title:    title,
		Status:   status,
		Detail:   detail,
		Instance: c.Request.URL.Path,
		Errors:   fields,
	})
}
