#!/usr/bin/env bash
# gen_vo.sh — convert VOICEOVER.md into vo.mp3 via ElevenLabs
#
# Usage:
#   export ELEVENLABS_API_KEY=xxxx
#   ./gen_vo.sh                 # writes ./vo.mp3
#
# No key in current session. Script is a stub that errors out safely if unset.

set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
SCRIPT_MD="$HERE/VOICEOVER.md"
OUT="$HERE/vo.mp3"

# Adam voice id (ElevenLabs default)
VOICE_ID="${ELEVENLABS_VOICE_ID:-pNInz6obpgDQGcFmaJgB}"
MODEL_ID="eleven_multilingual_v2"
STABILITY="0.45"
SIMILARITY="0.80"
STYLE="0.25"

if [[ -z "${ELEVENLABS_API_KEY:-}" ]]; then
  echo "error: ELEVENLABS_API_KEY not set. export it and re-run." >&2
  exit 1
fi

if [[ ! -f "$SCRIPT_MD" ]]; then
  echo "error: $SCRIPT_MD not found." >&2
  exit 1
fi

# Strip markdown: drop lines starting with #, |, -, >, code fences, and blank lines.
# Keep only the prose (the quoted beat lines and plain sentences).
# The `>` quoted manifesto lines ARE the script — strip the leading `> ` and emit.
TEXT="$(awk '
  /^```/ {in_code = !in_code; next}
  in_code {next}
  /^#/ {next}
  /^\|/ {next}
  /^---/ {next}
  /^\*\(/ {next}               # skip parenthetical direction lines
  /^$/ {print ""; next}
  /^> / {sub(/^> /, ""); print; next}
  {next}                        # skip everything else (tables, prose notes)
' "$SCRIPT_MD" | sed 's/[*_`]//g')"

if [[ -z "$TEXT" ]]; then
  echo "error: extracted text is empty. check VOICEOVER.md parsing." >&2
  exit 1
fi

# POST to ElevenLabs
# Endpoint: https://api.elevenlabs.io/v1/text-to-speech/:voice_id
JSON_PAYLOAD="$(python3 -c '
import json, sys
text = sys.stdin.read()
print(json.dumps({
  "text": text,
  "model_id": "'"$MODEL_ID"'",
  "voice_settings": {
    "stability": '"$STABILITY"',
    "similarity_boost": '"$SIMILARITY"',
    "style": '"$STYLE"',
    "use_speaker_boost": True
  }
}))
' <<< "$TEXT")"

curl -sS -X POST \
  "https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128" \
  -H "xi-api-key: ${ELEVENLABS_API_KEY}" \
  -H "Content-Type: application/json" \
  -d "$JSON_PAYLOAD" \
  --output "$OUT"

if [[ ! -s "$OUT" ]]; then
  echo "error: vo.mp3 empty or not written." >&2
  exit 1
fi

echo "wrote $OUT ($(wc -c < "$OUT") bytes)"
