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

Similarity measures wording and says nothing about difficulty. A backtest against later upstream retagging gives the score an AUC of 0.44 at the 2026-06-01 snapshot, 95% interval 0.39 to 0.49, where 0.5 is chance [empirical: formal-conjectures 137aec5c, 2026-10-01, python3 backtest.py --repo fc-history.git --head 137aec5c]. The backtest is in PR 519.
