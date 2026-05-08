# James Clerk Maxwell — canon-target intake

- **Slug**: `maxwell-james-clerk`
- **Canon branch**: 02-physics
- **Status**: queued (not yet ingested)
- **Initiated**: 2026-05-08
- **Source signal**: mentioned in Kruse × WiM podcasts (transcripts in `bucket-foundation/yt/`)

## Key works to ingest

A Treatise on Electricity and Magnetism (1873); ~100 papers

## Source candidates (in priority order)

- archive.org: full Treatise scan (PD)
- projectgutenberg.org
- Wikisource: collected papers

## License / copyright

fully public domain

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
