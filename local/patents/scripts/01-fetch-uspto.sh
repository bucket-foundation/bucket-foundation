#!/usr/bin/env bash
# bkt-ibj — fetch USPTO PatentsView parquet snapshots
# Resumable; safe to re-run.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATA="$ROOT/data/raw/patentsview"
mkdir -p "$DATA"
cd "$DATA"

# PatentsView snapshot tables we need for v1 local index.
# Source: https://patentsview.org/download/data-download-tables (parquet mirror)
TABLES=(
  g_patent
  g_inventor_disambiguated
  g_assignee_disambiguated
  g_location_disambiguated
  g_cpc_current
  g_us_patent_citation
  g_application
  g_claim
)

BASE="https://s3.amazonaws.com/data.patentsview.org/download"

for t in "${TABLES[@]}"; do
  out="${t}.parquet"
  if [[ -f "$out" ]]; then
    echo "==> $out exists, skipping"
    continue
  fi
  echo "==> fetching $t ..."
  # PatentsView ships .tsv.zip primarily; try parquet first, fall back to tsv.zip
  if curl -fsI "$BASE/${t}.parquet" >/dev/null 2>&1; then
    curl -fL --retry 3 --retry-delay 5 -C - "$BASE/${t}.parquet" -o "$out"
  else
    curl -fL --retry 3 --retry-delay 5 -C - "$BASE/${t}.tsv.zip" -o "${t}.tsv.zip"
    unzip -o "${t}.tsv.zip" && rm "${t}.tsv.zip"
  fi
done

echo
echo "==> fetched into $DATA"
du -sh "$DATA"
