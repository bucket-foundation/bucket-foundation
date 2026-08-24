# Local LLM seam for research-tools + the Bucket Academy tutor

One configurable, OpenAI-compatible LLM seam wired into three consumers, with a
**graceful deterministic fallback** in every one, the LLM is always optional,
Never load-bearing.

```
                         LLM_BASE_URL / LLM_MODEL / LLM_API_KEY
                                        │
  ┌─────────────────────────┬──────────┴───────────┬──────────────────────────┐
  │ ProtocolGPT             │ QuantumBioRAG         │ Academy tutor            │
  │ (tools_protocol.py)     │ (tools_rag.py)        │ (src/.../academy/tutor)  │
  │ optional step-wording   │ optional evidence     │ default chat provider    │
  │ polish                  │ synthesis             │ (S1–S7 enforced in code) │
  └───────────┬─────────────┴───────────┬───────────┴──────────────┬──────────┘
              │ Python llm_client.chat() │                          │ TS fetch()
              └──────────────┬───────────┘                          │
                             ▼                                       ▼
                  OpenAI-compatible endpoint  ◀───── LLM_BASE_URL (one URL) ─────┘
                             │
              ┌──────────────┴───────────────┐
              │ DEV: http://localhost:11434/v1│  (Ollama directly on Gian's box)
              │ PROD: https://<tunnel>/v1     │  (cloudflared → auth-shim → Ollama)
              └───────────────────────────────┘
```

## The seam

- **Python** (`services/research-tools/llm_client.py`): stdlib-only
 OpenAI-compatible `chat(system, user)`. Reads `LLM_BASE_URL` / `LLM_MODEL` /
 `LLM_API_KEY` / `LLM_TIMEOUT_S`. **Returns `None` on any error** (unset env,
 unreachable, timeout, bad status, malformed body) so callers fall back. Never
 raises, never hangs a request, never logs the key.
- **TypeScript** (`src/app/api/academy/tutor/{route,provider}.ts`): `selectProvider()`
 picks `local` when `LLM_BASE_URL` is set (the default), else `anthropic` when
 `ANTHROPIC_API_KEY` is set, else `null` → the route returns **503** (tutor
 dark). `callLocalLLM()` is an OpenAI-compatible `fetch` with an abort-timeout.

### How each consumer falls back

| Consumer | LLM step | When LLM is down/unset |
|---|---|---|
| **ProtocolGPT** | rewrites only the *wording* of already-extracted steps (cannot add/remove/reorder steps or touch numbers, reagents, timings, safety) | deterministic rule-extracted steps are returned verbatim; `llm_cleanup_applied: false` |
| **QuantumBioRAG** | adds a grounded `synthesis` paragraph over the retrieved rows | `synthesis: null`; the deterministic verdict/scores are unchanged, they are the product |
| **Academy tutor** | the chat provider behind the S1, S7 grounded Socratic turn | 503 if no provider; on local timeout/error → 502; unparseable model output → **fail-safe abstaining 200** (S7). Closed-set citations, abstain, grounding checks all stay in code |

## Secure prod exposure

Vercel and the Hetzner gateway can't reach `localhost`. We **do NOT expose raw
Ollama**. Instead:

1. **`llm_shim.py`**, a tiny stdlib reverse proxy bound to `127.0.0.1`:
 - requires `Authorization: Bearer <LLM_GATEWAY_SECRET>` on every request (constant-time);
 - forwards **only `/v1/*`** to `127.0.0.1:11434` (model-management paths → 404);
 - GET/POST only, body size-capped, strips the inbound `Authorization` before forwarding.
2. **cloudflared tunnels the SHIM** (`tunnel.sh`), never Ollama. The public URL is
 useless without the bearer secret.

The public `LLM_BASE_URL` is then `https://<tunnel-host>/v1` and `LLM_API_KEY`
is the `LLM_GATEWAY_SECRET`.

### Install

```bash
cd ~/agfarms/bucket-foundation/services/research-tools/llm
./setup.sh
```

`setup.sh`:
- generates a strong `LLM_GATEWAY_SECRET` once (preserved on re-run);
- writes it to `~/.config/research-tools-llm/llm-shim.env` (**chmod 600, OUTSIDE
 the repo, never committed**);
- installs + enables the `llm-shim.service` and `llm-tunnel.service` **systemd
 --user** units (linger is already on, so they survive logout/reboot and
 `Restart=always` keeps them up);
- verifies 401-without-bearer / 200-with-bearer / 404-on-blocked-path;
- prints the quick-tunnel public URL.

Read the secret later with:
```bash
grep LLM_GATEWAY_SECRET ~/.config/research-tools-llm/llm-shim.env
```

**Stable hostname (recommended over the ephemeral quick tunnel):** set
`CF_TUNNEL_NAME=research-llm` in the env file after a one-time
`cloudflared tunnel login && cloudflared tunnel create research-llm` + DNS route
to e.g. `research-llm.agfarms.dev`; `tunnel.sh` auto-uses the named tunnel.

### Service control

```bash
systemctl --user status  llm-shim.service llm-tunnel.service
systemctl --user restart llm-shim.service llm-tunnel.service
journalctl --user -u llm-shim.service -n 50
bash tunnel.sh url      # current quick-tunnel public URL
```

## Exactly which env vars to set where

Pick a model: `qwen3.5:latest` (general, slower, a reasoning model) or
`llama3.2:3b` (fast). For interactive paths the fast model is recommended.

### Hetzner gateway, `services/research-tools/deploy/k8s.tools.yaml`

Add a Secret + reference it from the Deployment `env`:

```yaml
# add to the same namespace (inst-bucket-foundation)
apiVersion: v1
kind: Secret
metadata:
  name: research-tools-llm
  namespace: inst-bucket-foundation
type: Opaque
stringData:
  LLM_BASE_URL: "https://<tunnel-host>/v1"
  LLM_API_KEY:  "<LLM_GATEWAY_SECRET>"
  LLM_MODEL:    "llama3.2:3b"
```

```yaml
# in the gateway container's env: block
            - name: LLM_BASE_URL
              valueFrom: { secretKeyRef: { name: research-tools-llm, key: LLM_BASE_URL } }
            - name: LLM_API_KEY
              valueFrom: { secretKeyRef: { name: research-tools-llm, key: LLM_API_KEY } }
            - name: LLM_MODEL
              valueFrom: { secretKeyRef: { name: research-tools-llm, key: LLM_MODEL } }
```

Apply:
```bash
docker exec -i agfarms-k3s kubectl apply -f - < deploy/k8s.tools.yaml
docker exec -i agfarms-k3s kubectl -n inst-bucket-foundation \
  rollout restart deploy/research-tools-gateway
```

If `LLM_BASE_URL` is omitted, the tools run their deterministic path exactly as
they do today, no behavior change until the seam is wired.

### Vercel

```bash
cd ~/agfarms/bucket-foundation
# value = the tunnel URL ending in /v1
printf 'https://<tunnel-host>/v1' | vercel env add LLM_BASE_URL production
# value = the LLM_GATEWAY_SECRET
grep LLM_GATEWAY_SECRET ~/.config/research-tools-llm/llm-shim.env | cut -d= -f2- \
  | tr -d '\n' | vercel env add LLM_API_KEY production
printf 'llama3.2:3b' | vercel env add LLM_MODEL production
vercel --prod   # redeploy to pick up env
```

With `LLM_BASE_URL` set, the tutor uses the local LLM. Leave `ANTHROPIC_API_KEY`
unset (or set it as the fallback alternative). Unset both → tutor returns 503
(dark), unchanged from today.

## Secret hygiene

- The live secret lives **only** in `~/.config/research-tools-llm/llm-shim.env`
 (chmod 600) and in the Vercel/K8s secret stores, **never in git**.
- `.gitignore` here blocks `*.env` / `llm-shim.env` / tunnel logs;
 `.env.example` documents the shape with no real value.
- Rotate by deleting the env file and re-running `setup.sh`, then update the
 Vercel + K8s secrets.

## Tests

```bash
# Python: seam fallback + tool determinism (89 existing + 11 new all green)
cd services/research-tools && python3 -m pytest tests/ -q

# TS: tutor provider selection
npx ts-node --compiler-options '{"module":"commonjs"}' scripts/test-tutor-provider.ts

# typecheck
npx tsc --noEmit
```
