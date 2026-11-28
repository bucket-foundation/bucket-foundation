# Pullback in an Uptrend

ID: `ta-pullback-uptrend`
Family: Technical Analysis
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Strategies in code

## Logic

Buy a short-term oversold reading, a 2-day RSI under 10, a close below the lower band or a sharp one-day drop, only while price is above its 200-day average; exit on a bounce or after a few bars.

## Source

1. Simple Technical Trading Rules and the Stochastic Properties of Stock Returns. BROCK and co-authors, 1992, The Journal of Finance. https://doi.org/10.1111/j.1540-6261.1992.tb04681.x (Crossref search, fetched 2026-11-27)
2. Source code in `finance/code/`: 6 implementations listed in `08-software/STRATEGIES-IN-CODE.md` (read 2026-11-27).

## Claimed Edge

Connors and Alvarez 2009 published RSI-2 rules for US stocks. The code ships the rule with no performance claim.

## Post-Publication Decay

Sullivan, Timmermann and White 1999 tested 7,846 technical rules with a data-snooping bootstrap: the best rule beat the Dow from 1897 to 1986 and showed no edge from 1987 to 1996. Park and Irwin 2007 found most profitable results predate the 1990s.

Decay source: Data‐Snooping, Technical Trading Rule Performance, and the Bootstrap. Sullivan and co-authors, 1999, The Journal of Finance. https://doi.org/10.1111/0022-1082.00163 (Crossref search, fetched 2026-11-27)

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[QuantDinger](../../08-software/quantdinger.md), [crypto-trading-bot](../../08-software/crypto-trading-bot.md)

## Code

- `crypto-trading-bot: src/strategy/strategies/cci.ts`
- `crypto-trading-bot: src/strategy/strategies/dip_catcher.ts`
- `QuantDinger: library/strategies/023_quantdinger_rsi_buy_dips.py`
- `QuantDinger: library/strategies/067_quantdinger_ma_pullback.py`
- `QuantDinger: library/strategies/122_quantdinger_buythedip.py`
- `QuantDinger: library/strategies/131_quantdinger_larry_connors_strategy_josemetal.py`

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
