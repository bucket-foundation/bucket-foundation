# PURSUE Release 01 — Master Index

*162 declassified UAP records dropped 2026-05-08 by U.S. Department of War*

**Source**: https://www.war.gov/UFO/  ·  **Captured**: 2026-05-08  ·  **Records**: 162


## Views

- **[TIMELINE.md](TIMELINE.md)** — by incident year (oldest → newest)
- **[BY-THEATER.md](BY-THEATER.md)** — by geographic theater
- **[records/](records/)** — 162 individual record files (one .md each)
- **[records.json](records.json)** — raw indexed records
- **[records-enriched.json](records-enriched.json)** — + theater, decade, entity tags
- **[summary.json](summary.json)** — aggregate stats
- **[manifest.csv](manifest.csv)** — original war.gov CSV

## Headline Stats

- **Agencies**: Department of War (82), FBI (56), NASA (12), Department of State (8),  (4)
- **Types**: PDF (120), VID (28), IMG (14)
- **Theaters**: unknown (56), middle east (44), americas (33), space (11), mediterranean (9), asia-pacific (5), europe (4)
- **Decades**: 2020s (71), 1960s (10), 1950s (5), 2040s (4), 2000s (3), 1990s (2), 1970s (2), 2010s (1), 1980s (1)

## Phenomenology terms (in descriptions)

- UAP: 126
- metallic: 5
- black: 3
- UFO: 2
- vehicle: 2
- orb: 2
- disc: 1
- flying disc: 1
- craft: 1
- glowing: 1

## Defense systems mentioned

- sensor: 32
- infrared: 27
- helicopter: 2
- satellite: 1
- radar: 1

## Status of binary mirror

- ✅ Manifest captured (162 records, full metadata)
- ✅ Per-record markdown index built
- ✅ Timeline + theater views built
- ⏳ **Binary mirror blocked** — Akamai blocks both rate-limited residential and datacenter ASNs (incl. GH Actions). Workflow `.github/workflows/mirror-war-gov.yml` runs daily via cron + IA Save Page Now to populate Wayback, then re-mirrors via Wayback proxy. Expected to converge over 1–7 days.