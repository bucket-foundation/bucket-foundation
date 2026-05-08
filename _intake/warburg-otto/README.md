# Otto Warburg — canon-target intake

- **Slug**: `warburg-otto`
- **Canon branch**: 05-biophysics
- **Status**: queued (not yet ingested)
- **Initiated**: 2026-05-08
- **Source signal**: mentioned in Kruse × WiM podcasts (transcripts in `bucket-foundation/yt/`)

## Key works to ingest

Warburg effect papers (1923+); Nobel 1931

## Source candidates (in priority order)

- NobelPrize.org: 1931 lecture
- PubMed: Warburg O
- archive.org: Über den Stoffwechsel der Tumoren (1924, German original)

## License / copyright

older papers PD

## Workflow

1. Identify lowest-friction source (PD > OA > author-site > publisher).
2. Pull primary materials. Use `agf-archive` (TODO) for archive.org books;
   curl + Wayback for journal papers; `agf-yt` for lecture videos.
3. Place raw files in this folder; canon-tier excerpts go to
   `gdrive:AGFarms/Nucleus/research/bucket-canon/05-biophysics/`.
4. Add row to `bucket-canon/CANON_INDEX.md` once promoted.

## Beads

File a `bkt-` bead in the bucket-foundation Nucleus instance per ingestion
sub-task (one per source, one per primary work). Cross-link this folder
in the bead description.
