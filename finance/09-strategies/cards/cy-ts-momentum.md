# Crypto Time-Series Momentum

ID: `cy-ts-momentum`
Family: Crypto
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Hold bitcoin when its recent one to four week return is positive.

## Source

1. Risks and Returns of Cryptocurrency. Liu, Tsyvinski, 2020, The Review of Financial Studies. https://doi.org/10.1093/rfs/hhaa113 (Crossref DOI, fetched 2026-11-27)
2. Kakushadze and Serur, 151 Trading Strategies, section 18.2. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27)

## Claimed Edge

Liu and Tsyvinski find strong time-series momentum in bitcoin returns.

## Post-Publication Decay

Short history and deep drawdowns.

Decay source: Common Risk Factors in Cryptocurrency. Liu, Tsyvinski, Wu, 2022, The Journal of Finance. https://doi.org/10.1111/jofi.13119 (Crossref DOI, fetched 2026-11-27)

## Capacity

Medium.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md), [D-onchain](../../03-data-sources/cards/D-onchain.md)

## Implementation

[freqtrade](../../08-software/freqtrade.md), [jesse](../../08-software/jesse.md), [vectorbt](../../08-software/vectorbt.md)

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
