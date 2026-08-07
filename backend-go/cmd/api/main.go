// Command api is the composition root of the go-api service: it wires the
// Clean Architecture layers by hand (constructor dependency injection) and
// runs the HTTP server with graceful shutdown.
package main

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	httpapi "github.com/portfolio/backend-go/internal/adapter/http"
	"github.com/portfolio/backend-go/internal/adapter/notifier"
	"github.com/portfolio/backend-go/internal/infrastructure/config"
	"github.com/portfolio/backend-go/internal/infrastructure/logger"
	"github.com/portfolio/backend-go/internal/infrastructure/postgres"
	"github.com/portfolio/backend-go/internal/infrastructure/token"
	"github.com/portfolio/backend-go/internal/usecase"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, "fatal:", err)
		os.Exit(1)
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}

	log := logger.New(cfg.LogLevel)

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	// Infrastructure.
	pool, err := postgres.NewPool(ctx, cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer pool.Close()

	// Repositories (infrastructure implementing domain ports).
	profileRepo := postgres.NewProfileRepo(pool)
	projectRepo := postgres.NewProjectRepo(pool)
	skillRepo := postgres.NewSkillRepo(pool)
	experienceRepo := postgres.NewExperienceRepo(pool)
	certificationRepo := postgres.NewCertificationRepo(pool)
	educationRepo := postgres.NewEducationRepo(pool)
	architectureRepo := postgres.NewArchitectureRepo(pool)
	contactMessageRepo := postgres.NewContactMessageRepo(pool)

	// Outbound adapters.
	contactNotifier := notifier.NewGraphQLContactNotifier(cfg.GraphQLAPIURL, cfg.InternalServiceToken, log)
	jwtIssuer := token.NewJWTIssuer(cfg.JWTSecret)

	// Use cases.
	contentUC := usecase.NewContent(
		profileRepo, projectRepo, skillRepo, experienceRepo,
		certificationRepo, educationRepo, architectureRepo,
	)
	contactUC := usecase.NewContact(contactNotifier)
	authUC := usecase.NewAuth(cfg.AdminUsername, cfg.AdminPassword, jwtIssuer)
	adminUC := usecase.NewAdminMessages(contactMessageRepo)

	// HTTP adapter.
	handlers := httpapi.NewHandlers(contentUC, contactUC, authUC, adminUC, pool, log)
	router := httpapi.NewRouter(handlers, log, cfg.JWTSecret)

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           router,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	errCh := make(chan error, 1)
	go func() {
		log.Info("go-api listening", "port", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
		}
	}()

	select {
	case err := <-errCh:
		return fmt.Errorf("http server: %w", err)
	case <-ctx.Done():
	}

	log.Info("shutdown signal received, draining connections")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("graceful shutdown: %w", err)
	}
	log.Info("go-api stopped cleanly")
	return nil
}
