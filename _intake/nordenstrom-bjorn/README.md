# Björn Nordenström — canon-target intake

- **Slug**: `nordenstrom-bjorn`
- **Canon branch**: 05-biophysics
- **Status**: queued (not yet ingested)
- **Initiated**: 2026-05-08
- **Source signal**: mentioned in Kruse × WiM podcasts (transcripts in `bucket-foundation/yt/`)

## Key works to ingest

Biologically Closed Electric Circuits (1983)

## Source candidates (in priority order)

- archive.org: BCEC book scans
- PubMed: Nordenström B Karolinska
- IABC (international assoc) archive

## License / copyright

book copyrighted; some papers OA

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
