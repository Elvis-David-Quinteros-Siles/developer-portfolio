// Package proxy construye los reverse proxies hacia los backends internos
// (CONTRACTS.md §2). Conserva el path original y propaga X-Request-ID y
// X-Forwarded-For de extremo a extremo (§8).
package proxy

import (
	"context"
	"errors"
	"log/slog"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"time"

	"github.com/portfolio/gateway/internal/middleware"
	"github.com/portfolio/gateway/internal/problem"
)

type options struct {
	defaultRespHeaders map[string]string
}

type Option func(*options)

// WithDefaultResponseHeader fija una cabecera en la respuesta solo si el
// backend no la definió (p. ej. Cache-Control para /media/*).
func WithDefaultResponseHeader(key, value string) Option {
	return func(o *options) {
		if o.defaultRespHeaders == nil {
			o.defaultRespHeaders = map[string]string{}
		}
		o.defaultRespHeaders[key] = value
	}
}

// New devuelve un handler que reenvía la petición a target conservando el path.
func New(target *url.URL, log *slog.Logger, opts ...Option) http.Handler {
	var o options
	for _, opt := range opts {
		opt(&o)
	}

	rp := &httputil.ReverseProxy{
		Rewrite: func(pr *httputil.ProxyRequest) {
			prior := pr.In.Header.Get("X-Forwarded-For")
			pr.SetURL(target)
			pr.Out.Host = pr.In.Host
			pr.SetXForwarded()
			// SetXForwarded descarta la cadena XFF entrante (nginx ya añadió la
			// IP del cliente); la restauramos anteponiéndola al salto actual.
			if prior != "" {
				pr.Out.Header.Set("X-Forwarded-For", prior+", "+pr.Out.Header.Get("X-Forwarded-For"))
			}
		},
		Transport: &http.Transport{
			DialContext: (&net.Dialer{
				Timeout:   5 * time.Second,
				KeepAlive: 30 * time.Second,
			}).DialContext,
			MaxIdleConns:          100,
			MaxIdleConnsPerHost:   32,
			IdleConnTimeout:       90 * time.Second,
			ResponseHeaderTimeout: 30 * time.Second,
			ExpectContinueTimeout: 1 * time.Second,
		},
		ModifyResponse: func(resp *http.Response) error {
			for k, v := range o.defaultRespHeaders {
				if resp.Header.Get(k) == "" {
					resp.Header.Set(k, v)
				}
			}
			return nil
		},
		ErrorHandler: func(w http.ResponseWriter, r *http.Request, err error) {
			if errors.Is(err, context.Canceled) {
				// El cliente abortó; no hay a quién responder.
				return
			}
			log.Error("upstream error",
				"request_id", middleware.GetRequestID(r.Context()),
				"upstream", target.Host,
				"path", r.URL.Path,
				"error", err,
			)
			problem.Write(w, r, http.StatusBadGateway, "upstream service unavailable")
		},
	}
	return rp
}
