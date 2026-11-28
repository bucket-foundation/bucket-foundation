# Candlestick Pattern Reversal

ID: `ta-candlestick`
Family: Technical Analysis
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Strategies in code

## Logic

Enter on engulfing, three-bar or contraction candle patterns at extremes, with a band or volume filter.

## Source

1. Simple Technical Trading Rules and the Stochastic Properties of Stock Returns. BROCK and co-authors, 1992, The Journal of Finance. https://doi.org/10.1111/j.1540-6261.1992.tb04681.x (Crossref search, fetched 2026-11-27)
2. Source code in `finance/code/`: 6 implementations listed in `08-software/STRATEGIES-IN-CODE.md` (read 2026-11-27).

## Claimed Edge

Marshall, Young and Rose 2006 found candlestick rules unprofitable on Dow stocks from 1992 to 2002.

## Post-Publication Decay

Sullivan, Timmermann and White 1999 tested 7,846 technical rules with a data-snooping bootstrap: the best rule beat the Dow from 1897 to 1986 and showed no edge from 1987 to 1996. Park and Irwin 2007 found most profitable results predate the 1990s.

Decay source: Data‐Snooping, Technical Trading Rule Performance, and the Bootstrap. Sullivan and co-authors, 1999, The Journal of Finance. https://doi.org/10.1111/0022-1082.00163 (Crossref search, fetched 2026-11-27)

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[QuantDinger](../../08-software/quantdinger.md)

## Code

- `QuantDinger: library/strategies/006_quantdinger_trend_reversal.py`
- `QuantDinger: library/strategies/037_quantdinger_trapped_countertrend.py`
- `QuantDinger: library/strategies/060_quantdinger_standard_bar_reversal.py`
- `QuantDinger: library/strategies/086_quantdinger_engulfing_stability.py`
- `QuantDinger: library/strategies/153_quantdinger_momentum_sequence_strategy_herman.py`
- `QuantDinger: library/strategies/161_quantdinger_sequence_snap_rsi_confirmed_reversal_scalper.py`

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
