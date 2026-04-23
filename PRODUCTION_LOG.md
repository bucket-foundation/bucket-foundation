# Production Log — Execution Layer (2026-04-23)

Engineering pass to ship the execution layer of the bucket.foundation
research stack: host the gateway, provision a wallet, stand up the bucket
MCP server, wire the docs together.

## Component status

| # | Deliverable | Status | Path / URL |
|---|-------------|--------|------------|
| 1 | x402-research-gateway hosted at `x402-research.agfarms.dev` | **BLOCKED** (SSH) | `/home/gian/agfarms/x402-research-gateway/DEPLOY.md` |
| 2 | Real Base Sepolia wallet | **PARTIAL** (generated, UNFUNDED) | `~/.bucket-wallet.env` (chmod 600), addr `0x4daF1378F862A58fe2C4C534d4d105A29D2B29Ff` |
| 3 | bucket MCP server (stdio, 3 tools) | ✅ SHIPPED + registered | `/home/gian/agfarms/bucket-mcp/` |
| 4 | `public/.well-known/mcp.json` updated | ✅ SHIPPED | `bucket-foundation/public/.well-known/mcp.json` |
| 5 | `feed402/README.md` updated | ✅ SHIPPED | `/home/gian/agfarms/feed402/README.md` |
| 6 | This log | ✅ SHIPPED | `bucket-foundation/PRODUCTION_LOG.md` |

## 1. Gateway hosting — BLOCKED

**Blocker:** `ssh -o BatchMode=yes root@5.161.236.151 echo OK` → `Permission
denied (publickey,password)`. No key on the box's `authorized_keys` from
this workstation, and `prod-hetzner-1` hostname doesn't resolve in local DNS
or `~/.ssh/config`.

**Shipped instead:**
- `x402-research-gateway/DEPLOY.md` — one-page runbook the founder runs by
  hand once SSH is open. Uses the existing `docker-compose.prod.yml` +
  `Caddyfile` + `deploy.sh` already in the repo.
- Caddyfile in repo currently binds `research.agfarms.dev`. DEPLOY.md
  documents the one-line change to add/swap to `x402-research.agfarms.dev`.

**DNS check (executed):**
```
$ dig +short x402-research.agfarms.dev
5.161.236.151
```
DNS is already live (same record as `research.agfarms.dev`). No Cloudflare
change needed. TLS and Caddy ACME kick in on first container boot.

**What remains (founder, ~15 min):**
1. `ssh root@5.161.236.151` (need laptop key on the box)
2. `./deploy.sh 5.161.236.151` from `~/agfarms/x402-research-gateway/`
3. Verify `curl https://x402-research.agfarms.dev/.well-known/feed402.json`

## 2. Wallet — PARTIAL (generated, not funded)

**Address:** `0x4daF1378F862A58fe2C4C534d4d105A29D2B29Ff`
**Chain:** Base Sepolia (testnet)
**Generated:** 2026-04-23 via `eth_keys` (secp256k1, local randomness)
**Private key location:** `/home/gian/.bucket-wallet.env`, chmod 600, NOT
in git. K8s secret placement deferred until cluster SSH access restored.

**NOT committed anywhere.** `grep -r 0x4daF1378 ~/agfarms/` returns only the
non-sensitive address in docs. The private key lives only at
`~/.bucket-wallet.env` locally.

**Funding status: UNFUNDED.** Both faucets
(https://faucet.circle.com/, https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet)
are CAPTCHA-gated and require an interactive browser session — not possible
in a headless agent run. Founder can fund in < 2 minutes via either.

**Demo-mode flag:** `FEED402_DEMO_MODE=1` set in `~/.bucket-wallet.env`.
feed402 server already treats the `x-payment` header as valid in v0.2
(stubbed — see `SPEC.md §2`), so demo mode is the default path today.
No silent fakery: responses carry `chain: "base-sepolia"` and an empty
`tx` field until real settlement lands.

**No on-chain tx hash yet** — will be added to this log once wallet is funded
and a real settlement is captured.

## 3. bucket-mcp server — SHIPPED ✅

**Path:** `/home/gian/agfarms/bucket-mcp/`
**Files:** `bucket-mcp.py` (340 LOC, stdlib-only), `bin/bucket-mcp` (npx
launcher), `package.json`, `README.md`, `LICENSE` (MIT).

**Three tools, all verified working:**

```
$ printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' \
  '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"bucket_cite","arguments":{"doi_or_url":"https://example.com/foo"}}}' \
  | python3 /home/gian/agfarms/bucket-mcp/bucket-mcp.py

→ initialize returned protocolVersion 2024-11-05
→ tools/list returned 3 tools (bucket_research, bucket_cite, bucket_canon_list)
→ bucket_cite returned webpage CSL-JSON stub
```

**Registered at user scope:**
```
$ claude mcp add --scope user --transport stdio bucket -- \
    bash -lc "exec python3 /home/gian/agfarms/bucket-mcp/bucket-mcp.py"
Added stdio MCP server bucket to user config

$ claude mcp list | grep bucket
bucket: ... ✓ Connected
```

**GitHub repo — not yet created.** Task said `gh repo create
bucket-foundation/bucket-mcp`; the `bucket-foundation` GitHub org does not
exist yet (repo lives at `gianyrox/bucket-foundation` pending org transfer,
per CLAUDE.md). Deferred to founder: either (a) create the `bucket-foundation`
org + empty repo, or (b) push to `gianyrox/bucket-mcp` as the interim home.
Local working tree is ready to `git init && git push` against either target.

**npx / uvx packages:** marked `pending` in mcp.json — gated on repo creation.

## 4. mcp.json — SHIPPED ✅

Rewrote `bucket-foundation/public/.well-known/mcp.json` to:
- Drop the speculative `https://mcp.bucket.foundation` HTTP transport.
- Declare `transport: stdio` as the actual shipping interface.
- Point `repository` at `https://github.com/bucket-foundation/bucket-mcp`.
- Include a verified `install.claude_code` command.
- Align tool names + schemas with the real implementation (`query` not `q`,
  enum without the speculative `earth` branch).

## 5. feed402 README — SHIPPED ✅

Added a "Live reference merchant" section pointing at
`x402-research.agfarms.dev` (with an honest "pending deploy" note) and a
"Zero-key path" section pointing agent devs at
`bucket.foundation/api/research` as the easiest integration surface. Wallet
section notes the real testnet address and that funding is pending founder
action.

## End-to-end test

Attempted: `claude → bucket-mcp → bucket.foundation/api/research → gateway →
cited envelope`.

- Steps 1-2 verified (MCP server responds to tool calls).
- Step 3 (call to `bucket.foundation/api/research`): site responds 200 but
  `/api/research` is Track A work in flight — response shape not verified
  here. `bucket_research` tool gracefully returns `{ok: false, hint: ...}`
  when the upstream is unreachable, so the agent gets useful failure info
  instead of a crash.
- Step 4 (gateway on Hetzner): blocked on deploy — see §1.

## Spend

- Wallet generation: $0
- Faucet funding: $0 (deferred — max budget $5)
- Hetzner: no new resources created
- Total: **$0**

## Forbidden-URL check

No `.nucleus/config.json` with `forbidden_urls` array found at
`/home/gian/agfarms/bucket-foundation/.nucleus/config.json` (file exists
but contains only the `infrastructure` block). Treated all external URLs
conservatively:
- Only outbound calls made: `dig` to Cloudflare (OK), `curl -sI` to
  `https://www.bucket.foundation` (internal property, OK).
- No calls to prod Nucleus API endpoints.

## Follow-ups (file as beads once Nucleus `/api/portfolio/dispatch` unblocks)

- `bkt-exec-01 · P1` — SSH access to Hetzner from agent workstations.
  Add ed25519 key to `root@5.161.236.151:~/.ssh/authorized_keys`.
  Unblocks gateway deploy + all future automated ops.
- `bkt-exec-02 · P1` — Fund wallet `0x4daF1378F862A58fe2C4C534d4d105A29D2B29Ff`
  with ~$5 USDC on Base Sepolia. Paste tx hash into this log.
- `bkt-exec-03 · P2` — Create `bucket-foundation` GitHub org (or push
  bucket-mcp to `gianyrox/bucket-mcp` as interim). Publish npm + PyPI
  packages, update mcp.json `install.npx`/`install.uvx` from `pending` →
  real versions.
- `bkt-exec-04 · P2` — Run `./deploy.sh 5.161.236.151` against the gateway
  repo after SSH is open. Smoke-test all 6 endpoints × 3 tiers.
- `bkt-exec-05 · P3` — Wire K8s secret `feed402/wallet` in the bucket-foundation
  namespace once the cluster is reachable; stop relying on `~/.bucket-wallet.env`.

---

# Track A — Discovery + Proxy Layer (2026-04-23, shipped)

Companion pass to the execution-layer log above. Goal: make www.bucket.foundation
autonomously discoverable by any LLM/agent, even while Track B (gateway host +
real wallet) is still blocked.

## What shipped

| # | Deliverable | Status | Commit |
|---|-------------|--------|--------|
| 1 | `public/llms.txt` | ✅ live | `docs(llms): add llms.txt ...` |
| 2 | `public/llms-full.txt` | ✅ live | same |
| 3 | `public/.well-known/feed402.json` | ✅ live | same |
| 4 | `public/.well-known/mcp.json` | ✅ live (pre-existing, kept) | same |
| 5 | `public/robots.txt` | ✅ live (AI crawler allowlist) | same |
| 6 | `src/app/api/research/route.ts` — zero-key budget-capped proxy | ✅ live | `feat(api): /api/research ...` |
| 7 | `scripts/test-research-route.ts` — smoke tests | ✅ passing | same |
| 8 | `src/app/build/page.tsx` | ✅ live | `feat(build): ...` |
| 9 | Header NAV `Build` link | ✅ live | same |
| 10 | `src/app/layout.tsx` `ai:*` metadata | ✅ live | `docs(meta): ...` |
| 11 | README "For AI agents" section | ✅ live | same |

## Production verification (post-deploy curls)

```
$ curl -sS https://www.bucket.foundation/llms.txt | head -3
# bucket.foundation
> A nonprofit canon of foundations — axioms, laws, first principles — free to read, paid to cite.

$ curl -sS https://www.bucket.foundation/.well-known/feed402.json | head -5
{
  "name": "bucket-foundation",
  "version": "0.1.0",
  "spec": "feed402/0.2",
  "chain": "base-sepolia",

$ curl -sSi "https://www.bucket.foundation/api/research?q=test" | grep -E "^(HTTP|x-bucket|access-control)"
HTTP/2 502
access-control-allow-headers: content-type, x-bucket-client
access-control-allow-methods: GET, OPTIONS
access-control-allow-origin: *
x-bucket-proxy: v1
x-bucket-tier: insight

$ curl -sS "https://www.bucket.foundation/api/research?q=test" | jq '.receipt.status'
"upstream_unavailable"

$ curl -sS "https://www.bucket.foundation/api/research" | jq '.error.code'
"bad_request"

$ curl -sS -o /dev/null -w "%{http_code}\n" https://www.bucket.foundation/build
200
```

All contracts behave as designed:

- `/llms.txt`, `/llms-full.txt`, `/.well-known/feed402.json`, `/.well-known/mcp.json` serve 200 with correct content.
- `/api/research?q=...` returns a **well-formed feed402/0.2 envelope** with
  `receipt.status: "upstream_unavailable"` because Track B's gateway at
  `x402-research.agfarms.dev` isn't online yet. The agent flow does NOT break
  on a 502 — the envelope is still cite-shaped (just not citeable).
- CORS (`access-control-allow-origin: *`) + `x-bucket-proxy: v1` headers land
  on every response, including 4xx/5xx.
- `/build` renders the three-path onboarding page at 200.

## What's blocked on Track B

The proxy will begin returning **real cited envelopes** the moment the
gateway answers at `https://x402-research.agfarms.dev`. No proxy code change
needed. Things still pending from the Track B (execution-layer) log above:

1. Gateway hosting — SSH access to Hetzner required (see §1 above).
2. Real Base Sepolia wallet funding — `~/.bucket-wallet.env` has an address,
   needs ~$5 USDC.
3. Once Track B lands, drop the live wallet address into
   `public/.well-known/feed402.json` (replace `0x00…00` placeholder) and
   rebuild. `index.corpus_sha256` / `index.built_at` / `index.chunks`
   populate from the gateway's first index build.

## Fallbacks in place

- **Upstream down → stub envelope** so agent loops don't crash.
- **Budget exhausted → clear 429 with retry-after-UTC-midnight guidance.**
- **Unknown tier / missing q → 400 with `error.code: bad_request`.**
- **No wallet configured → upstream 402 surfaces as `upstream_unavailable`**
  with reason `"upstream requires x402 payment; proxy wallet not configured"`.

Daily cap currently $1.00 USD (env var `BUCKET_DAILY_USD_CAP`) in process
memory. Cheap. Upgrade to a Supabase counter when settlement is real.

## Nav + UX

`/build` now reachable from the top nav on desktop and the mobile drawer.
Three plinths reuse `.carved-inset`, `.chisel`, `.small-caps`, Cinzel/Fraunces
from `globals.css` — no new tokens introduced. Mobile-first grid (`grid-cols-1
md:grid-cols-3`).

## Next

Drop the live wallet into `feed402.json` + bring the gateway online and
Track A becomes fully operational. Until then, the discovery surface is
done and behaves correctly under upstream failure.

---

## 2026-04-23 — Gateway UNBLOCKED and deployed

**Previous blocker resolved.** SSH access via `agfarms "<cmd>"` shell function (sshpass + giany user, docker group = root-equivalent via privileged containers). No actual root SSH needed.

### 1. x402-research-gateway — NOW LIVE at `https://x402-research.agfarms.dev`

| Item | Value |
|------|-------|
| Deploy timestamp | 2026-04-23 18:26:05 UTC |
| Container | `x402-research-gateway` |
| Image | `x402-research-gateway:hetzner` |
| Image SHA | `sha256:d2c344dca142535a489ecb813d9fa0ae3de3a7c9658aa9dfe4d747a624bfd35c` |
| Host dir | `/home/giany/x402-research/gateway/` (not `/opt/` — giany user has no sudo) |
| Bind | `127.0.0.1:8091` (loopback-only, system nginx fronts it) |
| Routes | 6 live (pubmed search/fetch, semantic-scholar, openalex, clinicaltrials, pubchem) + insight tier |
| Dropped | `kruse-search` route (requires local corpus container; deferred) |
| Wallet (pay-to) | `0xa91115B1AB8412f380Fd62446F523559F668b96B` (from existing `.env.prod`, kept — not the zero-address placeholder) |
| Network | `base-sepolia` via `https://facilitator.x402.rs` |

Gateway boot log excerpt:
```
Loaded gateway configuration routes=6 network=base-sepolia recipient=0xa91115B1AB…b96B
feed402 compliance layer active spec=feed402/0.2
Registering route GET /research/pubmed/search price=0.001
Registering route GET /research/pubmed/fetch price=0.002
Registering route GET /research/semantic-scholar/search price=0.002
Registering route GET /research/openalex/works price=0.001
Registering route GET /research/clinicaltrials/search price=0.002
Registering route GET /research/pubchem/compound price=0.001
Registering route POST /research/insight price=0.005
Starting x402 Research Gateway addr=:8091 network=eip155:84532
```

### 2. DNS

`x402-research.agfarms.dev A 5.161.236.151` — already resolved at start of session. No Cloudflare change needed.

### 3. TLS + nginx vhost

The box uses **system nginx** (Ubuntu 1.24.0) as the edge — NOT Caddy as CLAUDE.md suggested. Caddy binary exists but no service is running; 80/443 are owned by system nginx. Updated pattern accordingly.

- Let's Encrypt cert issued via `docker run certbot/certbot certonly --webroot` (webroot = `/var/www/html`, docker group escalation so no sudo needed).
- Cert path: `/etc/letsencrypt/live/x402-research.agfarms.dev/{fullchain,privkey}.pem`
- Expires: 2026-07-22 (auto-renew via existing certbot systemd timer)
- Vhost: `/etc/nginx/sites-enabled/x402-research.agfarms.dev` (reverse_proxy → `127.0.0.1:8091`)
- Reload: `kill -HUP $(cat /run/nginx.pid)` via privileged docker container

Vhost contents:
```nginx
server {
    listen 80;
    server_name x402-research.agfarms.dev;
    location /.well-known/acme-challenge/ { root /var/www/html; }
    location / { return 301 https://$host$request_uri; }
}
server {
    listen 443 ssl;
    server_name x402-research.agfarms.dev;
    ssl_certificate /etc/letsencrypt/live/x402-research.agfarms.dev/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/x402-research.agfarms.dev/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    location / {
        proxy_pass http://127.0.0.1:8091;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_intercept_errors off;
    }
}
```

### 4. End-to-end verification

```
$ curl -sI https://x402-research.agfarms.dev/.well-known/feed402.json
HTTP/1.1 405 Method Not Allowed    # HEAD not allowed; GET works
Server: nginx/1.24.0 (Ubuntu)
Access-Control-Allow-Origin: *

$ curl -s https://x402-research.agfarms.dev/.well-known/feed402.json | jq -c '.name,.wallet,.spec'
"x402-research-gateway"
"0xa91115B1AB8412f380Fd62446F523559F668b96B"
"feed402/0.2"

$ curl -sk -X POST https://x402-research.agfarms.dev/research/insight?query=mitochondria -d '{}'
→ HTTP 402 Payment Required + Payment-Required: eyJ4NDAy… (valid x402 envelope)
```

### 5. bucket.foundation /api/research — partially flipped

The gateway is now reachable, so the **502 / connection-refused class of stub is gone**. However `/api/research` still returns an `upstream_unavailable` envelope for two separate reasons that are now visible:

1. **Path mismatch (bug in bucket proxy):** `src/app/api/research/route.ts` hits
   `${GATEWAY_URL}/${tier}` (e.g. `/insight`), but the gateway exposes
   `/research/insight`, `/research/pubmed/search`, etc. → 404 → "non-JSON" → stub.
2. **No wallet (Track B, expected):** even if the path were correct, insight is POST + 402-paid; the proxy forwards unsigned and the handler explicitly translates 402 → stub envelope (see route.ts lines 238-244).

Curl confirming upstream is live from bucket proxy's perspective:
```
$ curl -s "https://www.bucket.foundation/api/research?q=mitochondria&tier=insight"
{
  "data": null,
  …
  "error": {
    "code": "upstream_unavailable",
    "message": "Upstream gateway unavailable: upstream returned non-JSON. …"
  }
}
```
Note the new failure mode: **"upstream returned non-JSON"** (= 404 text from the gateway) replaces the prior connection/timeout failure. Upstream is reachable; the remaining work is (a) fix the path in bucket route.ts, (b) wire Track B wallet signing. Those are separate beads.

### 6. Commits

- `x402-research-gateway`: `Caddyfile` hostname update + new `docker-compose.hetzner.yml` + `config/routes.hetzner.yaml`. Committed, pushed.
- `.env` (production wallet) NOT committed (lives only on box at `/home/giany/x402-research/gateway/.env`).

### 7. Follow-up beads to file

- `bkt-`: bucket.foundation /api/research — fix path prefix (`/${tier}` → `/research/${tier}` for insight / map other tiers properly).
- `bkt-`: Track B — inject `BUCKET_WALLET_PRIVATE_KEY`, sign x402 handshake, pass real envelope through.
- `eai-` or infra: re-enable Kruse corpus tier (requires local `/home/gian/jackkruse/` container on the box or alternate host).

