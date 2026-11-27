# MACD Signal Cross

ID: `ta-macd`
Family: Technical Analysis
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Strategies in code

## Logic

Go long when the MACD line crosses above its signal line or the histogram turns positive, with a trend or ADX filter; exit on the reverse.

## Source

1. Simple Technical Trading Rules and the Stochastic Properties of Stock Returns. BROCK and co-authors, 1992, The Journal of Finance. https://doi.org/10.1111/j.1540-6261.1992.tb04681.x (Crossref search, fetched 2026-11-27)
2. Source code in `finance/code/`: 10 implementations listed in `08-software/STRATEGIES-IN-CODE.md` (read 2026-11-27).

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

[QuantConnect/Lean](../../08-software/lean.md), [QuantDinger](../../08-software/quantdinger.md), [backtrader](../../08-software/backtrader.md), [crypto-trading-bot](../../08-software/crypto-trading-bot.md), [polakowo/vectorbt](../../08-software/vectorbt.md), [rqalpha](../../08-software/rqalpha.md)

## Code

- `backtrader: samples/macd-settings/macd-settings.py`
- `polakowo/vectorbt: examples/MACDVolume.ipynb`
- `QuantConnect/Lean: Algorithm.Framework/Alphas/MacdAlphaModel.py`
- `QuantConnect/Lean: Algorithm.Python/MACDTrendAlgorithm.py`
- `rqalpha: rqalpha/examples/macd.py`
- `crypto-trading-bot: src/strategy/strategies/macd.ts`
- `QuantDinger: library/strategies/081_quantdinger_macd_reloaded.py`
- `QuantDinger: library/strategies/082_quantdinger_macd_rsi_momentum.py`
- `QuantDinger: library/strategies/150_quantdinger_macd_bb_rsi_alorse.py`
- `QuantDinger: library/strategies/151_quantdinger_macd_liquidity_tracker_strategy_quant_trading.py`

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
