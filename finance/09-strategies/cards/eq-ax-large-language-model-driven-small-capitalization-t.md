# Large Language Model-Driven Small-Capitalization Trading: Integrating Financial News Sentiment

ID: `eq-ax-large-language-model-driven-small-capitalization-t`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: arXiv q-fin.TR or q-fin.PM 2015 to 2026

## Logic

From the abstract: We study an uncertainty-aware construction that feeds model-predicted risk -- decomposed into aleatoric and epistemic components -- directly into the covariance matrix of portfolio allocators, rather than treating portfolio risk as fixed or adjusting only expected returns. The strongest conservative row is pure beta with GPT-4o mini sentiment, a Student-t target, a 40-day holding period, and risk parity allocation, reaching Sharpe 2.33 at 100 bps.

## Source

1. Large Language Model-Driven Small-Capitalization Trading: Integrating Financial News Sentiment, Macroeconomic Indicators, and Technical Signals. Alireza Kargarzadeh and co-authors, 2026, arXiv 2608.12283. https://arxiv.org/abs/2608.12283 (arXiv API, fetched 2026-11-27)

## Claimed Edge

The abstract reports: We evaluate the pipeline on Russell 2000 equities under three stock-selection regimes: a pure-alpha trigger that isolates abnormal stock moves not explained by macro indicators, a pure-beta trigger that captures macro-indicator moves before the stock itself fires, and a beta trigger in which both channels agree. Across the full holding-period grid, the separated pure-alpha and pure-beta legs dominate the beta intersection on Sharpe and return.

## Post-Publication Decay

Single arXiv study with no out-of-sample follow-up fetched. Grade C.

## Capacity

Unknown; the abstract gives no capacity figure. Treat as Small until tested.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
