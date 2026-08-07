package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var testSecret = []byte("test-secret")

func signHS(t *testing.T, method jwt.SigningMethod, secret []byte, claims jwt.MapClaims) string {
	t.Helper()
	s, err := jwt.NewWithClaims(method, claims).SignedString(secret)
	if err != nil {
		t.Fatalf("signing token: %v", err)
	}
	return s
}

func adminClaims(exp time.Time) jwt.MapClaims {
	return jwt.MapClaims{
		"sub":  "admin",
		"role": "admin",
		"iat":  time.Now().Unix(),
		"exp":  exp.Unix(),
	}
}

func doAuthRequest(t *testing.T, authorization string) (*httptest.ResponseRecorder, bool) {
	t.Helper()
	nextCalled := false
	h := RequireAdminJWT(testSecret)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		nextCalled = true
		w.WriteHeader(http.StatusOK)
	}))
	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/contact-messages", nil)
	if authorization != "" {
		req.Header.Set("Authorization", authorization)
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec, nextCalled
}

func TestRequireAdminJWT_ValidToken(t *testing.T) {
	token := signHS(t, jwt.SigningMethodHS256, testSecret, adminClaims(time.Now().Add(time.Hour)))
	rec, nextCalled := doAuthRequest(t, "Bearer "+token)
	if !nextCalled || rec.Code != http.StatusOK {
		t.Fatalf("expected request to pass, got status %d (next called: %v)", rec.Code, nextCalled)
	}
}

func TestRequireAdminJWT_Rejections(t *testing.T) {
	cases := []struct {
		name          string
		authorization string
	}{
		{"missing header", ""},
		{"not bearer", "Basic abc123"},
		{"empty bearer", "Bearer "},
		{"garbage token", "Bearer not.a.jwt"},
		{"wrong secret", "Bearer " + signHS(t, jwt.SigningMethodHS256, []byte("other-secret"), adminClaims(time.Now().Add(time.Hour)))},
		{"expired", "Bearer " + signHS(t, jwt.SigningMethodHS256, testSecret, adminClaims(time.Now().Add(-time.Minute)))},
		{"missing exp", "Bearer " + signHS(t, jwt.SigningMethodHS256, testSecret, jwt.MapClaims{"sub": "admin", "role": "admin"})},
		{"wrong algorithm", "Bearer " + signHS(t, jwt.SigningMethodHS512, testSecret, adminClaims(time.Now().Add(time.Hour)))},
		{"missing role", "Bearer " + signHS(t, jwt.SigningMethodHS256, testSecret, jwt.MapClaims{"sub": "admin", "exp": time.Now().Add(time.Hour).Unix()})},
		{"wrong role", "Bearer " + signHS(t, jwt.SigningMethodHS256, testSecret, jwt.MapClaims{"sub": "u", "role": "user", "exp": time.Now().Add(time.Hour).Unix()})},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			rec, nextCalled := doAuthRequest(t, tc.authorization)
			if nextCalled {
				t.Fatal("request must not reach the backend")
			}
			if rec.Code != http.StatusUnauthorized {
				t.Fatalf("expected 401, got %d", rec.Code)
			}
			if ct := rec.Header().Get("Content-Type"); ct != "application/problem+json" {
				t.Fatalf("expected problem+json, got %q", ct)
			}
			if rec.Header().Get("WWW-Authenticate") == "" {
				t.Fatal("expected WWW-Authenticate header")
			}
		})
	}
}
