# BioRemPPDBX (BioRemPP Database Explorer)

**Status:** `main` in production  
BioRemPPDBX is a read-only platform for exploratory bioremediation and toxicological data analysis, built for institutional deployment under a URL subpath.

## 1) Architecture and Stack

- Frontend: **React + Vite + TypeScript**
- Backend: **Node.js + Express** (monolithic app server)
- Database: **SQLite** (read-only at runtime)
- Declarative configuration (compiled before runtime/build):
  - Guided Analysis: YAML
  - FAQ: YAML
  - Contact: YAML
- Institutional subpath support (canonical):
  - `BIOREMPP_URL_BASE_PATH=/bioremppdbx/`

## 2) Functional Modules

- **Home**: entry point, database snapshot, guided-analysis overview, external download links
- **Database Metrics**: integrated dataset-level metadata and schema-oriented metrics
- **Compounds**: compound exploration and compound detail page
- **Compound Classes**: aggregate class-level exploration and details
- **Genes / KO**: gene/KO exploration and gene detail page
- **Pathways**: pathway exploration and pathway detail page
- **Toxicity**: endpoint-level ToxCSM exploration
- **Guided Analysis**: curated analytical use cases with reproducible outputs (SQL/Python recipes)
- **FAQ**: operational/scientific FAQs
- **Contact**: laboratory/team/contact information

## 3) Run Locally (without Docker)

### Prerequisites

- Node.js (LTS recommended)
- npm

### Steps

```bash
npm install
npm run ingest:sqlite
npm run dev
```

Alternative full dev command:

```bash
npm run dev:full
```

### Expected local URLs

- Web (Vite): `http://localhost:5173/bioremppdbx/`
- API (dev server): `http://localhost:3101`
- API base under subpath in frontend calls: `/bioremppdbx/api/*`

## 4) Run with Docker Compose

Compose project name: `bioremppdbx`

### Profiles

- `dev`: hot reload (Vite + API)
- `prod`: app + Nginx reverse proxy (HTTP)
- `prod-ssl-local`: local TLS mock/homologation

### Development profile

```bash
docker compose --profile dev up -d --build
```

### Production profile

```bash
docker compose --profile prod up -d --build
```

Expected production local URL:

- `http://localhost:83/bioremppdbx/`

Health endpoints:

- App through subpath: `http://localhost:83/bioremppdbx/api/health`
- Nginx health: `http://localhost:83/health`

For full deployment details, see:

- [docs/deployment/docker-compose.md](/c:/Users/Douglas/Documents/biorempp_organization/biorempp_database_explorer/project/docs/deployment/docker-compose.md)
- [docs/deployment/DOCKER_COMPOSE_TI.txt](/c:/Users/Douglas/Documents/biorempp_organization/biorempp_database_explorer/project/docs/deployment/DOCKER_COMPOSE_TI.txt)

## 5) Minimal Environment Variables

Aligned with `.env.example`:

- `BIOREMPP_URL_BASE_PATH` (example: `/bioremppdbx/`)
- `BIOREMPP_URL_BASE_PATH_NO_TRAILING` (example: `/bioremppdbx`)
- `VITE_BIOREMPP_URL_BASE_PATH` (example: `/bioremppdbx/`)
- `PORT` (app internal runtime port, default `3000`)
- `SQLITE_DB_PATH` (default `./data/biorempp.sqlite` for local)
- `HTTP_PORT` (Nginx host port in `prod`, default `83`)

Example:

```env
PORT=3000
SQLITE_DB_PATH=./data/biorempp.sqlite
BIOREMPP_URL_BASE_PATH=/bioremppdbx/
BIOREMPP_URL_BASE_PATH_NO_TRAILING=/bioremppdbx
VITE_BIOREMPP_URL_BASE_PATH=/bioremppdbx/
VITE_DEV_API_ORIGIN=http://127.0.0.1:3101
HTTP_PORT=83
```

## 6) Important npm Commands

### Build and quality

```bash
npm run compile:configs
npm run typecheck
npm run build
```

### Data pipeline

```bash
npm run ingest:sqlite
npm run check:footprint
```

### Tests

```bash
npm run test:run
npm run test:guided:compliance
```

`test:guided:compliance` validates consistency between guided recipes and guided execution outputs.

## 7) Data Releases and Versioning

- Public download release currently available:
  - **BioRemPP v1.0.0** (Zenodo): https://zenodo.org/records/18905195
- Internal baseline under evolution:
  - **v1.1.0** (in progress), including reproducibility pipeline integration and expanded interoperability fields.

Schema and guided documentation:

- [docs/database-schema.md](/c:/Users/Douglas/Documents/biorempp_organization/biorempp_database_explorer/project/docs/database-schema.md)
- [docs/guided-analysis.md](/c:/Users/Douglas/Documents/biorempp_organization/biorempp_database_explorer/project/docs/guided-analysis.md)

## 8) Quick Troubleshooting

- **Routes duplicated with `/bioremppdbx/bioremppdbx/...`**
  - Check `BIOREMPP_URL_BASE_PATH` and `VITE_BIOREMPP_URL_BASE_PATH` consistency.
- **App opens but internal navigation fails**
  - Hard refresh to clear stale frontend cache.
  - Confirm `/bioremppdbx/api/health` returns `200`.
- **Connection refused on localhost**
  - In `prod`, use `http://localhost:83/bioremppdbx/` (not port 80 unless overridden).
- **Logo/assets not loading**
  - Validate paths like `/bioremppdbx/BIOREMPP_LOGO.png`.
- **API errors behind proxy**
  - Verify forwarded headers and base path alignment in proxy/ingress config.

## 9) Branching and Contribution Flow

- `main`: production/hotfix/deploy branch
- `develop`: integration branch for upcoming features
- Feature branches should be created from `develop`
- Use **Conventional Commits**
- Recommended PR checks:
  - `npm run typecheck`
  - `npm run build`
  - Docker smoke test (`dev`/`prod` as applicable)

---

If you are preparing institutional deployment, start with:

- [docs/deployment/docker-compose.md](/c:/Users/Douglas/Documents/biorempp_organization/biorempp_database_explorer/project/docs/deployment/docker-compose.md)
