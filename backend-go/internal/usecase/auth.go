package usecase

import (
	"context"
	"crypto/sha256"
	"crypto/subtle"
	"time"

	"github.com/portfolio/backend-go/internal/domain"
)

// TokenTTL is the lifetime of the issued admin JWT (ADR-0004).
const TokenTTL = time.Hour

// AdminRole is the role claim carried by admin tokens.
const AdminRole = "admin"

// TokenIssuer is the outbound port that signs an access token. Implemented in
// infrastructure (golang-jwt HS256).
type TokenIssuer interface {
	Issue(subject, role string, ttl time.Duration) (string, error)
}

// Auth implements the admin login use case against environment-provided
// credentials (ADR-0004).
type Auth struct {
	adminUsername string
	adminPassword string
	issuer        TokenIssuer
}

// NewAuth wires the auth use case.
func NewAuth(adminUsername, adminPassword string, issuer TokenIssuer) *Auth {
	return &Auth{adminUsername: adminUsername, adminPassword: adminPassword, issuer: issuer}
}

// LoginResult is the outcome of a successful login.
type LoginResult struct {
	Token     string
	ExpiresIn int64 // seconds
}

// Login verifies the credentials in constant time and issues a JWT. It
// returns domain.ErrInvalidCredentials when they do not match.
func (a *Auth) Login(_ context.Context, username, password string) (*LoginResult, error) {
	// Hash both sides so ConstantTimeCompare operates on equal-length inputs
	// and does not leak credential lengths.
	userOK := constantTimeEquals(username, a.adminUsername)
	passOK := constantTimeEquals(password, a.adminPassword)
	if userOK&passOK != 1 {
		return nil, domain.ErrInvalidCredentials
	}

	token, err := a.issuer.Issue(a.adminUsername, AdminRole, TokenTTL)
	if err != nil {
		return nil, err
	}
	return &LoginResult{Token: token, ExpiresIn: int64(TokenTTL.Seconds())}, nil
}

func constantTimeEquals(a, b string) int {
	ha := sha256.Sum256([]byte(a))
	hb := sha256.Sum256([]byte(b))
	return subtle.ConstantTimeCompare(ha[:], hb[:])
}
