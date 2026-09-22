#!/usr/bin/env bash
# Local LLM tier health: the discrete GPU, Ollama, the llama.cpp server, and
# its auth shim. Prints one status line, then one "fix:" line per problem.
# Exit 0 ok, 1 degraded, 2 down.
#
#   bash scripts/llm/health.sh          # fast: sysfs and three HTTP pings, ~10 ms
#   bash scripts/llm/health.sh --deep   # adds a one-token chat through Ollama and
#                                       # llama.cpp, this boot's kernel log, and the
#                                       # public endpoint on the Hetzner box
#
# Why the GPU check comes first: the RX 7700S (gfx1102) sits in the Framework
# Laptop 16 expansion bay, and on 2026-09-13 it dropped off the PCIe bus across
# a suspend and resume ("amdgpu 0000:03:00.0: device lost from bus!"). Ollama
# had enumerated GPUs at startup, so from then on every runner opened ROCm
# device 0, which was now the Radeon 780M iGPU (gfx1103). Ollama's rocBLAS
# ships no gfx1103 kernels, so each model load aborted ("Cannot read
# TensileLibrary.dat ... for GPU arch : gfx1103", then "llama runner
# terminated: signal: aborted (core dumped)"). A reboot brings the dGPU back.
set -uo pipefail

DGPU_ID="${LLM_DGPU_PCI_ID:-0x7480}"     # Navi 33, the RX 7700S
OLLAMA="${OLLAMA_URL:-http://127.0.0.1:11434}"
LLAMA="${LLM_SERVER_URL:-http://127.0.0.1:11435}"
SHIM="${LLM_SHIM_URL:-http://127.0.0.1:11500}"
PUBLIC="${LLM_PUBLIC_HEALTH:-https://atlas-api.agfarms.dev/llm/health}"
OLLAMA_PROBE="${OLLAMA_PROBE_MODEL:-llama3.2:3b}"
LLAMA_PROBE="${LLM_ALIAS:-qwen2.5-coder-7b}"

deep=0
[ "${1:-}" = "--deep" ] && deep=1

level=0
parts=()
fixes=()
raise() { [ "$1" -gt "$level" ] && level=$1; }

# The discrete GPU: present on the bus and bound to amdgpu.
slot=""
for d in /sys/bus/pci/devices/*; do
  if [ "$(cat "$d/vendor" 2>/dev/null)" = "0x1002" ] && [ "$(cat "$d/device" 2>/dev/null)" = "$DGPU_ID" ]; then
    slot="${d##*/}"
    break
  fi
done
if [ -z "$slot" ]; then
  parts+=("dGPU missing")
  fixes+=("the RX 7700S is off the PCIe bus; Ollama runners will abort on the 780M. Reboot to bring it back, or run 'sudo systemctl restart ollama' to fall back to CPU until then")
  raise 1
elif [ "$(basename "$(readlink "/sys/bus/pci/devices/$slot/driver" 2>/dev/null)")" != "amdgpu" ]; then
  parts+=("dGPU $slot unbound")
  fixes+=("the RX 7700S at $slot has no amdgpu driver bound; reboot")
  raise 1
else
  parts+=("dGPU $slot")
fi

if [ "$deep" = 1 ] && [ -n "$slot" ]; then
  lost=$(journalctl -k -b 0 -q --no-pager --grep "$slot.*device lost from bus" 2>/dev/null | wc -l)
  if [ "$lost" -gt 0 ]; then
    parts+=("dGPU lost this boot")
    fixes+=("the kernel logged 'device lost from bus' for $slot this boot; Ollama still holds the old GPU list, so reboot")
    raise 1
  fi
fi

http_code() { curl -s -o /dev/null --max-time "${2:-1}" -w "%{http_code}" "$1" 2>/dev/null; }

ollama_up=0
version=$(curl -s --max-time 1 "$OLLAMA/api/version" 2>/dev/null | sed -n 's/.*"version":"\([^"]*\)".*/\1/p')
if [ -n "$version" ]; then
  ollama_up=1
  parts+=("ollama $version")
else
  parts+=("ollama down")
  fixes+=("Ollama does not answer at $OLLAMA; check 'systemctl status ollama'")
fi

llama_up=0
if [ "$(http_code "$LLAMA/health")" = "200" ]; then
  llama_up=1
  parts+=("llama.cpp ok")
else
  parts+=("llama.cpp down")
  fixes+=("llama.cpp does not answer at $LLAMA; check 'systemctl --user status bkt-llm-server'")
fi

if [ "$(http_code "$SHIM/health")" = "200" ]; then
  parts+=("shim ok")
else
  parts+=("shim down")
  fixes+=("the auth shim does not answer at $SHIM; check 'systemctl --user status bkt-llm-shim'")
  raise 1
fi

if [ "$ollama_up" = 0 ] && [ "$llama_up" = 0 ]; then raise 2; elif [ "$ollama_up" = 0 ] || [ "$llama_up" = 0 ]; then raise 1; fi

if [ "$deep" = 1 ]; then
  tmp=$(mktemp)
  if [ "$ollama_up" = 1 ]; then
    t0=$(date +%s.%N)
    code=$(curl -s --max-time 180 -o "$tmp" -w "%{http_code}" "$OLLAMA/api/generate" \
      -d "{\"model\":\"$OLLAMA_PROBE\",\"prompt\":\"Say ok.\",\"stream\":false,\"options\":{\"num_predict\":1}}" 2>/dev/null)
    t1=$(date +%s.%N)
    if [ "$code" = "200" ] && grep -q '"done":true' "$tmp"; then
      where=$(curl -s --max-time 2 "$OLLAMA/api/ps" 2>/dev/null | python3 -c '
import json, sys
name = sys.argv[1]
try:
    models = json.load(sys.stdin).get("models", [])
except Exception:
    models = []
for m in models:
    if m.get("name") == name or m.get("model") == name:
        print("GPU" if m.get("size_vram", 0) > 0 else "CPU")
        break
' "$OLLAMA_PROBE")
      parts+=("$OLLAMA_PROBE $(awk -v a="$t0" -v b="$t1" 'BEGIN { printf "%.1f", b - a }')s ${where:-?}")
      if [ "$where" = "CPU" ]; then
        fixes+=("Ollama ran $OLLAMA_PROBE on the CPU; the dGPU is missing from its device list, so reboot")
        raise 1
      fi
    else
      parts+=("$OLLAMA_PROBE failed")
      fixes+=("a one-token chat on $OLLAMA_PROBE failed (HTTP $code); read 'journalctl -u ollama -n 80' for 'runner terminated' or 'TensileLibrary'")
      raise 1
    fi
  fi
  if [ "$llama_up" = 1 ]; then
    t0=$(date +%s.%N)
    code=$(curl -s --max-time 60 -o "$tmp" -w "%{http_code}" "$LLAMA/v1/chat/completions" -H 'content-type: application/json' \
      -d "{\"model\":\"$LLAMA_PROBE\",\"messages\":[{\"role\":\"user\",\"content\":\"Say ok.\"}],\"max_tokens\":1}" 2>/dev/null)
    t1=$(date +%s.%N)
    if [ "$code" = "200" ] && grep -q '"choices"' "$tmp"; then
      parts+=("llama.cpp chat $(awk -v a="$t0" -v b="$t1" 'BEGIN { printf "%.1f", b - a }')s")
    else
      parts+=("llama.cpp chat failed")
      fixes+=("a one-token chat through llama.cpp failed (HTTP $code); read 'journalctl --user -u bkt-llm-server -n 80'")
      raise 1
    fi
  fi
  rm -f "$tmp"
  if [ "$(http_code "$PUBLIC" 6)" = "200" ]; then
    parts+=("public ok")
  else
    parts+=("public down")
    fixes+=("the public endpoint $PUBLIC does not answer; it rides a reverse tunnel to the Hetzner box, so the live site's tutor has no local tier until that box is back")
    raise 1
  fi
fi

label=(ok degraded down)
line="local-llm: ${label[$level]}"
for p in "${parts[@]}"; do line+=" · $p"; done
echo "$line"
for f in "${fixes[@]}"; do echo "  fix: $f"; done
exit "$level"
