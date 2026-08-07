package usecase_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/portfolio/backend-go/internal/domain"
	"github.com/portfolio/backend-go/internal/usecase"
)

type fakeIssuer struct {
	token   string
	err     error
	subject string
	role    string
	ttl     time.Duration
}

func (f *fakeIssuer) Issue(subject, role string, ttl time.Duration) (string, error) {
	f.subject, f.role, f.ttl = subject, role, ttl
	return f.token, f.err
}

func TestAuthLogin(t *testing.T) {
	tests := []struct {
		name      string
		username  string
		password  string
		issuerErr error
		wantErr   error
		wantToken string
	}{
		{"valid credentials", "admin", "s3cret", nil, nil, "jwt-token"},
		{"wrong username", "root", "s3cret", nil, domain.ErrInvalidCredentials, ""},
		{"wrong password", "admin", "nope", nil, domain.ErrInvalidCredentials, ""},
		{"both wrong", "root", "nope", nil, domain.ErrInvalidCredentials, ""},
		{"empty credentials", "", "", nil, domain.ErrInvalidCredentials, ""},
		{"issuer failure propagates", "admin", "s3cret", errors.New("sign error"), errors.New("sign error"), ""},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			issuer := &fakeIssuer{token: "jwt-token", err: tc.issuerErr}
			auth := usecase.NewAuth("admin", "s3cret", issuer)

			res, err := auth.Login(context.Background(), tc.username, tc.password)

			switch {
			case tc.wantErr == nil:
				if err != nil {
					t.Fatalf("unexpected error: %v", err)
				}
				if res.Token != tc.wantToken {
					t.Fatalf("token = %q, want %q", res.Token, tc.wantToken)
				}
				if res.ExpiresIn != int64(usecase.TokenTTL.Seconds()) {
					t.Fatalf("expires_in = %d, want %d", res.ExpiresIn, int64(usecase.TokenTTL.Seconds()))
				}
				if issuer.subject != "admin" || issuer.role != usecase.AdminRole || issuer.ttl != usecase.TokenTTL {
					t.Fatalf("issuer called with (%q,%q,%v)", issuer.subject, issuer.role, issuer.ttl)
				}
			case errors.Is(tc.wantErr, domain.ErrInvalidCredentials):
				if !errors.Is(err, domain.ErrInvalidCredentials) {
					t.Fatalf("expected ErrInvalidCredentials, got %v", err)
				}
			default:
				if err == nil || err.Error() != tc.wantErr.Error() {
					t.Fatalf("expected %v, got %v", tc.wantErr, err)
				}
			}
		})
	}
}
