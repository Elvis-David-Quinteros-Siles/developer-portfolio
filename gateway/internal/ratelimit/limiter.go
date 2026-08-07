// Package ratelimit define la estrategia de limitación de tráfico (ADR-0005).
// La política concreta es intercambiable vía la interfaz Limiter (patrón Strategy).
package ratelimit

import (
	"context"
	"time"
)

// Decision es el resultado de evaluar una petición contra un límite.
type Decision struct {
	Allowed bool
	// RetryAfter indica cuánto esperar antes de reintentar cuando Allowed es false.
	RetryAfter time.Duration
}

// Limiter decide si la petición identificada por key puede proceder dentro de
// una ventana con un máximo de limit peticiones. Un error significa que la
// estrategia no pudo evaluar (p. ej. Redis caído); el llamador decide la
// política de fallo (el gateway hace fail-open, ADR-0005).
type Limiter interface {
	Allow(ctx context.Context, key string, limit int, window time.Duration) (Decision, error)
}

// AllowAll permite todo. Se usa cuando no hay backend de estado configurado.
type AllowAll struct{}

func (AllowAll) Allow(context.Context, string, int, time.Duration) (Decision, error) {
	return Decision{Allowed: true}, nil
}
