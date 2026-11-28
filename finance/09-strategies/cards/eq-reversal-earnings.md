# Reversal During Earnings Announcements

ID: `eq-reversal-earnings`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Buy stocks that fell most in the days before earnings, short those that rose.

## Source

1. News-Driven Return Reversals: Liquidity Provision Ahead of Earnings Announcements. So, Wang, 2013. https://doi.org/10.2139/ssrn.2275982 (Crossref search, fetched 2026-11-27)
2. Quantpedia free strategy page. https://quantpedia.com/strategies/reversal-during-earnings-announcements/ (fetched 2026-11-27)

## Claimed Edge

Short-term reversal returns are several times larger during earnings windows.

## Post-Publication Decay

Liquidity provision trade; crowding by market makers compresses it.

Decay source: Does Academic Research Destroy Stock Return Predictability?. Mclean, Pontiff, 2016, The Journal of Finance. https://doi.org/10.1111/jofi.12365 (Crossref DOI, fetched 2026-11-27)

## Capacity

Small.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md), [D-filings](../../03-data-sources/cards/D-filings.md)

## Implementation

No open-source implementation in `code/`.

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- Quantpedia reversal-during-earnings-announcements

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
