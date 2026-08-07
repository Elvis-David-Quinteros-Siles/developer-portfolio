package middleware

import (
	"context"
	"log/slog"
	"math"
	"net/http"
	"strconv"
	"time"

	"github.com/portfolio/gateway/internal/problem"
	"github.com/portfolio/gateway/internal/ratelimit"
)

// Rule describe un límite: cuántas peticiones caben en la ventana.
type Rule struct {
	Limit  int
	Window time.Duration
}

const (
	contactPath = "/api/v1/contact"
	// redisTimeout acota cada evaluación para que un Redis degradado no
	// bloquee el tráfico (fail-open, ADR-0005).
	redisTimeout = 500 * time.Millisecond
)

// RateLimit aplica el límite global por IP a todo el tráfico y, además, el
// límite estricto de contacto a POST /api/v1/contact (ADR-0005). Si la
// estrategia falla, deja pasar con un warning (fail-open).
func RateLimit(limiter ratelimit.Limiter, global, contact Rule, log *slog.Logger) Middleware {
	type check struct {
		key  string
		rule Rule
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip := ClientIP(r)
			checks := make([]check, 0, 2)
			if global.Limit > 0 {
				checks = append(checks, check{"rl:global:" + ip, global})
			}
			if contact.Limit > 0 && r.Method == http.MethodPost && r.URL.Path == contactPath {
				checks = append(checks, check{"rl:contact:" + ip, contact})
			}
			for _, c := range checks {
				ctx, cancel := context.WithTimeout(r.Context(), redisTimeout)
				dec, err := limiter.Allow(ctx, c.key, c.rule.Limit, c.rule.Window)
				cancel()
				if err != nil {
					log.Warn("rate limiter unavailable, failing open",
						"request_id", GetRequestID(r.Context()),
						"key", c.key,
						"error", err,
					)
					continue
				}
				if !dec.Allowed {
					w.Header().Set("Retry-After", strconv.Itoa(retryAfterSeconds(dec.RetryAfter)))
					problem.Write(w, r, http.StatusTooManyRequests, "rate limit exceeded")
					return
				}
			}
			next.ServeHTTP(w, r)
		})
	}
}

func retryAfterSeconds(d time.Duration) int {
	secs := int(math.Ceil(d.Seconds()))
	if secs < 1 {
		return 1
	}
	return secs
}
