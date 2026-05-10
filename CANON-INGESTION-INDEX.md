# Bucket Foundation — Canon Ingestion Index

*Updated 2026-05-10T11:31:05*

**Total source documents**: 15,141  ·  **FTS searchable**: 15,322

## Sources (12 types)

| Source | Count | Path |
|---|---:|---|
| YouTube transcripts | 172 | `yt/<id>-<slug>/` |
| Archive.org books   | 58 | `archive/<id>/` |
| PubMed papers       | 2,489 | `pubmed/PMID-<id>-<slug>/` |
| arXiv papers        | 114 | `arxiv/<id>-<slug>/` |
| Project Gutenberg   | 95 | `gutenberg/PG-<id>-<slug>/` |
| Wikisource          | 43 | `wikisource/<slug>/` |
| OpenAlex authors    | 126 | `openalex/<id>/` |
| OpenAlex fanout     | 645 | `openalex-fanout/<W-id>/` |
| OpenAlex citers     | 9,274 | `openalex-citers/<W-id>.md` |
| Blog scrapes        | 1,455 | `blog/<host>/` |
| Kruse blog corpus   | 460 | `_intake/kruse-blog-corpus/articles/` |
| AARO archive        | 97 | `_intake/aaro-mil-archive/pdfs/` |
| PURSUE Release 01   | 113/146 | `_intake/war-gov-pursue-release-01/pdfs/` |
| **Total source docs** | **15,141** | |
| **FTS searchable**    | **15,322** | |

## Maps & briefs

- [`bucket-canon/_bridges/INDEX.md`](../bucket-canon/_bridges/INDEX.md) — 10 primary-bridge entries
- [`_intake/canon-profiles/INDEX.md`](_intake/canon-profiles/INDEX.md) — canon-person profile pages
- [`_intake/concept-digests/INDEX.md`](_intake/concept-digests/INDEX.md) — concept research briefs
- [`_intake/connections/`](_intake/connections/) — synthesis layer (BRIDGES + META-CANON + COAUTHOR-MATRIX + graph)
- [`_intake/RESEARCH-MAPPING-QUEUE.md`](_intake/RESEARCH-MAPPING-QUEUE.md) — standing canon-target list
- [`_intake/BRANCH-COVERAGE-AUDIT.md`](_intake/BRANCH-COVERAGE-AUDIT.md) — branch-by-branch state

## Web routes

- `/canon` — seven-branch grid + globe
- `/canon/[slug]` — branch page
- `/canon/bridges` — meta-structure
- `/canon/bridges/[slug]` — single bridge
- `/canon/claims` — curated candidate claims
- `/canon/claims/[concept]/[slug]` — single claim card
- `/canon/graph` — collaboration network

## Tooling (org-wide via ~/bin → ~/agfarms/tools/)

| Tool | What |
|---|---|
| `agf-yt`           | YouTube transcript + metadata + chapters |
| `agf-yt-mine`      | Reference miner |
| `agf-yt-clean`     | Auto-caption normalizer |
| `agf-archive`      | archive.org search/get/batch |
| `agf-pubmed`       | NCBI E-utilities (+ PMC fulltext) |
| `agf-arxiv`        | arXiv Atom API |
| `agf-gutenberg`    | Project Gutenberg via Gutendex |
| `agf-wikisource`   | MediaWiki API |
| `agf-blog`         | Generic static-site article scraper |
| `agf-openalex`     | Author publication graphs (200M+ works) |
| `agf-openalex-fanout`  | 2nd-degree citation graph |
| `agf-openalex-explode` | Citers → individual records |
| `agf-philpapers`   | PhilPapers (anon-blocked at scale) |
| `agf-ads`          | NASA ADS (token required) |
| `agf-fts`          | SQLite FTS5 search |
| `agf-fts-digest`   | Per-concept cross-source briefs |
| `agf-fts-profile`  | Per-canon-person FTS profiles |
| `agf-canon-connections` | Bridge/branch synthesis |
| `agf-coauthor-matrix`   | Canon-author collab graph |
| `agf-claim-extract` + `-curate` | Canon-claim mining pipeline |
| `canon-status`, `pursue-status` | Snapshots |

## Autonomous (systemd --user, linger=yes)

| Timer | Cadence | Job |
|---|---|---|
| `pursue-mirror.timer`  | hourly | war.gov PURSUE mirror (113/146) |
| `archive-mirror.timer` | daily  | archive.org canon-target puller |
| `aaro-mirror.timer`    | every 6h | AARO.mil archive (97/143) |
| `fts-rebuild.timer`    | every 6h | FTS index rebuild |

All linger across reboots. Each self-disables when complete.
