// Package config loads the service configuration from the environment
// (12-factor). Variable names are the canonical ones from CONTRACTS §7 and
// docker-compose.yml.
package config

import (
	"fmt"
	"os"
	"strings"
)

// Config holds every runtime setting of the service.
type Config struct {
	Port                 string
	DatabaseURL          string
	GraphQLAPIURL        string
	InternalServiceToken string
	JWTSecret            string
	AdminUsername        string
	AdminPassword        string
	LogLevel             string
}

// Load reads and validates the configuration from the environment. It fails
// fast when a required variable is missing.
func Load() (*Config, error) {
	cfg := &Config{
		Port:                 getEnv("PORT", "8080"),
		DatabaseURL:          os.Getenv("DATABASE_URL"),
		GraphQLAPIURL:        os.Getenv("GRAPHQL_API_URL"),
		InternalServiceToken: os.Getenv("INTERNAL_SERVICE_TOKEN"),
		JWTSecret:            os.Getenv("JWT_SECRET"),
		AdminUsername:        os.Getenv("ADMIN_USERNAME"),
		AdminPassword:        os.Getenv("ADMIN_PASSWORD"),
		LogLevel:             getEnv("LOG_LEVEL", "info"),
	}

	var missing []string
	for name, value := range map[string]string{
		"DATABASE_URL":           cfg.DatabaseURL,
		"GRAPHQL_API_URL":        cfg.GraphQLAPIURL,
		"INTERNAL_SERVICE_TOKEN": cfg.InternalServiceToken,
		"JWT_SECRET":             cfg.JWTSecret,
		"ADMIN_USERNAME":         cfg.AdminUsername,
		"ADMIN_PASSWORD":         cfg.AdminPassword,
	} {
		if value == "" {
			missing = append(missing, name)
		}
	}
	if len(missing) > 0 {
		return nil, fmt.Errorf("missing required environment variables: %s", strings.Join(missing, ", "))
	}
	return cfg, nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
