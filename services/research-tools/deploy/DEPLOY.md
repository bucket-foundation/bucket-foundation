# research-tools-gateway — Deploy Runbook

**Target:** `https://research-tools.agfarms.dev` on prod-hetzner-1 (Hetzner CPX42),
K3s-in-Docker (`agfarms-k3s`), namespace `inst-bucket-foundation`, TLS via host
nginx + certbot. Same proven pattern as the nucleus tenants + the Polingual API.

**Status: LIVE.** The **lean 9-tool image** (§0–§7) was verified 2026-06-19. The
**standard 16-tool fat image** (§8b, `tools-v3`) superseded it the same day and is
the current live image — all 16 endpoints answer over public HTTPS. See
[§8b](#8b-the-standard-fat-image--all-16-tools-live-shipped-2026-06-19) and
[§7 Verification](#7-verification-what-was-checked-live).

---

## 0. Scope — what actually ships in this image (be honest)

The gateway (`gateway.py`) registers **16 tools**. This image (`Dockerfile`)
ships only the **9 that are fully self-contained and REAL**, because they need
nothing but `fastapi/uvicorn/numpy/scipy/ViennaRNA` — no GPU, no ML weights, no
sibling repos:

| Cluster | Tools | Backend | Live? |
|---|---|---|---|
| RAG / data | `paperradar`, `grantdraft`, `methodsmatcher`, `reviewguard` | live OpenAlex API (`tools_rag.py`) | ✅ live |
| DNA / RNA | `rnastructure`, `grnaoptimizer`, `rnafmembeds` | ViennaRNA + numpy (`tools_dnarna.py`) | ✅ live |
| Neuroscience | `hhfit`, `spikefeatures` | scipy fits + spike detection (`tools_neuro.py`) | ✅ live |

The other **7** (`labbrain`, `proteinscout`, `stabilitydesigner`, `screenserver`,
`patchseqml`, `trajmine`, `cryotriage`) are **registered and answer their HTTP
endpoints**, but their runners `subprocess` into heavy sibling repos
(`~/agfarms/biophysics-phd-review/<tool>/`, `~/screenserver`) + ML model weights
that are **intentionally NOT vendored** into this lean CPU image. With those
dirs absent they return a clean tool-level error (e.g. `corpus_build_failed`,
`no_report`) — the gateway never crashes. Vendoring them (RDKit/ADMET,
MDAnalysis, MiniLM, ESM, etc.) is a separate, multi-GB image + a GPU plan for
`cryotriage`/real-MD `trajmine`; that is a **follow-up bead**, not this slice.
`/health` reports backend status per cluster (`rag_backend`, `dnarna_backend`,
`neuro_backend`) so the UI shows live/offline truthfully.

---

## 1. Prerequisites (all satisfied on prod-hetzner-1)

- DNS: `research-tools.agfarms.dev` resolves to the box (`5.161.236.151`, via the
  Cloudflare `*.agfarms.dev` wildcard — already in place, no DNS change needed).
- Docker 28 on the box; `agfarms-k3s` (rancher/k3s v1.31.6) container healthy.
- `kubectl` reached via `docker exec agfarms-k3s kubectl ...` (the host
  `~/.kube/config` points at a stale minikube addr — do NOT use it).
- Traefik ingress NodePort = **30080** on the k3s container IP **172.19.0.2**.
- nginx + certbot on the host (Let's Encrypt, per the org pattern; **no
  cert-manager** in this cluster — TLS is terminated at host nginx).
- `inst-bucket-foundation` namespace already exists.

SSH to the box (non-interactive; the `agfarms` shell function uses `ssh -t` and
hangs in scripts — call sshpass directly without `-t`):
```bash
sshpass -p "$AGFARMS_PASS" ssh -o StrictHostKeyChecking=accept-new "$AGFARMS_HOST" '<cmd>'
# sudo on the box: pipe the password to `sudo -S` over ssh stdin:
printf '%s\n' "$AGFARMS_PASS" | sshpass -p "$AGFARMS_PASS" ssh "$AGFARMS_HOST" "sudo -S -p '' <cmd>"
```

---

## 2. Build the image (on the box — x86_64, no cross-arch)

```bash
# 1. Copy the build context to the box (gateway + the 3 REAL backends + deploy/).
RT=~/agfarms/bucket-foundation/services/research-tools
sshpass -p "$AGFARMS_PASS" ssh "$AGFARMS_HOST" 'rm -rf ~/research-tools-build && mkdir -p ~/research-tools-build/deploy'
sshpass -p "$AGFARMS_PASS" scp \
  "$RT/gateway.py" "$RT/tools_rag.py" "$RT/tools_dnarna.py" "$RT/tools_neuro.py" \
  "$AGFARMS_HOST:~/research-tools-build/"
sshpass -p "$AGFARMS_PASS" scp \
  "$RT/deploy/Dockerfile" "$RT/deploy/requirements.txt" "$RT/deploy/k8s.yaml" \
  "$RT/deploy/nginx-research-tools.agfarms.dev.conf" \
  "$AGFARMS_HOST:~/research-tools-build/deploy/"

# 2. Build (~30s; wheels only, no compile).
sshpass -p "$AGFARMS_PASS" ssh "$AGFARMS_HOST" \
  'cd ~/research-tools-build && docker build -f deploy/Dockerfile \
     -t farmera/research-tools-gateway:v1 -t farmera/research-tools-gateway:latest .'
```

---

## 3. Import the image into k3s containerd

k3s-in-docker has its **own** containerd — a host `docker build` is not visible to
it. Import via `ctr`:
```bash
sshpass -p "$AGFARMS_PASS" ssh "$AGFARMS_HOST" \
  'docker save farmera/research-tools-gateway:v1 \
     | docker exec -i agfarms-k3s ctr -n k8s.io images import -'
```
The manifest uses `imagePullPolicy: IfNotPresent` so it uses this imported image
and never reaches for an external registry.

---

## 4. Apply the K8s manifests

```bash
# k8s.yaml ships image :latest; we pin to the imported :v1 tag at apply time.
sshpass -p "$AGFARMS_PASS" ssh "$AGFARMS_HOST" \
  'sed "s|research-tools-gateway:latest|research-tools-gateway:v1|" \
     ~/research-tools-build/deploy/k8s.yaml \
   | docker exec -i agfarms-k3s kubectl apply -f -'

# Wait for ready:
sshpass -p "$AGFARMS_PASS" ssh "$AGFARMS_HOST" \
  'docker exec agfarms-k3s kubectl rollout status \
     deploy/research-tools-gateway -n inst-bucket-foundation --timeout=120s'

# In-cluster smoke (via Traefik with the Host header nginx will send):
sshpass -p "$AGFARMS_PASS" ssh "$AGFARMS_HOST" \
  'curl -s -H "Host: research-tools.agfarms.dev" http://172.19.0.2:30080/health'
```

---

## 5. TLS cert + host nginx vhost

```bash
# 5a. Issue the Let's Encrypt cert (certonly: does NOT rewrite our vhost).
printf '%s\n' "$AGFARMS_PASS" | sshpass -p "$AGFARMS_PASS" ssh "$AGFARMS_HOST" \
  "sudo -S -p '' certbot certonly --nginx -d research-tools.agfarms.dev \
     --non-interactive --agree-tos -m gianyrox@gmail.com --keep-until-expiring"

# 5b. Install the vhost (it proxies TLS -> 172.19.0.2:30080 with the Host header).
printf '%s\n' "$AGFARMS_PASS" | sshpass -p "$AGFARMS_PASS" ssh "$AGFARMS_HOST" \
  "sudo -S -p '' cp ~/research-tools-build/deploy/nginx-research-tools.agfarms.dev.conf \
     /etc/nginx/sites-available/research-tools.agfarms.dev"
printf '%s\n' "$AGFARMS_PASS" | sshpass -p "$AGFARMS_PASS" ssh "$AGFARMS_HOST" \
  "sudo -S -p '' ln -sf /etc/nginx/sites-available/research-tools.agfarms.dev \
     /etc/nginx/sites-enabled/research-tools.agfarms.dev"

# 5c. Test + reload.
printf '%s\n' "$AGFARMS_PASS" | sshpass -p "$AGFARMS_PASS" ssh "$AGFARMS_HOST" "sudo -S -p '' nginx -t"
printf '%s\n' "$AGFARMS_PASS" | sshpass -p "$AGFARMS_PASS" ssh "$AGFARMS_HOST" "sudo -S -p '' systemctl reload nginx"
```
> NOTE: this box's nginx predates `http2 on;` (nginx <1.25.1). The vhost uses the
> legacy `listen 443 ssl http2;` form. Do not "modernize" it without checking
> `nginx -v`.

Cert auto-renews via the certbot systemd timer already on the box.

---

## 6. Wire Bucket -> gateway (`TOOLS_GATEWAY_URL`)

The Bucket Next proxies (`src/app/api/research/<tool>/route.ts`, all 16 already
exist) read `TOOLS_GATEWAY_URL` and **already default to
`https://research-tools.agfarms.dev`**. So the live site works even with the env
unset — but set it explicitly for clarity + preview environments:

**Vercel (bucket-foundation project) — set for Production + Preview:**
```bash
cd ~/agfarms/bucket-foundation
printf 'https://research-tools.agfarms.dev' | vercel env add TOOLS_GATEWAY_URL production
printf 'https://research-tools.agfarms.dev' | vercel env add TOOLS_GATEWAY_URL preview
# (or set it in the Vercel dashboard: Project → Settings → Environment Variables)
# Redeploy to pick it up:  vercel --prod
```
`TOOLS_GATEWAY_URL` is **server-only** (used in route handlers, `runtime="nodejs"`,
never shipped to the client) — no `NEXT_PUBLIC_` prefix.

**K3s secret `bucket/tools-gateway`** (for the doc-specified future where the
Bucket app itself runs in-cluster; the live site is on Vercel, so this is
forward-looking parity, not load-bearing today):
```bash
sshpass -p "$AGFARMS_PASS" ssh "$AGFARMS_HOST" \
  'docker exec agfarms-k3s kubectl create secret generic tools-gateway \
     -n inst-bucket-foundation \
     --from-literal=TOOLS_GATEWAY_URL=https://research-tools.agfarms.dev \
     --dry-run=client -o yaml | docker exec -i agfarms-k3s kubectl apply -f -'
```

No secrets are committed to the repo. The gateway is payment-agnostic; metering
(Viatika) lives in the Bucket proxy per architecture doc §6 and is off in v1.

---

## 7. Verification (what was checked LIVE)

All on 2026-06-19 against the public endpoint:

```bash
curl https://research-tools.agfarms.dev/health
#   -> 200 {"ok":true, ... "dnarna_backend":true,"neuro_backend":true,"rag_backend":true}

curl -X POST https://research-tools.agfarms.dev/v1/rnastructure/submit \
     -H 'Content-Type: application/json' \
     -d '{"sequence":"GGGAAACUCCUUUGGGAGAGUUUCCC"}'
#   -> 200, status:"succeeded", mode:"inline", REAL ViennaRNA 2.7.0 fold:
#      mfe_structure "(((((((((((...)).)))))))))", mfe_kcal_mol -13.2,
#      11 base pairs + partition-function pair probabilities. demo:false.

curl -X POST .../v1/hhfit/submit       -d '{"trace":"demo"}'      # 200, real scipy RC fit
curl -X POST .../v1/grnaoptimizer/submit -d '{"sequence":"...GGG"}' # 200
curl -I http://research-tools.agfarms.dev/health                  # 301 -> https
# CORS: Origin https://bucket.foundation -> echoed; https://evil.example -> not echoed.
```

---

## 8. Operate / redeploy / rollback

```bash
K() { sshpass -p "$AGFARMS_PASS" ssh "$AGFARMS_HOST" "docker exec agfarms-k3s kubectl $* -n inst-bucket-foundation"; }
K 'get deploy,svc,ingress,pods -l app=research-tools-gateway'
K 'logs deploy/research-tools-gateway --tail=100'
K 'rollout restart deploy/research-tools-gateway'

# New version: build :v2, import (step 3), then:
K 'set image deploy/research-tools-gateway gateway=farmera/research-tools-gateway:v2'
K 'rollout undo deploy/research-tools-gateway'   # rollback

# Tear down:
K 'delete deploy,svc,ingress research-tools-gateway'
```

---

## 8b. The STANDARD (fat) image — all 16 tools live (shipped 2026-06-19)

The lean image above serves 9 tools. A **second, standard image** vendors the
remaining 7 so **all 16 endpoints answer live** from the same gateway API (no UI
or contract change). It is the live image as of 2026-06-19 (`tools-v3`).

Artifacts (all in `deploy/`):
- `Dockerfile.tools` — fat CPU image (~3.18 GB). Base + scientific stack + CPU-only
  torch (`--index-url .../whl/cpu`) + RDKit. Vendors the 7 tools' source + weights
  under `/app/vendor/`, and sets `TOOLS_REPO_DIR=/app/vendor/tools` +
  `SCREENSERVER_DIR=/app/vendor/screenserver` so the gateway's **existing**
  subprocess logic dispatches to the vendored code — **no gateway code change**.
  Bakes the all-MiniLM-L6-v2 HF cache (`HF_HUB_OFFLINE=1`) so labbrain never
  downloads its embedder.
- `requirements.tools.txt` — the fat deps. **`scikit-learn==1.6.1` is pinned**: the
  screenserver HistGradientBoosting pickles fail to unpickle on sklearn 1.9+
  (`No module named '_loss'`). numpy is left to the resolver (`>=1.26,<2.3`) because
  mdtraj/deeptime cap it below the lean image's 2.2.1.
- `build-tools-context.sh` — reproducibly assembles the build context from the
  sibling repos (excludes the 3.7 GB cryotriage data, 296 MB stabilitydesigner
  train data, 156 MB patchseqml data, 1.6 GB `.esm_cache` — none needed on the
  invoked paths).
- `k8s.tools.yaml` — the fat Deployment. **`--workers 1` (REQUIRED)** — the job
  table is in-memory per worker; async tools (labbrain build, trajmine, cryotriage)
  are polled by `job_id` and would 404 on a different worker. `memory: 3Gi` limit
  (torch + the 381 MB stabilitydesigner sklearn model + RDKit need headroom).
  `TOOLS_INLINE_BUDGET_S=45` so more heavy CPU tools return inline.

What runs live in the fat image (verified 2026-06-19 via public HTTPS):

| Tool | Backend | Status |
|---|---|---|
| proteinscout | sklearn pickles (vendored) | ✅ live, REAL |
| stabilitydesigner | 381 MB sklearn ddG model (vendored) | ✅ live, REAL (ddG=0.364 for Y5F) |
| screenserver | RDKit + 13 sklearn ensembles (vendored) | ✅ live, REAL |
| patchseqml | numpy/scipy Hodgkin-Huxley `sim` | ✅ live, REAL |
| labbrain | sentence-transformers all-MiniLM (baked) + OpenAlex | ✅ live, REAL (cache-hit fast; uncached author goes async) |
| trajmine | mdtraj+deeptime **demo-md** (no GPU) | ✅ live, DEMO (real-shaped MSM) |
| cryotriage | scikit-image+mrcfile **synthetic** (no GPU) | ✅ live, DEMO (real-shaped triage) |

Build + deploy (same proven path as §2–§4):
```bash
# on a host with the sibling repos:
bash deploy/build-tools-context.sh                       # → /tmp/rt-tools-build
# copy context to the box, then on the box:
docker build -f deploy/Dockerfile.tools -t farmera/research-tools-gateway:tools-v3 .
docker save farmera/research-tools-gateway:tools-v3 | docker exec -i agfarms-k3s ctr -n k8s.io images import -
docker exec -i agfarms-k3s kubectl apply -f - < deploy/k8s.tools.yaml
docker exec agfarms-k3s kubectl rollout status deploy/research-tools-gateway -n inst-bucket-foundation
```
Rollback to the lean 9-tool image: `kubectl set image deploy/research-tools-gateway gateway=farmera/research-tools-gateway:v1` (the lean `:v1` is kept in containerd).

## 9. Remaining / follow-up

1. ~~**Vendor the 7 subprocess/demo tools** into a second image.~~ **DONE 2026-06-19**
   — see §8b. All 16 endpoints live. **trajmine real-MD + cryotriage real cryo-EM
   stay demo/synthetic** because the Hetzner CPX42 has **no GPU**; flipping them to
   real is a GPU-worker deploy (a separate node/queue), not a redesign — the async
   contract is already in place. That GPU plane is the only remaining tool gap.
2. **Set `TOOLS_GATEWAY_URL` in Vercel** (step 6) and redeploy Bucket — optional
   (the proxy already defaults to this URL) but recommended for explicitness.
3. **Push `farmera/research-tools-gateway` to Docker Hub** if you want pull-based
   deploys instead of `ctr import` (then drop `imagePullPolicy: IfNotPresent`).
4. **Persist the job table** (Redis/RQ + Supabase mirror) — currently in-memory
   per pod; fine for inline tools, required before the async/heavy plane lands.
   Keep `replicas: 1` until then (the in-memory job table is not shared).
5. **Metering seam** (Viatika) in the Bucket proxy — architecture doc §6.
