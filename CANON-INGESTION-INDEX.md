# Bucket Foundation — Canon Ingestion Index

*Updated 2026-05-10T15:13:44*

**Total source documents**: 20,272  ·  **FTS searchable**: 20,353

## Sources (12+ types)

| Source | Count |
|---|---:|
| YouTube transcripts | 409 |
| Archive.org books   | 156 |
| PubMed papers       | 5,611 |
| arXiv papers        | 138 |
| Project Gutenberg   | 108 |
| Wikisource          | 43 |
| OpenAlex authors    | 283 |
| OpenAlex fanout     | 1,209 |
| OpenAlex citers     | 10,190 |
| Blog scrapes        | 1,455 |
| Kruse blog corpus   | 460 |
| AARO archive        | 97 |
| PURSUE Release 01   | 113/146 |
| **Total source docs** | **20,272** |
| **FTS searchable**    | **20,353** |

## Canon branches (11)

01-mathematics, 02-physics, 03-chemistry, 04-information, 05-biophysics,
06-cosmology, 07-mind, 08-deep-history, 09-art, 09-sacred-texts, **10-music** (NEW)

See [CANON-MASTER.md](CANON-MASTER.md) for the read-this-first overview.
See [bucket-canon/_bridges/INDEX.md](../bucket-canon/_bridges/INDEX.md) for
the meta-structure (5 primary axes + 6 secondary bridges).

## Web routes (force-static SSG)

- `/canon` — seven-branch grid + globe
- `/canon/[slug]` — branch page
- `/canon/bridges` — meta-structure index
- `/canon/bridges/[slug]` — single bridge
- `/canon/claims` — curated candidate claims
- `/canon/claims/[concept]/[slug]` — claim card
- `/canon/graph` — collaboration network

## Tooling (org-wide via ~/bin → ~/agfarms/tools/)

20+ canon-ingestion tools. See README in each tools/<x>/ folder.

## Autonomous (systemd --user, linger=yes)

| Timer | Cadence | Job |
|---|---|---|
| `pursue-mirror.timer`  | hourly | war.gov PURSUE mirror (113/146) |
| `archive-mirror.timer` | daily  | archive.org canon-target puller |
| `aaro-mirror.timer`    | every 6h | AARO.mil archive (97/143) |
| `fts-rebuild.timer`    | every 6h | FTS index rebuild |

## Session growth (single 2-hour loop session)

Started: 1,159 FTS docs.
Now: **20,353 FTS docs (17.6x growth)**.
Total source docs: 20,272.
