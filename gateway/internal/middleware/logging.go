package middleware

import (
	"log/slog"
	"net/http"
	"time"
)

// statusRecorder captura el status escrito para el log de acceso. Unwrap
// permite que http.ResponseController (usado por ReverseProxy para
// flush/hijack) alcance el ResponseWriter original.
type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (s *statusRecorder) WriteHeader(code int) {
	s.status = code
	s.ResponseWriter.WriteHeader(code)
}

func (s *statusRecorder) Unwrap() http.ResponseWriter {
	return s.ResponseWriter
}

// Logging emite una línea JSON por request con los campos exigidos por
// CONTRACTS.md §8.
func Logging(log *slog.Logger) Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
			next.ServeHTTP(rec, r)
			log.LogAttrs(r.Context(), slog.LevelInfo, "request",
				slog.String("request_id", GetRequestID(r.Context())),
				slog.String("method", r.Method),
				slog.String("path", r.URL.Path),
				slog.Int("status", rec.status),
				slog.Float64("latency_ms", float64(time.Since(start).Microseconds())/1000.0),
				slog.String("ip", ClientIP(r)),
			)
		})
	}
}
