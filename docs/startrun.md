# Forge Platform - Project Overview

## About the Project

**Forge** is an infrastructure automation platform based on the AWX project (version 24.6.1).
The project is licensed under Apache License 2.0, based on the original work by the Red Hat team.

The goal is a complete refactoring of the code - both backend and frontend - to make it clean, readable, and maintainable.
Modernization for running on newer systems (Ubuntu 24.04+, Python 3.12+).

---

## Architecture

Forge Platform is split into three independent repositories:

| Repository | Description | Registry |
|------------|-------------|----------|
| `forge-backend` | Django REST API, task engine, receptor | `registry.cloudforyour.work/forge-platform/forge-backend` |
| `forge-frontend` | React UI (Vite + TypeScript) | `registry.cloudforyour.work/forge-platform/forge-frontend` |
| `forge-deploy` | Docker Compose, nginx, settings, scripts | — |

### Service Architecture

```
                    ┌─────────────────────────────────────────────┐
                    │               External Nginx                │
                    │         (TLS termination, routing)           │
                    │              ports 80 / 443                  │
                    └──────┬──────────────┬───────────────┬───────┘
                           │              │               │
                    /api/, /sso/    /websocket/    / (everything else)
                    /api/login/          │               │
                           │              │               │
                    ┌──────▼──────┐       │        ┌──────▼──────┐
                    │  forge-web  │◄──────┘        │forge-frontend│
                    │ (uwsgi +   │                 │ (nginx +     │
                    │  daphne +   │                 │  React SPA)  │
                    │  nginx-int) │                 └──────────────┘
                    │  port 8013  │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ forge-task  │
                    │ (dispatcher,│
                    │  callback,  │
                    │  wsrelay,   │
                    │  receptor)  │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │                         │
       ┌──────▼──────┐          ┌──────▼──────┐
       │  PostgreSQL  │          │    Redis    │
       │   15-alpine  │          │  7-alpine   │
       └──────────────┘          └─────────────┘
```

---

## What Has Been Done So Far

### Repository Separation (COMPLETED 2026-03-17)

The monolithic AWX codebase was separated into three independent repos:

- **forge-backend**: Python package (`forge/`), Dockerfile (Ubuntu 24.04 multi-stage),
  supervisor configs, settings, all Django management commands
- **forge-frontend**: React/Vite/TypeScript SPA with its own Dockerfile (Node 20 build + nginx serve)
- **forge-deploy**: Production Docker Compose stack, nginx TLS config, init/healthcheck/backup scripts

### Docker Images on Harbor

- `registry.cloudforyour.work/forge-platform/forge-backend:latest` — Ubuntu 24.04, Python 3.12, receptor, supervisor
- `registry.cloudforyour.work/forge-platform/forge-frontend:latest` — nginx 1.27-alpine serving built React assets

### Production Deployment (VERIFIED 2026-03-17)

Full production stack deployed and verified in Vagrant VM (Ubuntu 24.04):
- **6 services**: postgres, redis, forge-init, forge-web, forge-task, forge-frontend, nginx
- **HTTPS**: self-signed SSL with nginx TLS termination (port 443)
- **HTTP→HTTPS redirect**: automatic
- **API**: `/api/v2/ping/` returns version 2026.3.0
- **Auth**: admin login verified
- **Frontend**: React SPA served via forge-frontend container, proxied by nginx
- **252 Django migrations** applied successfully

### AWX→Forge File Rename (COMPLETED 2026-03-17)

All remaining `awx*` files renamed to `forge*` across all repositories:

- `awx-python` → `forge-python` (Python venv wrapper script)
- `awx_settings.py` → `forge_settings.py` (Django settings module)
- `awx-spud-reading.svg` → removed (old AWX mascot icon)
- `awx-autoreload` → `forge-autoreload` (dev file watcher)
- `awx-manage` (dev wrapper) → `forge-manage`
- All `awx-manage` references in scripts → `forge-manage`
- Backward compatibility: `awx-manage` and `awx-python` symlinks preserved in Docker image

**Result**: Zero `awx*` files remaining in any repository. `forge-manage` is the primary
management command. `awx-manage` still works via symlink for backward compatibility.

### Previous Work (from monolithic phase)

- AWX 24.6.1 cloned, `modernization` branch created
- Full rebranding AWX → Forge (Level 1 user-facing + Level 2 package rename)
- **2882 files changed** — `awx/` → `forge/` with all imports updated
- Python unit tests: **1083 passed**, 0 failed
- CI/CD: Jenkinsfile with Lint → Test → Build → Security → Release stages
- Version: `2026.03.0` (CalVer format)

### Bugs Fixed During Deployment

1. `forge/devonly.py` present in sdist → forced development mode in production
2. Missing `import logging.handlers` in `forge/main/utils/handlers.py`
3. Missing SSL cert path symlink for Ubuntu (`/etc/pki/tls/certs/ca-bundle.crt`)
4. Missing `curl` in runtime image (needed for healthcheck)
5. Missing `forge/ui_next/` stub module (needed by `forge/urls.py`)
6. Missing `collectstatic` in headless build (DRF/Django admin static files)

---

## Phase Overview

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Build Stabilization | **COMPLETED** |
| 2 | Rebranding (Forge) | **COMPLETED** |
| 3 | Dependency Modernization | **COMPLETED** |
| 4 | Backend Refactoring | **COMPLETED** |
| 5 | Frontend Refactoring | **COMPLETED** |
| 6 | Dockerfile Modernization | **COMPLETED** |
| 7 | Docker Compose Production | **COMPLETED** |
| 8 | Testing and QA | **COMPLETED** |
| 9 | Release | **COMPLETED** |
| L1 | User-Facing Rebranding | **COMPLETED** |
| L2 | Full Package Rename (awx→forge) | **COMPLETED** |
| 10 | Repository Separation | **COMPLETED** |
| 11 | AWX→Forge File Rename | **COMPLETED** |
| 12 | Centralized CI/CD Pipeline | **COMPLETED** |

### CI/CD Pipeline (COMPLETED 2026-03-17)

Centralized Jenkinsfile in `forge-deploy` that orchestrates all three repos:

```
Checkout (backend + frontend) → Lint → Test → Build → Security → Release
```

- Pipeline clones `forge-backend` and `forge-frontend` from Git
- Runs Python lint (flake8) + frontend lint (tsc) in parallel
- Runs Python unit tests (pytest) + frontend tests (vitest) in parallel
- Builds both Docker images (`forge-platform/forge-backend`, `forge-platform/forge-frontend`)
- Security scans: pip-audit + Trivy container scan
- Release: pushes versioned images to Harbor (`registry.cloudforyour.work`) on `main` branch or git tags

Jenkins credentials: `forge-git-creds` (SSH), `forge-harbor-creds` (Harbor)

---

## How to Deploy (Production)

### Prerequisites

- Docker 24+ with Compose v2
- 8GB+ RAM, 4+ CPU cores
- SSL certificates (Let's Encrypt or self-signed)

### Quick Start

```bash
git clone <forge-deploy-repo>
cd forge-deploy

# 1. Create .env from template
cp .env.example .env
# Edit .env — set POSTGRES_PASSWORD, FORGE_SECRET_KEY, FORGE_ADMIN_PASSWORD, etc.

# 2. SSL certificates (self-signed for testing)
mkdir -p nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/privkey.pem -out nginx/ssl/fullchain.pem \
  -subj "/CN=forge.local"

# 3. Deploy
docker compose up -d

# 4. Watch initialization
docker compose logs -f forge-init

# 5. Access
# HTTPS: https://<your-ip>/
# API:   https://<your-ip>/api/v2/ping/
# Login: admin / <FORGE_ADMIN_PASSWORD from .env>
```

### Deploy in Vagrant (for testing)

```bash
cd forge-deploy
vagrant up          # Starts Ubuntu 24.04 VM with Docker
vagrant ssh
cd /forge-deploy
docker compose up -d

# Access from host browser: https://192.168.56.22/
```

---

## How to Build Images

### Backend

```bash
cd forge-backend
docker build -t registry.cloudforyour.work/forge-platform/forge-backend:latest .
docker push registry.cloudforyour.work/forge-platform/forge-backend:latest
```

### Frontend

```bash
cd forge-frontend
docker build -t registry.cloudforyour.work/forge-platform/forge-frontend:latest .
docker push registry.cloudforyour.work/forge-platform/forge-frontend:latest
```

---

## Vagrant Development Environments

Each repo includes a Vagrantfile with Ubuntu 24.04 and Docker/Compose pre-installed:

| Repo | VM IP | RAM | Ports |
|------|-------|-----|-------|
| forge-backend | 192.168.56.20 | 8GB | 8043, 8013, 8080, 5433 |
| forge-frontend | 192.168.56.21 | 4GB | 3000, 4173 |
| forge-deploy | 192.168.56.22 | 8GB | 80→8080, 443→8443, 8013 |

---

## File Structure

```
forge-platform/
├── forge-backend/              # Python backend
│   ├── Dockerfile              # Production multi-stage build (Ubuntu 24.04)
│   ├── Vagrantfile             # Dev VM
│   ├── Makefile                # Build targets
│   ├── _build/                 # Rendered supervisor configs
│   ├── forge/                  # Main Python package
│   │   ├── api/                # REST API
│   │   ├── main/               # Core models, tasks, migrations
│   │   ├── settings/           # Django settings
│   │   ├── ui_next/            # SPA routing stub (urls.py + template)
│   │   └── sso/                # SSO/LDAP/SAML
│   └── requirements/           # Python dependencies
│
├── forge-frontend/             # React UI
│   ├── Dockerfile              # Multi-stage (Node 20 + nginx)
│   ├── Vagrantfile             # Dev VM
│   ├── nginx.conf              # SPA nginx config
│   ├── src/                    # React/TypeScript source
│   └── package.json            # Node dependencies
│
└── forge-deploy/               # Deployment
    ├── docker-compose.yml      # 7 services (postgres, redis, init, web, task, frontend, nginx)
    ├── .env.example            # Environment template
    ├── Vagrantfile             # Deployment test VM
    ├── settings/               # Django production settings
    ├── nginx/                  # External nginx (TLS, routing)
    ├── receptor/               # Receptor mesh config
    ├── scripts/                # init, healthcheck, backup, restore
    └── docs/                   # Documentation
```

---

## Development Rules

- **Every change is understood** - if you cannot explain why something was done, do not commit it
- **Review everything** - always review the diff before committing
- **Author of all commits and code is Krstan Vjestica** - never attribute tools as authors
- **All deployment testing inside Vagrant VM** - never install dependencies on host

## Commit Message Format

`type(scope): short description`

Types: `refactor`, `fix`, `feat`, `docs`, `test`, `chore`

---

## License

Forge is licensed under Apache License 2.0.
Based on the AWX project (https://github.com/ansible/awx).
