// Package middleware implementa las políticas transversales del gateway
// (ADR-0001) como decoradores componibles de http.Handler.
package middleware

import (
	"net"
	"net/http"
	"strings"
)

// Middleware decora un http.Handler con comportamiento adicional.
type Middleware func(http.Handler) http.Handler

// Chain aplica los middleware sobre h de fuera hacia dentro:
// Chain(h, a, b) equivale a a(b(h)).
func Chain(h http.Handler, mws ...Middleware) http.Handler {
	for i := len(mws) - 1; i >= 0; i-- {
		h = mws[i](h)
	}
	return h
}

// ClientIP devuelve la IP del cliente original: el primer salto de
// X-Forwarded-For (nginx es el único punto de entrada y la fija) o, en su
// defecto, la dirección remota de la conexión.
func ClientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		first, _, _ := strings.Cut(xff, ",")
		if ip := strings.TrimSpace(first); ip != "" {
			return ip
		}
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}
