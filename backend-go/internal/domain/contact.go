package domain

import (
	"net/mail"
	"strings"
	"unicode/utf8"
)

// Contact field length rules (domain invariants, CONTRACTS §6).
const (
	ContactNameMin    = 2
	ContactNameMax    = 120
	ContactEmailMax   = 254
	ContactSubjectMin = 3
	ContactSubjectMax = 200
	ContactMessageMin = 10
	ContactMessageMax = 5000
)

// ContactSubmission is the value object a visitor submits through the
// contact form. IPAddress and UserAgent are request metadata captured by the
// HTTP adapter.
type ContactSubmission struct {
	Name      string
	Email     string
	Subject   string
	Message   string
	IPAddress string
	UserAgent string
}

// Normalize trims surrounding whitespace on user-provided fields.
func (s *ContactSubmission) Normalize() {
	s.Name = strings.TrimSpace(s.Name)
	s.Email = strings.TrimSpace(s.Email)
	s.Subject = strings.TrimSpace(s.Subject)
	s.Message = strings.TrimSpace(s.Message)
}

// Validate enforces the domain rules for a contact submission. It returns a
// *ValidationError describing every violated field, or nil when valid.
func (s ContactSubmission) Validate() *ValidationError {
	fields := map[string]string{}

	if n := utf8.RuneCountInString(s.Name); n < ContactNameMin || n > ContactNameMax {
		fields["name"] = "name must be between 2 and 120 characters"
	}
	if s.Email == "" || utf8.RuneCountInString(s.Email) > ContactEmailMax {
		fields["email"] = "email must be a valid address of at most 254 characters"
	} else if addr, err := mail.ParseAddress(s.Email); err != nil || addr.Address != s.Email {
		fields["email"] = "email must be a valid address"
	}
	if n := utf8.RuneCountInString(s.Subject); n < ContactSubjectMin || n > ContactSubjectMax {
		fields["subject"] = "subject must be between 3 and 200 characters"
	}
	if n := utf8.RuneCountInString(s.Message); n < ContactMessageMin || n > ContactMessageMax {
		fields["message"] = "message must be between 10 and 5000 characters"
	}

	if len(fields) > 0 {
		return NewValidationError(fields)
	}
	return nil
}
