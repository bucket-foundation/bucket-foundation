# Crypto Exchange Market Making

ID: `cy-market-making`
Family: Crypto
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Quote both sides around a reservation price that shifts with inventory.

## Source

1. High-frequency trading in a limit order book. Avellaneda, Stoikov, 2008, Quantitative Finance. https://doi.org/10.1080/14697680701381228 (Crossref DOI, fetched 2026-11-27)

## Claimed Edge

Avellaneda-Stoikov quotes earn the spread while bounding inventory risk.

## Post-Publication Decay

Decay source: High-frequency trading in a limit order book. Avellaneda, Stoikov, 2008, Quantitative Finance. https://doi.org/10.1080/14697680701381228 (Crossref DOI, fetched 2026-11-27)

## Capacity

Small for retail.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[hummingbot](../../08-software/hummingbot.md), [hftbacktest](../../08-software/hftbacktest.md), [nautilus_trader](../../08-software/nautilus_trader.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- code OctoBot: packages/tentacles/Trading/Mode/market_making_trading_mode
- code hftbacktest: examples/GLFT Market Making Model and Grid Trading.ipynb
- code hftbacktest: examples/High-Frequency Grid Trading.ipynb
- code hummingbot: controllers/generic/pmm_mister.py
- code hummingbot: controllers/generic/pmm_v1.py
- code hummingbot: controllers/market_making/pmm_simple.py
- code hummingbot: hummingbot/strategy/avellaneda_market_making/
- code hummingbot: hummingbot/strategy/perpetual_market_making/
- code hummingbot: hummingbot/strategy/pure_market_making/
- code nautechsystems/nautilus_trader: crates/trading/src/examples/strategies/grid_mm/strategy.rs
- code nautechsystems/nautilus_trader: examples/backtest/fx_market_maker_gbpusd_bars.py

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
