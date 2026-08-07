package middleware

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"strconv"
	"time"
)

type contextKey int

const requestIDKey contextKey = iota

const headerRequestID = "X-Request-ID"

// RequestID propaga el X-Request-ID entrante o genera uno nuevo, lo expone en
// la respuesta y en el contexto, y lo deja en la petición para que el proxy lo
// reenvíe al backend (CONTRACTS.md §8).
func RequestID() Middleware {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			id := r.Header.Get(headerRequestID)
			if id == "" {
				id = newRequestID()
			}
			r.Header.Set(headerRequestID, id)
			w.Header().Set(headerRequestID, id)
			next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), requestIDKey, id)))
		})
	}
}

// GetRequestID devuelve el request id del contexto, o "" si no existe.
func GetRequestID(ctx context.Context) string {
	id, _ := ctx.Value(requestIDKey).(string)
	return id
}

func newRequestID() string {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		return strconv.FormatInt(time.Now().UnixNano(), 16)
	}
	return hex.EncodeToString(b[:])
}
