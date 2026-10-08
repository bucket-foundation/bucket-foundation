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
};
```

Relevance filter for key works: a hit is kept when it has at least one citation, its OpenAlex field sits in the branch's field set (`BRANCH_FIELDS` in `records.py`) or its title names the problem (title, query or alias), and its title or topic holds the query phrase, the title, an alias, a keyword or a keyword word of five letters or more outside the stop list. A title with none of those but a problem word (conjecture, problem, theorem, undecidable, proof, hypothesis, unsolved) scores 1, since OpenAlex matched the phrase in its abstract. Score = 2 per title match + 1 per topic match; ties break on citations. Duplicate titles keep the first hit. The first 8 kept works carry `in_embedding: true` and their titles enter the embedding text in `atlas.py`.

Quality: `full` means at least 8 kept works and at least 5 phrase hits; `partial` means fewer than 8 kept works; `weak` means no kept work or fewer than 5 phrase hits (refine the query in `sources.tsv`); `empty` means no OpenAlex response is cached.

Role rule for key works: a title matching survey, review, progress, overview, status, open problems or perspective is `survey`; a work within one year of the resolved year is `resolved`; a work within five years after the posed year is `posed`; the rest are `partial`. The rule is a heuristic from the year and title only.

Licences: the `statement` text and `aliases` come from Wikipedia and carry CC BY-SA 4.0 with attribution in the record, so the records directory is share-alike text. The code stays MIT. Derived numbers (counts, activity, relevance, embeddings) are CC0 in intent. OpenAlex metadata is CC0-1.0; arXiv API metadata is CC0-1.0. Requests to OpenAlex send `mailto` from the `OPENALEX_MAILTO` environment variable and `Authorization: Bearer` from `OPENALEX_API_KEY` when set; neither reaches a stored URL or cache key. `records/sources.tsv` maps each id to its Wikipedia title and its OpenAlex and arXiv query phrase. The repo corpora searched for mentions are `openalex-fanout/`, `pubmed/` and the research-atlas parquet tables named in `src/data/research-atlas-manifest.json` when they exist on disk.

Build: `python3 records.py [--limit N] [--only id ...] [--force] [--offline]`. A record on disk is skipped unless `--force`. `--offline` reads the cache only. `INDEX.md` is rewritten on every run.

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
