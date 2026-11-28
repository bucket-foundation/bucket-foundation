# Order Book Imbalance Taking

ID: `ot-book-imbalance`
Family: Other
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Strategies in code

## Logic

Take liquidity on the side the book leans toward when bid-ask size ratio or microprice minus mid passes a threshold.

## Source

1. The Price Impact of Order Book Events. Cont and co-authors, 2013, Journal of Financial Econometrics. https://doi.org/10.1093/jjfinec/nbt003 (Crossref search, fetched 2026-11-27)
2. Source code in `finance/code/`: 3 implementations listed in `08-software/STRATEGIES-IN-CODE.md` (read 2026-11-27).

## Claimed Edge

Cont, Kukanov and Stoikov 2014 found order flow imbalance explains short-horizon price changes.

## Post-Publication Decay

No fetched post-publication study. Grade C.

## Capacity

Small.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[nautechsystems/nautilus_trader](../../08-software/nautilus_trader.md), [prediction-market-backtesting](../../08-software/prediction-market-backtesting.md)

## Code

- `nautechsystems/nautilus_trader: crates/trading/src/examples/strategies/orderbook_imbalance/strategy.rs`
- `nautechsystems/nautilus_trader: examples/backtest/finfeed_polymarket_book_imbalance.py`
- `prediction-market-backtesting: strategies/microprice_imbalance.py`

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
