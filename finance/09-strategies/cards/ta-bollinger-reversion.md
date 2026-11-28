# Bollinger Band Reversion

ID: `ta-bollinger-reversion`
Family: Technical Analysis
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Strategies in code

## Logic

Buy when price closes below the lower Bollinger band or %B falls under a threshold, sell above the upper band; some versions add an RSI or envelope filter.

## Source

1. Simple Technical Trading Rules and the Stochastic Properties of Stock Returns. BROCK and co-authors, 1992, The Journal of Finance. https://doi.org/10.1111/j.1540-6261.1992.tb04681.x (Crossref search, fetched 2026-11-27)
2. Source code in `finance/code/`: 9 implementations listed in `08-software/STRATEGIES-IN-CODE.md` (read 2026-11-27).

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

[QuantDinger](../../08-software/quantdinger.md), [hummingbot](../../08-software/hummingbot.md), [nautechsystems/nautilus_trader](../../08-software/nautilus_trader.md), [polakowo/vectorbt](../../08-software/vectorbt.md)

## Code

- `hummingbot: controllers/directional_trading/bollinger_v1.py`
- `hummingbot: controllers/directional_trading/bollinger_v2.py`
- `nautechsystems/nautilus_trader: examples/live/architect_ax/strategies.py BBMeanReversion`
- `polakowo/vectorbt: examples/TelegramSignals.ipynb`
- `QuantDinger: library/strategies/024_quantdinger_price_action_bollinger.py`
- `QuantDinger: library/strategies/043_quantdinger_bollinger_rsi_reversion.py`
- `QuantDinger: library/strategies/047_quantdinger_double_extreme_hunter.py`
- `QuantDinger: library/strategies/083_quantdinger_ma_band.py`
- `QuantDinger: library/strategies/084_quantdinger_displaced_envelope.py`

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
