# Price and Slope versus Moving Average

ID: `ta-price-above-ma`
Family: Technical Analysis
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Strategies in code

## Logic

Hold the asset while price sits above an adaptive or plain moving average, or while that average slopes up, KAMA, zero-lag and gradient filters included; exit otherwise.

## Source

1. Simple Technical Trading Rules and the Stochastic Properties of Stock Returns. BROCK and co-authors, 1992, The Journal of Finance. https://doi.org/10.1111/j.1540-6261.1992.tb04681.x (Crossref search, fetched 2026-11-27)
2. Kakushadze and Serur, 151 Trading Strategies, section 3.11. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27); Spanish edition arXiv 1912.04492 (arXiv API, fetched 2026-11-27)
3. Simple Technical Trading Rules and the Stochastic Properties of Stock Returns. BROCK and co-authors, 1992, The Journal of Finance. https://doi.org/10.1111/j.1540-6261.1992.tb04681.x (Crossref search, fetched 2026-11-27)
4. Source code in `finance/code/`: 13 implementations listed in `08-software/STRATEGIES-IN-CODE.md` (read 2026-11-27).

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

[QuantDinger](../../08-software/quantdinger.md)

## Code

- `QuantDinger: library/strategies/012_quantdinger_uhl_ma_system.py`
- `QuantDinger: library/strategies/020_quantdinger_hull_tsi.py`
- `QuantDinger: library/strategies/033_quantdinger_friction_trend.py`
- `QuantDinger: library/strategies/044_quantdinger_kama_slope.py`
- `QuantDinger: library/strategies/049_quantdinger_ema_slope_trend.py`
- `QuantDinger: library/strategies/057_quantdinger_adaptive_trend_flow.py`
- `QuantDinger: library/strategies/075_quantdinger_golden_vector.py`
- `QuantDinger: library/strategies/076_quantdinger_gradient_trend_filter.py`
- `QuantDinger: library/strategies/078_quantdinger_hull_fisher.py`
- `QuantDinger: library/strategies/080_quantdinger_kama_atr.py`
- `QuantDinger: library/strategies/106_quantdinger_triangular_hull.py`
- `QuantDinger: library/strategies/178_quantdinger_zero_lag_ma_trend_following.py`
- `QuantDinger: library/strategies/190_quantdinger_kahlman_hullma_wt_cross_strategy.py`

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
