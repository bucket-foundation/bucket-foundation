# Solvability Atlas

Maps 71 open and closed problems across the seven canon branches, plus the proved and open theorems in `lean/manifest.json`, by problem level, Lean formal status and the markets each problem touches.

Formal status sources: `formal_sources.tsv` cites the formalization behind each problem's formal status, and BucketMath rows cite `lean/manifest.json`. A problem without a row there shows as curator judgement on its card.

Solvability score: `0.55 * resolved + 0.45 * formal`, where formal is proved 1.0, partial 0.6, statement 0.35, none 0.1. Level runs 1 to 5, with P vs NP and the Millennium problems at 5.

## Run

```bash
./build.sh
```

Embeddings come from `BAAI/bge-small-en-v1.5`. Four text variants exist (`atlas.TEXT_VARIANTS`): `keywords` (title, branch, keywords), `statement`, `statement_titles` (plus the titles of the kept key works marked `in_embedding`) and `statement_titles_aliases`. `ATLAS_TEXT=<variant>` selects one; the default is the variant with the best hit rate against `atlas.EXPECTED_PAIRS` in the ablation table of `records/INDEX.md` (`python3 ablation.py` rebuilds it), `keywords` as of 2026-10-06. `graph.json` names the variant and counts the text kinds per node in `embedding_text`. Each problem and token takes an angle from its rank along the first two principal directions, so neighbours on the circle are neighbours in embedding space.

## Outputs

| File | Content |
|------|---------|
| 01-token-circle.png | every keyword and market token on a circle, radius = mean solvability |
| 02-star-chart.png | problems as stars, radius = level x unsolvedness, size = markets |
| 03-star-chart-time.png | radius = year posed, a line to the year resolved |
| 04-helix.png | one helix turn per level, radius = solvability |
| 05-sphere.png | top three principal directions on the unit sphere |
| 06-network.png | kNN similarity network, k = 6, size = betweenness |
| 07-similarity-matrix.png, 09-token-matrix.png | cosine matrices ordered by community and circle rank |
| 08-matrices.png | branch x branch, level x Lean status, market x branch |
| graph.json, graph.cypher | nodes with centralities, SIMILAR_TO, HAS_TOKEN and MARKET edges |
| stats.json | density, clustering, modularity, assortativity, permutation test, Spearman |
| productions.json | one production card per node: claim, formal status, minted state, status, sources |
| similarity.json | cosine similarity between every pair of nodes, upper triangle, three decimals |
| neighbors.json | the full set: 71 atlas problems, every row of `problems-sourced.tsv` and the Lean theorems, each with its 50 most similar nodes (index into `ids`, cosine to three decimals) and its nearest solved problem over the whole set; `solved` lists the solved ids and `solved_rule` states the variant rule |
| components-full*.json, components-full*.csv, 10-components-full*.png | the components of the full set, with and without the Lean theorems; the plots label the 71 atlas problems and, after `--relabel`, the 40 outside problems with the largest growth |
| components*.json, components*.csv, 10-components*.png | each node's coordinates on the first five principal components of the embeddings, the share of variance each explains, and the tokens that load each end of each component; a labelled scatter of the first two. `components-problems` repeats this on the 71 problems alone, because the first component of the full set mainly separates Lean theorems from problems |

`build.sh` runs `atlas.py`, then `site.py` writes the plots to `public/atlas/` and the production cards to `src/lib/research-os/solvability-atlas-data.json`. `site.py` also copies `similarity.json` to `src/lib/research-os/solvability-similarity-data.json` and `neighbors.json` to `src/lib/research-os/solvability-neighbors-data.json`, which the frontier circle reads: `bkt atlas frontier` prints it in the terminal, `--svg FILE` writes the drawing and `--json` prints the data. The full set is the default whenever the build holds the neighbour file; `--full` insists on it. Research OS renders the cards at `/research-os/solvability`.

## Full Set

`atlas.py` ends with the full set: the 71 atlas problems, the 4,596 rows of `problems-sourced.tsv` (top-level rows and variants, with `form` and `variant_of` kept) and the Lean theorems as a separate kind that the frontier leaves off by default. The embedding text is the statement when present, else the problem record text, else name plus keywords; the branch word is never in the text. Embeddings are cached under `~/.cache/bucket-atlas` (`ATLAS_CACHE` overrides) keyed by model revision and text hash, so a rerun with no new text encodes nothing. Angle comes from the first two principal components of the problem embeddings alone; Lean theorems are projected on the same axes.

Solved rule: a top-level row is solved when its status is solved. A variant is solved only when its own status and its parent's status are both solved; a proved special case of an open problem is `partial` and stays open, so a problem cannot be pulled inside by its own fragments. Growth pulls are bounded by the 50 stored neighbours.

```bash
./build.sh                                   # atlas.py then site.py, full set included
cd ../../packages/bkt && BKT_INCLUDE_STAFF_DATA=1 bun run src/pack/staff.ts
bun run src/cli.tsx atlas frontier --svg out/frontier.svg --json > out/frontier.json
cd ../../tools/solvability-atlas && python3 atlas.py out --relabel out/frontier.json   # components plots with the top 40 outside
```

Frontier at the full scale, 2026-10-05: 4,667 rows (Lean off), 1,499 solved, 3,324 inside, 1,343 outside, threshold 0.803 `[empirical: output/solvability-frontier/full/frontier.json, bkt atlas frontier --json]`.

The frontier circle sits at reach 0.795, the 10th percentile of each solved problem's highest similarity to another solved problem, over the 156 productions in `solvability-atlas-data.json` (99 solved) `[empirical: src/lib/research-os/solvability-similarity-data.json, 2026-10-05, bkt atlas frontier --json]`. The similarity file covers the 218 nodes the tool builds today; the frontier reads the 156 the committed atlas data holds. Edit `problems.tsv` or `descriptions.tsv`, rerun, and the page follows.

`out/` stays out of git; its PNGs, graph.json, graph.cypher and stats.json are mirrored to `gdrive:AGFarms/Nucleus/bucket-foundation/solvability-atlas/`.

## Problem records

`records.py` builds one JSON record per problem in `records/` from OpenAlex, Wikipedia, arXiv and the repo's own corpora, with every network field carrying its source URL and licence. Schema, relevance filter and build flags: `records/SCHEMA.md`. Per-problem counts, a status per record and the neighbour shift between keyword and record embeddings: `records/INDEX.md` (`python3 neighbour_shift.py` rebuilds the shift section). Responses cache under `cache/`, which stays out of git. Records hold Wikipedia text under CC BY-SA 4.0 with attribution; the code is MIT and the derived numbers are CC0 in intent.

## Reproduce

`pip install -r requirements.txt`. The embedding model is pinned by revision in `atlas.py`. `python3 -m pytest tests` checks that the angles, the network and its statistics repeat on a fixed input.

## Public Plots

The plots in `public/atlas/` are public on purpose: they show published problems and the repo's own Lean manifest. The page that frames them waits behind the launch gate.

## Sourced Problems

`problems-sourced.tsv` holds rows ingested from outside lists, with the same columns plus `form`, `variant_of`, `status`, `source`, `licence`, `statement`, `statement_source` and `status_source`. `SOURCES.md` surveys every candidate source with count, licence and verdict; `python3 sources/build.py` rebuilds the file from the fetchers in `sources/`, and `tests/test_sourced.py` checks it. `atlas.py` reads it for the full set.
