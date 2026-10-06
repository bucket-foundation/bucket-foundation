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

Relevance filter for key works: a hit is kept when it has at least one citation, its OpenAlex field sits in the branch's field set (`BRANCH_FIELDS` in `records.py`), and its title or topic holds the query phrase, the title, an alias, a keyword or a keyword word of five letters or more outside the stop list. Score = 2 per title match + 1 per topic match; ties break on citations. Duplicate titles keep the first hit. The first 8 kept works carry `in_embedding: true` and their titles enter the embedding text in `atlas.py`.

Quality: `full` means at least 8 kept works and at least 5 phrase hits; `partial` means fewer than 8 kept works; `weak` means no kept work or fewer than 5 phrase hits (refine the query in `sources.tsv`); `empty` means no OpenAlex response is cached.

Role rule for key works: a title matching survey, review, progress, overview, status, open problems or perspective is `survey`; a work within one year of the resolved year is `resolved`; a work within five years after the posed year is `posed`; the rest are `partial`. The rule is a heuristic from the year and title only.

Licences: the `statement` text and `aliases` come from Wikipedia and carry CC BY-SA 4.0 with attribution in the record, so the records directory is share-alike text. The code stays MIT. Derived numbers (counts, activity, relevance, embeddings) are CC0 in intent. OpenAlex metadata is CC0-1.0; arXiv API metadata is CC0-1.0. Requests to OpenAlex send `mailto` from the `OPENALEX_MAILTO` environment variable and `Authorization: Bearer` from `OPENALEX_API_KEY` when set; neither reaches a stored URL or cache key. `records/sources.tsv` maps each id to its Wikipedia title and its OpenAlex and arXiv query phrase. The repo corpora searched for mentions are `openalex-fanout/`, `pubmed/` and the research-atlas parquet tables named in `src/data/research-atlas-manifest.json` when they exist on disk.

Build: `python3 records.py [--limit N] [--only id ...] [--force] [--offline]`. A record on disk is skipped unless `--force`. `--offline` reads the cache only. `INDEX.md` is rewritten on every run.
