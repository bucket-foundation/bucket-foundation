# Quantum in Finance · I-finance
**Layer:** L4 Industries · **Chapter:** §05 · **Status:** depth

## The pitch
Finance is the flagship "quantum use case": portfolio optimization, Monte Carlo derivative pricing, risk (VaR/CVA), and fraud/anomaly detection all map to problems where classical compute is expensive. Vendors promise quadratic speedups on Monte Carlo (amplitude estimation, see `S-qmc`) and better solutions to NP-hard portfolio selection (QAOA, `S-variational`). Two sub-verticals behave differently: **retail/commercial banking** chases fraud graphs and credit scoring; **capital markets** (trading desks, derivatives, reinsurance-adjacent risk) chases pricing and optimization. Banks were the earliest and heaviest enterprise experimenters, with 15+ global banks running programs by March 2026 (JPMorgan, Goldman, HSBC, BBVA, Barclays, BNP Paribas, Wells Fargo).

## Real activity (named, dated)
- **JPMorganChase** — the most substantive results. With Quantinuum, Argonne, ORNL, UT Austin, published **certified randomness** on the 56-qubit Quantinuum H2-1 (*Nature*, 26 Mar 2025) — a genuine "beyond classical" task (see `S-certrand`). Separately showed a **theoretical QAOA speedup** for constrained optimization (*Science Advances*, 29 May 2025). A JPMorgan+AWS hybrid decomposition (2024) reported a modest **~12% runtime reduction** on a constrained optimization by partitioning. "Up to 100x speed" figures appear in controlled-test PRs and are T4.
- **HSBC + IBM** (Sept 2025) — claimed **up to 34% improvement** predicting whether a corporate bond trade fills at the quoted price vs classical, on real algorithmic bond-trading data using an IBM Heron processor in a hybrid workflow. Framed as "first empirical evidence quantum adds value in production-representative trading." Bank+vendor co-announcement, not independently reproduced.
- **Goldman Sachs** — early leader on Monte Carlo option pricing (with IonQ/QC Ware), then reportedly **scaled back** after concluding practical advantage remains far off — the honest counter-signal to the bullish PRs.
- **Multiverse Computing** — Spanish vendor selling "quantum-inspired" (tensor-network) finance tooling to banks; revenue is classical software, useful context on where the money actually flows.

## Key graded claims
- [T2] Certified randomness on H2-1, classically unachievable — JPMC/Quantinuum, *Nature* s41586-025-08737-1 (demonstrated; a cryptography primitive, not trading P&L)
- [T3] QAOA constrained-optimization speedup (theoretical) — JPMC, *Science Advances* 2025
- [T4] HSBC/IBM 34% bond-fill improvement — co-announcement Sept 2025 (controlled POC)
- [T4] Portfolio-optimization / Monte-Carlo "100x" speedups — bank+vendor PRs (no production deployment)
- [T5] Finance as a headline share of McKinsey's ~$2.7T-by-2035 economic-value estimate — analyst forecast; grade hard, double-counted across verticals and inflation-unadjusted (2026 dollars)

## Proven today vs promise vs hype
- **Proven:** certified randomness (peer-reviewed, beyond-classical) — a cryptographic primitive with privacy/audit uses, not alpha.
- **Promise:** portfolio optimization, Monte Carlo pricing, bond-fill prediction — real POCs on tiny instances, awaiting fault tolerance to beat Gurobi/CPLEX at scale.
- **Hype:** "quantum trading edge today," "100x in production," multi-trillion-dollar finance TAM lines.

## Honest assessment
No bank runs a quantum computer in live operations as of mid-2026. The certified-randomness result is real and refereed and is a cryptography primitive. The optimization and pricing "advantages" are controlled POCs on small instances that classical methods still beat at scale, and the amplitude-estimation speedup that finance has chased for years needs fault-tolerant depth that erases the near-term gain. Goldman's pullback and JPMorgan's careful language are the honest signals inside the sector. Realistic operational value: late 2020s at the earliest, gated on fault tolerance.

## Sources
- JPMorgan certified randomness: https://www.jpmorgan.com/technology/news/certified-randomness · Nature: https://www.nature.com/articles/s41586-025-08737-1
- HSBC/IBM bond trading (Sept 2025): reported via The Quantum Insider / FStech
- "15+ global banks probing quantum" — The Quantum Insider, 27 Mar 2026
- "Goldman Sachs, JPMorgan sharply diverge on quantum" — TheStreet
- McKinsey Quantum Technology Monitor 2026 (economic-value figure)
