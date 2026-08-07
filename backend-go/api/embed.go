// Package api embeds the hand-written OpenAPI 3 specification so the binary
// stays self-contained (distroless image without a filesystem layout).
package api

import _ "embed"

// OpenAPISpec is the raw openapi.yaml document.
//
//go:embed openapi.yaml
var OpenAPISpec []byte
