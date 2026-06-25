#!/usr/bin/env bash
# Bucket Academy local GPU LLM — llama.cpp server on the AMD RX 7700S (gfx1102).
#
# WHY llama.cpp and not the system ollama: the installed ollama 0.18.2 ships ONLY
# the cuda_v12 backend in /usr/local/lib/ollama (no Vulkan, no ROCm .so), so
# OLLAMA_VULKAN=1 is a silent no-op and every chat model runs 100% CPU
# (confirmed: `ollama ps` => "100% CPU", rocm-smi GPU use 0%). llama.cpp built
# WITH the Vulkan backend (libggml-vulkan.so) genuinely offloads to the discrete
# GPU — measured ~13 tok/s on GPU vs ~5.4 tok/s on CPU, rocm-smi GPU use 95-97%.
#
# Device selection: GGML_VK_VISIBLE_DEVICES=1 isolates the RX 7700S (RADV NAVI33)
# — Vulkan enumerates 0=Radeon 780M iGPU (gfx1103), 1=RX 7700S dGPU (gfx1102).
# After filtering, the dGPU becomes the only device (Vulkan0) and gets full
# offload. HSA_OVERRIDE_GFX_VERSION is set for parity with the rest of the box's
# ROCm tooling; the Vulkan backend doesn't require it, but it's harmless.
#
# OpenAI-compatible: serves /v1/chat/completions (+ /v1/models, /health) so the
# tutor's existing callLocalLLM() seam works unchanged.
set -euo pipefail

MODEL="${LLM_GGUF:-/home/gian/models/Qwen2.5-Coder-7B-Instruct-Q4_K_M.gguf}"
ALIAS="${LLM_ALIAS:-qwen2.5-coder-7b}"
HOST="${LLM_HOST:-127.0.0.1}"
PORT="${LLM_PORT:-11435}"
CTX="${LLM_CTX:-4096}"
NGL="${LLM_NGL:-99}"
LLAMA_BIN="${LLAMA_BIN:-/home/gian/llama.cpp/build/bin/llama-server}"

export GGML_VK_VISIBLE_DEVICES="${GGML_VK_VISIBLE_DEVICES:-1}"
export HSA_OVERRIDE_GFX_VERSION="${HSA_OVERRIDE_GFX_VERSION:-11.0.0}"

exec "$LLAMA_BIN" \
  --model "$MODEL" \
  --alias "$ALIAS" \
  --host "$HOST" --port "$PORT" \
  --ctx-size "$CTX" \
  --n-gpu-layers "$NGL" \
  --no-webui
