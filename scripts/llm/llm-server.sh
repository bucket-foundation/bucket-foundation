#!/usr/bin/env bash
set -euo pipefail

MODEL="${LLM_GGUF:-$HOME/models/Qwen2.5-Coder-7B-Instruct-Q4_K_M.gguf}"
ALIAS="${LLM_ALIAS:-qwen2.5-coder-7b}"
HOST="${LLM_HOST:-127.0.0.1}"
PORT="${LLM_PORT:-11435}"
CTX="${LLM_CTX:-4096}"
NGL="${LLM_NGL:-99}"
LLAMA_BIN="${LLAMA_BIN:-$HOME/llama.cpp/build/bin/llama-server}"

export GGML_VK_VISIBLE_DEVICES="${GGML_VK_VISIBLE_DEVICES:-1}"
export HSA_OVERRIDE_GFX_VERSION="${HSA_OVERRIDE_GFX_VERSION:-11.0.0}"

exec "$LLAMA_BIN" \
  --model "$MODEL" \
  --alias "$ALIAS" \
  --host "$HOST" --port "$PORT" \
  --ctx-size "$CTX" \
  --n-gpu-layers "$NGL" \
  --no-webui
