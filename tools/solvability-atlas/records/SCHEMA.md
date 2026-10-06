# Problem record schema

One JSON file per atlas problem, `records/<id>.json`, schema id `bucket.solvability-atlas.record/v1`. `record_schema.py` validates a record; `records.py` builds them from `problems.tsv`, `descriptions.tsv`, `formal_sources.tsv`, `records/sources.tsv` and four network sources, each cached under `cache/`. Every network-derived field names the URL it came from.

```ts
type Record = {
  schema: "bucket.solvability-atlas.record/v1";
  id: string;                      // problems.tsv id
  title: string;                   // problems.tsv name
  statement: { text: string; source: string | null };  // Wikipedia summary extract, else descriptions.tsv
  aliases: string[];               // Wikipedia title and lead bold terms that differ from the title
  branch: "mathematics" | "physics" | "chemistry" | "information" | "biophysics" | "cosmology" | "mind";
  level: 1 | 2 | 3 | 4 | 5;
  industries: string[];            // problems.tsv markets, then the three most common OpenAlex subfields of the key works
  posed: number;
  resolved: number | null;
  history: { year: number; event: string; source: string }[];   // posed and resolved rows from problems.tsv, dated infobox rows from the Wikipedia page
  key_works: {                     // top 25 OpenAlex works by citations whose title or abstract holds the query phrase
    openalex: string; title: string; year: number | null; cited_by_count: number; doi: string | null;
    role: "posed" | "partial" | "resolved" | "survey"; source: string;
  }[];
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
};
```

Role rule for key works: a title matching survey, review, progress, overview, status, open problems or perspective is `survey`; a work within one year of the resolved year is `resolved`; a work within five years after the posed year is `posed`; the rest are `partial`. The rule is a heuristic from the year and title only.

Sources and licences: OpenAlex (CC0-1.0, polite pool with `mailto`), Wikipedia REST summary and page HTML (CC-BY-SA-4.0), arXiv API (metadata CC0-1.0). `records/sources.tsv` maps each id to its Wikipedia title and its OpenAlex and arXiv query phrase. The repo corpora searched for mentions are `openalex-fanout/`, `pubmed/` and the research-atlas parquet tables named in `src/data/research-atlas-manifest.json` when they exist on disk.

Build: `python3 records.py [--limit N] [--only id ...] [--force] [--offline]`. A record on disk is skipped unless `--force`. `--offline` reads the cache only. `INDEX.md` is rewritten on every run.
