package httpapi

import (
	"crypto/rand"
	"encoding/hex"
	"log/slog"
	"runtime/debug"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"

	"github.com/portfolio/backend-go/internal/infrastructure/logger"
	"github.com/portfolio/backend-go/internal/usecase"
)

// RequestID propagates an incoming X-Request-ID (from the gateway) or
// generates one, stores it in the gin and request contexts and echoes it back
// in the response header.
func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		rid := strings.TrimSpace(c.GetHeader("X-Request-ID"))
		if rid == "" || len(rid) > 128 {
			rid = newRequestID()
		}
		c.Set(requestIDKey, rid)
		c.Request = c.Request.WithContext(logger.ContextWithRequestID(c.Request.Context(), rid))
		c.Header("X-Request-ID", rid)
		c.Next()
	}
}

func newRequestID() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		// Fall back to a time-based id; never panic on the hot path.
		return hex.EncodeToString([]byte(time.Now().UTC().Format("20060102150405.000000000")))
	}
	return hex.EncodeToString(b)
}

// Logging emits one structured JSON log line per request. Health probes are
// logged at debug level to keep the log stream useful.
func Logging(log *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()

		level := slog.LevelInfo
		path := c.Request.URL.Path
		if path == "/healthz" || path == "/readyz" {
			level = slog.LevelDebug
		} else if c.Writer.Status() >= 500 {
			level = slog.LevelError
		}

		log.LogAttrs(c.Request.Context(), level, "http_request",
			slog.String("request_id", c.GetString(requestIDKey)),
			slog.String("method", c.Request.Method),
			slog.String("path", path),
			slog.Int("status", c.Writer.Status()),
			slog.Float64("latency_ms", float64(time.Since(start).Microseconds())/1000),
			slog.String("client_ip", c.ClientIP()),
		)
	}
}

// Recovery converts panics into an RFC 7807 500 response and logs the stack.
func Recovery(log *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if r := recover(); r != nil {
				log.ErrorContext(c.Request.Context(), "panic recovered",
					"request_id", c.GetString(requestIDKey),
					"panic", r,
					"stack", string(debug.Stack()),
				)
				if !c.Writer.Written() {
					writeProblem(c, 500, "Internal Server Error", "an unexpected error occurred")
				} else {
					c.Abort()
				}
			}
		}()
		c.Next()
	}
}

// JWTAuth validates the Bearer token on /api/v1/admin/* routes. The gateway
// already validates it, but each service must be secure on its own
// (defense in depth, ADR-0004).
func JWTAuth(secret string) gin.HandlerFunc {
	key := []byte(secret)
	parser := jwt.NewParser(
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithExpirationRequired(),
	)

	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		const prefix = "Bearer "
		if len(header) <= len(prefix) || !strings.EqualFold(header[:len(prefix)], prefix) {
			c.Header("WWW-Authenticate", `Bearer realm="admin"`)
			writeProblem(c, 401, "Unauthorized", "missing or malformed Authorization header")
			return
		}

		tokenString := strings.TrimSpace(header[len(prefix):])
		token, err := parser.Parse(tokenString, func(*jwt.Token) (any, error) { return key, nil })
		if err != nil || !token.Valid {
			c.Header("WWW-Authenticate", `Bearer realm="admin", error="invalid_token"`)
			writeProblem(c, 401, "Unauthorized", "invalid or expired token")
			return
		}

		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			writeProblem(c, 401, "Unauthorized", "invalid token claims")
			return
		}
		if role, _ := claims["role"].(string); role != usecase.AdminRole {
			writeProblem(c, 403, "Forbidden", "admin role required")
			return
		}

		c.Next()
	}
}
