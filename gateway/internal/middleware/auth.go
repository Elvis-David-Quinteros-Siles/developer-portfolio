package middleware

import (
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"

	"github.com/portfolio/gateway/internal/problem"
)

// RequireAdminJWT valida en el borde los tokens de rutas /api/v1/admin/*
// (ADR-0004): Bearer JWT HS256 firmado con JWT_SECRET, con exp obligatorio y
// claim role=admin. Cualquier fallo responde 401 RFC 7807.
func RequireAdminJWT(secret []byte) Middleware {
	keyFunc := func(*jwt.Token) (any, error) { return secret, nil }
	parserOpts := []jwt.ParserOption{
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
		jwt.WithExpirationRequired(),
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			raw, ok := bearerToken(r.Header.Get("Authorization"))
			if !ok {
				unauthorized(w, r, "missing bearer token")
				return
			}
			token, err := jwt.Parse(raw, keyFunc, parserOpts...)
			if err != nil || !token.Valid {
				unauthorized(w, r, "invalid or expired token")
				return
			}
			claims, ok := token.Claims.(jwt.MapClaims)
			if !ok || claims["role"] != "admin" {
				unauthorized(w, r, "admin role required")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func bearerToken(header string) (string, bool) {
	const prefix = "Bearer "
	if len(header) <= len(prefix) || !strings.EqualFold(header[:len(prefix)], prefix) {
		return "", false
	}
	token := strings.TrimSpace(header[len(prefix):])
	return token, token != ""
}

func unauthorized(w http.ResponseWriter, r *http.Request, detail string) {
	w.Header().Set("WWW-Authenticate", `Bearer realm="admin", error="invalid_token"`)
	problem.Write(w, r, http.StatusUnauthorized, detail)
}
