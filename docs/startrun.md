# Forge - Project Overview

## About the Project

**Forge** is an infrastructure automation platform based on the AWX project (version 24.6.1).
The project is licensed under Apache License 2.0, based on the original work by the Red Hat team.

The goal is a complete refactoring of the code - both backend and frontend - to make it clean, readable, and maintainable.
Modernization for running on newer systems (Ubuntu 24.04+, Python 3.12+).

---

## What Has Been Done So Far

### Environment

- Cloned AWX 24.6.1 and created the `modernization` branch
- Created a `Vagrantfile` for local build on Ubuntu 24.04 (4 CPU / 8GB RAM)
- Created a provision script (`tools/scripts/vagrant-provision.sh`) that installs:
  - Docker + Docker Compose
  - Python 3.11 (for AWX compatibility) + Python 3.12 (system)
  - Node.js 18
  - Ansible
- Version: `2026.03.0` (CalVer format, derived from git tag)

### Critical Fixes

The following bugs were fixed to make the build pass at all:

1. **OpenSSL pin removed** (`tools/ansible/roles/dockerfile/templates/Dockerfile.j2`)
   - `openssl-3.0.7` no longer exists in CentOS Stream 9 repositories
   - Replaced with `openssl` (without version) in both stages (builder and runtime)

2. **Rsyslog pin removed** (`tools/ansible/roles/dockerfile/templates/Dockerfile.j2`)
   - `rsyslog-8.2102.0-106.el9` replaced with `rsyslog`

3. **Django version updated** (`requirements/requirements.txt`)
   - `django==4.2.10` → `django==4.2.16`
   - Resolves conflict with `django-ansible-base` which requires `>=4.2.16`

4. **sqlparse updated** (`requirements/requirements.txt`)
   - `sqlparse==0.4.4` → `sqlparse==0.5.2`

5. **django-ansible-base pinned** (`requirements/requirements_git.txt`)
   - From `@devel` (unstable) to `@2024.9.4` (stable tag)

6. **Argparse crash for Python 3.12.8+** (`awxkit/awxkit/cli/utils.py`)
   - `_parse_known_args` method was missing the `intermixed` parameter
   - Added the parameter to work with newer Python versions

### Level 1 - User-Facing Rebranding (COMPLETED)

Full user-facing rebranding from AWX to Forge:
- Product name, titles, descriptions changed across all UI and API
- API headers: `X-API-Product-Name: Forge`
- Django app labels, logging prefixes, branding strings
- Frontend: page titles, logos, theme colors
- Documentation fully translated to English

### Level 2 - Full Package Rename (COMPLETED 2026-03-11)

Complete Python package rename `awx/` → `forge/`:
- **2882 files changed** — directory rename with all internal imports updated
- All 143 migration field references fixed (`awx.main.fields` → `forge.main.fields`)
- `setup.cfg`: `find:` packages with `[options.package_data]` for templates/static
- `uwsgi.ini`: WSGI path → `forge.wsgi:application`
- Database ENGINE and cache BACKEND → `forge.main.db` / `forge.main.cache`
- `awx-manage` symlink preserved for backward compatibility
- `ui_next/urls.py`: template name → `index_forge.html`
- `.gitignore`: cleaned up, all `awx/` patterns replaced with `forge/`
- CI configs (`.gitlab-ci.yml`, `Jenkinsfile`) updated for `forge/` paths
- `resource_api.py`: `service_type` kept as `"awx"` (external library constraint)

### Production Deployment (VERIFIED 2026-03-11)

Full production stack deployed and verified in Vagrant VM:
- **Docker image**: CentOS Stream 9, multi-stage build with UI frontend
- **Services**: postgres, redis, forge-init, forge-web (uwsgi+daphne), forge-task, nginx
- **HTTPS**: self-signed SSL with nginx TLS termination (port 8043)
- **HTTP→HTTPS redirect**: nginx on port 8080 redirects to 8043
- **CSRF**: trusted origins set in DB via init script (AWX conf system override)
- **252 Django migrations** applied successfully
- **UI**: React frontend (forge/ui_next) built and served at root URL
- **API**: DRF browseable interface fully functional at `/api/v2/`
- **Auth**: admin login, OAuth2 token creation verified

### Test Results (2026-03-11)

**Python unit tests**: **1083 passed**, 0 failed, 1 skipped
- Fixed `test_db.py`: `awx.__version__` → `forge.__version__`
- Fixed `test_filters.py`: `enabled_loggers ['awx']` → `['forge']`
- Fixed `is_testing()`: added `pytest` to argv detection patterns
- Fixed `defaults/__init__.py`: added `DEFAULTS_SNAPSHOT` generation

**Previous Phase 8 results** (still valid):
- **Functional (API)** — 989 passed, 0 failed, 1 skipped
- **Lint (Python)** — flake8 0 errors
- **Lint (Frontend)** — tsc --noEmit, 0 errors
- **Security (Python)** — pip-audit, 0 critical runtime CVE
- **Security (Container)** — trivy, 0 CRITICAL

### Documentation

- `docs/plan_development.md` - Development plan overview in 8 phases
- `docs/plan_detailed.md` - **MAIN WORKING DOCUMENT** - Detailed step-by-step plan
- `docs/startrun.md` - This file
- `CHANGELOG.md` - Record of all changes (in the project root)

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
| 9 | Release | **IN PROGRESS** |
| L1 | User-Facing Rebranding | **COMPLETED** |
| L2 | Full Package Rename (awx→forge) | **COMPLETED** |

### Current step: Phase 9 - Release (in progress)

**Completed:**
- VERSION: `24.6.2` → `2026.03.0` (CalVer format)
- Changelog finalized (all phases documented)
- CI/CD: `.gitlab-ci.yml` + `Jenkinsfile` — version derived from git tag
- Level 1 + Level 2 rebranding merged into `Level-1-rebranding` branch
- Production deployment verified with all tests passing

**Next steps:**
1. Create Docker Hub account and organization
2. Configure GitLab CI/CD variables (`DOCKERHUB_USER`, `DOCKERHUB_TOKEN`, `DOCKERHUB_IMAGE`)
3. `git tag -a v2026.03.0 -m "Forge 2026.03.0"` → push tag → CI handles release
4. Release notes on GitLab
5. Merge `Level-1-rebranding` into `devel`

---

## How to Deploy (Vagrant VM)

```bash
# 1. Start VM and sync code
vagrant up
vagrant rsync

# 2. SSH into VM and generate Dockerfile
vagrant ssh
cd /awx_devel
make Dockerfile

# 3. Build Docker image
DOCKER_BUILDKIT=1 docker build -f Dockerfile \
  --build-arg VERSION=2026.3.0 \
  --build-arg SETUPTOOLS_SCM_PRETEND_VERSION=2026.3.0 \
  -t forge-platform/forge:latest .

# 4. Generate SSL certs
cd tools/docker-compose-prod
mkdir -p nginx/ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/privkey.pem -out nginx/ssl/fullchain.pem \
  -subj "/CN=forge.local"

# 5. Deploy
docker compose up -d

# 6. Access
# HTTPS: https://localhost:8043/api/v2/
# HTTP (redirects): http://localhost:8080/
# Login: admin / admin
```

## How to Run Tests (Vagrant VM)

```bash
# Python unit tests (run inside a temporary container)
vagrant ssh
cd /awx_devel
docker run --rm \
  -v /awx_devel:/awx_devel \
  -e DJANGO_SETTINGS_MODULE=forge.settings.defaults \
  --network docker-compose-prod_forge \
  --user 0 \
  forge-platform/forge:latest \
  bash -c "pip install pytest pytest-django pytest-mock drf-yasg -q && \
    cd /awx_devel && python -m pytest forge/main/tests/unit/ -q"

# Frontend lint (requires Node 20+)
cd /awx_devel/forge/ui_next
npm ci && npm run lint
```

## Port Forwarding (Vagrant)

| Guest Port | Host Port | Service |
|------------|-----------|---------|
| 8043 | 8043 | HTTPS (nginx) |
| 8080 | 8080 | HTTP (nginx, redirects to HTTPS) |
| 8013 | 8013 | Direct forge-web (no TLS) |
| 5432 | 5433 | PostgreSQL |

---

## File Structure

```
forge-project/
├── CHANGELOG.md                             # Record of all changes
├── Vagrantfile                              # Ubuntu 24.04 VM (port forwarding configured)
├── setup.cfg                                # Package config (name=forge, find: packages)
├── pyproject.toml                           # Build system (setuptools)
├── MANIFEST.in                              # sdist includes for forge/ package
├── docs/
│   ├── plan_development.md                  # Development plan overview
│   ├── plan_detailed.md                     # MAIN WORKING DOCUMENT - step by step
│   ├── startrun.md                          # Project overview (this file)
│   └── RELEASE_NOTES_v2026.03.0.md          # Release notes for v2026.03.0
├── forge/                                   # Main Python package (renamed from awx/)
│   ├── __init__.py                          # Version, manage() entry point
│   ├── api/                                 # REST API (serializers, views, urls)
│   ├── main/                                # Core models, tasks, migrations
│   ├── conf/                                # Database-backed settings system
│   ├── sso/                                 # SSO/LDAP/SAML authentication
│   ├── settings/                            # Django settings (defaults, production, dev)
│   ├── ui_next/                             # React frontend (Vite + TypeScript)
│   │   ├── src/                             # Source code
│   │   ├── package.json                     # Dependencies
│   │   └── urls.py                          # Django catch-all → index_forge.html
│   ├── playbooks/                           # Ansible playbooks
│   └── resource_api.py                      # ansible-base resource registry
├── tools/
│   ├── docker-compose-prod/                 # Production Docker Compose deployment
│   │   ├── docker-compose.yml               # 6 services
│   │   ├── .env                             # Environment variables
│   │   ├── settings/                        # Django settings (database, redis, custom)
│   │   ├── nginx/nginx.conf                 # TLS termination, rate limiting
│   │   ├── receptor/                        # Receptor mesh configuration
│   │   └── scripts/                         # init, healthcheck, backup, restore
│   ├── ansible/roles/dockerfile/
│   │   ├── templates/Dockerfile.j2          # Main production Dockerfile template
│   │   └── files/uwsgi.ini                 # WSGI config (forge.wsgi:application)
│   └── scripts/
│       └── vagrant-provision.sh             # VM provisioning
├── requirements/
│   ├── requirements.txt                     # Python dependencies
│   └── requirements_git.txt                 # Git dependencies (pinned)
└── awx_collection/                          # Ansible collection (out of scope, see below)
```

---

## Out of Scope

### awx_collection (Ansible Galaxy Collection)

The `awx_collection/` directory contains the `awx.awx` Ansible collection — a set of modules that allow users to manage Forge (and AWX) via Ansible playbooks. This collection is published on Ansible Galaxy and is maintained by the Ansible community.

**Decision:** This collection is intentionally left outside of Forge's development scope. Reasons:
- The `awx.awx` namespace is registered on Ansible Galaxy and widely used by the community
- The collection works with Forge's API as-is (API is fully compatible)
- Rebranding to `forge.forge` would require Galaxy namespace registration and community migration
- Maintenance and development of this collection is the responsibility of the Ansible community

**`resource_api.py`:** The `service_type` field remains set to `"awx"` due to `django-ansible-base` library constraints. This does not affect functionality.

### awxkit (Python SDK & CLI)

The `awxkit/` directory contains the official Python SDK and CLI client (`awx` command) for managing AWX/Forge via REST API. Published on PyPI as `awxkit`.

**Decision:** Do NOT rename. Reasons:
- Published on PyPI as `awxkit` — renaming would require new package registration and user migration
- The `awx` CLI command is widely known in the Ansible community
- Works with Forge's API without any modifications (same REST endpoints)
- Massive effort for zero functional benefit
- Same rationale as `awx_collection` — external-facing tooling that is API-compatible as-is

---

## Development Rules

- **Every change is understood** - if you cannot explain why something was done, do not commit it
- **Review everything** - always review the diff before committing
- **Author of all commits and code is Krstan Vjestica** - never attribute tools as authors
- **All development and testing inside Vagrant VM** - never install dependencies on host

## Commit Message Format

`type(scope): short description`

Types: `refactor`, `fix`, `feat`, `docs`, `test`, `chore`

---

## License

Forge is licensed under Apache License 2.0.
Based on the AWX project (https://github.com/ansible/awx).
