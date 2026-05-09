# Bucket Foundation — Canon Ingestion Index

*Generated 2026-05-09*

**Total source documents**: 1,047  ·  **FTS searchable**: 1,147

## Sources

| Source | Count | Path | Notes |
|---|---|---|---|
| YouTube transcripts | 126 | `yt/<id>-<slug>/` | Kruse podcasts + Pollack lectures + Marino + Becker + Wheeler + Penrose interviews. 12hr→126×~2hr avg = ~250hr of audio transcribed. |
| Archive.org books   | 43 | `archive/<id>/` | PDFs + EPUBs + plaintext. Russell *Universal One* 1926, Newton *Principia* 1687, Maxwell *Treatise* 1873, Faraday *Researches*, Einstein *Relativity*, Mendeleev *Principles of Chemistry* 1901, Schrödinger *What is Life*, Helmholtz *Sensations of Tone*, Pasteur fermentation, Darwin *Origin of Species*, Pauling, Euclid Heath, Gauss *Disquisitiones*, Szent-Györgyi *Bioenergetics* 1957. |
| PubMed papers       | 195 | `pubmed/PMID-<id>-<slug>/` | Becker 1961+, Pollack EZ water, Marino LSU, Mitchell chemiosmotic, Popp biophoton, Nordenström BCEC, melanin function, methylene blue, Hameroff-Penrose. |
| arXiv papers        | 30 | `arxiv/<id>-<slug>/` | Penrose-Hameroff Orch-OR, quantum biology, Wheeler delayed-choice, Tegmark, Bekenstein. |
| Blog scrapes        | 50 | `blog/<host>/` | Ray Peat full archive. |
| Kruse blog corpus   | 460 | `_intake/kruse-blog-corpus/articles/` | Pre-existing 460-article scrape. |
| DNI UAP reports     | 4 | `_intake/dni-uap-reports/` | 2022, 2023, 2024 annual reports. |
| AARO archive        | 31 | `_intake/aaro-mil-archive/pdfs/` | Autonomous, 143 PDFs queued via Wayback (Akamai-blocked direct). |
| PURSUE Release 01   | 108/146 | `_intake/war-gov-pursue-release-01/pdfs/` | Autonomous hourly mirror. 88% complete. |
| **Total**           | **1,047** | | |

## Maps & briefs

- [`_intake/canon-profiles/INDEX.md`](_intake/canon-profiles/INDEX.md) — **26 canon-person profiles** (Becker, Pollack, Mitchell, Marino, Newton, Maxwell, ...). Each profile: 25 cross-source hits with snippets.
- [`_intake/concept-digests/INDEX.md`](_intake/concept-digests/INDEX.md) — **25 concept digests** (deuterium-water, exclusion-zone, melanin-semiconductor, chemiosmotic-mitchell, photoelectric-biology, quantum-biology, biophoton-popp, ...).
- [`_intake/RESEARCH-MAPPING-QUEUE.md`](_intake/RESEARCH-MAPPING-QUEUE.md) — standing list of canonical targets across all 7 branches.
- [`_intake/kruse-references-mined/REFERENCES.md`](_intake/kruse-references-mined/REFERENCES.md) — 101 concepts + 39 titled people + 52 citations + 793 names extracted from 65 transcripts.

## Search

```bash
agf-fts search bucket-foundation "Becker bone bioelectric"
agf-fts search bucket-foundation '"deuterium depleted water"'
agf-fts-digest bucket-foundation --topics-builtin --out _intake/concept-digests
agf-fts-profile bucket-foundation --out _intake/canon-profiles
canon-status     # one-line snapshot
pursue-status    # PURSUE mirror progress
```

## Tooling (all org-wide via ~/bin → ~/agfarms/tools/)

| Tool | What |
|---|---|
| `agf-yt`           | YouTube transcript + metadata + chapters |
| `agf-yt-mine`      | Reference miner across transcripts |
| `agf-yt-clean`     | Auto-caption normalizer (Cruz→Kruse, etc.) |
| `agf-archive`      | archive.org search/get/batch |
| `agf-pubmed`       | NCBI E-utilities (PubMed + PMC) |
| `agf-arxiv`        | arXiv Atom API |
| `agf-blog`         | Generic static-site article scraper |
| `agf-fts`          | SQLite FTS5 BM25 search |
| `agf-fts-digest`   | Per-concept cross-source briefs |
| `agf-fts-profile`  | Per-canon-person FTS profiles |
| `agf-discover`     | Surface candidates from references.json |

## Autonomous (systemd --user, linger=yes)

| Timer | Cadence | Job |
|---|---|---|
| `pursue-mirror.timer`  | hourly | war.gov PURSUE mirror (currently 108/146) |
| `archive-mirror.timer` | daily  | archive.org canon-target puller |
| `aaro-mirror.timer`    | every 6h | AARO.mil archive via Wayback |
| `fts-rebuild.timer`    | every 6h | FTS index rebuild |

All linger across reboots. Each self-disables when complete.
