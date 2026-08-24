# Migrated to Longtail

This shorts pipeline now lives in Longtail (Longtail = production
infrastructure, Bucket Foundation = canon source).

**New home:** `~/agfarms/longtail/longtail-pipeline/shorts/`

See `~/agfarms/longtail/longtail-pipeline/shorts/README.md` for full
documentation.

Bucket Foundation still owns and provides:
- `bucket-canon/<branch>/sub-claims/...`, canon claim cards (source content)
- `public/brand/`, bucket logos, papyrus texture
- `mcp-server/bucket-canon-mcp.py`, MCP query interface for canon

The shorts pipeline reads these from Bucket via env vars
(`BUCKET_FOUNDATION_DIR`, `BUCKET_BRAND_DIR`).

This directory (`bucket-foundation/tools/shorts/`) is kept only as the
migration record; do not modify. Code changes happen in Longtail.

Migrated: 2026-05-13.
