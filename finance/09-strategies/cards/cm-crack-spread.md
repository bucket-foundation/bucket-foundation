# Crack Spread

ID: `cm-crack-spread`
Family: Commodities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Trade the spread between crude and refined products when it departs from its refining margin norm.

## Source

1. Risk arbitrage opportunities in petroleum futures spreads. Girma, Paulson, 1999, Journal of Futures Markets. https://doi.org/10.1002/(sici)1096-9934(199912)19:8<931::aid-fut5>3.0.co;2-l (Crossref search, fetched 2026-11-27)
2. Kakushadze and Serur, 151 Trading Strategies, section 9.5. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27)

## Claimed Edge

Girma and Paulson found risk arbitrage opportunities in the crack spread.

## Post-Publication Decay

Refinery outages create jumps the model misses.

Decay source: Does Academic Research Destroy Stock Return Predictability?. Mclean, Pontiff, 2016, The Journal of Finance. https://doi.org/10.1111/jofi.12365 (Crossref DOI, fetched 2026-11-27)

## Capacity

Medium.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
