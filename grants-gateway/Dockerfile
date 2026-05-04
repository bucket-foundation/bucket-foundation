# syntax=docker/dockerfile:1.7
# grants-gateway — production image
# Build:  docker build -t farmera/bucket-grants-gateway:v0.1.0-alpha.2 .
# Run:    docker run -p 8789:8789 \
#           -e FEED402_WALLET=0x... \
#           -e FEED402_VERIFY_MODE=facilitator \
#           -e GRANTS_STORE=sqlite \
#           farmera/bucket-grants-gateway:v0.1.0-alpha.2
#
# Persistence strategy: the SQLite corpus (data/grants.db, ~80 MiB, 17k rows)
# is BAKED INTO THE IMAGE at build time. The DB is gitignored, so Dockerfile
# expects ./data/grants.db to exist locally before `docker build` (produced by
# `python3 scripts/ingest.py`, ~10 min, idempotent). This is the simplest
# strategy that gives idempotent rebuilds and instant cold starts — no PVC,
# no init-container, no S3 seed. Ingest cadence is monthly; bump the image
# tag to roll a fresh corpus.

FROM node:20-slim AS build
WORKDIR /app
# build-essential + python3 needed by `better-sqlite3` native build
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 build-essential ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* tsconfig.json ./
RUN npm install --no-audit --no-fund --silent
COPY src ./src
RUN npx tsc

FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8789
ENV GRANTS_STORE=sqlite
ENV GRANTS_DB=/app/data/grants.db
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 build-essential ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund --silent && npm cache clean --force
# Strip build toolchain after native deps compiled
RUN apt-get purge -y build-essential python3 && apt-get autoremove -y
COPY --from=build /app/dist ./dist
# Bake the ingested corpus. CI/local must run `python3 scripts/ingest.py`
# before `docker build` so this file is present in the build context.
COPY data/grants.db ./data/grants.db
EXPOSE 8789
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:'+ (process.env.PORT||8789) +'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/server.js"]
