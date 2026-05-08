# Dmitri Mendeleev — canon-target intake

- **Slug**: `mendeleev-dmitri`
- **Canon branch**: 03-chemistry
- **Status**: queued (not yet ingested)
- **Initiated**: 2026-05-08
- **Source signal**: mentioned in Kruse × WiM podcasts (transcripts in `bucket-foundation/yt/`)

## Key works to ingest

1869 Russian original + 1871 English revision; full periodic table papers

## Source candidates (in priority order)

- archive.org: 1869/1871 paper scans (public domain)
- projectgutenberg.org / Wikisource: translations
- IUPAC historical archive

## License / copyright

fully public domain

## Workflow

1. Identify lowest-friction source (PD > OA > author-site > publisher).
2. Pull primary materials. Use `agf-archive` (TODO) for archive.org books;
   curl + Wayback for journal papers; `agf-yt` for lecture videos.
3. Place raw files in this folder; canon-tier excerpts go to
   `gdrive:AGFarms/Nucleus/research/bucket-canon/03-chemistry/`.
4. Add row to `bucket-canon/CANON_INDEX.md` once promoted.

## Beads

File a `bkt-` bead in the bucket-foundation Nucleus instance per ingestion
sub-task (one per source, one per primary work). Cross-link this folder
in the bead description.
