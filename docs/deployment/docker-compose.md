# Docker Compose Deployment

## Overview

This project runs as a Node monolith (Express API + Vite-built SPA) with SQLite in read-only mode at runtime.

- Supported profiles:
  - `dev`: hot reload (Vite + API)
  - `prod`: app + Nginx reverse proxy on HTTP
  - `prod-ssl-local`: app + Nginx with local TLS cert mount (homologation only)
- Canonical institutional subpath:
  - `BIOREMPP_URL_BASE_PATH=/bioremppdbx/`

## Environment

Copy `.env.example` and adjust values:

```bash
cp .env.example .env
```

Main variables:

- `BIOREMPP_URL_BASE_PATH` (backend + nginx), e.g. `/bioremppdbx/`
- `VITE_BIOREMPP_URL_BASE_PATH` (frontend build/dev), e.g. `/bioremppdbx/`
- `PORT` (runtime app port inside container, default `3000`)
- `SQLITE_DB_PATH` (runtime path inside app container, default `/app/data/biorempp.sqlite`)

## Development Profile

```bash
docker compose --profile dev up --build
```

Expected:

- Web: `http://localhost:5173/bioremppdbx/`
- API: proxied under `/bioremppdbx/api/*`
- Internal API port exposed on host: `3101`

## Production Profile (HTTP)

```bash
docker compose --profile prod up -d --build
```

Expected:

- App via Nginx: `http://localhost/bioremppdbx/`
- Health through subpath: `http://localhost/bioremppdbx/api/health`
- Internal app health: `http://localhost:3000/health` (inside network)

## Production Profile with Local TLS Mock (optional)

Generate a local cert/key and mount:

- `SSL_CERT_PATH=./.docker/certs/biorempp-local.crt`
- `SSL_KEY_PATH=./.docker/certs/biorempp-local.key`

Run:

```bash
docker compose --profile prod --profile prod-ssl-local up -d --build
```

Expected:

- HTTP redirect: `http://localhost:8081` -> HTTPS
- HTTPS app: `https://localhost:8443/bioremppdbx/`

## Institutional Ingress Checklist

- TLS termination should happen at institutional ingress/load balancer.
- Forward headers:
  - `X-Forwarded-Proto`
  - `X-Forwarded-For`
  - `X-Forwarded-Host`
- Keep external route prefix aligned with:
  - `BIOREMPP_URL_BASE_PATH=/bioremppdbx/`
- Health probe target:
  - `/bioremppdbx/api/health`

