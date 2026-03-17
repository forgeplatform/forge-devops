# Forge Deploy

Deployment, infrastruktura i CI/CD za Forge platformu.

## Pregled

Ovaj repo sadrži sve potrebno za deploy Forge platforme:
- Docker Compose konfiguracija (produkcija + development)
- Nginx reverse proxy
- SSL/TLS (Let's Encrypt)
- Backup/restore skripte
- CI/CD pipeline konfiguracija
- Health check skripte
- Receptor mesh konfiguracija

## Quick Start

```bash
# 1. Kloniraj repo
git clone https://github.com/forgeplatform/forge-deploy.git
cd forge-deploy

# 2. Konfiguriši environment
cp .env.example .env
# Uredi .env sa pravim vrijednostima

# 3. Pokreni
docker compose up -d

# 4. Provjeri health
./scripts/healthcheck-web.sh
```

## Arhitektura

```
┌──────────────┐     ┌───────────────┐
│ forge-backend│     │ forge-frontend│
│   (Django)   │     │   (React)     │
└──────┬───────┘     └──────┬────────┘
       │                     │
       ▼                     ▼
┌─────────────────────────────────────┐
│          Docker Registry            │
└─────────────────┬───────────────────┘
                  │
                  ▼
       ┌─────────────────┐
       │   forge-deploy   │
       │ docker-compose   │
       └────────┬────────┘
                │
    ┌───────────┼───────────┐
    ▼           ▼           ▼
┌────────┐ ┌────────┐ ┌────────┐
│ nginx  │ │postgres│ │ redis  │
└────────┘ └────────┘ └────────┘
```

## Servisi

| Servis | Image | Port | Opis |
|--------|-------|------|------|
| nginx | nginx:latest | 443, 80 | Reverse proxy, SSL termination |
| forge-web | krlex/forge-backend | 8013 | Django API + uWSGI |
| forge-task | krlex/forge-backend | - | Celery worker + Dispatcher |
| postgres | postgres:15 | 5432 | Baza podataka |
| redis | redis:7 | 6379 | Cache + message broker |

## Struktura

```
forge-deploy/
├── docker-compose.yml       # Produkcioni stack
├── docker-compose.dev.yml   # Development stack
├── docker/                  # Dockerfile templates
├── nginx/                   # Nginx konfiguracija + SSL
├── receptor/                # Receptor mesh konfiguracija
├── scripts/                 # Backup, restore, health checks
├── settings/                # Django production settings
├── docs/                    # Sva dokumentacija
├── .env.example             # Template za environment
└── Jenkinsfile              # Jenkins pipeline
```

## Dokumentacija

### Deployment
- [Architecture Overview](docs/01-architecture-overview.md)
- [Docker Deployment](docs/07-docker-deployment.md)
- [CI/CD Pipeline](docs/08-ci-cd-pipeline.md)
- [CI Pipeline Reference](docs/ci-pipeline-reference.md)
- [Contributing Guide](docs/10-contributing-guide.md)

### Planovi
- [Separation Plan](docs/plan_separation.md)
- [Development Plan](docs/plan_development.md)
- [Detailed Plan](docs/plan_detailed.md)
- [Future Development](docs/future_development_plan.md)
- [Chat/AI Assistant Plan](docs/chat_plan.md)
- [Mobile App Plan](docs/mobile_plan.md)

### Release
- [Release Notes v2026.03.0](docs/RELEASE_NOTES_v2026.03.0.md)
- [Start & Run Guide](docs/startrun.md)

## Backup & Restore

```bash
# Backup
./scripts/backup.sh

# Restore
./scripts/restore.sh /path/to/backup.sql.gz
```

## Povezani repozitorijumi

- [forge-backend](https://github.com/forgeplatform/forge-backend) — Django API + Task Engine
- [forge-frontend](https://github.com/forgeplatform/forge-frontend) — React UI
