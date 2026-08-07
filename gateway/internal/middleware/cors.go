package middleware

import (
	"net/http"
	"strings"
)

// CORS aplica orígenes permitidos configurados por entorno (CONTRACTS.md §7)
// y responde los preflight sin llegar al backend.
func CORS(origins []string) Middleware {
	allowAll := false
	allowed := make(map[string]struct{}, len(origins))
	for _, o := range origins {
		o = strings.TrimRight(strings.TrimSpace(o), "/")
		switch o {
		case "":
		case "*":
			allowAll = true
		default:
			allowed[o] = struct{}{}
		}
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			w.Header().Add("Vary", "Origin")

			originAllowed := false
			if origin != "" {
				_, listed := allowed[strings.TrimRight(origin, "/")]
				originAllowed = allowAll || listed
			}
			if originAllowed {
				w.Header().Set("Access-Control-Allow-Origin", origin)
			}

			if r.Method == http.MethodOptions && r.Header.Get("Access-Control-Request-Method") != "" {
				if originAllowed {
					w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
					w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Request-ID")
					w.Header().Set("Access-Control-Max-Age", "86400")
				}
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
