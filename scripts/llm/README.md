# Bucket Academy — Local GPU LLM endpoint

A GPU-accelerated, OpenAI-compatible chat-LLM endpoint on Gian's AMD **RX 7700S**
(gfx1102), serving the Academy Socratic tutor (`src/app/api/academy/tutor`) with
**no Anthropic key**. Three `systemd --user` services (survive logout; linger is on):

```
bkt-llm-server  llama.cpp on the dGPU (Vulkan)        127.0.0.1:11435  /v1/*, /health
   └─ bkt-llm-shim   bearer-auth proxy (the ONLY thing exposed)  127.0.0.1:11500  /v1/*, /health
        └─ bkt-llm-tunnel  cloudflared quick tunnel              https://<rand>.trycloudflare.com
```

## Why llama.cpp, not the system Ollama

The installed `ollama 0.18.2` ships **only** the `cuda_v12` backend in
`/usr/local/lib/ollama` — **no Vulkan, no ROCm** `.so`. So `OLLAMA_VULKAN=1` (set
in the root systemd unit) is a silent no-op and every chat model runs **100% CPU**
(`ollama ps` => "100% CPU", `rocm-smi` GPU use 0%). `llama.cpp` built with the
Vulkan backend (`/home/gian/llama.cpp/build/bin/llama-server`,
`libggml-vulkan.so`) genuinely offloads to the discrete GPU.

Vulkan enumerates `0 = Radeon 780M (iGPU, gfx1103)`, `1 = RX 7700S (dGPU, gfx1102)`.
`GGML_VK_VISIBLE_DEVICES=1` isolates the dGPU; it then becomes `Vulkan0` and gets
full offload (`offloaded 29/29 layers to GPU`).

## Measured GPU vs CPU (Qwen2.5-Coder-7B-Instruct Q4_K_M)

| Path | tok/s | GPU use during gen |
|------|-------|--------------------|
| **GPU (RX 7700S, Vulkan)** | **~13 tok/s** (sustained) / 23–70 on short warm gens | **95–99%** (rocm-smi) |
| CPU (`--n-gpu-layers 0`) | ~5.4 tok/s | 0% |

~2.4× faster sustained, and it gets inference off the CPU entirely. Model = 4.1 GiB
on the GPU + 224 MiB KV + 304 MiB compute; fits the 8 GiB dGPU comfortably.

## Operate

```bash
systemctl --user status  bkt-llm-server bkt-llm-shim bkt-llm-tunnel
systemctl --user restart bkt-llm-server          # reload model
journalctl --user -u bkt-llm-server -n 50         # offload / errors
cat scripts/llm/.tunnel-url                        # current public URL (ephemeral)

# local smoke test
curl -s http://127.0.0.1:11500/health
SECRET=$(cat scripts/llm/.bearer-secret)
curl -s -X POST http://127.0.0.1:11500/v1/chat/completions \
  -H "Authorization: Bearer $SECRET" -H 'Content-Type: application/json' \
  -d '{"model":"qwen2.5-coder-7b","messages":[{"role":"user","content":"hi"}],"max_tokens":20}'
```

## Secrets (gitignored, never committed)

- `scripts/llm/.bearer-secret` — the bearer token (mode 600)
- `scripts/llm/shim.env` — `LLM_SHIM_SECRET=...` consumed by the shim unit
- `scripts/llm/.tunnel-url` — current ephemeral tunnel URL

## Wire the deployed tutor (Vercel env)

The tutor seam (`route.ts` + `provider.ts`) already prefers a local OpenAI-compatible
endpoint when `LLM_BASE_URL` is set (Anthropic is the fallback; neither => 503 dark).
Set on the Vercel **bucket-foundation** project:

| Env | Value |
|-----|-------|
| `LLM_BASE_URL` | `https://<current-tunnel>.trycloudflare.com/v1`  (note the **`/v1`** suffix) |
| `LLM_MODEL`    | `qwen2.5-coder-7b` |
| `LLM_API_KEY`  | `<contents of scripts/llm/.bearer-secret>` (the shim bearer) |
| `LLM_TIMEOUT_S`| `60` (optional; default 20 — bump it, local GPU is slower than hosted) |

Do **not** set `ANTHROPIC_API_KEY` (would still be overridden by `LLM_BASE_URL`,
but local-only is the point here). All S1–S7 safety runs in code regardless.

> The quick-tunnel hostname **changes on each tunnel restart**. For a stable
> hostname use a NAMED tunnel (same as polingual): `cloudflared tunnel login`
> then `cloudflared tunnel create bkt-llm` + DNS route to e.g. `llm.agfarms.dev`,
> and point the tunnel unit at the named config. Then `LLM_BASE_URL` never changes.
