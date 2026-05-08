# Albert Szent-Györgyi — canon-target intake

- **Slug**: `szent-gyorgyi-albert`
- **Canon branch**: 05-biophysics
- **Status**: queued (not yet ingested)
- **Initiated**: 2026-05-08
- **Source signal**: mentioned in Kruse × WiM podcasts (transcripts in `bucket-foundation/yt/`)

## Key works to ingest

Bioenergetics (1957); Introduction to a Submolecular Biology (1960); Nobel papers 1937

## Source candidates (in priority order)

- archive.org: full scans of both books (likely PD-eligible 70+ years)
- NobelPrize.org: 1937 lecture + papers
- PubMed: Szent-Györgyi A

## License / copyright

older works likely PD; pre-1928 US PD; 1957/60 needs review

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
