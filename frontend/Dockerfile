# syntax=docker/dockerfile:1

# ---------------------------------------------------------------- build ------
FROM node:22-alpine AS build
WORKDIR /app

ARG VITE_APP_NAME=Portfolio
ENV VITE_APP_NAME=${VITE_APP_NAME}

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---------------------------------------------------------------- serve ------
FROM nginxinc/nginx-unprivileged:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

# La imagen unprivileged ya corre como uid 101 (nginx) y escucha en 8080.
EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=3s --retries=3 --start-period=5s \
  CMD wget -qO- http://127.0.0.1:8080/ >/dev/null 2>&1 || exit 1
