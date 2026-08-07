// Package problem serializa errores HTTP en formato RFC 7807
// (application/problem+json), el formato de error del contrato (CONTRACTS.md §3).
package problem

import (
	"encoding/json"
	"net/http"
)

type Details struct {
	Type     string `json:"type"`
	Title    string `json:"title"`
	Status   int    `json:"status"`
	Detail   string `json:"detail,omitempty"`
	Instance string `json:"instance,omitempty"`
}

// Write emite la respuesta de error; debe ser la única escritura al ResponseWriter.
func Write(w http.ResponseWriter, r *http.Request, status int, detail string) {
	w.Header().Set("Content-Type", "application/problem+json")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(Details{
		Type:     "about:blank",
		Title:    http.StatusText(status),
		Status:   status,
		Detail:   detail,
		Instance: r.URL.Path,
	})
}
