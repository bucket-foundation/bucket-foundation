# Tail Hedging with Puts

ID: `op-tail-hedge`
Family: Options and Volatility
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Buy out-of-the-money index puts to cap drawdown.

## Source

1. Pathetic Protection: The Elusive Benefits of Protective Puts. Israelov, 2018, The Journal of Alternative Investments. https://doi.org/10.3905/jai.2018.1.066 (Crossref search, fetched 2026-11-27)
2. Kakushadze and Serur, 151 Trading Strategies, section 2.11. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27)
3. Did hedging tail risk pay off?. MSCI, 2020. https://www.msci.com/research-and-insights/blog-post/did-hedging-tail-risk-pay-off (fetched 2026-11-27)

## Claimed Edge

A cost center; Israelov shows protective puts reduce return more than drawdown.

## Post-Publication Decay

MSCI found tail-hedge protection was more than offset by its cost unless timed before a crisis; in 2020 to April 27, equity with 10% puts returned -9.3% against -14.7% unhedged.

Decay source: Pathetic Protection: The Elusive Benefits of Protective Puts. Israelov, 2018, The Journal of Alternative Investments. https://doi.org/10.3905/jai.2018.1.066 (Crossref search, fetched 2026-11-27)

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- KS 2.4

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
