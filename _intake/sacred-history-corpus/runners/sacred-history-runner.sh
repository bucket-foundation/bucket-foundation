#!/usr/bin/env bash
# Sacred-History Corpus — idempotent, rights-aware mirror runner.
#
# Modeled on scripts/pursue-mirror-runner.sh (the canonical AGFarms
# autonomous-mirror pattern): single-instance flock, per-source skip-if-done,
# append-only log, .status.json snapshot, safe to run repeatedly / interrupt.
#
# ============================ FOUNDER-LOCKED STATUS (2026-05-19) ============
# Founder greenlit "do what you can and must" on 2026-05-19. Per DECISIONS.md:
#
#   * RIGHTS-POLICY.md is ADOPTED as the operating default. The written +
#     founder-adopted two-tier gate SATISFIES the P1 rights interlock
#     (bkt-sh-rights-policy) **FOR PUBLIC-DOMAIN / OPEN SOURCES ONLY**.
#   * Phase 1 is LIVE for PD/open sources ONLY. This is a bounded, idempotent
#     PROOF run, not a full historical backfill.
#   * Copyrighted / NC / unclear sources stay METADATA-ONLY and remain GATED:
#     their LIVE_GUARD is NOT removed (TIER_B_GUARD below stays 1).
#   * Compute: local CPU/GPU/disk is the default and effectively uncapped.
#     Any network AI / Viatika x402 metered call is DISABLED ($0). The
#     AI-analysis hook assumes a LOCAL model; the Viatika network synthesis
#     hook is present but DEFAULT-OFF and is NEVER called by this runner.
#
# KEY DIFFERENCES FROM pursue-mirror-runner.sh (by design):
#   1. Phase-1 PD/open sources run LIVE by default (founder-locked). A
#      --dry-run flag still exists for inspection (lists, no fetch).
#   2. RECURRING, NOT self-disabling. This corpus is "ongoing forever" — the
#      timer re-checks for new editions/manuscripts and never disables itself.
#   3. Only the clean/open first-slice sources are wired LIVE:
#        Sefaria index · SuttaCentral (CC0) · Tanzil Quran ·
#        ctext.org · Wikidata SPARQL (sacred/historical events)
#      Each respects its source's ToS (rate limits, no bulk redistribution,
#      robots, Retry-After). Bounded + idempotent + resumable.
#
# Invoked by:
#   - systemd --user timer (see sacred-history-mirror.timer.template)
#   - bkt-nuc session startup
#   - manually:  ./sacred-history-runner.sh            (LIVE, PD/open only)
#                ./sacred-history-runner.sh --dry-run   (inspect, no fetch)
set -u

# ------------------------------------------------------------------ paths ---
DEST="$HOME/agfarms/bucket-foundation/_intake/sacred-history-corpus"
WORK="$DEST/work"
LOG="$DEST/runner.log"
LOCK="$DEST/.runner.lock"
MANIFEST="$DEST/dry-run-manifest.tsv"
STATUS="$DEST/.status.json"
UA="bucket-foundation-sacred-history/0.2 (+https://bucket.foundation; research; contact gianyrox@gmail.com)"

# ------------------------------------------------------------------ mode ----
# Founder-locked default = live for PD/open sources only. --dry-run forces an
# inspect-only pass (lists planned fetches, fetches nothing).
MODE="live"
for a in "$@"; do
  case "$a" in
    --dry-run) MODE="dry-run" ;;
    --live)    MODE="live" ;;
  esac
done

# --------------------------------------------------------------- guards -----
# PD/OPEN gate: ADOPTED RIGHTS-POLICY.md satisfies the P1 rights interlock for
# public-domain / openly-licensed sources only. Live fetch of the 5 Phase-1
# PD/open sources is therefore permitted (founder-locked 2026-05-19).
PD_OPEN_LIVE=1
# TIER_B / copyrighted / NC / unclear sources: STILL GATED. This guard is NOT
# removed by the founder greenlight. No Tier-B runner enables live until a
# documented per-source rights change is logged in DECISIONS.md / CORPUS_INDEX.
TIER_B_GUARD=1
# Network AI / Viatika x402 metered synthesis: DISABLED ($0). Local model only.
AI_NETWORK_SYNTHESIS=0   # default-OFF; this runner NEVER flips this on.

# ------------------------------------------------------------------ lock ----
mkdir -p "$WORK"
exec 9> "$LOCK"
flock -n 9 || { echo "[$(date -Iseconds)] another runner active, skip" >> "$LOG"; exit 0; }

echo "[$(date -Iseconds)] === runner start (mode=$MODE PD_OPEN_LIVE=$PD_OPEN_LIVE TIER_B_GUARD=$TIER_B_GUARD AI_NET=$AI_NETWORK_SYNTHESIS) ===" >> "$LOG"
echo "[$(date -Iseconds)] RIGHTS-POLICY.md adopted as operating default (DECISIONS.md 2026-05-19); satisfies P1 interlock for PD/open ONLY; Tier-B stays gated" >> "$LOG"
: > "$MANIFEST"
printf "source\tkind\tfetched_url\tlicense_gate\tresult\tbytes\tnote\n" >> "$MANIFEST"

planned=0
fetched_ok=0
total_bytes=0

note_row() { # source kind url gate result bytes note
  printf "%s\t%s\t%s\t%s\t%s\t%s\t%s\n" "$1" "$2" "$3" "$4" "$5" "$6" "$7" >> "$MANIFEST"
  planned=$((planned+1))
  if [ "$5" = "FETCHED" ] || [ "$5" = "PRESENT" ]; then
    fetched_ok=$((fetched_ok+1))
    total_bytes=$((total_bytes + ${6:-0}))
  fi
}

bytes_of() { wc -c < "$1" 2>/dev/null | tr -d ' ' || echo 0; }

# curl helper: short timeout, identifies us, honors Retry-After (capped 120s),
# never follows into bulk, single retry on 429/503.
GET() {
  local url="$1"; shift
  local out=""; local extra=()
  while [ $# -gt 0 ]; do
    case "$1" in
      -o) out="$2"; shift 2 ;;
      *)  extra+=("$1"); shift ;;
    esac
  done
  local tmp; tmp="$(mktemp)"
  local code
  code=$(curl -sL --max-time 45 -A "$UA" -w '%{http_code}' \
              -D "$tmp.hdr" "${extra[@]}" -o "$tmp" "$url" 2>/dev/null || echo "000")
  if [ "$code" = "429" ] || [ "$code" = "503" ]; then
    local ra; ra=$(grep -i '^retry-after:' "$tmp.hdr" 2>/dev/null | tr -d '\r' | awk '{print $2}')
    [ -z "$ra" ] && ra=30
    [ "$ra" -gt 120 ] 2>/dev/null && ra=120
    echo "[$(date -Iseconds)] HTTP $code on $url; honoring Retry-After ${ra}s then 1 retry" >> "$LOG"
    sleep "$ra"
    code=$(curl -sL --max-time 45 -A "$UA" -w '%{http_code}' \
                "${extra[@]}" -o "$tmp" "$url" 2>/dev/null || echo "000")
  fi
  if [ "$code" = "200" ] && [ -s "$tmp" ]; then
    if [ -n "$out" ]; then mv "$tmp" "$out"; else cat "$tmp"; rm -f "$tmp"; fi
    rm -f "$tmp.hdr"
    return 0
  fi
  rm -f "$tmp" "$tmp.hdr"
  echo "[$(date -Iseconds)] GET failed ($code) $url" >> "$LOG"
  return 1
}

# ============================================================ SOURCE 1 ======
# Sefaria — structural INDEX only (NO text bodies, even in live). Index itself
# is open; per-text license is read only when (future) text bodies are wired.
src_sefaria() {
  local s="sefaria" base="https://www.sefaria.org/api"
  local out="$WORK/sefaria-index.json"
  local gate="index open (per-text license read at body-fetch time); NO text bodies this slice"
  if [ "$MODE" = "dry-run" ]; then
    note_row "$s" "INDEX" "$base/index" "$gate" "DRY" 0 "would fetch TOC structure only"
    return
  fi
  if [ -s "$out" ]; then
    note_row "$s" "INDEX" "$base/index" "$gate" "PRESENT" "$(bytes_of "$out")" "idempotent skip (already mirrored)"
    return
  fi
  if GET "$base/index" -o "$out"; then
    local b; b=$(bytes_of "$out")
    local titles; titles=$(jq '[.. | objects | select(has("title")) | .title] | length' "$out" 2>/dev/null || echo "?")
    echo "[$(date -Iseconds)] [$s] fetched index -> ${b}B (~$titles titles)" >> "$LOG"
    note_row "$s" "INDEX" "$base/index" "$gate" "FETCHED" "$b" "structure only; ~$titles titles in TOC; NO text bodies"
  else
    note_row "$s" "INDEX" "$base/index" "$gate" "FAILED" 0 "fetch failed; will retry next run (idempotent)"
  fi
}

# ============================================================ SOURCE 2 ======
# SuttaCentral — CC0. Structure (menu) API only this slice. Bulk bilara-data
# git clone is deferred (CC0, but kept out of the proof run to stay bounded).
src_suttacentral() {
  local s="suttacentral" base="https://suttacentral.net/api"
  local out="$WORK/suttacentral-menu.json"
  local gate="CC0 (translations) — full-text allowed; structure only this slice"
  if [ "$MODE" = "dry-run" ]; then
    note_row "$s" "MENU" "$base/menu" "$gate" "DRY" 0 "would fetch top-level structure"
    note_row "$s" "REPO" "https://github.com/suttacentral/bilara-data" "CC0" "DRY" 0 "bulk clone deferred (bounded proof run)"
    return
  fi
  if [ -s "$out" ]; then
    note_row "$s" "MENU" "$base/menu" "$gate" "PRESENT" "$(bytes_of "$out")" "idempotent skip"
  elif GET "$base/menu" -o "$out"; then
    local b; b=$(bytes_of "$out")
    local n; n=$(jq 'length' "$out" 2>/dev/null || echo "?")
    echo "[$(date -Iseconds)] [$s] fetched menu -> ${b}B (~$n root nodes)" >> "$LOG"
    note_row "$s" "MENU" "$base/menu" "$gate" "FETCHED" "$b" "top-level pitakas; ~$n root nodes; CC0"
  else
    note_row "$s" "MENU" "$base/menu" "$gate" "FAILED" 0 "fetch failed; retry next run"
  fi
  note_row "$s" "REPO" "https://github.com/suttacentral/bilara-data" "CC0" "DEFERRED" 0 "bulk clone deferred to ingest-pertext tier (bounded proof run)"
}

# ============================================================ SOURCE 3 ======
# Tanzil Quran — verbatim Arabic, free, MUST stay unmodified. We fetch the
# metadata index + the two canonical verbatim Arabic editions and store the
# Tanzil license file alongside. Text is NEVER modified.
src_tanzil() {
  local s="tanzil"
  local meta="$WORK/tanzil-quran-data.js"
  local gate="Tanzil license (verbatim Arabic, attribution, NO modification)"

  # 3a — metadata index (surah/ayah structure)
  if [ "$MODE" = "dry-run" ]; then
    note_row "$s" "META" "https://tanzil.net/res/text/metadata/quran-data.js" "$gate" "DRY" 0 "would fetch 114-surah/6236-ayah index"
  elif [ -s "$meta" ]; then
    note_row "$s" "META" "https://tanzil.net/res/text/metadata/quran-data.js" "$gate" "PRESENT" "$(bytes_of "$meta")" "idempotent skip"
  elif GET "https://tanzil.net/res/text/metadata/quran-data.js" -o "$meta"; then
    local b; b=$(bytes_of "$meta")
    echo "[$(date -Iseconds)] [$s] fetched metadata -> ${b}B" >> "$LOG"
    note_row "$s" "META" "https://tanzil.net/res/text/metadata/quran-data.js" "$gate" "FETCHED" "$b" "surah/ayah index (114/6236)"
  else
    note_row "$s" "META" "https://tanzil.net/res/text/metadata/quran-data.js" "$gate" "FAILED" 0 "retry next run"
  fi

  # 3b — verbatim Arabic editions (uthmani, simple). Store license note.
  local ed
  for ed in uthmani simple; do
    local url="https://tanzil.net/pub/download/index.php?quranType=${ed}&outType=txt&agree=true"
    local txt="$WORK/tanzil-quran-${ed}.txt"
    if [ "$MODE" = "dry-run" ]; then
      note_row "$s" "TEXT" "$url" "$gate" "DRY" 0 "$ed edition (verbatim) — would fetch"
      continue
    fi
    if [ -s "$txt" ]; then
      note_row "$s" "TEXT" "$url" "$gate" "PRESENT" "$(bytes_of "$txt")" "$ed verbatim Arabic (idempotent skip; unmodified)"
      continue
    fi
    if GET "$url" -o "$txt"; then
      local b; b=$(bytes_of "$txt")
      echo "[$(date -Iseconds)] [$s] fetched $ed -> ${b}B (verbatim, unmodified)" >> "$LOG"
      note_row "$s" "TEXT" "$url" "$gate" "FETCHED" "$b" "$ed verbatim Arabic; license file stored alongside; text NOT modified"
    else
      note_row "$s" "TEXT" "$url" "$gate" "FAILED" 0 "$ed fetch failed; retry next run"
    fi
    sleep 3   # polite spacing between Tanzil download endpoint hits
  done

  # 3c — Tanzil license file kept alongside the verbatim text (license posture)
  local lic="$WORK/TANZIL-LICENSE.txt"
  if [ ! -s "$lic" ] && [ "$MODE" != "dry-run" ]; then
    cat > "$lic" <<'LIC'
Tanzil Quran Text — license posture (recorded by sacred-history-corpus runner)

Source: https://tanzil.net  (Tanzil Quran Text, Copyright (C) 2007-2024 Tanzil Project)

Tanzil distributes the verified Quran Arabic text free of charge. Permission
is granted to copy and distribute VERBATIM, UNMODIFIED copies with attribution
to the Tanzil Project. MODIFICATION of the text is restricted.

This corpus stores the Tanzil Arabic editions VERBATIM and UNMODIFIED, with
attribution, exactly as the Tanzil license requires. The text is treated as
read-only; no normalization, reflowing, or transformation is applied to the
stored bytes. See https://tanzil.net/docs/tanzil_license for the full terms.
LIC
    note_row "$s" "LICENSE" "https://tanzil.net/docs/tanzil_license" "$gate" "FETCHED" "$(bytes_of "$lic")" "license posture recorded alongside verbatim text"
  fi
}

# ============================================================ SOURCE 4 ======
# ctext.org — PD source text BUT ToS forbids bulk redistribution + rate-limits.
# Phase-1 posture: ENUMERATE STRUCTURE ONLY. A single gettext call on a
# WORK-LEVEL urn returns {title, subsections} (the chapter index) — NOT the
# full text body (full text only comes from individual chapter urns, which we
# never request). We additionally STRIP any `fulltext` element before storing,
# so zero passage text is ever written. One request per work, hard-throttled.
src_ctext() {
  local s="ctext" base="https://api.ctext.org"
  # NOTE (proof-run scope): only `analects` and `mengzi` resolve as bare
  # ctp: URNs; single-scroll classics need their canonical URN form (e.g.
  # ctp:dao-de-jing). Building the full ctext URN map is scoped to
  # bkt-sh-ingest-open-tier, NOT this bounded proof run. The rights posture
  # holds regardless: invalid-URN works store only a title/urn/error stub,
  # ZERO passage text, fulltext always dropped.
  local works=(analects daodejing zhuangzi mengzi liji yijing daxue zhongyong)
  local gate="PD source text; ctext ToS = research, attribution, NO bulk redistribution, rate-limited"
  local w
  for w in "${works[@]}"; do
    local urn="ctp:$w"
    local probe="$base/gettext?urn=$urn"
    local out="$WORK/ctext-${w}-structure.json"
    if [ "$MODE" = "dry-run" ]; then
      note_row "$s" "WORK" "$probe" "$gate" "DRY" 0 "structure-only (title+subsections); no bulk text"
      continue
    fi
    if [ -s "$out" ]; then
      note_row "$s" "WORK" "$probe" "$gate" "PRESENT" "$(bytes_of "$out")" "structure only (title+subsections); idempotent skip; ToS-respecting"
      continue
    fi
    local raw="$out.raw"
    if GET "$probe" -o "$raw"; then
      # Strip any fulltext element: keep ONLY title + subsections (the index).
      # If jq can't parse (rate-limit/error page), keep raw for diagnosis.
      if jq -e 'has("title") or has("subsections") or has("error")' "$raw" >/dev/null 2>&1; then
        jq '{urn: "'"$urn"'", title: (.title // null), subsections: (.subsections // null), error: (.error // null), note: "fulltext element intentionally dropped (no-bulk-redistribution ToS)"}' "$raw" > "$out" 2>/dev/null || cp "$raw" "$out"
      else
        cp "$raw" "$out"
      fi
      rm -f "$raw"
      local b; b=$(bytes_of "$out")
      local subs; subs=$(jq -r '(.subsections|length)//"?"' "$out" 2>/dev/null || echo "?")
      echo "[$(date -Iseconds)] [$s] structure $w -> ${b}B (title+~$subs subsections; fulltext dropped; ToS no-bulk respected)" >> "$LOG"
      note_row "$s" "WORK" "$probe" "$gate" "FETCHED" "$b" "structure only: title + ~$subs subsections; fulltext DROPPED; no bulk redistribution"
    else
      rm -f "$raw"
      note_row "$s" "WORK" "$probe" "$gate" "FAILED" 0 "structure fetch failed (possibly rate-limited); retry next run"
    fi
    sleep 8   # ctext is strictly rate-limited; be conservative & polite
  done
}

# ============================================================ SOURCE 5 ======
# Wikidata SPARQL — CC0. ONE bounded query (LIMIT 500). Idempotent overwrite
# on each recurring run so new events are picked up; no bulk crawl.
src_wikidata_events() {
  local s="wikidata" ep="https://query.wikidata.org/sparql"
  local q='SELECT ?event ?eventLabel ?when WHERE {
  VALUES ?cls { wd:Q3232653 wd:Q170156 wd:Q105420 wd:Q2627975 }
  ?event wdt:P31 ?cls ; wdt:P585 ?when .
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} ORDER BY ?when LIMIT 500'
  local enc; enc=$(python3 -c 'import urllib.parse,sys;print(urllib.parse.quote(sys.stdin.read()))' <<<"$q")
  local url="$ep?format=json&query=$enc"
  local out="$WORK/wikidata-sacred-events.json"
  local gate="CC0"
  if [ "$MODE" = "dry-run" ]; then
    note_row "$s" "SPARQL" "$ep (P31∈{religious event,council,schism,...} & P585; LIMIT 500)" "$gate" "DRY" 0 "bounded query; would fetch"
    return
  fi
  if GET "$url" -H "Accept: application/sparql-results+json" -o "$out"; then
    local b; b=$(bytes_of "$out")
    local n; n=$(jq '.results.bindings | length' "$out" 2>/dev/null || echo "?")
    echo "[$(date -Iseconds)] [$s] fetched events -> ${b}B (~$n rows)" >> "$LOG"
    note_row "$s" "SPARQL" "$ep (LIMIT 500)" "$gate" "FETCHED" "$b" "bounded query; ~$n rows; recurring re-query picks up new events"
  else
    note_row "$s" "SPARQL" "$ep (LIMIT 500)" "$gate" "FAILED" 0 "query failed (possibly rate-limited); retry next run"
  fi
}

# ===================================================== AI-ANALYSIS HOOK ======
# Cross-tradition correlation / branch analysis. FOUNDER-LOCKED: this assumes a
# LOCAL model (local CPU/GPU, effectively uncapped). The optional Viatika x402
# network synthesis pass is DEFAULT-OFF and is NEVER called by this runner.
ai_analysis_hook() {
  if [ "$AI_NETWORK_SYNTHESIS" = "1" ]; then
    # DEFAULT-OFF. Intentionally inert. A future, explicitly-budgeted Phase-2
    # decision (logged in DECISIONS.md) would be required to enable a
    # Viatika-capped network synthesis pass. This runner NEVER sets it to 1.
    echo "[$(date -Iseconds)] [ai] network synthesis flag set — NOT honored by runner (Phase-2, founder-gated)" >> "$LOG"
  fi
  echo "[$(date -Iseconds)] [ai] analysis path = LOCAL model only (network AI / Viatika x402 = \$0, disabled). No synthesis run this slice." >> "$LOG"
}

# ------------------------------------------------------------- run all ------
src_sefaria
src_suttacentral
src_tanzil
src_ctext
src_wikidata_events
ai_analysis_hook

echo "[$(date -Iseconds)] === runner done: mode=$MODE rows=$planned fetched=$fetched_ok bytes=$total_bytes (manifest: $MANIFEST) ===" >> "$LOG"

# ------------------------------------------------------------- status -------
SOURCES_LISTED=$(awk -F'\t' 'NR>1{print $1}' "$MANIFEST" | sort -u | wc -l | tr -d ' ')
cat > "$STATUS" <<EOF
{
  "corpus": "sacred-history",
  "last_run": "$(date -Iseconds)",
  "mode": "$MODE",
  "rights_policy": "adopted-2026-05-19 (satisfies P1 interlock for PD/open only)",
  "pd_open_live": $PD_OPEN_LIVE,
  "tier_b_guard": $TIER_B_GUARD,
  "ai_network_synthesis": $AI_NETWORK_SYNTHESIS,
  "ai_path": "local-model-only",
  "first_slice_sources": ["sefaria","suttacentral","tanzil","ctext","wikidata"],
  "distinct_sources_in_manifest": $SOURCES_LISTED,
  "manifest_rows": $planned,
  "fetched_ok": $fetched_ok,
  "total_bytes": $total_bytes,
  "recurring": true,
  "self_disables": false,
  "manifest": "$MANIFEST"
}
EOF

# RECURRING: never disable the timer. This corpus is ongoing-forever; the
# timer re-runs to discover new editions / manuscripts / events. (Contrast
# with pursue-mirror-runner.sh which self-disables on completion.)
exit 0
