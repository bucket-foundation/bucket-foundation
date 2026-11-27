# Dated Futures Cash-and-Carry

ID: `cy-dated-futures-basis`
Family: Crypto
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Buy spot bitcoin, sell CME or exchange dated futures, earn the annualized basis.

## Source

1. Crypto Carry. Schmeling, Schrimpf, Todorov, 2022. https://doi.org/10.2139/ssrn.4268371 (Crossref search, fetched 2026-11-27)
2. Kakushadze and Serur, 151 Trading Strategies, section 18.4. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27)

## Claimed Edge

Crypto carry reached double-digit annualized rates in bull markets and predicts crash risk.

## Post-Publication Decay

Crypto futures carry reached 60% a year and varied strongly over time, and cash-and-carry capital was scarce because margin spikes and liquidations make the trade risky (Schmeling, Schrimpf and Todorov, 2022).

Decay source: Crypto Carry. Schmeling, Schrimpf, Todorov, 2022. https://doi.org/10.2139/ssrn.4268371 (Crossref search, fetched 2026-11-27)

## Capacity

Medium.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[ccxt](../../08-software/ccxt.md)

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
