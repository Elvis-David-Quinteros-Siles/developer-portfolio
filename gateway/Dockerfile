# syntax=docker/dockerfile:1

FROM golang:1.23-alpine AS base
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .

# La etapa de build hereda de test: un build solo puede terminar OK si los
# tests pasaron.
FROM base AS test
RUN go vet ./... && CGO_ENABLED=0 go test ./...

FROM test AS build
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/gateway ./cmd/gateway \
 && CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/healthcheck ./cmd/healthcheck

# Imagen final sin shell ni libc: solo los dos binarios estáticos.
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/gateway /app/gateway
COPY --from=build /out/healthcheck /app/healthcheck
USER nonroot:nonroot
EXPOSE 8080
ENTRYPOINT ["/app/gateway"]
