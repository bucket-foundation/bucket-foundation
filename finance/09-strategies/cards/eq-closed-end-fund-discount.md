# Closed-End Fund Discounts

ID: `eq-closed-end-fund-discount`
Family: Equities
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Buy closed-end funds at wide discounts to NAV, hedge the underlying, wait for narrowing or activist events.

## Source

1. Investor Sentiment and the Closed-End Fund Puzzle. Lee, Shleifer, Thaler, 1990. https://doi.org/10.3386/w3465 (Crossref search, fetched 2026-11-27)
2. Kakushadze and Serur, 151 Trading Strategies, section 3.19. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27)
3. Closed-End Funds and Discount Control Mechanisms. Kraeussl, 2023. https://doi.org/10.2139/ssrn.4345001 (Crossref DOI, fetched 2026-11-27)

## Claimed Edge

Discounts mean-revert and move with small-investor sentiment.

## Post-Publication Decay

Non-discretionary discount controls such as mandatory continuation votes signal higher fund quality, and the rents accrue to managers rather than investors (Kraeussl, 2023).

Decay source: Closed-End Funds and Discount Control Mechanisms. Kraeussl, 2023. https://doi.org/10.2139/ssrn.4345001 (Crossref DOI, fetched 2026-11-27)

## Capacity

Small.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
