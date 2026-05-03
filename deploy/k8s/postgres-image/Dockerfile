# Postgres 16 with both PostGIS 3 + pgvector baked in.
# Used by bucket-foundation/deploy/k8s/postgres.yaml.
#
# Build + push (founder runs once, then on extension upgrades):
#   docker build -t agfarms/postgres-bucket:pg16-postgis-pgvector \
#     /home/gian/agfarms/bucket-foundation/deploy/k8s/postgres-image
#   docker push agfarms/postgres-bucket:pg16-postgis-pgvector
#
# Why we bake instead of apt-install at initdb:
#   The previous yaml ran `apt-get install postgresql-16-postgis-3` from a
#   docker-entrypoint-initdb.d/ shell hook. That works on first boot but breaks
#   on every pod reschedule (initdb only runs once per PVC) and depends on the
#   Debian network at startup. Baked extensions are deterministic + offline.
FROM pgvector/pgvector:pg16

USER root
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      postgresql-16-postgis-3 \
      postgresql-16-postgis-3-scripts \
 && rm -rf /var/lib/apt/lists/*
USER postgres
