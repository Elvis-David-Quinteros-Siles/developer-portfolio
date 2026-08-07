// Command gateway es el API Gateway del portfolio (ADR-0001): enrutamiento
// hacia go-api y graphql-api con rate limiting, validación JWT de rutas admin,
// CORS y observabilidad por request.
package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/portfolio/gateway/internal/config"
	"github.com/portfolio/gateway/internal/middleware"
	"github.com/portfolio/gateway/internal/problem"
	"github.com/portfolio/gateway/internal/proxy"
	"github.com/portfolio/gateway/internal/ratelimit"
)

func main() {
	if err := run(); err != nil {
		slog.Error("gateway terminated", "error", err)
		os.Exit(1)
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("config: %w", err)
	}

	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: cfg.LogLevel}))
	slog.SetDefault(logger)

	var limiter ratelimit.Limiter = ratelimit.AllowAll{}
	var rdb *redis.Client
	if cfg.RedisURL != "" {
		opts, err := redis.ParseURL(cfg.RedisURL)
		if err != nil {
			return fmt.Errorf("REDIS_URL: %w", err)
		}
		rdb = redis.NewClient(opts)
		defer rdb.Close()
		limiter = ratelimit.NewRedisSlidingWindow(rdb)
	} else {
		logger.Warn("REDIS_URL not set: rate limiting disabled (fail-open)")
	}

	goProxy := proxy.New(cfg.GoAPIURL, logger)
	graphqlProxy := proxy.New(cfg.GraphQLAPIURL, logger)
	mediaProxy := proxy.New(cfg.GraphQLAPIURL, logger,
		proxy.WithDefaultResponseHeader("Cache-Control", "public, max-age=86400"))

	rateLimit := middleware.RateLimit(limiter,
		middleware.Rule{Limit: cfg.RateLimitGlobal, Window: time.Minute},
		middleware.Rule{Limit: cfg.RateLimitContact, Window: time.Hour},
		logger,
	)
	cors := middleware.CORS(cfg.CORSOrigins)
	adminAuth := middleware.RequireAdminJWT(cfg.JWTSecret)

	// Enrutamiento según CONTRACTS.md §2. CORS va primero para que el
	// preflight (sin Authorization) se resuelva antes de auth y rate limit.
	mux := http.NewServeMux()
	adminChain := middleware.Chain(goProxy, cors, rateLimit, adminAuth)
	mux.Handle("/api/v1/admin/", adminChain)
	mux.Handle("/api/v1/admin", adminChain)
	mux.Handle("/api/v1/", middleware.Chain(goProxy, cors, rateLimit))
	mux.Handle("/graphql", middleware.Chain(graphqlProxy, cors, rateLimit))
	mux.Handle("/media/", mediaProxy)
	mux.HandleFunc("GET /healthz", handleHealthz)
	mux.HandleFunc("GET /readyz", handleReadyz(rdb))
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		problem.Write(w, r, http.StatusNotFound, "no route matches this path")
	})

	handler := middleware.Chain(mux, middleware.RequestID(), middleware.Logging(logger))

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           handler,
		ReadHeaderTimeout: 10 * time.Second,
		IdleTimeout:       120 * time.Second,
		ErrorLog:          slog.NewLogLogger(logger.Handler(), slog.LevelError),
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	serveErr := make(chan error, 1)
	go func() {
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			serveErr <- err
		}
	}()
	logger.Info("gateway listening",
		"port", cfg.Port,
		"go_api", cfg.GoAPIURL.String(),
		"graphql_api", cfg.GraphQLAPIURL.String(),
	)

	select {
	case err := <-serveErr:
		return err
	case <-ctx.Done():
	}

	logger.Info("shutdown signal received, draining connections")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("shutdown: %w", err)
	}
	logger.Info("shutdown complete")
	return nil
}

func handleHealthz(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// handleReadyz reporta el estado de Redis pero responde 200 aunque esté caído:
// el gateway sigue sirviendo tráfico en fail-open (ADR-0005).
func handleReadyz(rdb *redis.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		redisStatus := "disabled"
		if rdb != nil {
			ctx, cancel := context.WithTimeout(r.Context(), time.Second)
			defer cancel()
			if err := rdb.Ping(ctx).Err(); err != nil {
				redisStatus = "unavailable"
			} else {
				redisStatus = "ok"
			}
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "redis": redisStatus})
	}
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
