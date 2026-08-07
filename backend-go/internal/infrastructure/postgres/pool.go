// Package postgres implements the domain repositories on top of pgx/v5.
// Every query is read-only and filters deleted_at IS NULL: Django owns the
// schema and all writes (ADR-0003).
package postgres

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// NewPool builds a pgx connection pool from DATABASE_URL. Connections are
// established lazily; readiness is checked via Ping (see /readyz).
func NewPool(ctx context.Context, databaseURL string) (*pgxpool.Pool, error) {
	cfg, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("parsing DATABASE_URL: %w", err)
	}
	cfg.MaxConns = 10
	cfg.MinConns = 1
	cfg.MaxConnLifetime = 30 * time.Minute
	cfg.MaxConnIdleTime = 5 * time.Minute
	cfg.HealthCheckPeriod = time.Minute

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("creating pgx pool: %w", err)
	}
	return pool, nil
}
