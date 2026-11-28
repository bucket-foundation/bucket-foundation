# Congressional Trade Copying

ID: `eq-congress-copy`
Family: Equities
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Strategies in code

## Logic

Buy what members of Congress disclose buying, entered on the disclosure date.

## Source

1. Abnormal Returns from the Common Stock Investments of the U.S. Senate. Ziobrowski and co-authors, 2004, Journal of Financial and Quantitative Analysis. https://doi.org/10.1017/s0022109000003161 (Crossref search, fetched 2026-11-27)
2. Source code in `finance/code/`: 1 implementations listed in `08-software/STRATEGIES-IN-CODE.md` (read 2026-11-27).

## Claimed Edge

Ziobrowski and co-authors 2004 found Senators beat the market from 1993 to 1998; later studies of the House found no edge.

## Post-Publication Decay

No fetched post-publication study. Grade C.

## Capacity

Medium.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md)

## Implementation

[lumibot](../../08-software/lumibot.md)

## Code

- `lumibot: lumibot/example_strategies/ai_nancy_pelosi_copy_trading_bot.py`

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
