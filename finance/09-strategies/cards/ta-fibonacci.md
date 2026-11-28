# Fibonacci Retracement Entries

ID: `ta-fibonacci`
Family: Technical Analysis
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Strategies in code

## Logic

After a swing, enter on a pullback to the 38.2, 50 or 61.8 percent retracement with an oscillator confirmation, target the prior extreme.

## Source

1. Simple Technical Trading Rules and the Stochastic Properties of Stock Returns. BROCK and co-authors, 1992, The Journal of Finance. https://doi.org/10.1111/j.1540-6261.1992.tb04681.x (Crossref search, fetched 2026-11-27)
2. Source code in `finance/code/`: 4 implementations listed in `08-software/STRATEGIES-IN-CODE.md` (read 2026-11-27).

## Claimed Edge

The code ships the rule with no performance claim; no peer-reviewed support found.

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

- `QuantDinger: library/strategies/132_quantdinger_fib_confluence_scanner.py`
- `QuantDinger: library/strategies/133_quantdinger_fibonacci_rsi_strategy.py`
- `QuantDinger: library/strategies/174_quantdinger_two_bar_fib_retrace_strategy_futures.py`
- `QuantDinger: library/strategies/188_quantdinger_fibonacci_5_candles_retracement_version_2_close_bar.py`

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
