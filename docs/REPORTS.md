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
| `schema` | `bucket.report/1`, or `bucket.report/2` when the record carries the keys under Version 2 |
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

## Version 2

`bucket.report/2` keeps every version 1 field with its version 1 meaning and the same canonical byte form. `figures` and `data_sources` stay the lists published with the paper, each with a public copy under `public/papers/<slug>/`. The site, `publish`, `build` and `graph.reports` read those two lists alone. The desktop Research screen reads seven more keys. A version 1 record that carries one of them fails `check` with `<key>: needs bucket.report/2`.

| Key | Shape | Meaning |
|---|---|---|
| `assets` | `[{id, path, caption, licence, audience, source, build}]` | An image the window shows. `source` names the script that draws it and `build` the build that remakes it; both are optional |
| `tables` | `[{id, path, format, label, licence, audience, editable, licence_column, source_column}]` | A data table. `format` is `tsv`, `csv`, `json` or `jsonl`. `licence` may be `mixed` when `licence_column` names the column that holds each row's licence |
| `paper` | `{includes, bib, style, lean, audience}` | Every file the entry file reads. `source_path` stays the entry file |
| `record_sets` | `[{id, dir, schema, label, licence, index, audience}]` | A folder of one-record JSON files |
| `tool` | `{path, readme, audience}` | The code folder and its README. A `.packignore` file in any folder under it lists, one name per line, the files and folders of that folder the research pack leaves out; use it for outputs a command rebuilds |
| `builds` | `[{id, label, runner, entry, inputs, outputs, needs, audience}]` | `runner` is `latex` or `python`. `entry` and every input must be a path the manifest lists under `assets`, `tables`, `paper`, `tool` or `record_sets` |
| `attributions` | `[{source, url, licence, rows, notice}]` | One row per upstream source |

Rules the validator applies:

- An `id` is kebab-case and unique within its list.
- `audience` is `public` or `staff`. A reader that meets a missing value treats it as `staff`.
- An entry may say `public` only when its path starts with `public/`, equals `source_path` or `pdf_path`, sits in `paper`, or matches a `figures` or `data_sources` path.
- A `paper` file counts only inside the folder of `source_path` or the `bib/` folder beside it, and `paper.lean` must be a folder inside the folder of `source_path`. A public `paper` fails on any other path.
- A path under `tools/`, under `tool.path` or under a staff record set is staff under every rule above.
- `localPaths` returns each path once. A path listed as both `staff` and `public` comes out `staff`.
- An asset's `source` script counts as `staff` unless the same rule admits it.
- `check` adds one test per listed path: `local file missing: <path>`. A staff table needs no public copy.

`solvability-frontier` is the first version 2 record. Its `figures` build and `tables` build are absent until the manifest has a key that lists `papers/solvability-frontier/figures/tables.py` and `common.py`.

## Database

`graph.reports` in `supabase/migrations/20261007120000_reports.sql`, one row per slug with the same columns minus the site fields. Service role only, like `graph.marketing_reports`; the site never reads it. Apply locally with `npx supabase@2.117.0 migration up --local`.

## Commands

```
node scripts/report.mjs build <slug>      PDF, webp figures, data copies, hashes, built_at
node scripts/report.mjs register <slug>   upsert the row through the local stack, service role from .env.local; a hosted URL needs `--remote`
node scripts/report.mjs publish <slug>    copy to public/papers/<slug>, set status public, upsert src/lib/papers.ts
node scripts/report.mjs list              slug, status, kind, date, source
node scripts/report.mjs check             every record valid, hashes match, public copies and papers entry present
```

`scripts/test-report-record.mjs` runs in `npm test` and covers the validator, the version 2 keys, the hash rule, `checkRecord`, `registerRow` and the papers entry generator. Figure conversion uses `sharp`; a PDF figure goes through `pdftoppm` first.

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
