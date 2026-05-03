#!/usr/bin/env bash
# fetch_bulk_xml.sh — download USPTO weekly Bulk Data red books
#
# Bead: bkt-5qg / bkt-tfu (Bucket Foundation Global Patent Index)
# Source: https://bulkdata.uspto.gov
#   - Patent Grant Full Text Data (PGFR / "grant red book")     ~2GB/week
#   - Patent Application Full Text (APP / "application red book") ~2GB/week
# Cadence: weekly (Tuesday). Total backfill ~150GB.
#
# Resume-safe: `wget -c -nc`. Idempotent.
# Output: $ROOT/raw/bulk/{grant,application}/<YYYY>/
#
# Usage:
#   ./fetch_bulk_xml.sh                 # default: last 5 years
#   YEAR_FROM=2010 YEAR_TO=2024 ./fetch_bulk_xml.sh
#   DRY_RUN=1 ./fetch_bulk_xml.sh

set -euo pipefail

ROOT="${ROOT:-/home/gian/agfarms/bucket-foundation/data/patents/uspto}"
OUT="$ROOT/raw/bulk"
BASE="${USPTO_BULK_BASE:-https://bulkdata.uspto.gov/data/patent}"

CURRENT_YEAR="$(date +%Y)"
YEAR_TO="${YEAR_TO:-$CURRENT_YEAR}"
YEAR_FROM="${YEAR_FROM:-$((CURRENT_YEAR - 5))}"

mkdir -p "$OUT/grant" "$OUT/application"

echo "[fetch_bulk_xml] years=$YEAR_FROM..$YEAR_TO"

# USPTO directory layout:
#   /grant/redbook/fulltext/<YYYY>/ipgYYMMDD.zip
#   /application/redbook/fulltext/<YYYY>/ipaYYMMDD.zip
fetch_year_listing() {
    local kind="$1"      # grant | application
    local prefix="$2"    # ipg | ipa
    local year="$3"
    local idx_url="$BASE/$kind/redbook/fulltext/$year/"

    mkdir -p "$OUT/$kind/$year"

    # Grab the directory listing HTML, extract zip filenames.
    local listing
    listing="$(curl -fsSL "$idx_url" 2>/dev/null || true)"
    if [[ -z "$listing" ]]; then
        echo "[fetch_bulk_xml] WARN: no listing at $idx_url"
        return 0
    fi

    # Filter to ipg* / ipa* zips
    local files
    files="$(echo "$listing" | grep -oE "${prefix}[0-9]{6}\.zip" | sort -u || true)"

    for f in $files; do
        local url="$idx_url$f"
        if [[ "${DRY_RUN:-0}" == "1" ]]; then
            echo "DRY: wget -c -nc -P $OUT/$kind/$year $url"
            continue
        fi
        echo "[fetch_bulk_xml] $kind/$year/$f"
        wget -c -nc --tries=3 --timeout=60 -P "$OUT/$kind/$year" "$url" || true
    done
}

for year in $(seq "$YEAR_FROM" "$YEAR_TO"); do
    fetch_year_listing grant       ipg "$year"
    fetch_year_listing application ipa "$year"
done

echo "[fetch_bulk_xml] done. xml->parquet conversion is a TODO in load_patentsview.py sibling."
