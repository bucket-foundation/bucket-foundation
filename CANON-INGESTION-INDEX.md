# Bucket Foundation — Canon Ingestion Index

*Generated 2026-05-09*

**Total source documents**: 903  ·  **FTS searchable**: 1,147

## Sources

| Source | Count | Path |
|---|---|---|
| YouTube transcripts | 126 | `yt/<id>-<slug>/` |
| Archive.org books   | 42 | `archive/<id>/` |
| PubMed papers       | 195 | `pubmed/PMID-<id>-<slug>/` |
| arXiv papers        | 30 | `arxiv/<id>-<slug>/` |
| Blog scrapes        | 50 | `blog/<host>/` |
| Kruse blog corpus   | 460 | `_intake/kruse-blog-corpus/articles/` |

## Maps

- [`_intake/canon-profiles/INDEX.md`](_intake/canon-profiles/INDEX.md) — 26 person profiles (Becker, Pollack, Mitchell, Marino, Newton, ...)
- [`_intake/concept-digests/INDEX.md`](_intake/concept-digests/INDEX.md) — 25 concept digests (deuterium-water, exclusion-zone, melanin-semiconductor, ...)
- [`_intake/RESEARCH-MAPPING-QUEUE.md`](_intake/RESEARCH-MAPPING-QUEUE.md) — standing queue of canon targets

## Search

```bash
agf-fts search bucket-foundation "<query>"          # FTS5 BM25, sub-second
agf-fts-digest bucket-foundation --topics-builtin --out _intake/concept-digests
agf-fts-profile bucket-foundation --out _intake/canon-profiles
canon-status                                         # one-line snapshot
```

## Tools (org-wide via ~/bin)

- `agf-yt`, `agf-yt-mine`, `agf-yt-clean`  — YouTube
- `agf-archive`                            — archive.org
- `agf-pubmed`                             — NCBI E-utilities
- `agf-arxiv`                              — arXiv Atom API
- `agf-blog`                               — generic static-site scrape
- `agf-fts`, `agf-fts-digest`, `agf-fts-profile` — search + briefs
- `canon-status`, `pursue-status`           — snapshots

## Autonomous (systemd --user, linger=yes)

- `pursue-mirror.timer`  — hourly war.gov PURSUE mirror (currently 129/146 = 88%)
- `archive-mirror.timer` — daily archive.org canon-target puller
- `fts-rebuild.timer`    — every 6h FTS index rebuild
