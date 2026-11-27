# Front-Running Index Rolls

ID: `cm-goldman-roll`
Family: Commodities
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Sell the expiring contract and buy the next before commodity index funds roll.

## Source

1. Limits to Arbitrage and Commodity Index Investment: Front-Running the Goldman Roll. Mou, 2010. https://doi.org/10.2139/ssrn.1716841 (Crossref search, fetched 2026-11-27)

## Claimed Edge

Mou found front-running the GSCI roll earned high Sharpe ratios.

## Post-Publication Decay

Mou found the roll trades earned Sharpe ratios as high as 4.39 over 2000 to March 2010, with profit tied to the size of index investment and the arbitrage capital employed.

Decay source: Limits to Arbitrage and Commodity Index Investment: Front-Running the Goldman Roll. Mou, 2010. https://doi.org/10.2139/ssrn.1716841 (Crossref search, fetched 2026-11-27)

## Capacity

Medium.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
