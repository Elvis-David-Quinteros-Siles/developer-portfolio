# syntax=docker/dockerfile:1

# ---------------------------------------------------------------- deps -------
FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# ---------------------------------------------------------------- lint -------
# La stage de build hereda de esta, igual que en los Dockerfiles de Go: si el
# lint falla, la imagen no puede llegar a existir.
FROM deps AS lint
RUN npm run lint

# ---------------------------------------------------------------- build ------
# `npm run build` es `tsc -b && vite build`: el typecheck también es un gate.
FROM lint AS build

ARG VITE_APP_NAME=Portfolio
ENV VITE_APP_NAME=${VITE_APP_NAME}

RUN npm run build

# ---------------------------------------------------------------- serve ------
FROM nginxinc/nginx-unprivileged:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

# La imagen unprivileged ya corre como uid 101 (nginx) y escucha en 8080.
EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=3s --retries=3 --start-period=5s \
  CMD wget -qO- http://127.0.0.1:8080/ >/dev/null 2>&1 || exit 1
