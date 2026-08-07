// Package token implements the usecase.TokenIssuer port with HS256 JWTs
// (ADR-0004).
package token

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// JWTIssuer signs HS256 tokens with the shared JWT_SECRET.
type JWTIssuer struct {
	secret []byte
}

// NewJWTIssuer builds an issuer from the shared secret.
func NewJWTIssuer(secret string) *JWTIssuer {
	return &JWTIssuer{secret: []byte(secret)}
}

// Issue signs a token with claims sub, role, iat and exp (ADR-0004).
func (i *JWTIssuer) Issue(subject, role string, ttl time.Duration) (string, error) {
	now := time.Now()
	claims := jwt.MapClaims{
		"sub":  subject,
		"role": role,
		"iat":  now.Unix(),
		"exp":  now.Add(ttl).Unix(),
	}
	signed, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(i.secret)
	if err != nil {
		return "", fmt.Errorf("signing token: %w", err)
	}
	return signed, nil
}
