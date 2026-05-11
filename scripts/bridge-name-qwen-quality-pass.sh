#!/usr/bin/env bash
# After llama3.2:3b finishes naming, re-run with qwen2.5-coder:7b for quality.
# Writes to bucket-canon/_bridges/detected-v2/ so we can A/B compare.

set -e
cd ~/agfarms/bucket-foundation

# Wait for any running bridge-name to finish
while pgrep -f "agf-bridge-name" >/dev/null; do
  echo "$(date +%H:%M) waiting for llama bridge-name to finish..."
  sleep 600
done
echo "$(date +%H:%M) llama done, starting qwen pass"

# Modify agf-bridge-name to accept --out override, then run with qwen
nohup agf-bridge-name bucket-foundation \
  --top 17 \
  --model qwen2.5-coder:7b \
  --out bucket-canon/_bridges/detected-v2 \
  > /tmp/bridge-name-qwen.log 2>&1
echo "$(date +%H:%M) qwen pass complete"
