# Solvability Atlas

Maps 71 open and closed problems across the seven canon branches, plus the proved and open theorems in `lean/manifest.json`, by problem level, Lean formal status and the markets each problem touches.

Solvability score: `0.55 * resolved + 0.45 * formal`, where formal is proved 1.0, partial 0.6, statement 0.35, none 0.1. Level runs 1 to 5, with P vs NP and the Millennium problems at 5.

## Run

```bash
HF_HUB_OFFLINE=1 python3 atlas.py out
```

Embeddings come from `BAAI/bge-small-en-v1.5`. Each problem and token takes an angle from its rank along the first two principal directions, so neighbours on the circle are neighbours in embedding space.

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

`python3 report.py out` builds `out/report.html`, the card report with every plot embedded.

PNGs are mirrored to `gdrive:AGFarms/Nucleus/bucket-foundation/solvability-atlas/` and kept out of git.
