# Prime directions

Bead `bkt-ilgt`. Turns a corpus into its orthogonal prime directions and draws them as spokes on a circle in the canon globe palette. Outputs a JSON file for a web renderer, a PNG and an MP4 sweep, plus a gap report against the other corpora in the same run.

## Commands

Run from this directory. Needs numpy, scipy, scikit-learn and matplotlib; psycopg2 and networkx for `canon`; `pdftotext` for PDF corpora and `ffmpeg` for video.

```bash
python3 -m prime_directions list
python3 -m prime_directions run 80k academy --out out --gaps --mp4
python3 -m prime_directions run --all --out out --private-out ~/.local/share/bucket-prime-directions --gaps --mp4
python3 -m pytest -q tests
```

Corpus paths in `corpora.json` resolve against the main checkout, found through `git --git-common-dir`, so a worktree reads the untracked `_intake/` data. `PRIME_DATA_ROOT` overrides it.

## Pipeline

1. Load: `sqlite` for the 80k FTS5 table, `folder` for markdown, text and PDF trees, `json_items` for Academy atoms.
2. Clean: drop URLs, markup and LaTeX; drop every line that appears in more than 0.2% of documents, floor 5; drop documents under the corpus `min_chars`.
3. Vectorize: binary sparse document-term matrix, English stop words, tokens start with a letter, pruned by document frequency.
4. Factor: randomized truncated SVD, k = 12 by default, signs fixed so the largest loading is positive. The run records the max of |VVᵀ - I|.
5. Scores: each document's component scores, standardized. The PNG maps -2.5 sd to the center and +2.5 sd to the rim.

The SVD is uncentered, so component 1 tracks overall term density and carries a small variance ratio.

## Gaps

For each term in a corpus's model vocabulary, the gap is `log(rate in target) - log(highest rate across the other corpora)`, where a rate is `(df + 0.5) / (n + 1)`. A term scores `log_ratio x weight`, the weight being its norm in the rank-k reconstruction. A component's gap is the loading-energy average of the log-ratios. Positive means the corpus covers the direction and every other corpus is thin on it.

## Private corpora

A corpus with `"private": true` writes only under `--private-out`, which must sit outside the repo and the main checkout. Public gap reports compare public corpora only; a run that includes a private corpus also writes `gaps-all.json` and a full `summary.json` under `--private-out`.

## JSON

`prime.json` carries schema `bucket.prime-directions/1`: shape, density, orthogonality error, params, cleaning stats, timings, and per component the spoke angle, singular value, variance ratio, top and bottom terms. `docs` holds id, title and standardized scores, omitted with `--no-docs`.

## Canon clusters

```bash
python3 -m prime_directions canon --out out/canon --smooth
python3 -m prime_directions canon --out ~/.local/share/bucket-prime-directions/canon-full --include-private
```

`canon` reads the Research OS graph from the local Supabase stack, `PRIME_GRAPH_DSN` or `--dsn` overriding the default local address, over a read-only session: public, current nodes and the edges between them. Academy atoms from `learning/app/corpus` enrich their mirror nodes with the lesson text, and atoms missing from the graph join as nodes with their `requires` edges. Nodes whose text, provenance or source video metadata (`yt/<id>-*/metadata.json`) names a private corpus are dropped, with every excerpt from a flagged video, unless `--include-private`, which writes only outside the repo.

Features are node terms plus link columns, idf-weighted and row-normalized by default (`--weighting`). Outputs: `canon.json` with canon clusters, cluster metrics, five-number summaries per component and per-node canon, PageRank, residual and scores; `globe.png`; and the charts picked with `--charts`: `projection` (`--axes 2,3`, `--smooth` adds a kernel density view), `boxplot`, `residuals`. The math and the Lean proofs: [MATH.md](MATH.md), `lean/check.sh`.

## Nearest neighbors

`neighbors` returns the closest observations in PCA score space, scoped `local`, `global` or `cross` to canon clusters, and matches advisors from a CSV of numeric columns. `neighbors-bench` compares brute force, KD-tree, HNSW and pgvector. Method notes, sources and results: [NEIGHBORS.md](NEIGHBORS.md). `faiss` and `threadpoolctl` are needed for HNSW and the benchmark; `PRIME_TEST_PG` names a pgvector DSN for the live pgvector test.

## Advisor review

```bash
python3 -m prime_directions advisor-review --people people.jsonl --query statement.md \
  --out ~/.local/share/bucket-advisor-review/review --text-keys author_topics.name,author_topics.field \
  --ror-cache ~/.local/share/bucket-advisor-review/cache/ror.json
```

`people.jsonl` holds one JSON object per person: an id, a name, text fields read by dotted path (`--text-keys`, default a broad list), topic labels (`author_topics.name`) for the evidence chips, and filter fields (`field`, `country`, `funding`, `institution`, `taking_students`, `sources`). The command fits 64 prime directions on the people's text with idf weights and unit rows, projects the query document above `--stop-heading` into them, and scores everyone by cosine after centering and scaling each component to unit spread (`--scoring`). Each row carries its rank, percentile among all people, and the topics it shares with the query.

`--directions` names a TSV of label and text, one research direction per line, kept outside the repo. Each person then carries two stars: `star_prime`, the percentile on each of the first 8 prime directions, and `star_ours`, similarity to each direction scaled against the 200 closest people. The page opens on a circle of every person around the statement: radius is the rank percentile, angle is the ranked position on the first two whitened components, and a click selects a dot. It adds a timeline that steps through the current order (slider, Previous and Next, arrow keys), a profile panel with both stars, and prime-direction filters that keep people at or above the 75th percentile. Scrolling over the main chart steps through people. Every chart marks you, the average of the current filters and the selected person. The panel holds a small copy of each chart (circle, prime directions, our directions); clicking one makes it the main chart. Clicking a list card opens that person in the expanded view; the one-at-a-time view is gone. Decisions are Shortlist (accent), Skip (muted red) and a small bookmark for save for later; keys s, x and b. Each chart has its own legend. Sorts: best match, h-index, active grant, my decisions, institution, name, closest to each of our directions, highest on each prime direction. Extra filters: strong on one of our directions (75th percentile or more) and an h-index floor. An email shows only when its `email_source` is `official_directory` or `opt_in`; `--publishable` strips every email. Profile links must be https. Browser tests: `npx playwright test tests/e2e/advisor-review-page.spec.ts`. Similarity is unvalidated as a measure of advising fit.

`--ror-cache` checks each listed institution against its ROR record: the country comes from the listed institution, and a profile whose OpenAlex institution is unrelated after a name-based match is flagged as possibly another person. Lookups are cached; `--ror-offline` uses the cache alone.

Outputs, all under an `--out` outside the repo: `index.html`, one self-contained file with the plot inlined, card views, shortlist, maybe and skip decisions kept in the browser, a shortlist CSV export, a PhD advisors view without Stevens faculty, a Stevens contacts view, and a per-institution cap in the top 50 (`--cap`, `--cap-window`); `ranked.csv` with the top `--top` rows; `pca.png`; and `report.json` with the fit, the score spread, the top-100 institution mix per view, the ROR check counts and an exact against KD-tree and HNSW lookup check. `--min-rows` and `--watch` re-run as the input grows.

## Fit me

```bash
python3 -m prime_directions fit-me --statement statement.pdf --cv cv.pdf --people people.jsonl --out ~/my-fit
python3 -m prime_directions fit-me --out ~/my-fit --forget
```

Runs on this machine with no network call: TF-IDF and SVD fitted on the people file, no model download. Research directions come from the statement's Research Directions list (or its six longest paragraphs), each labelled by its top three terms; `--directions` overrides them. Output is always publishable, so no email reaches it, and the page carries ranked rows, stars and direction labels, never statement text. `--out` gets a `.bucket-fit-marker`; fit-me refuses a non-empty unmarked or symlinked `--out`, and `--forget` deletes only a marked directory that is not the filesystem root, home, the repo or an ancestor of them. `--people` is required until the public advisor export (bkt-abwh) lands. Statements and CVs may be Markdown, text or PDF: at most 20 MB, 40 pages and 200,000 characters, read in a subprocess capped at 1 GB of memory and 30 CPU seconds, first by pypdf with its decompression limits set, then by `pdftotext -l 40 --` under the same caps, with output reads bounded; a missing pdftotext has its own error; a PDF with no text layer fails with a message. The marker holds an id that fit-me also records in `fit-me-registry.json` under the data root, written atomically with mode 0600 under a file lock; a damaged registry stops the command, and `--forget` deletes only when the two match; the data root itself is protected. `--validate` follows in a later slice.
