# bucket-foundation — k8s manifests

Postgres 16 + PostGIS + pgvector + TLS ingress for the `bucket-foundation` namespace
on `prod-hetzner-1` (Hetzner CPX42, K3s in Docker `agfarms-k3s`).

Bead: **bkt-pf0**. Downstream consumers: `bkt-5qg` (USPTO ingest), `bkt-zx6`
(feed402 endpoint), `bkt-q7k` (chat).

## Files

| File | What |
|------|------|
| `postgres.yaml` | ConfigMap (init scripts) + ClusterIP Service + StatefulSet (50Gi PVC). NO secret stanza — secret must be created out-of-band first. |
| `postgres-image/Dockerfile` | Custom image baking postgis + pgvector. Build + push once before applying postgres.yaml. |
| `tls-ingress.yaml` | nginx Ingress for `bucket-foundation.nucleus.agfarms.dev` with cert-manager TLS |

## One-time image build (founder runs once, then on extension upgrades)

```bash
docker build -t agfarms/postgres-bucket:pg16-postgis-pgvector \
  /home/gian/agfarms/bucket-foundation/deploy/k8s/postgres-image
docker push agfarms/postgres-bucket:pg16-postgis-pgvector
```

If the cluster pulls from a private registry, swap the tag accordingly and update
`postgres.yaml`'s `image:` field.

## Apply order (founder runs after review)

```bash
# 0. Sanity — namespace already exists (Nucleus instance lives here)
kubectl get ns bucket-foundation

# 1. Create the password secret BEFORE applying postgres.yaml.
#    (postgres.yaml no longer contains any secret stanza — required to exist first.)
kubectl -n bucket-foundation create secret generic postgres-credentials \
  --from-literal=POSTGRES_USER=bucket \
  --from-literal=POSTGRES_DB=bucket \
  --from-literal=POSTGRES_PASSWORD="$(openssl rand -base64 32 | tr -d '=+/' | head -c 32)" \
  --dry-run=client -o yaml | kubectl apply -f -

# Stash the password to ~/.env or ops vault — you will need it for DATABASE_URL.
kubectl -n bucket-foundation get secret postgres-credentials \
  -o jsonpath='{.data.POSTGRES_PASSWORD}' | base64 -d; echo

# 2. Apply Postgres (image must already be pushed — see "One-time image build" above)
kubectl apply -f postgres.yaml

# 3. Wait for ready (~30-45s; postgis + pgvector are baked into the image now)
kubectl -n bucket-foundation rollout status statefulset/postgres --timeout=5m
kubectl -n bucket-foundation logs statefulset/postgres -f   # ctrl-C once you see "database system is ready"

# 4. Verify extensions
kubectl -n bucket-foundation exec -it postgres-0 -- \
  psql -U bucket -d bucket -c "SELECT extname, extversion FROM pg_extension ORDER BY extname;"
# Expected rows: plpgsql, postgis, postgis_topology, vector

# 5. Apply TLS ingress
kubectl apply -f tls-ingress.yaml

# 6. Verify cert issuance (cert-manager polls Let's Encrypt; allow 30-90s)
kubectl -n bucket-foundation get cert bucket-foundation-nucleus-tls -w
# READY should flip to True. If stuck, kubectl describe cert ... and check Order/Challenge events.

# 7. DNS smoke test
curl -sI https://bucket-foundation.nucleus.agfarms.dev/ | head -3
```

## DATABASE_URL pattern (for downstream beads)

In-cluster (Nucleus instance, ingest jobs, feed402 server):
```
postgresql://bucket:${POSTGRES_PASSWORD}@postgres.bucket-foundation.svc.cluster.local:5432/bucket
```

Out-of-cluster (port-forward, local dev):
```bash
kubectl -n bucket-foundation port-forward svc/postgres 5433:5432
# then
postgresql://bucket:${POSTGRES_PASSWORD}@localhost:5433/bucket
```

USPTO schema lands in the `patents` schema (already created by init):
```bash
kubectl -n bucket-foundation exec -i postgres-0 -- \
  psql -U bucket -d bucket -f - < /home/gian/agfarms/bucket-foundation/data/patents/uspto/schema/uspto.sql
```

## Cert renewal verification

cert-manager auto-renews ~30 days before expiry. To inspect:
```bash
kubectl -n bucket-foundation get cert
kubectl -n bucket-foundation describe cert bucket-foundation-nucleus-tls
kubectl -n bucket-foundation get secret bucket-foundation-nucleus-tls \
  -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -noout -dates -subject
```

## Backup plan (TODO — file as bead `bkt-pf0-backup`)

Nightly `pg_dump` CronJob → mirror to `gdrive:AGFarms/Nucleus/bucket-foundation/db-backups/<YYYY-MM-DD>.sql.gz`.
Not in this manifest set; ship after first real ingest lands so we know the size profile.

## Notes / caveats

- **PostGIS install runs at first init via apt-get** inside `pgvector/pgvector:pg16`. Adds
  ~60s to first-boot time and requires outbound network from the pod (Hetzner default = OK).
  If we ever lose net egress from the cluster, swap the image for a custom build with
  postgis + pgvector baked in (build script TODO).
- **Single replica StatefulSet, no streaming replication.** Fine for dev / first-revenue
  stage. Upgrade to a primary+replica or move to managed Postgres before we cross any
  durability SLA.
- **Storage: `local-path` (Hetzner local disk).** Lost if the node dies. Backups (above)
  are the recovery path until we move to networked storage.
- **Resources: 2 CPU / 4Gi req, 4 CPU / 8Gi limit.** CPX42 has 8 vCPU / 16Gi — leaves
  headroom for the Nucleus instance and other namespace workloads.
