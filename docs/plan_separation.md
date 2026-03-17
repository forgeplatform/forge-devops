# Plan separacije projekta na zasebne repozitorijume

## Pregled

Forge platforma se trenutno nalazi u jednom monorepo-u. Ovaj plan definiše razdvajanje na **5 nezavisnih repozitorijuma** koji se povezuju kroz CI/CD pipeline.

```
forgeplatform/
├── forge-backend        ← Django API + Task Engine + Celery
├── forge-frontend       ← React UI (Vite + Tailwind)
├── forge-deploy         ← Docker, Compose, Nginx, CI/CD, infra
├── forge-assistant      ← Ollama + ChromaDB RAG (buduće)
└── forge-mobile         ← Android/iOS app (buduće)
```

---

## Faza 1: forge-backend

**Repo:** `forgeplatform/forge-backend`

### Šta ulazi:
| Izvor (trenutni monorepo) | Odredište u novom repo-u |
|---|---|
| `forge/` (Python paket) | `forge/` |
| `forge/main/`, `forge/api/`, `forge/conf/`, `forge/sso/` | Isto |
| `forge/settings/` | `forge/settings/` |
| `manage.py` | `manage.py` |
| `requirements/` | `requirements/` |
| `tools/` (management skripte) | `tools/` |
| `setup.cfg`, `setup.py`, `pyproject.toml` | Root |

### Dokumentacija koja ide uz backend:
- `docs/wiki/02-backend-django.md`
- `docs/wiki/04-task-engine.md`
- `docs/wiki/05-authentication-rbac.md`
- `docs/wiki/06-database-schema.md`
- `docs/wiki/09-testing-guide.md` (Python dio)
- `docs/wiki/11-api-reference.md`
- `docs/wiki/12-configuration-reference.md`

### CI/CD za backend repo:
```yaml
# .gitlab-ci.yml
stages:
  - lint        # flake8
  - test        # pytest (unit + functional)
  - build       # Docker image (forge-backend:tag)
  - security    # pip-audit, trivy
  - publish     # Push image na registry
```

### Artefakt:
- Docker image: `krlex/forge-backend:<verzija>`
- API dokumentacija (auto-generisana)

---

## Faza 2: forge-frontend

**Repo:** `forgeplatform/forge-frontend`

### Šta ulazi:
| Izvor (trenutni monorepo) | Odredište u novom repo-u |
|---|---|
| `src/` (React aplikacija) | `src/` |
| `public/` | `public/` |
| `index.html` | `index.html` |
| `package.json`, `package-lock.json` | Root |
| `vite.config.ts` | Root |
| `tailwind.config.ts` | Root |
| `tsconfig.json`, `tsconfig.*.json` | Root |
| `postcss.config.js` | Root |
| `.eslintrc.*` | Root |

### Dokumentacija koja ide uz frontend:
- `docs/wiki/03-frontend-react.md`
- `docs/wiki/09-testing-guide.md` (Frontend dio)

### CI/CD za frontend repo:
```yaml
# .gitlab-ci.yml
stages:
  - lint        # tsc --noEmit, eslint
  - test        # vitest
  - build       # vite build → static bundle
  - publish     # Upload artefakta ili Docker image sa nginx
```

### Artefakt:
- Build folder (`dist/`) — statički fajlovi
- Opciono Docker image: `krlex/forge-frontend:<verzija>` (nginx + static files)

### Konfiguracija:
- API URL se konfiguriše kroz environment varijablu (`VITE_API_URL`)
- Frontend se build-uje nezavisno od backend-a
- Proxy konfiguracija u `vite.config.ts` za development

---

## Faza 3: forge-deploy

**Repo:** `forgeplatform/forge-deploy`

### Šta ulazi:
| Izvor (trenutni monorepo) | Odredište u novom repo-u |
|---|---|
| `Dockerfile`, `Dockerfile.*` | `docker/` |
| `docker-compose.yml` | Root |
| `nginx/` konfiguracija | `nginx/` |
| `Vagrantfile` | `vagrant/` |
| Deployment skripte | `scripts/` |
| SSL/TLS konfiguracija | `ssl/` |

### Dokumentacija koja ide uz deploy:
- `docs/wiki/01-architecture-overview.md`
- `docs/wiki/07-docker-deployment.md`
- `docs/wiki/08-ci-cd-pipeline.md`
- `docs/wiki/10-contributing-guide.md`
- `docs/ci-pipeline-reference.md`
- `docs/startrun.md`
- `docs/RELEASE_NOTES_*.md`
- `docs/future_development_plan.md`

### Struktura:
```
forge-deploy/
├── docker/
│   ├── Dockerfile.backend      # Multi-stage za backend
│   ├── Dockerfile.frontend     # Multi-stage za frontend (nginx)
│   └── Dockerfile.assistant    # Ollama + RAG (buduće)
├── docker-compose.yml          # Produkcioni stack
├── docker-compose.dev.yml      # Development stack
├── nginx/
│   ├── nginx.conf
│   └── forge.conf
├── ssl/
│   └── letsencrypt.sh
├── scripts/
│   ├── backup.sh
│   ├── restore.sh
│   ├── health-check.sh
│   └── init.sh
├── vagrant/
│   └── Vagrantfile
├── docs/
│   └── (sva deployment dokumentacija)
├── .env.example
└── README.md
```

### Docker Compose (produkcija):
```yaml
services:
  postgres:
    image: postgres:15
  redis:
    image: redis:7
  forge-backend:
    image: krlex/forge-backend:${VERSION}
  forge-frontend:
    image: krlex/forge-frontend:${VERSION}
  forge-task:
    image: krlex/forge-backend:${VERSION}   # isti image, drugi entrypoint
  nginx:
    # reverse proxy → frontend + backend API
```

### CI/CD orchestracija:
```
forge-deploy repo je "glue" koji:
1. Povlači verzije backend i frontend image-a
2. Definiše kako se deploy-uje na server
3. Sadrži docker-compose za produkciju
4. Sadrži backup/restore skripte
5. Sadrži health check i monitoring konfiguraciju
```

---

## Faza 4: forge-assistant (buduće)

**Repo:** `forgeplatform/forge-assistant`

### Planirana struktura:
```
forge-assistant/
├── app/
│   ├── main.py              # FastAPI/Django app
│   ├── ollama_client.py     # Ollama LLM integracija
│   ├── rag/
│   │   ├── indexer.py       # ChromaDB document indexing
│   │   └── retriever.py     # RAG retrieval
│   └── api/
│       └── assistant.py     # /api/v2/assistant/ endpoint
├── documents/               # Dokumenti za RAG indeksiranje
├── Dockerfile
├── requirements.txt
├── docker-compose.yml       # Ollama + ChromaDB + Assistant
└── docs/
    └── chat_plan.md
```

### Integracija:
- Izlaže API koji frontend konzumira (`/api/v2/assistant/`)
- SSE streaming za real-time odgovore
- ChromaDB za vektorsko pretraživanje dokumentacije
- Ollama za LLM inference (lokalno, bez cloud zavisnosti)

---

## Faza 5: forge-mobile (buduće)

**Repo:** `forgeplatform/forge-mobile`

### Planirana struktura:
```
forge-mobile/
├── android/
│   ├── app/src/main/kotlin/   # Kotlin + Jetpack Compose
│   └── build.gradle.kts
├── backend/                    # Go API za mobile-specific funkcije
│   ├── cmd/server/main.go
│   ├── internal/
│   │   ├── auth/              # JWT + biometric verification
│   │   ├── push/              # FCM push notifications
│   │   └── approval/         # Deployment approval flow
│   └── go.mod
├── docs/
│   └── mobile_plan.md
└── .github/workflows/         # Android build + Go build
```

---

## Kako se repoi povezuju (CI/CD integracija)

### Verzionisanje:
- Svi repoi koriste **CalVer**: `YYYY.MM.PATCH` (npr. `2026.03.1`)
- Git tagovi pokreću release pipeline
- `forge-deploy` referencira verzije ostalih repoa

### Release flow:
```
1. Developer push-uje kod u forge-backend ili forge-frontend
2. CI tog repo-a:
   - lint → test → build → security → publish Docker image
3. forge-deploy se ažurira sa novom verzijom:
   - Ručno: update VERSION u .env ili docker-compose.yml
   - Automatski: webhook/trigger koji ažurira verziju
4. Deploy na server:
   - git pull forge-deploy
   - docker compose pull
   - docker compose up -d
```

### Dijagram povezivanja:
```
┌──────────────┐     ┌───────────────┐     ┌──────────────┐
│ forge-backend│     │ forge-frontend│     │forge-assistant│
│   (Django)   │     │   (React)     │     │  (Ollama)    │
└──────┬───────┘     └──────┬────────┘     └──────┬───────┘
       │ publish             │ publish              │ publish
       ▼                     ▼                      ▼
┌─────────────────────────────────────────────────────────┐
│              Docker Registry (DockerHub)                │
│  krlex/forge-backend   krlex/forge-frontend   krlex/... │
└─────────────────────────┬───────────────────────────────┘
                          │ pull
                          ▼
              ┌───────────────────────┐
              │     forge-deploy      │
              │  docker-compose.yml   │
              │  nginx, ssl, scripts  │
              └───────────┬───────────┘
                          │ deploy
                          ▼
              ┌───────────────────────┐
              │   Production Server   │
              └───────────────────────┘
```

---

## Redosled izvršavanja

| Korak | Akcija | Prioritet |
|-------|--------|-----------|
| 1 | Kreirati `forge-frontend` repo, izvući React kod | Visok |
| 2 | Kreirati `forge-backend` repo, izvući Django kod | Visok |
| 3 | Kreirati `forge-deploy` repo, definisati Docker Compose | Visok |
| 4 | Podesiti CI/CD za svaki repo | Visok |
| 5 | Testirati end-to-end sa separatnim image-ima | Visok |
| 6 | Kreirati `forge-assistant` repo | Srednji |
| 7 | Kreirati `forge-mobile` repo | Nizak |

### Korak 1-3: Razdvajanje (procjena: 1-2 sedmice)
- Koristiti `git filter-branch` ili `git subtree split` za očuvanje istorije
- Ažurirati sve reference i putanje
- Verifikovati da svaki repo samostalno prolazi CI

### Korak 4-5: CI/CD integracija (procjena: 1 sedmica)
- GitLab CI za svaki repo
- Docker Hub publish za svaki repo
- `forge-deploy` orchestracija

### Korak 6-7: Buduće komponente
- Po `chat_plan.md` i `mobile_plan.md` vremenskim okvirima

---

## Napomene

- **Monorepo ostaje kao arhiva** — trenutni repo `awx` se zadržava u read-only modu kao referenca
- **Dokumentacija se dijeli** — svaki repo dobija svoju relevantnu dokumentaciju
- **Zajednički wiki** — `forge-deploy` sadrži arhitekturalni pregled i linkove ka svim repozitorijumima
- **Docker image-i su jedini artefakt** — repoi ne zavise direktno jedan od drugog, samo preko Docker image-a
- **Environment varijable** — sva konfiguracija između servisa ide kroz env varijable (12-factor app princip)
