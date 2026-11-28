# Opportunistic Insider Buying

ID: `eq-opportunistic-insider`
Family: Equities
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Follow insider purchases after filtering out routine traders who trade the same month each year.

## Source

1. Decoding Inside Information. Cohen, Malloy, Pomorski, 2012, The Journal of Finance. https://doi.org/10.1111/j.1540-6261.2012.01740.x (Crossref DOI, fetched 2026-11-27)
2. Decoding Inside Information. Cohen, Malloy, Pomorski, 2012, The Journal of Finance. https://doi.org/10.1111/j.1540-6261.2012.01740.x (Crossref DOI, fetched 2026-11-27)

## Claimed Edge

A long-short on opportunistic insider trades earned about 82 basis points a month value-weighted.

## Post-Publication Decay

Cohen, Malloy and Pomorski find opportunistic insider trades earn value-weighted abnormal returns of 82 basis points a month, routine trades earn about zero, and opportunistic traders cut trading after waves of SEC enforcement.

Decay source: Decoding Inside Information. Cohen, Malloy, Pomorski, 2012, The Journal of Finance. https://doi.org/10.1111/j.1540-6261.2012.01740.x (Crossref DOI, fetched 2026-11-27)

## Capacity

Small.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md)

## Implementation

No open-source implementation in `code/`.

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- code lumibot: lumibot/example_strategies/ai_insider_trading_bot.py

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
