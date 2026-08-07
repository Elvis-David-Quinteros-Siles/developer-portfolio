// Package config centraliza la carga de configuración por variables de
// entorno (CONTRACTS.md §7). Toda lectura de entorno ocurre aquí.
package config

import (
	"fmt"
	"log/slog"
	"net/url"
	"os"
	"strconv"
	"strings"
)

type Config struct {
	Port          string
	GoAPIURL      *url.URL
	GraphQLAPIURL *url.URL
	RedisURL      string
	JWTSecret     []byte
	CORSOrigins   []string
	// Límite global de requests por minuto por IP.
	RateLimitGlobal int
	// Límite de POST /api/v1/contact por hora por IP.
	RateLimitContact int
	LogLevel         slog.Level
}

func Load() (*Config, error) {
	goAPI, err := parseURL("GO_API_URL", getenv("GO_API_URL", "http://go-api:8080"))
	if err != nil {
		return nil, err
	}
	graphqlAPI, err := parseURL("GRAPHQL_API_URL", getenv("GRAPHQL_API_URL", "http://graphql-api:8000"))
	if err != nil {
		return nil, err
	}

	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		return nil, fmt.Errorf("JWT_SECRET is required (ADR-0004: el gateway valida JWT en el borde)")
	}

	global, err := parseInt("RATE_LIMIT_GLOBAL", getenv("RATE_LIMIT_GLOBAL", "100"))
	if err != nil {
		return nil, err
	}
	contact, err := parseInt("RATE_LIMIT_CONTACT", getenv("RATE_LIMIT_CONTACT", "5"))
	if err != nil {
		return nil, err
	}

	return &Config{
		Port:             getenv("PORT", "8080"),
		GoAPIURL:         goAPI,
		GraphQLAPIURL:    graphqlAPI,
		RedisURL:         os.Getenv("REDIS_URL"),
		JWTSecret:        []byte(secret),
		CORSOrigins:      splitCSV(os.Getenv("CORS_ORIGINS")),
		RateLimitGlobal:  global,
		RateLimitContact: contact,
		LogLevel:         parseLogLevel(getenv("LOG_LEVEL", "info")),
	}, nil
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func parseURL(name, raw string) (*url.URL, error) {
	u, err := url.Parse(raw)
	if err != nil || u.Scheme == "" || u.Host == "" {
		return nil, fmt.Errorf("%s: invalid URL %q", name, raw)
	}
	return u, nil
}

func parseInt(name, raw string) (int, error) {
	n, err := strconv.Atoi(raw)
	if err != nil || n < 0 {
		return 0, fmt.Errorf("%s: expected non-negative integer, got %q", name, raw)
	}
	return n, nil
}

func splitCSV(raw string) []string {
	var out []string
	for _, part := range strings.Split(raw, ",") {
		if p := strings.TrimSpace(part); p != "" {
			out = append(out, p)
		}
	}
	return out
}

func parseLogLevel(raw string) slog.Level {
	switch strings.ToLower(raw) {
	case "debug":
		return slog.LevelDebug
	case "warn", "warning":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}
