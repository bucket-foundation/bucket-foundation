# Stacked Moving Averages and Ribbons

ID: `ta-three-ma-stack`
Family: Technical Analysis
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Strategies in code

## Logic

Hold long only while three or more moving averages, a displaced ribbon, Guppy or Alligator lines, are stacked in rising order; exit when the order breaks.

## Source

1. Simple Technical Trading Rules and the Stochastic Properties of Stock Returns. BROCK and co-authors, 1992, The Journal of Finance. https://doi.org/10.1111/j.1540-6261.1992.tb04681.x (Crossref search, fetched 2026-11-27)
2. Kakushadze and Serur, 151 Trading Strategies, section 3.13. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27); Spanish edition arXiv 1912.04492 (arXiv API, fetched 2026-11-27)
3. Source code in `finance/code/`: 7 implementations listed in `08-software/STRATEGIES-IN-CODE.md` (read 2026-11-27).

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

[QuantConnect/Lean](../../08-software/lean.md), [QuantDinger](../../08-software/quantdinger.md), [backtesting.py](../../08-software/backtesting-py.md)

## Code

- `backtesting.py: doc/examples/Multiple Time Frames.py`
- `QuantConnect/Lean: Algorithm.Python/DisplacedMovingAverageRibbon.py`
- `QuantDinger: library/strategies/028_quantdinger_triple_dema.py`
- `QuantDinger: library/strategies/030_quantdinger_three_signal_trend.py`
- `QuantDinger: library/strategies/101_quantdinger_super_guppy.py`
- `QuantDinger: library/strategies/160_quantdinger_bill_williams_alligator_improved.py`
- `QuantDinger: library/strategies/173_quantdinger_triple_ema_trend.py`

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
