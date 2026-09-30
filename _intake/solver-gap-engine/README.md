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

Similarity measures wording. A high score marks a problem worth handing to a prover and says nothing about its difficulty.
