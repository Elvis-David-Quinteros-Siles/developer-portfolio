// Package logger provides the structured JSON logger (log/slog) and the
// request-id context helpers used for end-to-end trace propagation
// (CONTRACTS §8).
package logger

import (
	"context"
	"log/slog"
	"os"
	"strings"
)

// New builds a JSON slog.Logger writing to stdout at the given level
// (debug|info|warn|error; defaults to info).
func New(level string) *slog.Logger {
	var lvl slog.Level
	switch strings.ToLower(level) {
	case "debug":
		lvl = slog.LevelDebug
	case "warn", "warning":
		lvl = slog.LevelWarn
	case "error":
		lvl = slog.LevelError
	default:
		lvl = slog.LevelInfo
	}
	handler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: lvl})
	return slog.New(handler)
}

type ctxKey struct{}

// ContextWithRequestID returns a context carrying the request id so that any
// layer (logging, outbound HTTP calls) can propagate X-Request-ID.
func ContextWithRequestID(ctx context.Context, requestID string) context.Context {
	return context.WithValue(ctx, ctxKey{}, requestID)
}

// RequestIDFrom extracts the request id from the context ("" when absent).
func RequestIDFrom(ctx context.Context) string {
	if v, ok := ctx.Value(ctxKey{}).(string); ok {
		return v
	}
	return ""
}
