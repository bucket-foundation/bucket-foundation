# ADX and DMI Trend Filter

ID: `ta-adx-dmi`
Family: Technical Analysis
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Strategies in code

## Logic

Trade in the direction of the higher of DI+ and DI- only when ADX shows a strong trend, above 20 to 50; stand aside in chop.

## Source

1. Simple Technical Trading Rules and the Stochastic Properties of Stock Returns. BROCK and co-authors, 1992, The Journal of Finance. https://doi.org/10.1111/j.1540-6261.1992.tb04681.x (Crossref search, fetched 2026-11-27)
2. Source code in `finance/code/`: 7 implementations listed in `08-software/STRATEGIES-IN-CODE.md` (read 2026-11-27).

## Claimed Edge

The code ships the rule with no performance claim. Brock, Lakonishok and LeBaron 1992 found simple trading rules beat buy-and-hold on the Dow before 1987.

## Post-Publication Decay

Sullivan, Timmermann and White 1999 tested 7,846 technical rules with a data-snooping bootstrap: the best rule beat the Dow from 1897 to 1986 and showed no edge from 1987 to 1996. Park and Irwin 2007 found most profitable results predate the 1990s.

Decay source: Data‐Snooping, Technical Trading Rule Performance, and the Bootstrap. Sullivan and co-authors, 1999, The Journal of Finance. https://doi.org/10.1111/0022-1082.00163 (Crossref search, fetched 2026-11-27)

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[QuantDinger](../../08-software/quantdinger.md), [jesse](../../08-software/jesse.md)

## Code

- `jesse: jesse/strategies/RealStrategyRegression3/__init__.py`
- `QuantDinger: library/strategies/038_quantdinger_ma_adx_filter.py`
- `QuantDinger: library/strategies/058_quantdinger_adx_dmi_trend.py`
- `QuantDinger: library/strategies/071_quantdinger_ema_rsi_adx.py`
- `QuantDinger: library/strategies/137_quantdinger_bollinger_bands_rsi_and_adx_trading_system.py`
- `QuantDinger: library/strategies/152_quantdinger_macd_pullback_sniper_trend_adx_filtered_strategy.py`
- `QuantDinger: library/strategies/157_quantdinger_rob_booker_adx_breakout.py`

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
