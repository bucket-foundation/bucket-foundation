# Solver Gap Engine

Ranks open formalized math problems by closeness to solved ones, then checks classical results in Lean with a proof and a sample test.

## Reproduce

```bash
git clone https://github.com/google-deepmind/formal-conjectures fc
git -C fc checkout 7d450ef6da7178b2716620e8492e26d0f8a9d81d
pip install -r requirements.txt
python3 build_map.py
python3 match.py
(cd fc && lake exe cache get && lake env lean --run ../harness/Empirical.lean)
```

`match.py` writes `candidates.json`, `CANDIDATES.md` and `stats.json`. The Lean run exits 1 when any sample check fails.

## Current Numbers

| Measure | Value |
|---|---|
| Problems mapped | 3,599, of which 1,403 open [empirical: build_map.py at fc 7d450ef, 2026-09-30, python3 build_map.py] |
| Open problems ranked | 1364 [empirical: match.py, 2026-09-30, python3 match.py] |
| Cross-file similarity 0.9 or above | 5 [empirical: match.py stats.json, 2026-09-30, python3 match.py] |
| Cross-file similarity 0.8 or above | 31 |
| Median nearest cross-file similarity | 0.586 |
| Closest match in the same file, excluded | 455 |

Similarity measures wording and says nothing about difficulty. A backtest against later upstream retagging gives AUC 0.583, 0.585, 0.528 and 0.441 at the snapshots of 2025-09-01, 2025-12-01, 2026-03-01 and 2026-06-01, where 0.5 is chance [empirical: formal-conjectures 137aec5c, 2026-10-01, python3 backtest.py --repo fc-history.git --head 137aec5c]. `backtest/backtest.json` is the source for those four values, and `scripts/test-solver-gap-backtest-numbers.mjs` fails when a copy drifts.

## Follow-up Studies

| File | Question | Script |
|---|---|---|
| `BACKTEST.md` | Did a higher gap score mark problems upstream later tagged solved | `backtest.py`, `predict.py`, `momentum.py`, `rates.py`, `plot.py` |
| `RETAGS.md` | What the September 2026 retags were | `retags.py` |
| `STALE-TAGS.md` | Which open tags disagree with the Erdős problems database | `stale_tags.py` |
| `LEAN-RANK.md` | Whether features of the Lean statement rank better, and which problems fix every parameter | `lean_features.py`, `finite_sweep.py` |
| `WATCH.md` | How to diff upstream by hand and stage one generation per newly solved problem | `watch.py` |
