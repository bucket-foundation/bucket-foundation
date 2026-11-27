# Hurst and VPIN Regime Trading

ID: `ot-hurst-vpin`
Family: Other
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Strategies in code

## Logic

Use the Hurst exponent on dollar bars to pick trend or reversion regime and VPIN aggressor flow to pick direction.

## Source

1. Flow Toxicity and Liquidity in a High Frequency World. Easley and co-authors, 2010, Crossref. https://doi.org/10.2139/ssrn.1695596 (Crossref search, fetched 2026-11-27)
2. Source code in `finance/code/`: 1 implementations listed in `08-software/STRATEGIES-IN-CODE.md` (read 2026-11-27).

## Claimed Edge

Easley, Lopez de Prado and O Hara 2012 introduced VPIN as an order-flow toxicity measure.

## Post-Publication Decay

No fetched post-publication study. Grade C.

## Capacity

Small.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[nautechsystems/nautilus_trader](../../08-software/nautilus_trader.md)

## Code

- `nautechsystems/nautilus_trader: crates/trading/src/examples/strategies/hurst_vpin_directional/strategy.rs`

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
