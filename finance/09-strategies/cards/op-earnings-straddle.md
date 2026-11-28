# Earnings Straddles

ID: `op-earnings-straddle`
Family: Options and Volatility
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Buy straddles a few days before earnings, sell just before the announcement.

## Source

1. Anticipating Uncertainty: Straddles Around Earnings Announcements. Gao, Xing, Zhang, 2013. https://doi.org/10.2139/ssrn.2204549 (Crossref search, fetched 2026-11-27)

## Claimed Edge

Pre-announcement straddles earned positive returns as implied vol rises into the event.

## Post-Publication Decay

Volume in short-dated options has grown; check post-2018 data.

Decay source: Does Academic Research Destroy Stock Return Predictability?. Mclean, Pontiff, 2016, The Journal of Finance. https://doi.org/10.1111/jofi.12365 (Crossref DOI, fetched 2026-11-27)

## Capacity

Small.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md), [D-filings](../../03-data-sources/cards/D-filings.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
