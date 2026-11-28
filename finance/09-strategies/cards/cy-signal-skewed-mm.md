# Signal-Skewed Market Making

ID: `cy-signal-skewed-mm`
Family: Crypto
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Strategies in code

## Logic

Quote both sides but shift the quote center by an alpha signal, book imbalance, spot-futures basis, factor fair value or MACD, and widen spreads with volatility.

## Source

1. High-frequency trading in a limit order book. Avellaneda, Stoikov, 2008, Quantitative Finance. https://doi.org/10.1080/14697680701381228 (Crossref search, fetched 2026-11-27)
2. Source code in `finance/code/`: 5 implementations listed in `08-software/STRATEGIES-IN-CODE.md` (read 2026-11-27).

## Claimed Edge

hftbacktest replays show signal skew improves fill quality; no live record.

## Post-Publication Decay

No fetched post-publication study. Grade C.

## Capacity

Small.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[hftbacktest](../../08-software/hftbacktest.md), [hummingbot](../../08-software/hummingbot.md), [nautechsystems/nautilus_trader](../../08-software/nautilus_trader.md)

## Code

- `hummingbot: controllers/market_making/pmm_dynamic.py`
- `nautechsystems/nautilus_trader: crates/trading/src/examples/strategies/composite_market_maker/strategy.rs`
- `hftbacktest: examples/Market Making with Alpha - Order Book Imbalance.ipynb`
- `hftbacktest: examples/Market Making with Alpha - Basis.ipynb`
- `hftbacktest: examples/Market Making with Alpha - APT.ipynb`

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
