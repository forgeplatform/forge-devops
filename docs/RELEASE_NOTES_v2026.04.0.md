# Forge 2026.04.0 — Release Notes

**Release date:** 2026-04-03
**Based on:** Forge 2026.03.0 + new features
**License:** Apache License 2.0

---

## Overview

Forge 2026.04.0 delivers the remaining Tier 1 features from the post-release roadmap:
Event-Driven Automation (EDA), AI Assistant, Dynamic Surveys, and Improved Audit Trail.

---

## New Features

### Event-Driven Automation (EDA)

Webhook-based event routing with user-defined rules. External systems (GitHub, GitLab,
Alertmanager, PagerDuty, Datadog, CloudWatch, or any generic HTTP source) can trigger
automated job launches, workflow executions, or notification dispatches.

- **EventRule model:** Conditions (Jinja2) + Actions (launch job, workflow, notification)
- **Public webhook receiver:** `/api/v2/eda_webhooks/<path>/` with HMAC signature verification
- **Jinja2 condition engine:** Sandboxed evaluation against webhook payloads
- **Outbound webhooks:** Push job status changes to external systems
- **EventLog:** Full audit trail of received webhooks and rule evaluation results
- **Frontend:** New "Automation" sidebar section with Event Rules, Event Logs, Outbound Webhooks pages
- **Security:** HMAC verification (SHA-256/SHA-1), rate limiting via throttle, payload size limits, deduplication
- **Dry-run test endpoint:** Evaluate conditions without firing actions

### AI Assistant (Ollama RAG)

Optional microservice providing context-aware chat assistance using local LLMs.

- **forge-assistant** repository: FastAPI + Ollama + ChromaDB
- **SSE streaming** for real-time token delivery
- **Frontend chat panel** with floating button, markdown rendering, context awareness
- **Privacy-first:** All processing on-premises, no cloud API calls

### Dynamic Surveys

Survey questions with choices populated at launch time from three sources:
database queries, external API calls, and Jinja2 templates.

### Improved Audit Trail

- **ActivityStream enhanced:** Now captures `actor_ip`, `actor_user_agent`, `actor_session_id`
- **AuditEvent model:** Immutable append-only security log for compliance
- **Frontend Audit Log page:** Filters, expandable rows, CSV export
- **SIEM export:** Flat JSON format for Splunk/ELK/Datadog

---

## New API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v2/event_rules/` | GET, POST | List/create event rules |
| `/api/v2/event_rules/{id}/` | GET, PATCH, DELETE | Event rule CRUD |
| `/api/v2/event_rules/{id}/webhook_key/` | GET, POST | Get/rotate webhook key |
| `/api/v2/event_rules/{id}/event_logs/` | GET | Logs for this rule |
| `/api/v2/event_rules/{id}/test/` | POST | Dry-run condition test |
| `/api/v2/event_rules/{id}/enable/` | POST | Enable rule |
| `/api/v2/event_rules/{id}/disable/` | POST | Disable rule |
| `/api/v2/event_logs/` | GET | List all event logs |
| `/api/v2/event_logs/{id}/` | GET | Event log detail |
| `/api/v2/outbound_webhooks/` | GET, POST | List/create outbound webhooks |
| `/api/v2/outbound_webhooks/{id}/` | GET, PATCH, DELETE | Outbound webhook CRUD |
| `/api/v2/outbound_webhooks/{id}/test/` | POST | Send test payload |
| `/api/v2/eda_webhooks/{path}/` | POST | Public webhook receiver (no auth) |
| `/api/v2/audit_events/` | GET | List audit events |
| `/api/v2/audit_events/?format=csv` | GET | Export as CSV |
| `/api/v2/audit_events/?format=siem` | GET | Export for SIEM |

---

## New Database Tables

| Table | Description |
|-------|-------------|
| `main_eventrule` | Webhook rules with conditions and actions |
| `main_eventlog` | Incoming webhook events and evaluation results |
| `main_outboundwebhook` | Outbound webhook configurations |
| `main_auditevent` | Immutable security audit log |

---

## Frontend Changes

- New **Automation** sidebar section: Event Rules, Event Logs, Outbound Webhooks
- New **Audit Log** page with filters, expandable rows, CSV export
- New **AI Assistant** floating chat panel
- **Dynamic survey** support in launch dialog and survey editor
- 10 new pages, 3 new API hooks, TypeScript interfaces for all EDA types

---

## Quality Metrics

| Metric | Value |
|--------|-------|
| Backend tests (standalone EDA) | 38 passed |
| Frontend tests (vitest) | 58 passed |
| TypeScript compilation | 0 errors |

---

## Documentation

New documentation files:
- `docs/13-dynamic-surveys.md` — Dynamic survey system
- `docs/14-audit-trail.md` — Audit trail and compliance logging
- `docs/15-event-driven-automation.md` — EDA architecture, API, security, quick start

Updated documentation:
- `01-architecture-overview.md` — Added EDA webhook flow
- `02-backend-django.md` — Added EDA models reference
- `03-frontend-react.md` — Added EDA routes
- `04-task-engine.md` — Added EDA as job launch source
- `06-database-schema.md` — Added EDA tables and ER relationships
- `09-testing-guide.md` — Added standalone test suite
- `11-api-reference.md` — Added all EDA endpoints
- `wiki-index.md` — Added docs 13, 14, 15
- `future_development_plan.md` — Updated competitive landscape (EDA, Dynamic Surveys, AI Assistant, Audit Trail: Planned → Yes)

---

## Competitive Landscape Update

| Feature | Forge | AWX | AAP 2.5+ | Ascender | Semaphore |
|---------|-------|-----|----------|----------|-----------|
| Dynamic surveys | **Yes** | No | No | No | No |
| Event-driven (EDA) | **Yes** | No | Yes | No | No |
| AI assistant | **Yes** | No | Yes | No | No |
| Audit trail (immutable) | **Yes** | No | Partial | No | No |
