# Quantum in Retail · I-retail
**Layer:** L4 Industries · **Chapter:** §05 · **Status:** depth

## The pitch
Retail's pitch is demand forecasting, dynamic pricing, assortment and shelf-space optimization, inventory/replenishment, and recommendation. All reduce to optimization (QUBO/QAOA over combinatorial assortment and stocking) or ML (quantum-enhanced forecasting, quantum neural networks). The claimed payoff is fewer stockouts and less overstock across huge SKU catalogs — a combinatorial space classical solvers already handle well, which is the tension.

## Real activity (named, dated)
- **Strangeworks / Quantagonia** (Aug 2025) — Strangeworks acquired Quantagonia to fold quantum-enhanced demand forecasting and decision-making into its platform. Vendor consolidation, not a named retailer deployment.
- **Method research** — *Exploring Quantum Neural Networks for Demand Forecasting* (Entropy/MDPI, 2025, vol 27:490): QNN forecasting on benchmark datasets, no advantage over classical shown.
- **Analyst-heavy** — most visible activity is market-report noise ("Quantum-Enhanced Demand Forecasting" TAM projected ~$2B (2025) → ~$2.64B (2026), ~32% CAGR). T5 forecasts, not pilots.
- Named marquee retail deployments (Walmart/Amazon/Kroger running a QPU in the loop) do not exist in the public record; retail quantum work sits inside logistics (`I-logistics`) and finance-style optimization pilots.

## Key graded claims
- T3 Quantum neural networks tested for demand forecasting on benchmark data — MDPI Entropy 2025 (demonstrated on toy data; no advantage vs classical)
- T4 Quantum-enhanced forecasting productized (Strangeworks/Quantagonia) — vendor consolidation announcement (claimed)
- T5 "Quantum-enhanced demand forecasting" multi-billion-dollar market — GII/Research&Markets forecasts (speculative; double-counted with logistics/finance, inflation-unadjusted)

## Proven today vs promise vs hype
- **Proven:** nothing operational — QNN forecasting demos on benchmark data, matched by classical ML.
- **Promise:** assortment/pricing optimization at catalog scale — high bar because classical MILP is strong and cheap.
- **Hype:** the TAM reports themselves — this node is where market-sizing noise outweighs any real pilot.

## Honest assessment
Retail is one of the thinner industry pitches. Demand forecasting and assortment are problems where classical ML and modern MILP solvers are strong and cheap, so the quantum bar for advantage is high and unmet. The visible "activity" is dominated by market-sizing reports and one vendor acquisition — a T5-heavy corner with essentially no retailer pilots. No retailer runs quantum hardware operationally. Realistic value is far off and, even then, likely marginal versus classical optimization. Grade the TAM numbers hardest here.

## Sources
- https://www.giiresearch.com/report/tbrc1982975-quantum-enhanced-demand-forecasting-global-market.html
- https://www.researchandmarkets.com/reports/6177364/quantum-enhanced-demand-forecasting-market-report
- https://www.mdpi.com/1099-4300/27/5/490 (QNN demand forecasting)
- https://www.grandviewresearch.com/industry-analysis/quantum-computing-market (retail segment CAGR)
