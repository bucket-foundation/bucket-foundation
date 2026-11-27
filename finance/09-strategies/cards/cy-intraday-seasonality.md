# Bitcoin Intraday Seasonality

ID: `cy-intraday-seasonality`
Family: Crypto
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Hold bitcoin only during the hours with the highest historical returns.

## Source

1. Overnight Seasonality in Bitcoin - Quantpedia. web. https://quantpedia.com/strategies/intraday-seasonality-in-bitcoin/ (web page, fetched 2026-11-27)
2. Quantpedia free strategy page. https://quantpedia.com/strategies/intraday-seasonality-in-bitcoin/ (fetched 2026-11-27)
3. Impact of US Bitcoin ETF Introduction on BTC and ETH Intraday Regime Seasonality. Espel, 2025. https://doi.org/10.2139/ssrn.4779488 (Crossref DOI, fetched 2026-11-27)

## Claimed Edge

Quantpedia lists hour-of-day patterns tied to US and Asian sessions.

## Post-Publication Decay

Espel found intraday liquidity regimes in BTC and ETH, with volatility and volume seasonalities strongest on weekdays, and measured the change after US Bitcoin ETF introduction in a window of two months either side.

Decay source: Impact of US Bitcoin ETF Introduction on BTC and ETH Intraday Regime Seasonality. Espel, 2025. https://doi.org/10.2139/ssrn.4779488 (Crossref DOI, fetched 2026-11-27)

## Capacity

Medium.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[freqtrade](../../08-software/freqtrade.md), [vectorbt](../../08-software/vectorbt.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- Quantpedia intraday-seasonality-in-bitcoin

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
