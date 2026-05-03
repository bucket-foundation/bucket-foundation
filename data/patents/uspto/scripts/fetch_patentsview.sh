#!/usr/bin/env bash
# fetch_patentsview.sh — download latest PatentsView parquet snapshots
#
# Bead: bkt-5qg / bkt-tfu (Bucket Foundation Global Patent Index)
# Source: https://patentsview.org/download/data-download-tables
# Cadence: quarterly. Total size ~80GB (compressed parquet).
#
# Resume-safe: uses `wget -c -nc`. Re-running only fetches missing/partial files.
# Output: /home/gian/agfarms/bucket-foundation/data/patents/uspto/parquet/patentsview/
#
# Usage:
#   ./fetch_patentsview.sh           # fetch all canonical tables
#   DRY_RUN=1 ./fetch_patentsview.sh # print URLs only

set -euo pipefail

ROOT="${ROOT:-/home/gian/agfarms/bucket-foundation/data/patents/uspto}"
OUT="$ROOT/parquet/patentsview"
BASE_URL="${PATENTSVIEW_BASE_URL:-https://s3.amazonaws.com/data.patentsview.org/download}"

# Canonical tables we ingest. Extend as schema grows.
TABLES=(
  "g_patent"                      # one row per granted patent
  "g_inventor"                    # raw inventor mentions per patent
  "g_inventor_disambiguated"      # disambiguated inventor identities
  "g_location_disambiguated"      # disambiguated locations w/ lat/lon
  "g_assignee"                    # raw assignee mentions per patent
  "g_assignee_disambiguated"      # disambiguated assignee identities
  "g_cpc_current"                 # current CPC classifications
  "g_us_patent_citation"          # US patent->patent citations
)

mkdir -p "$OUT"
cd "$OUT"

echo "[fetch_patentsview] target=$OUT base=$BASE_URL tables=${#TABLES[@]}"

for tbl in "${TABLES[@]}"; do
    url="$BASE_URL/${tbl}.tsv.zip"   # PatentsView ships TSV.zip; parquet conversion happens in load step
    if [[ "${DRY_RUN:-0}" == "1" ]]; then
        echo "DRY: wget -c -nc $url"
        continue
    fi
    echo "[fetch_patentsview] -> $tbl"
    wget -c -nc --tries=5 --timeout=60 "$url" || {
        echo "[fetch_patentsview] WARN: $tbl failed; will retry on next run"
    }
done

echo "[fetch_patentsview] done. unzip + convert handled by load_patentsview.py"
