#!/usr/bin/env bash

set -e
cd ~/agfarms/bucket-foundation

while pgrep -f "agf-bridge-name" >/dev/null; do
  echo "$(date +%H:%M) waiting for llama bridge-name to finish..."
  sleep 600
done
echo "$(date +%H:%M) llama done, starting qwen pass"

nohup agf-bridge-name bucket-foundation \
  --top 17 \
  --model qwen2.5-coder:7b \
  --out bucket-canon/_bridges/detected-v2 \
  > /tmp/bridge-name-qwen.log 2>&1
echo "$(date +%H:%M) qwen pass complete"
