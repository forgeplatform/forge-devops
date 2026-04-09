# forge-deploy / k8s — Kubernetes Manifest Stubs

These manifests are **stubs** that accompany Tier 3.6 (Observability /
OpenTelemetry) and prepare the ground for Tier 3.3 (Kubernetes Operator).

> **WARNING — NOT YET TESTED**
>
> These YAML files have **not** been validated against a live cluster.
> No k8s test environment has been provisioned yet. See
> `docs/future_development_plan.md` → *Infrastructure & Test
> Environments* for the open TODO to stand one up.

## Contents

- `otel-collector.yaml` — ConfigMap + Deployment + Service for the
  OpenTelemetry Collector (the same `otel/config.yaml` content used by
  `forge-deploy/docker-compose.yml`). Exposes OTLP gRPC on 4317 and
  OTLP HTTP on 4318 (ClusterIP).
- `grafana-dashboards-cm.yaml` — ConfigMap named `forge-grafana-dashboards`
  labelled `grafana_dashboard: "1"` for the Grafana sidecar pattern.
  Inlines `forge-overview.json`.

## Prerequisites

- A running Kubernetes cluster (k3s, kind, microk8s, or any real cluster).
- Grafana installed via the official Helm chart or the Grafana Operator
  with the dashboard sidecar enabled (so it picks up ConfigMaps labelled
  `grafana_dashboard=1`).
- A Prometheus datasource in Grafana (UID `DS_PROMETHEUS` — or re-map
  via the dashboard import dialog).

## Apply

```sh
kubectl create ns forge-system
kubectl apply -f k8s/
```

Check rollout:

```sh
kubectl -n forge-system rollout status deploy/forge-otel-collector
kubectl -n forge-system get svc forge-otel-collector
kubectl -n forge-system logs deploy/forge-otel-collector --tail 50
```

Point the Forge backend at the Collector by setting
`OTEL_EXPORTER_ENDPOINT=http://forge-otel-collector.forge-system.svc.cluster.local:4317`.

## Status

Pending validation on a real cluster. Tracked under *Infrastructure &
Test Environments* in `docs/future_development_plan.md`.
