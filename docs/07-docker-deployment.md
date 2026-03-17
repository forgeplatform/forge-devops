# 07 — Docker & Deployment

How to build, configure, and deploy Forge to production.

---

## Development Setup (Vagrant)

**All development and testing runs inside the Vagrant VM. Never install dependencies on the host.**

### Prerequisites

- VirtualBox 7+ or libvirt
- Vagrant 2.4+
- 8GB+ free RAM (VM uses 8GB)

### Quick Start

```bash
vagrant up                # Start VM
vagrant rsync             # Sync code to VM
vagrant ssh               # Enter VM
cd /awx_devel
make Dockerfile           # Generate Dockerfile from Jinja2 template
DOCKER_BUILDKIT=1 docker build -f Dockerfile \
  --build-arg VERSION=2026.3.0 \
  --build-arg SETUPTOOLS_SCM_PRETEND_VERSION=2026.3.0 \
  -t forge-platform/forge:latest .

cd tools/docker-compose-prod
docker compose up -d

# Access (from host browser):
# HTTPS: https://localhost:8043
# Login: admin / admin
```

### Port Forwarding

| Guest | Host | Service |
|-------|------|---------|
| 8043 | 8043 | HTTPS (Nginx) |
| 8080 | 8080 | HTTP (redirect) |
| 8013 | 8013 | Direct web (no TLS) |
| 5432 | 5433 | PostgreSQL |

### Useful Vagrant Commands

```bash
vagrant rsync-auto    # Auto-sync on file changes
vagrant halt          # Stop VM (preserves data)
vagrant destroy       # Delete VM (everything is lost)
vagrant provision     # Re-run provision script
```

### Shell Aliases (inside VM)

```bash
forge-build    # Build Docker image
forge-start    # docker compose up -d
forge-stop     # docker compose down
forge-logs     # docker compose logs -f
forge-shell    # docker compose exec forge-web bash
forge-test     # Run tests
```

---

## Docker Image — Multi-Stage Build

The Dockerfile is generated from a Jinja2 template: `tools/ansible/roles/dockerfile/templates/Dockerfile.j2`

### 3 Build Stages

| Stage | Base | What it does |
|-------|------|-------------|
| 1. ui-builder | Node 18 Alpine | `npm ci && npm run build` → static files |
| 2. builder | CentOS Stream 9 | pip install dependencies, python setup.py sdist |
| 3. runtime | CentOS Stream 9 | Minimal image with runtime dependencies only |

### Watch out

- **Build takes ~10-15 minutes** the first time. With Docker cache, rebuilds are faster.
- **`SETUPTOOLS_SCM_PRETEND_VERSION`** is a required build arg — without it, setuptools
  tries to read the version from git which doesn't work inside the Docker context.
- The image runs as a **non-root user (UID 1000)** — security best practice.
- `dumb-init` is PID 1 — properly forwards signals to child processes.

---

## Production Deployment

### File Structure

```
tools/docker-compose-prod/
├── docker-compose.yml      # 6 services
├── .env.example            # Template for .env (COPY to .env)
├── settings/               # Django settings for production
│   ├── database.py         # PostgreSQL connection
│   ├── redis_settings.py   # Redis connection
│   ├── secret_key.py       # Django SECRET_KEY
│   ├── custom_settings.py  # ALLOWED_HOSTS, CSRF, cookies
│   └── nginx-internal.conf # Internal nginx routing
├── nginx/
│   ├── nginx.conf          # External nginx (TLS, rate limit)
│   └── ssl/                # SSL certificates
├── receptor/
│   └── receptor.conf       # Receptor mesh config
└── scripts/
    ├── init.sh             # Migrations, admin user, provisioning
    ├── healthcheck-web.sh  # Web container health check
    ├── backup.sh           # Database backup
    └── restore.sh          # Database restore
```

### Services and Startup Order

```
postgres ──► redis ──► forge-init ──► forge-web ──► forge-task ──► nginx
 (healthcheck)         (migrations,    (uwsgi,       (dispatcher,   (TLS,
                        admin user,     daphne,       callback,      rate
                        provisioning)   nginx-int)    wsrelay,       limit)
                                                      receptor)
```

Each service waits for the previous one to be healthy before starting.

### Step-by-Step Deployment

```bash
cd tools/docker-compose-prod

# 1. Create configuration
cp .env.example .env

# 2. Set REQUIRED values in .env:
#    POSTGRES_PASSWORD=<strong password>
#    FORGE_SECRET_KEY=<openssl rand -base64 32>
#    FORGE_BROADCAST_WEBSOCKET_SECRET=<openssl rand -base64 32>
#    FORGE_ADMIN_PASSWORD=<strong admin password>
#    FORGE_CSRF_TRUSTED_ORIGINS=https://forge.example.com

# 3. SSL certificates
# Let's Encrypt:
certbot certonly --standalone -d forge.example.com
cp /etc/letsencrypt/live/forge.example.com/fullchain.pem nginx/ssl/
cp /etc/letsencrypt/live/forge.example.com/privkey.pem nginx/ssl/

# Or self-signed (for testing):
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/privkey.pem -out nginx/ssl/fullchain.pem \
  -subj "/CN=forge.example.com"

# 4. Deploy
docker compose up -d

# 5. Watch initialization
docker compose logs -f forge-init

# 6. Verify
curl -k https://forge.example.com/api/v2/ping/
```

---

## Environment Variables

### Required

| Variable | Description | Generate with... |
|----------|-------------|-----------------|
| `POSTGRES_PASSWORD` | DB password | `openssl rand -base64 24` |
| `FORGE_SECRET_KEY` | Django crypto key | `openssl rand -base64 32` |
| `FORGE_BROADCAST_WEBSOCKET_SECRET` | WS auth secret | `openssl rand -base64 32` |
| `FORGE_ADMIN_PASSWORD` | Admin password | Manually — strong password |
| `FORGE_CSRF_TRUSTED_ORIGINS` | CSRF origins | `https://forge.example.com` |

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `FORGE_ALLOWED_HOSTS` | `*` | Allowed HTTP hosts |
| `FORGE_NODE_TYPE` | `hybrid` | `hybrid`, `control`, or `execution` |
| `NGINX_HTTPS_PORT` | `443` | External HTTPS port |

### Watch out

- **`FORGE_SECRET_KEY` MUST REMAIN THE SAME** between upgrades. If you change it,
  all sessions, tokens, and encrypted credentials become invalid.

- **`FORGE_CSRF_TRUSTED_ORIGINS` must include the full URL** with `https://`. Without
  it, the login form won't work (403 CSRF error).

---

## SSL/TLS

### Let's Encrypt (recommended for production)

```bash
certbot certonly --standalone -d forge.example.com
cp /etc/letsencrypt/live/forge.example.com/{fullchain,privkey}.pem nginx/ssl/
```

Auto-renewal (add to crontab):
```bash
0 0 1 * * certbot renew && cp /etc/letsencrypt/live/forge.example.com/*.pem /path/to/nginx/ssl/ && docker compose restart nginx
```

### Watch out

- Nginx is configured for **TLS 1.2 and 1.3** — older versions are disabled.
- **HSTS** header is enabled — the browser will remember that the site uses HTTPS.
- **Rate limiting** on `/api/login/` — 5 requests/second (brute force protection).
- `client_max_body_size` is **50MB** — for uploading projects/playbooks.

---

## Backup & Restore

### Automated backup

```bash
# Run backup (output: /var/lib/awx/backups/forge_backup_TIMESTAMP.sql.gz)
docker compose exec forge-task bash /etc/forge/backup.sh

# With custom retention (30 days instead of default 7)
docker compose exec forge-task bash /etc/forge/backup.sh 30
```

### Scheduled backup (crontab on host)

```bash
0 2 * * * cd /path/to/docker-compose-prod && docker compose exec -T forge-task bash /etc/forge/backup.sh
```

### Restore

```bash
docker compose stop forge-web forge-task
gunzip -c forge_backup_20260310.sql.gz | docker compose exec -T postgres psql -U forge forge
docker compose start forge-web forge-task
```

### Watch out

- Backup contains **only the database**. Projects (git repos) are synced automatically from SCM.
- **Credentials are encrypted in the database** with `FORGE_SECRET_KEY`. Without the same key,
  a restore won't decrypt credentials.

---

## Health Checks

```bash
# Ping (no authentication required)
curl https://forge.example.com/api/v2/ping/

# Instance capacity
curl -u admin:password https://forge.example.com/api/v2/instances/

# Supervisor processes
docker compose exec forge-web supervisorctl status
docker compose exec forge-task supervisorctl status
```

---

## Troubleshooting

### Container won't start

```bash
docker compose logs forge-init    # Check migrations and init
# "database does not exist" → POSTGRES_DB doesn't match
# "authentication failed" → POSTGRES_PASSWORD doesn't match
```

### Can't log in

```bash
# CSRF error (403)?
# → Check FORGE_CSRF_TRUSTED_ORIGINS (must be full URL with https://)

# Cookie not being sent?
# → Check SESSION_COOKIE_SECURE — must be False for HTTP

# Forgotten password?
docker compose exec forge-web awx-manage update_password --username=admin --password=NewPass123!
```

### UI not working (blank page)

```bash
# Check if static files are present
docker compose exec forge-web ls /var/lib/awx/public/static/forge/
# Must contain index_forge.html and assets/
```

### Jobs not running

```bash
# Check task container processes
docker compose exec forge-task supervisorctl status
# All 4 must be RUNNING

# Check capacity
docker compose exec forge-web awx-manage list_instances
```

---

## Scaling

### Adding an execution node

```bash
# On the execution node: start a task container
docker run -d --name forge-task \
  -e DATABASE_HOST=db.example.com \
  -e REDIS_HOST=redis.example.com \
  -e FORGE_NODE_TYPE=execution \
  -e FORGE_NODE_NAME=exec-node-1 \
  forge-platform/forge:latest launch_awx_task.sh

# On the control node: register the new node
forge-manage provision_instance --hostname=exec-node-1 --node-type=execution
forge-manage register_queue --queuename=default --hostnames=exec-node-1
```

### Recommended Hardware

| Size | CPU | RAM | Disk |
|------|-----|-----|------|
| Small (≤100 hosts) | 4 | 8GB | 50GB SSD |
| Medium (≤1000 hosts) | 8 | 16GB | 100GB SSD |
| Large (≤10000 hosts) | 16 | 32GB | 200GB SSD |
| Enterprise (10000+) | 16+ | 64GB+ | 500GB SSD |
