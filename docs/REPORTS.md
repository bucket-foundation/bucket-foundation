# Reports

One record, one layout and one tool for every Bucket report: papers, briefs, memos and dataset reports. Bead `bkt-eb6c`.

## Layout

```
reports/<slug>/
  report.json        the metadata record, canonical byte form
  REPORT.md          markdown source, or
  main.tex           LaTeX source with the Makefile from papers/template
  figures/           figure sources: py, svg, pdf, png
  data/              data the report reads, with its licence in report.json
output/reports/<slug>/
  paper.pdf          the built PDF
  figures/*.webp     every figure, converted
  data/*             copies of the data files
public/papers/<slug>/
  paper.pdf, *.webp, data/*   the public copy, present when status is public
```

A slug is kebab-case and is the folder name, the primary key in `graph.reports` and the path under `/research/papers/`. A report whose source lives elsewhere keeps it there and points `source_path` at it; `report.json` still sits in `reports/<slug>/`.

## report.json

Written in the Data Standard canonical form: UTF-8, keys `[a-z0-9_]+` sorted bytewise, no whitespace, no floats, one line feed at the end. `scripts/report.mjs` rewrites it on every build and publish, so edit it by hand only for authored fields and run `check` after.

| Field | Meaning |
|---|---|
| `schema` | `bucket.report/1` |
| `slug`, `title`, `authors`, `date` | `authors` is a list; `date` is `YYYY-MM-DD` |
| `status` | `draft`, `private` or `public` |
| `kind` | `paper`, `brief`, `memo` or `dataset-report` |
| `abstract` | One string. `abstract_paragraphs` holds the split copy the site renders |
| `bead` | `bkt-` id or null |
| `source_path` | Repo-relative. `.md` builds with pandoc, `.tex` with `make pdf`, anything else needs `build_command` |
| `build_command` | Shell line run in the source folder, such as `python3 build.py`. Then `pdf_path` names where the PDF lands |
| `pdf_path`, `pdf_hash` | The built PDF and its sha256 |
| `figures` | `[{path, caption, licence, alt}]` |
| `data_sources` | `[{path or url, licence, retrieved, label}]` |
| `source_hash` | sha256 of the source file bytes |
| `built_at`, `published_at`, `updated_at` | RFC 3339 UTC with `Z` |
| `public_path` | Override for a legacy public folder, such as `public/papers/01-funding-landscape` |
| `affiliation`, `version`, `venue`, `doi`, `github_url`, `licence`, `corpus_line`, `highlights`, `bibtex` | Site fields, copied into the `src/lib/papers.ts` entry |

## Database

`graph.reports` in `supabase/migrations/20261007120000_reports.sql`, one row per slug with the same columns minus the site fields. Service role only, like `graph.marketing_reports`; the site never reads it. Apply locally with `npx supabase@2.117.0 migration up --local`.

## Commands

```
node scripts/report.mjs build <slug>      PDF, webp figures, data copies, hashes, built_at
node scripts/report.mjs register <slug>   upsert the row through the local stack, service role from .env.local
node scripts/report.mjs publish <slug>    copy to public/papers/<slug>, set status public, upsert src/lib/papers.ts
node scripts/report.mjs list              slug, status, kind, date, source
node scripts/report.mjs check             every record valid, hashes match, public copies and papers entry present
```

`scripts/test-report-record.mjs` runs in `npm test` and covers the validator, the hash rule and the papers entry generator. Figure conversion uses `sharp`; a PDF figure goes through `pdftoppm` first.

## Migrated Reports

| Slug | Source | Why the source stays where it is |
|---|---|---|
| `funding-landscape`, `paper-ranking`, `funder-specialization`, `funding-careers` | `public/papers/*/paper.pdf` | LaTeX lives in the research-atlas repo; the PDF is the only source held here. `public_path` keeps `01-funding-landscape`. |
| `solvability-frontier` | `papers/solvability-frontier/main.tex` | The paper standard keeps LaTeX under `papers/`. Private until the public copy from the pending papers PR lands, then `publish`. |
| `learning-system-brief` | `learning/research-os/learning-system/brief/BRIEF.md` | Built by its own `build.py` into `output/pdf/`; `build_command` runs it. |
| `solver-gap-engine` | `reports/2026-09-30-solver-gap-engine.md` | What's New links the file by path, so it stays. |

## Adding a Report

1. `mkdir reports/<slug>`, write `REPORT.md` or copy `papers/template/` in as `main.tex`.
2. Write `report.json` with the authored fields, `status: "draft"`, and `source_hash` from `sha256sum`.
3. `build`, `register`, then `check`. When the founder clears it, `publish` and `register` again.
