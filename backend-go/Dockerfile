# syntax=docker/dockerfile:1

# ---------------------------------------------------------------- base -----
FROM golang:1.23-alpine AS base
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .

# ---------------------------------------------------------------- test -----
# The builder inherits from this stage, so the image cannot be produced
# unless the unit tests pass.
FROM base AS test
RUN CGO_ENABLED=0 go vet ./... && CGO_ENABLED=0 go test ./...

# -------------------------------------------------------------- builder ----
FROM test AS builder
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/api ./cmd/api \
 && CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/healthcheck ./cmd/healthcheck

# ---------------------------------------------------------------- final ----
# Distroless static: no shell, no package manager, runs as nonroot.
# The compose healthcheck executes the static /app/healthcheck binary.
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=builder /out/api /app/api
COPY --from=builder /out/healthcheck /app/healthcheck
ENV PORT=8080 \
    GIN_MODE=release
EXPOSE 8080
ENTRYPOINT ["/app/api"]
