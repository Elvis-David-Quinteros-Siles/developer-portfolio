package usecase_test

import (
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/portfolio/backend-go/internal/domain"
	"github.com/portfolio/backend-go/internal/usecase"
)

type fakeNotifier struct {
	id       string
	err      error
	called   bool
	received domain.ContactSubmission
}

func (f *fakeNotifier) SubmitContact(_ context.Context, s domain.ContactSubmission) (string, error) {
	f.called = true
	f.received = s
	return f.id, f.err
}

func validSubmission() domain.ContactSubmission {
	return domain.ContactSubmission{
		Name:      "Diego Quinteros",
		Email:     "dquinteros630@gmail.com",
		Subject:   "Hello there",
		Message:   "I would like to talk about a backend position.",
		IPAddress: "203.0.113.7",
		UserAgent: "test-agent/1.0",
	}
}

func TestContactSubmit_Validation(t *testing.T) {
	tests := []struct {
		name       string
		mutate     func(*domain.ContactSubmission)
		wantField  string
		wantCalled bool
	}{
		{"valid submission passes", func(s *domain.ContactSubmission) {}, "", true},
		{"name too short", func(s *domain.ContactSubmission) { s.Name = "A" }, "name", false},
		{"name too long", func(s *domain.ContactSubmission) { s.Name = strings.Repeat("a", 121) }, "name", false},
		{"name only whitespace", func(s *domain.ContactSubmission) { s.Name = "   " }, "name", false},
		{"email empty", func(s *domain.ContactSubmission) { s.Email = "" }, "email", false},
		{"email malformed", func(s *domain.ContactSubmission) { s.Email = "not-an-email" }, "email", false},
		{"email with display name rejected", func(s *domain.ContactSubmission) { s.Email = "Bob <bob@example.com>" }, "email", false},
		{"subject too short", func(s *domain.ContactSubmission) { s.Subject = "ab" }, "subject", false},
		{"subject too long", func(s *domain.ContactSubmission) { s.Subject = strings.Repeat("s", 201) }, "subject", false},
		{"message too short", func(s *domain.ContactSubmission) { s.Message = "too short" }, "message", false},
		{"message too long", func(s *domain.ContactSubmission) { s.Message = strings.Repeat("m", 5001) }, "message", false},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			notifier := &fakeNotifier{id: "msg-1"}
			uc := usecase.NewContact(notifier)

			sub := validSubmission()
			tc.mutate(&sub)

			id, err := uc.Submit(context.Background(), sub)

			if tc.wantField == "" {
				if err != nil {
					t.Fatalf("expected success, got error: %v", err)
				}
				if id != "msg-1" {
					t.Fatalf("expected id msg-1, got %q", id)
				}
			} else {
				var verr *domain.ValidationError
				if !errors.As(err, &verr) {
					t.Fatalf("expected ValidationError, got %v", err)
				}
				if _, ok := verr.Fields[tc.wantField]; !ok {
					t.Fatalf("expected violation on field %q, got %v", tc.wantField, verr.Fields)
				}
			}
			if notifier.called != tc.wantCalled {
				t.Fatalf("notifier called = %v, want %v", notifier.called, tc.wantCalled)
			}
		})
	}
}

func TestContactSubmit_NormalizesBeforeSending(t *testing.T) {
	notifier := &fakeNotifier{id: "msg-2"}
	uc := usecase.NewContact(notifier)

	sub := validSubmission()
	sub.Name = "  Diego Quinteros  "
	sub.Subject = " Hello there "

	if _, err := uc.Submit(context.Background(), sub); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if notifier.received.Name != "Diego Quinteros" {
		t.Errorf("name not trimmed: %q", notifier.received.Name)
	}
	if notifier.received.Subject != "Hello there" {
		t.Errorf("subject not trimmed: %q", notifier.received.Subject)
	}
}

func TestContactSubmit_UpstreamErrors(t *testing.T) {
	tests := []struct {
		name    string
		err     error
		wantErr error
	}{
		{"django down maps to unavailable", domain.ErrUpstreamUnavailable, domain.ErrUpstreamUnavailable},
		{"django rejection maps to rejected", domain.ErrUpstreamRejected, domain.ErrUpstreamRejected},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			uc := usecase.NewContact(&fakeNotifier{err: tc.err})
			_, err := uc.Submit(context.Background(), validSubmission())
			if !errors.Is(err, tc.wantErr) {
				t.Fatalf("expected %v, got %v", tc.wantErr, err)
			}
		})
	}
}
