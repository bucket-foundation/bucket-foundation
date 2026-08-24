# Polingual Photon API

The **full 45,000-photon Polingual dictionary** as a live service, all 27
languages and all 5 comparison axes, so the bucket.foundation explorer is no
longer limited to the ~6,500-word baked subset.

- **Live**: https://polingual.agfarms.dev
- **Same-origin proxy** (what the web app calls): `/api/polingual?op=…`
- **Data**: Wiktionary via Kaikki (CC-BY-SA). Provenance travels in every payload.

> ## Status: INTERIM bridge, reconcile with the authoritative copy
>
> CLAUDE.md (`bkt-2ea`) names the **authoritative** Polingual store as the
> existing `polingual.photons` schema on `agf-supabase-db` (**6.5M rows / 35
> langs**, `relations` populated, PostgREST-exposed) and the preferred design as
> **pgvector RPC on that schema, kept out of a parallel service**. pgvector 0.8.0 is
> installable there. The blocker on that path today is **embedding 6.5M rows
> with LaBSE with no GPU on the box** (days of CPU work), a much larger bead.
>
> This service is therefore an **interim bridge**: it ships all 5 axes over the
> curated **45k** subset *now* with cross-lingual vector results. The
> **Next proxy below is backend-agnostic**, when the pgvector RPC lands, only
> `POLINGUAL_API_URL` (or the route's upstream) is repointed; the client and the
> explorer don't change. Nothing here blocks the authoritative path.

## Endpoints

| Method | Path | Params | Axis |
|---|---|---|---|
| GET | `/healthz` | - | liveness + index stats |
| GET | `/lookup` | `surface,lang` | the photon itself (+ provenance) |
| GET | `/semantic` | `surface,lang,k,cross` | words that MEAN the same (cross-lingual) |
| GET | `/phonetic` | `surface,lang,k` | words that SOUND the same |
| GET | `/spelling` | `surface,lang,k` | words SPELLED similarly |
| GET | `/etymology` | `surface,lang` | where a word COMES FROM |
| GET | `/translate` | `surface,from,to,k` | same meaning across languages |

Example:
```bash
curl 'https://polingual.agfarms.dev/semantic?surface=agua&lang=es&k=6'
# → cross-lingual "water" neighbors: fa آب, ru вода, vi nước, hi पानी … (CC-BY-SA)
```

## Architecture

```
browser ──same-origin──▶ Next /api/polingual  ──server-side fetch──▶ https://polingual.agfarms.dev
                         (src/app/api/polingual/route.ts)            host nginx (TLS) ─▶ 127.0.0.1:8088
                                                                     systemd --user uvicorn (server.py)
                                                                     memmap .f32.bin + cached sqlite
```

- **server.py**, FastAPI. Memmaps the 768-d LaBSE semantic + 64-d phonetic
 `.f32.bin` matrices (never copies 138 MB into RAM per request), loads the
 sqlite metadata once into numpy arrays, reuses the connection. Vector dims are
 **auto-detected** from file size ÷ row count, so it serves whatever build is
 on disk. CORS is locked to the bucket.foundation origins; a per-IP sliding
 rate limit (default 120 req/min) backs the nginx `limit_req`.
- No embedding model is loaded, all five axes operate on photons already in the
 substrate (top-k over stored vectors / edit distance / kaikki cache). Free-text
 embedding of arbitrary input is a deliberate v2 follow-up.

## Deploy

```bash
AGFARMS_PASS=… PHOTONS_SRC=…/_intake/photons \
  bash services/photon-api/deploy.sh
```

Rsyncs the substrate (`index.sqlite` + two `.f32.bin` + `kaikki-cache`, ~1.6 GB
with the cache) + code to `~/polingual-photon/` on prod-hetzner-1, builds a
venv, installs/(re)starts the `polingual-photon` **systemd --user** service
(MemoryMax 1.5 G), and installs the `polingual.agfarms.dev` nginx vhost + Let's
Encrypt cert. Re-runnable; touches **no** tenant namespace, the K3s ingress, or
Supabase. The service binds `127.0.0.1:8088` and is independent of K3s/Traefik.

### Manage on the box
```bash
agfarms 'export XDG_RUNTIME_DIR=/run/user/$(id -u); systemctl --user status polingual-photon'
agfarms 'curl -s http://127.0.0.1:8088/healthz'
```

## Switching the explorer from the subset to the full index

The client (`learning/app/js/polingual.js`, owned by another agent) currently
reads the ~6,500-word baked subset. To serve the full 45k:

1. Point its lookups at **`/api/polingual?op=<axis>&surface=&lang=&…`** (same
 origin, no CORS, no key).
2. Map the five explorer axes to `op` values: `semantic`, `phonetic`,
 `spelling`, `etymology`, `translate` (plus `lookup` for the headword card).
3. On a `503` from the proxy (`upstream_timeout` / `upstream_unreachable`),
 fall back to the baked subset, the proxy returns a clear `error.code` + note.
4. Render `provenance.source` / `provenance.license` (CC-BY-SA) with results.
