package domain

import "errors"

// Sentinel errors used across layers. Adapters translate them to transport
// specific representations (RFC 7807 in HTTP).
var (
	// ErrNotFound signals that the requested resource does not exist (or is
	// soft-deleted).
	ErrNotFound = errors.New("resource not found")

	// ErrInvalidCredentials signals a failed admin login attempt.
	ErrInvalidCredentials = errors.New("invalid credentials")

	// ErrUpstreamUnavailable signals that a dependent service (Django
	// graphql-api) did not respond in time or failed hard. Maps to 503.
	ErrUpstreamUnavailable = errors.New("upstream service unavailable")

	// ErrUpstreamRejected signals that the dependent service answered but
	// rejected the operation. Maps to 502.
	ErrUpstreamRejected = errors.New("upstream service rejected the request")
)

// ValidationError carries per-field domain validation failures.
type ValidationError struct {
	Fields map[string]string
}

func (e *ValidationError) Error() string { return "validation failed" }

// NewValidationError builds a ValidationError from a field->message map.
func NewValidationError(fields map[string]string) *ValidationError {
	return &ValidationError{Fields: fields}
}
