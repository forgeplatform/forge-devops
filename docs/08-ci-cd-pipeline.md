# 08 — CI/CD Pipeline

Forge has CI/CD pipelines for both GitLab CI and Jenkins. Both perform the same
stages: lint → test → build → security scan → release.

---

## Pipeline Stages

```
┌────────┐   ┌────────┐   ┌────────┐   ┌──────────┐   ┌─────────┐
│  Lint  │──►│  Test  │──►│ Build  │──►│ Security │──►│ Release │
└────────┘   └────────┘   └────────┘   └──────────┘   └─────────┘
  flake8       pytest       Docker       pip-audit      Docker Hub
  tsc          vitest       image        trivy          git tag
```

| Stage | What it does | Fails if... |
|-------|-------------|-------------|
| Lint (Python) | `flake8 forge/` | PEP8 errors, undefined names |
| Lint (Frontend) | `tsc --noEmit` | TypeScript type errors |
| Test (Python) | `pytest forge/main/tests/unit/` | Any test fails |
| Test (Frontend) | `npm test` (vitest) | Any test fails |
| Build | Docker multi-stage build | Build error |
| Security (Python) | `pip-audit` | Critical CVE in dependencies |
| Security (Container) | `trivy image` | CRITICAL CVE in the image |
| Release | Push to Docker Hub | Only on tagged builds |

---

## CI Variables (required for release)

| Variable | Description |
|----------|-------------|
| `DOCKERHUB_USER` | Docker Hub username |
| `DOCKERHUB_TOKEN` | Docker Hub access token |
| `DOCKERHUB_IMAGE` | Image name (e.g., `krlex/forge-platform`) |

---

## Versioning

Forge uses **CalVer** (Calendar Versioning):

```
YYYY.MM.PATCH
2026.03.0     # First release of March 2026
2026.03.1     # Patch release
2026.04.0     # April release
```

The version is derived from the git tag:
```bash
git tag -a v2026.03.0 -m "Forge 2026.03.0"
git push origin v2026.03.0
# CI automatically builds and pushes to Docker Hub
```

---

## Running CI Locally

```bash
# Python lint
flake8 forge/ --count --statistics --max-line-length=160

# Python tests
DJANGO_SETTINGS_MODULE=forge.settings.development \
  python -m pytest forge/main/tests/unit/ -q

# Frontend lint
cd forge/ui_next && npx tsc --noEmit

# Frontend tests
cd forge/ui_next && npm test

# Security scan
pip install pip-audit && pip-audit -r requirements/requirements.txt
trivy image forge-platform/forge:latest --severity HIGH,CRITICAL
```

---

## Release Process

1. Verify all tests pass
2. Update CHANGELOG.md and release notes
3. Commit: `git commit -m "chore: prepare release v2026.03.0"`
4. Tag: `git tag -a v2026.03.0 -m "Forge 2026.03.0"`
5. Push tag: `git push origin v2026.03.0`
6. CI automatically builds, tests, and pushes the image

### Watch out

- **Never release without passing tests.**
- **Tag format must have `v` prefix:** `v2026.03.0`, not `2026.03.0`.
- **Docker Hub login** must be configured in CI variables before the first release.
