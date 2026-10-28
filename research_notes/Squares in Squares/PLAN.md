# Squares in Squares

Research OS direction, opened 2026-10-23. Status: plan only, no work started, no critic run.

## Competition

- URL: https://www.kaggle.com/competitions/squares-in-squares
- Host: Kaggle, Walter Reade and Ashley Oldacre. Playground competition, no points or medals.
- Task: pack n unit squares, free rotation, into the smallest axis-aligned square, for every n from 1 to 1000.
- Score per n: L / sqrt(n) - 1, lower wins, leaderboard is the sum. A missing n scores the trivial grid, ceil(sqrt(n)) / sqrt(n) - 1.
- Submission CSV: `id,n,square_id,x,y,angle`, centers and angle in radians, plain decimals. L is computed from the squares. Partial submissions allowed. Unparseable puzzle is charged the grid ceiling.
- Rule: interiors of any two squares must intersect in zero area.
- Prizes, $50,000 total: final 12k, 10k, 8k, 5k, 5k. Milestone prizes 5k each to the leader at each cutoff, ties go to the earliest submission.
- Snapshot 2026-10-23: 999 entrants, 308 teams, 1,379 submissions.

## Due Dates

All at 23:59 UTC.

| Date | Event |
|---|---|
| 2026-10-21 | Start |
| 2027-01-17 | Milestone 1 cutoff, $5,000 |
| 2027-04-18 | Milestone 2 cutoff, $5,000 |
| 2027-07-11 | Entry deadline, accept the rules by this date |
| 2027-07-11 | Team merger deadline |
| 2027-07-18 | Final submission deadline |

## Plan

1. Review recent Bucket work that applies: `papers/solvability-frontier`, `lean/` BucketMath, the hte engine on 127.0.0.1:8420, `quantum/` optimization spikes, and the Research OS directions model (`src/lib/research-os/directions.ts`).
2. Literature review, written to `research_notes/Squares in Squares/` in Research OS literature review style. Seed sources to verify:
   - Erich Friedman, Packing Unit Squares in Squares: A Survey and New Results, Electronic Journal of Combinatorics dynamic survey DS7. The best-known table up to n near 100.
   - Erdős and Graham 1975, wasted area grows at most like s^{7/11}; later bounds by Roth and Vaughan (lower), Chung and Graham (upper).
   - Optimality proofs: Kearney and Shiu for n=6, Stromquist for n=10, Nagamochi for n = k^2 - 1 and k^2 - 2, Bentz for n = k^2 - k cases.
   - Gensane and Ryckelynck, improved packings by computer search; Walter Trump's n=11 packing.
   - Computational methods: simulated annealing, separating-axis overlap tests, penalty and gradient methods for rotated rectangles, recent AlphaEvolve-style LLM program search on packing problems.
3. Baseline: grid for every n, then known good families: k^2 + small n by inserting tilted strips, and Friedman's table where it applies. Score the full 1..1000 sum locally with an exact overlap checker.
4. Optimizer: penalty relaxation plus annealing on (x, y, angle), exact separating-axis verification with a small safety margin, per-n parallel runs on charizard.
5. Research output: Bucket paper from `papers/template/`, any new best-known packing logged as a citeable Research OS node with the verifier, Lean statements for proven lower bounds where they exist.
6. Submit before milestone 1, 2027-01-17.

## Open Decisions

- Kaggle account and API token: founder enters credentials, the agent never does.
- Team solo or with collaborators, before 2027-07-11.
- Prize money and nonprofit status: Bucket is held in the founder's personal capacity.
