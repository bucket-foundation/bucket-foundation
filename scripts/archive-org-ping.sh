#!/usr/bin/env bash
# archive.org Wayback save — submit every bucket.foundation URL for archiving.
# Each archived URL becomes a long-lived citation source that AI search
# (Claude, Perplexity, Google) can surface.
#
# Rate-limited to 1 req / 2s to avoid throttling.

set -u
BASE="${BUCKET_BASE:-https://www.bucket.foundation}"
UA="bucket.foundation archive-ping/1.0 (+https://www.bucket.foundation)"

urls=(
  "/"
  "/canon"
  "/manifesto"
  "/protocol"
  "/protocol/envelope"
  "/build"
  "/learn"
  "/cite-forever/v0.1"
  "/governance"
  "/about"
  "/join"
  "/knowledge"
  "/research"
  "/kruse"
  "/kruse/search"
  "/contributors"
  "/library"
  "/assets"
  "/whats-new"
  "/llms.txt"
  "/llms-full.txt"
  "/ai.txt"
  "/feed.xml"
  "/.well-known/feed402.json"
  "/.well-known/ai-plugin.json"
  "/.well-known/mcp.json"
  "/canon/mathematics"
  "/canon/physics"
  "/canon/chemistry"
  "/canon/information"
  "/canon/biophysics"
  "/canon/cosmology"
  "/canon/mind"
  "/canon/earth"
  "/canon/physics/figures/einstein"
)

ok=0; fail=0
for p in "${urls[@]}"; do
  full="${BASE}${p}"
  code=$(curl -sS -o /dev/null -w "%{http_code}" \
    -A "$UA" -L --max-time 45 \
    "https://web.archive.org/save/${full}" || echo "000")
  if [[ "$code" =~ ^(200|302|301|429)$ ]]; then
    echo "ok   $code  $full"
    ok=$((ok+1))
  else
    echo "fail $code  $full"
    fail=$((fail+1))
  fi
  sleep 2
done
echo "---"
echo "submitted=$((ok+fail)) ok=$ok fail=$fail"
