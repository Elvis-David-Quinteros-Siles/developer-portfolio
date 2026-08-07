package usecase

import (
	"context"
	"fmt"

	"github.com/portfolio/backend-go/internal/domain"
)

// Contact implements the "submit contact" use case. It never writes to the
// database: after validating, it delegates to the write side (Django) through
// the domain.ContactNotifier port (ADR-0003, CONTRACTS §6).
type Contact struct {
	notifier domain.ContactNotifier
}

// NewContact wires the contact use case with its outbound notifier port.
func NewContact(notifier domain.ContactNotifier) *Contact {
	return &Contact{notifier: notifier}
}

// Submit normalizes and validates the submission, then delegates it to the
// notifier. It returns the id of the persisted message.
func (u *Contact) Submit(ctx context.Context, submission domain.ContactSubmission) (string, error) {
	submission.Normalize()
	if verr := submission.Validate(); verr != nil {
		return "", verr
	}

	id, err := u.notifier.SubmitContact(ctx, submission)
	if err != nil {
		return "", fmt.Errorf("delegating contact submission: %w", err)
	}
	return id, nil
}
