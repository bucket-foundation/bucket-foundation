# Problem record schema

One JSON file per atlas problem, `records/<id>.json`, schema id `bucket.solvability-atlas.record/v1`. `record_schema.py` validates a record; `records.py` builds them from `problems.tsv`, `descriptions.tsv`, `formal_sources.tsv`, `records/sources.tsv` and four network sources, each cached under `cache/`. Every network-derived field names the URL it came from.

```ts
type Record = {
  schema: "bucket.solvability-atlas.record/v1";
  id: string;                      // problems.tsv id
  title: string;                   // problems.tsv name
  statement: { text: string; source: string | null; licence: string; attribution: { title: string; url: string } };  // Wikipedia summary extract under CC BY-SA 4.0, else descriptions.tsv
  aliases: string[];               // Wikipedia title and lead bold terms that differ from the title
  branch: "mathematics" | "physics" | "chemistry" | "information" | "biophysics" | "cosmology" | "mind";
  level: 1 | 2 | 3 | 4 | 5;
  industries: string[];            // problems.tsv markets, then any OpenAlex subfield carried by at least 3 kept works; "artificial intelligence" folds into "ai"
  posed: number;
  resolved: number | null;
  history: { year: number; event: string; source: string }[];   // posed and resolved rows from problems.tsv, dated infobox rows from the Wikipedia page
  key_works: {                     // relevant works from the 25 most cited OpenAlex hits for the query phrase, deduplicated by title
    openalex: string; title: string; year: number | null; cited_by_count: number; doi: string | null;
    role: "posed" | "partial" | "resolved" | "survey"; relevance: number; in_embedding: boolean; source: string;
  }[];
  key_works_considered: number;    // hits returned before the relevance filter
  key_works_dropped: Record<string, number>;   // drops per filter: uncited, off-field, no keyword hit, duplicate
  activity: {                      // works per year with the phrase in title or abstract
    openalex_by_year: Record<string, number>; openalex_total: number; arxiv_total: number | null; source: string;
  };
  people: { openalex: string | null; name: string; works: number; source: string }[];         // authors across key works, top 15
  organizations: { openalex: string | null; name: string; works: number; source: string }[];  // institutions across key works, top 15
  related: { id: string; why: string }[];          // other problems sharing keywords or markets, top 5
  repo_mentions: { corpus: "openalex-fanout" | "pubmed" | "research-atlas"; id: string; title: string; source: string }[];
  formal: { status: "none" | "statement" | "partial" | "proved"; source: string | null; url: string | null };
  sources: { url: string; licence: string; retrieved: string }[];
  retrieved: string;               // ISO date of the build
  quality: { status: "full" | "partial" | "weak" | "empty"; reason: string };
  claims?: Claim[];                // ledger entries for this problem, absent when there are none
};
```

Relevance filter for key works: a hit is kept when it has at least one citation, its OpenAlex field sits in the branch's field set (`BRANCH_FIELDS` in `records.py`) or its title names the problem (title, query or alias), and its title or topic holds the query phrase, the title, an alias, a keyword or a keyword word of five letters or more outside the stop list. A title with none of those but a problem word (conjecture, problem, theorem, undecidable, proof, hypothesis, unsolved) scores 1, since OpenAlex matched the phrase in its abstract. Score = 2 per title match + 1 per topic match; ties break on citations. Duplicate titles keep the first hit. The first 8 kept works carry `in_embedding: true` and their titles enter the embedding text in `atlas.py`.

Quality: `full` means at least 8 kept works and at least 5 phrase hits; `partial` means fewer than 8 kept works; `weak` means no kept work or fewer than 5 phrase hits (refine the query in `sources.tsv`); `empty` means no OpenAlex response is cached.

Role rule for key works: a title matching survey, review, progress, overview, status, open problems or perspective is `survey`; a work within one year of the resolved year is `resolved`; a work within five years after the posed year is `posed`; the rest are `partial`. The rule is a heuristic from the year and title only.

Licences: the `statement` text and `aliases` come from Wikipedia and carry CC BY-SA 4.0 with attribution in the record, so the records directory is share-alike text. The code stays MIT. Derived numbers (counts, activity, relevance, embeddings) are CC0 in intent. OpenAlex metadata is CC0-1.0; arXiv API metadata is CC0-1.0. Requests to OpenAlex send `mailto` from the `OPENALEX_MAILTO` environment variable and `Authorization: Bearer` from `OPENALEX_API_KEY` when set; neither reaches a stored URL or cache key. `records/sources.tsv` maps each id to its Wikipedia title and its OpenAlex and arXiv query phrase. The repo corpora searched for mentions are `openalex-fanout/`, `pubmed/` and the research-atlas parquet tables named in `src/data/research-atlas-manifest.json` when they exist on disk.

Build: `python3 records.py [--limit N] [--only id ...] [--force] [--offline]`. A record on disk is skipped unless `--force`. `--offline` reads the cache only. `INDEX.md` is rewritten on every run.

## Claims

A published claim of a solution is a ledger entry, and the ledger sets a fourth status, `claimed`, beside `solved`, `partial` and `open`. Ledgers live in `claims/<batch>.json`, schema id `bucket.solvability-atlas.claims/v1`; `claims.py` validates them and `atlas.mark_solved` applies them.

```ts
type Claim = {
  id: string;                      // atlas row, dropped inside records/<id>.json
  batch: string;                   // ledger name, added on load
  family: string;                  // the claimant's own result number
  family_title: string;
  claimant: string;
  date: string;                    // ISO date of publication
  source_url: string;              // the claimant's catalogue at a pinned commit
  manuscripts: string[];
  statement: string;               // the statement claimed, copied from the catalogue
  match: "problem" | "special_case" | "related" | "unestablished";
  match_note: string;              // why the match holds, in one or two sentences
  formal: { exists: boolean; scope: "full" | "narrower" | "none"; statement: string | null; url: string | null; note: string };
  confirmation: { by: string; kind: "named_expert" | "refereed_venue"; url: string; date: string } | null;
  withdrawn: { date: string; url: string } | null;
};
```

Status rule: a row is `claimed` when an unwithdrawn entry has `match: "problem"` and `confirmation` is null. A claimed row has `solved: false` and no resolved year, so reach, the frontier, the backtest codings and every solved rate read it as open; `tests/test_claims_frontier.py` checks that the status moves no reach, zone or class. Recording a `confirmation` that names an expert or a refereed venue is the single path to `solved`, and the confirmation year becomes the resolved year. A `withdrawn` entry returns the row to open. The other three match values are notes: `special_case` and `related` record a partial result on a row that stays open, and `unestablished` lists a row whose match could not be shown from the catalogue.

`formal.scope` compares the machine-checked statement with the statement claimed for the row: `full` when the scope note states it, `narrower` when the Lean file covers less or covers a neighbouring statement, `none` when the family has no scope note. `formal.statement` holds the scope note text and `formal.note` says what a narrower file leaves out.

Build: `python3 claims_build.py` joins the hand map `claims/<batch>.map.tsv` (row, family, match, formal scope, notes) to the claimant's catalogue, fetched once into `cache/` with a cap of 80 requests, and writes the ledger and `claims/<batch>.families.tsv`, the index of every family with its count of mapped rows. `python3 claims.py --apply` then writes the status into the neighbour file, the entries into `records/<id>.json`, compact entries into the production cards and the full ledger into `src/lib/research-os/solvability-claims-data.json`. It refuses to run when a ledger changes the solved set, since reach moves then and `build.sh` must run. Packed rows carry `claims` as compact entries (batch, family, match, formal scope, confirmed, withdrawn). Catalogue text in the first ledger is Apache-2.0, from `github.com/openai/math`.

## Embedding

Each node is embedded with `BAAI/bge-small-en-v1.5` (revision `5c38ec7c405ec4b44b94cc5a9bb96e735b38267a`). The rule in `atlas.full_text` is: the statement of a sourced row; the record text (name, aliases, statement, keywords and the titles of the kept key works) for a top-level atlas problem; name plus keywords for the rest. The branch word never enters the text. The rule is unchanged by the ablation below.

`embed_ablation.py` embeds every node under six inputs, builds the neighbours and a 2021 forecast with `forecast.py` for each, and scores it with `scoring.py`, a Python port of `scoreForecast` in `src/lib/research-os/solvability-backtest.ts` that `tests/test_scoring.py` checks against the TypeScript numbers to three decimals. Coding is settled (solved only), 10,000 permutations, seed 20261006. Inputs: `name`; `name_keywords`; `name_statement`; `name_statement_keywords_branch` (`<name>. <branch>. <statement> Keywords: <keywords>.`); `statement_only`; `current` (the rule above). `bge-base` is not in the local Hugging Face cache, so only `bge-small` ran. The run writes `out/ablation-2021.json` and the table; `ablation/ablation-2021.json` keeps a committed copy.

| model | input | mean words | threshold | AUC | AUC, undated solved removed | inside / outside | settled inside | settled outside | p |
|---|---|---|---|---|---|---|---|---|---|
| bge-small-en-v1.5 | `name` | 5.1 | 0.716 | 0.797 | 0.717 | 225 / 200 | 15 (0.067) | 3 (0.015) | 0.0113 |
| bge-small-en-v1.5 | `name_keywords` | 6.1 | 0.699 | 0.763 | 0.782 | 274 / 152 | 15 (0.055) | 1 (0.007) | 0.0142 |
| bge-small-en-v1.5 | `name_statement` | 37.9 | 0.670 | 0.892 | 0.741 | 233 / 185 | 23 (0.099) | 1 (0.005) | 0.0001 |
| bge-small-en-v1.5 | `name_statement_keywords_branch` | 41.5 | 0.674 | 0.883 | 0.708 | 272 / 150 | 23 (0.085) | 1 (0.007) | 0.0002 |
| bge-small-en-v1.5 | `statement_only` | 32.8 | 0.662 | 0.875 | 0.656 | 279 / 150 | 28 (0.1) | 1 (0.007) | 0.0003 |
| bge-small-en-v1.5 | `current` | 33.9 | 0.665 | 0.89 | 0.709 | 261 / 167 | 28 (0.107) | 1 (0.006) | 0.0001 |

The highest AUC among the alternatives is `name_statement` at 0.892, against 0.89 for the current rule. The settled positives number 24 to 29 depending on the input (29 for the current rule), and most of them are solved rows with no resolved year that the scorer counts as resolved by the cutoff. With those removed about 8 positives remain and the AUC of the six inputs spreads from 0.656 to 0.782 in a different order, where `name_keywords` (0.782) sits above the current rule (0.709). AUC counts ties as half. The rule stays until a variant beats it by a margin larger than that dated-only spread (0.656 to 0.782) on both codings.


## Records for every row

`python3 records.py --all` (or `python3 records_all.py`) writes `src/lib/research-os/solvability-records-data.json`, schema `bucket.solvability-atlas.records-packed/v1`, one packed record per row of `problems.tsv` and `problems-sourced.tsv` (5,209 today), under 3 MiB. `record_schema.row_errors` validates the unpacked form and `records_all.unpack` returns it.

Per row: id, title, branch, form, variant_of, status, coding (settled for solved, advanced for partial, open for open and claimed), posed and resolved, posed_evidence, statement (cut at 200 characters with an ellipsis, the full text sits at `statement_source`), source and licence, status_source, keywords, market; computed from the embeddings: zone, reach (highest similarity to a solved row over the whole set), radius (the frontier drawing's band: core under 0.6, ring to 1, outer to 1.5), angle, the six nearest solved and six nearest open rows with similarity, and the loadings on the first three principal components of the embeddings. The file's `axes` name the 8 keywords at each end of each component. The 71 atlas problems keep the hand-written part of `records/<id>.json` under `hand` (aliases, level, history, formal status, related, the first four key works, the first three people and organizations, quality). The frontier threshold is the 10th percentile of solved reach, the rule of `solvability-frontier.ts`; `tests/test_records_all.py` checks it and the zone counts against the report data.
