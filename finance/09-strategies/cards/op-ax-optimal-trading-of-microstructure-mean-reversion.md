# Optimal Trading of Microstructure Mean Reversion

ID: `op-ax-optimal-trading-of-microstructure-mean-reversion`
Family: Options and Volatility
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: arXiv q-fin.TR or q-fin.PM 2015 to 2026

## Logic

From the abstract: We build an order book whose own flow produces that error and solve for the trading rule that maximises the long-run average profit rate net of the bid-ask spread. A symmetric band of half-width $θ$ buys when the gap reaches $-θ$, sells at $+θ$, and holds inside; on the surrogate it is optimal among all admissible strategies, on the jump process itself that reduction remains a conjecture.

## Source

1. Optimal Trading of Microstructure Mean Reversion. Lucas Rabechini Amaral, 2026, arXiv 2608.00885. https://arxiv.org/abs/2608.00885 (arXiv API, fetched 2026-11-27)

## Claimed Edge

The abstract reports: With $φ$ the tight-book half-spread, the optimal half-width and its profit rate are $θ^*(θ^*-φ)=s_G^2$ and $R^*=αs_G\sqrt{2/π}\,e^{-θ^{*2}/2s_G^2}$. Trading as soon as the gap covers the spread earns zero: all profit is the option value of waiting.

## Post-Publication Decay

Single arXiv study with no out-of-sample follow-up fetched. Grade C.

## Capacity

Unknown; the abstract gives no capacity figure. Treat as Small until tested.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
