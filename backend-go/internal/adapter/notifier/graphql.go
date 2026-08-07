// Package notifier implements the domain.ContactNotifier port as an HTTP
// client of the Django graphql-api submitContact mutation (Adapter pattern,
// CONTRACTS §6). This is the ONLY write path originated in go-api and it is
// fully delegated: go-api never writes to PostgreSQL (ADR-0003).
package notifier

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/portfolio/backend-go/internal/domain"
	"github.com/portfolio/backend-go/internal/infrastructure/logger"
)

// submitTimeout is the hard Go -> Django timeout (CONTRACTS §6).
const submitTimeout = 5 * time.Second

const contactMutation = `mutation($input: ContactInput!){ submitContact(input:$input){ id } }`

// GraphQLContactNotifier posts the submitContact mutation to graphql-api.
type GraphQLContactNotifier struct {
	endpoint string
	token    string
	client   *http.Client
	log      *slog.Logger
}

// NewGraphQLContactNotifier builds the client. baseURL is GRAPHQL_API_URL
// (e.g. http://graphql-api:8000); token is INTERNAL_SERVICE_TOKEN.
func NewGraphQLContactNotifier(baseURL, token string, log *slog.Logger) *GraphQLContactNotifier {
	return &GraphQLContactNotifier{
		endpoint: strings.TrimRight(baseURL, "/") + "/graphql",
		token:    token,
		client:   &http.Client{Timeout: submitTimeout},
		log:      log,
	}
}

type graphqlRequest struct {
	Query     string         `json:"query"`
	Variables map[string]any `json:"variables"`
}

type graphqlResponse struct {
	Data struct {
		SubmitContact struct {
			ID string `json:"id"`
		} `json:"submitContact"`
	} `json:"data"`
	Errors []struct {
		Message string `json:"message"`
	} `json:"errors"`
}

// SubmitContact delegates the submission to Django and returns the persisted
// message id. Transport failures and 5xx map to domain.ErrUpstreamUnavailable
// (503); a well-formed rejection maps to domain.ErrUpstreamRejected (502).
func (n *GraphQLContactNotifier) SubmitContact(ctx context.Context, s domain.ContactSubmission) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, submitTimeout)
	defer cancel()

	input := map[string]any{
		"name":      s.Name,
		"email":     s.Email,
		"subject":   s.Subject,
		"message":   s.Message,
		"userAgent": s.UserAgent,
	}
	if s.IPAddress != "" {
		input["ipAddress"] = s.IPAddress
	} else {
		input["ipAddress"] = nil
	}

	body, err := json.Marshal(graphqlRequest{
		Query:     contactMutation,
		Variables: map[string]any{"input": input},
	})
	if err != nil {
		return "", fmt.Errorf("encoding graphql request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, n.endpoint, bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("building graphql request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("X-Internal-Token", n.token)
	if rid := logger.RequestIDFrom(ctx); rid != "" {
		req.Header.Set("X-Request-ID", rid)
	}

	resp, err := n.client.Do(req)
	if err != nil {
		n.log.ErrorContext(ctx, "graphql-api unreachable", "error", err.Error())
		return "", fmt.Errorf("%w: %v", domain.ErrUpstreamUnavailable, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= http.StatusInternalServerError {
		n.log.ErrorContext(ctx, "graphql-api server error", "status", resp.StatusCode)
		return "", fmt.Errorf("%w: graphql-api returned status %d", domain.ErrUpstreamUnavailable, resp.StatusCode)
	}

	raw, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return "", fmt.Errorf("%w: reading graphql response: %v", domain.ErrUpstreamUnavailable, err)
	}

	var out graphqlResponse
	if err := json.Unmarshal(raw, &out); err != nil {
		return "", fmt.Errorf("%w: invalid graphql response: %v", domain.ErrUpstreamUnavailable, err)
	}

	if len(out.Errors) > 0 {
		n.log.WarnContext(ctx, "submitContact rejected by graphql-api",
			"status", resp.StatusCode, "graphql_error", out.Errors[0].Message)
		return "", fmt.Errorf("%w: %s", domain.ErrUpstreamRejected, out.Errors[0].Message)
	}
	if resp.StatusCode != http.StatusOK || out.Data.SubmitContact.ID == "" {
		n.log.WarnContext(ctx, "submitContact returned no id", "status", resp.StatusCode)
		return "", fmt.Errorf("%w: submitContact returned no id (status %d)", domain.ErrUpstreamRejected, resp.StatusCode)
	}
	return out.Data.SubmitContact.ID, nil
}
