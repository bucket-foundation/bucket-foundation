# Math Contract

Bead `bkt-hoz6`. Every quantitative claim an agent writes in a PR body, a MATH.md, a paper or a research note carries one of two tags.

- `[bm:BucketMath.Module.name]` cites a definition or a proved theorem in BucketMath, the Lean library at `lean/`. Use `[bm-open:Name]` for a stated claim that has no proof yet; those live in `BucketMath.Open`.
- `[empirical: source, date, command]` marks a measured number: the data it came from, when, and the command that reproduces it.

## Tools

```bash
python3 tools/bucketmath/bm.py lookup residual unit direction
python3 tools/bucketmath/bm.py lint path/to/MATH.md
python3 tools/bucketmath/bm.py check
python3 tools/bucketmath/bm.py check --write
```

`lookup` searches `lean/manifest.json`. `lint` fails when a tag names nothing, cites an open claim as proved, or cites a proved one as open; it warns on sentences with a number and a quantitative word and no tag. `check` builds the library, requires every theorem outside `BucketMath.Open` to use only `propext`, `Classical.choice` and `Quot.sound`, keeps the build offline, and fails when the committed manifest differs from a fresh one. `--write` refreshes it. The MCP tool `bucketmath_lookup` answers the same lookup from the public server; the local server also has `bucketmath_check`.

## Limits

The lint resolves tags. It cannot tell whether the cited theorem supports the sentence, and its number heuristic misses measured claims written without digits; the critic reviews both. Theorems from the history hypothesis engine appear as `external` until they move into BucketMath.

## Library

| Module | Holds |
|---|---|
| `BucketMath.Vec` | sums, dot products and their linear rules over ℚ |
| `BucketMath.Directions` | residual identity for a unit direction, PageRank step mass, one-cluster modularity |
| `BucketMath.Profile` | profiles as slices of integer pairs, quarter turns, coils of rotated slices, preserved energy |
| `BucketMath.Markets` | spread, economic value added, regimes and competitive entry |
| `BucketMath.Open` | stated claims without proofs |
| `BucketMathAll` | BucketMath plus the history engine package at `papers/history-hypothesis-engine/lean` |

Core Lean 4.33.1 only; `Std` ships with the toolchain. Adding a fetched package fails `check`.
