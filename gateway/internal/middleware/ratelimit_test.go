package middleware

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/portfolio/gateway/internal/ratelimit"
)

// fakeLimiter registra las claves consultadas y responde según se configure.
type fakeLimiter struct {
	keys     []string
	decision ratelimit.Decision
	err      error
	denyKey  string // si no está vacío, solo esa clave se deniega
}

func (f *fakeLimiter) Allow(_ context.Context, key string, _ int, _ time.Duration) (ratelimit.Decision, error) {
	f.keys = append(f.keys, key)
	if f.err != nil {
		return ratelimit.Decision{}, f.err
	}
	if f.denyKey != "" && key != f.denyKey {
		return ratelimit.Decision{Allowed: true}, nil
	}
	return f.decision, nil
}

func discardLogger() *slog.Logger {
	return slog.New(slog.NewJSONHandler(io.Discard, nil))
}

func serveRateLimited(l ratelimit.Limiter, method, path string) *httptest.ResponseRecorder {
	mw := RateLimit(l,
		Rule{Limit: 100, Window: time.Minute},
		Rule{Limit: 5, Window: time.Hour},
		discardLogger(),
	)
	h := mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	req := httptest.NewRequest(method, path, nil)
	req.RemoteAddr = "10.1.2.3:5555"
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

func TestRateLimit_Allowed(t *testing.T) {
	fake := &fakeLimiter{decision: ratelimit.Decision{Allowed: true}}
	rec := serveRateLimited(fake, http.MethodGet, "/api/v1/projects")
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	if len(fake.keys) != 1 || fake.keys[0] != "rl:global:10.1.2.3" {
		t.Fatalf("expected only the global key, got %v", fake.keys)
	}
}

func TestRateLimit_ContactAppliesBothRules(t *testing.T) {
	fake := &fakeLimiter{decision: ratelimit.Decision{Allowed: true}}
	rec := serveRateLimited(fake, http.MethodPost, "/api/v1/contact")
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
	want := []string{"rl:global:10.1.2.3", "rl:contact:10.1.2.3"}
	if len(fake.keys) != 2 || fake.keys[0] != want[0] || fake.keys[1] != want[1] {
		t.Fatalf("expected keys %v, got %v", want, fake.keys)
	}
}

func TestRateLimit_ContactDenied429(t *testing.T) {
	fake := &fakeLimiter{
		denyKey:  "rl:contact:10.1.2.3",
		decision: ratelimit.Decision{Allowed: false, RetryAfter: 90 * time.Second},
	}
	rec := serveRateLimited(fake, http.MethodPost, "/api/v1/contact")
	if rec.Code != http.StatusTooManyRequests {
		t.Fatalf("expected 429, got %d", rec.Code)
	}
	if ct := rec.Header().Get("Content-Type"); ct != "application/problem+json" {
		t.Fatalf("expected problem+json, got %q", ct)
	}
	if got := rec.Header().Get("Retry-After"); got != "90" {
		t.Fatalf("expected Retry-After 90, got %q", got)
	}
}

func TestRateLimit_RetryAfterMinimumOneSecond(t *testing.T) {
	fake := &fakeLimiter{decision: ratelimit.Decision{Allowed: false, RetryAfter: 10 * time.Millisecond}}
	rec := serveRateLimited(fake, http.MethodGet, "/api/v1/projects")
	if rec.Code != http.StatusTooManyRequests {
		t.Fatalf("expected 429, got %d", rec.Code)
	}
	if got := rec.Header().Get("Retry-After"); got != "1" {
		t.Fatalf("expected Retry-After 1, got %q", got)
	}
}

func TestRateLimit_FailOpenOnLimiterError(t *testing.T) {
	fake := &fakeLimiter{err: errors.New("redis down")}
	rec := serveRateLimited(fake, http.MethodPost, "/api/v1/contact")
	if rec.Code != http.StatusOK {
		t.Fatalf("fail-open expected 200, got %d", rec.Code)
	}
}

func TestRateLimit_UsesXForwardedForIP(t *testing.T) {
	fake := &fakeLimiter{decision: ratelimit.Decision{Allowed: true}}
	mw := RateLimit(fake, Rule{Limit: 10, Window: time.Minute}, Rule{}, discardLogger())
	h := mw(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
	req := httptest.NewRequest(http.MethodGet, "/api/v1/skills", nil)
	req.RemoteAddr = "172.18.0.2:40000" // IP interna de nginx
	req.Header.Set("X-Forwarded-For", "203.0.113.7, 172.18.0.2")
	h.ServeHTTP(httptest.NewRecorder(), req)
	if len(fake.keys) != 1 || fake.keys[0] != "rl:global:203.0.113.7" {
		t.Fatalf("expected key for original client IP, got %v", fake.keys)
	}
}
