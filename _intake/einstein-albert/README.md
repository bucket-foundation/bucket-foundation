# Albert Einstein — canon-target intake

- **Slug**: `einstein-albert`
- **Canon branch**: 02-physics
- **Status**: queued (not yet ingested)
- **Initiated**: 2026-05-08
- **Source signal**: mentioned in Kruse × WiM podcasts (transcripts in `bucket-foundation/yt/`)

## Key works to ingest

1905 annus mirabilis (4 papers); GR papers 1915-1916; later papers

## Source candidates (in priority order)

- einstein-papers.org: Princeton scholarly edition (CC by Princeton)
- archive.org: full scans of original German + translations

## License / copyright

1905 papers PD

## Workflow

1. Identify lowest-friction source (PD > OA > author-site > publisher).
2. Pull primary materials. Use `agf-archive` (TODO) for archive.org books;
   curl + Wayback for journal papers; `agf-yt` for lecture videos.
3. Place raw files in this folder; canon-tier excerpts go to
   `gdrive:AGFarms/Nucleus/research/bucket-canon/02-physics/`.
4. Add row to `bucket-canon/CANON_INDEX.md` once promoted.

## Beads

File a `bkt-` bead in the bucket-foundation Nucleus instance per ingestion
sub-task (one per source, one per primary work). Cross-link this folder
in the bead description.
