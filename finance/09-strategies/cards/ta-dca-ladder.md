# DCA Ladder

ID: `ta-dca-ladder`
Family: Technical Analysis
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Strategies in code

## Logic

Buy in scheduled or dip-triggered tranches, adding size as price falls, and take profit on the averaged entry.

## Source

1. Simple Technical Trading Rules and the Stochastic Properties of Stock Returns. BROCK and co-authors, 1992, The Journal of Finance. https://doi.org/10.1111/j.1540-6261.1992.tb04681.x (Crossref search, fetched 2026-11-27)
2. Source code in `finance/code/`: 5 implementations listed in `08-software/STRATEGIES-IN-CODE.md` (read 2026-11-27).

## Claimed Edge

The code ships the rule with no performance claim. Averaging down raises loss in a trend.

## Post-Publication Decay

Sullivan, Timmermann and White 1999 tested 7,846 technical rules with a data-snooping bootstrap: the best rule beat the Dow from 1897 to 1986 and showed no edge from 1987 to 1996. Park and Irwin 2007 found most profitable results predate the 1990s.

Decay source: Data‐Snooping, Technical Trading Rule Performance, and the Bootstrap. Sullivan and co-authors, 1999, The Journal of Finance. https://doi.org/10.1111/0022-1082.00163 (Crossref search, fetched 2026-11-27)

## Capacity

Medium.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OctoBot](../../08-software/octobot.md), [binance-trading-bot](../../08-software/binance-trading-bot.md), [crypto-trading-bot](../../08-software/crypto-trading-bot.md), [hummingbot](../../08-software/hummingbot.md)

## Code

- `hummingbot: controllers/directional_trading/dman_v3.py`
- `hummingbot: controllers/market_making/dman_maker_v2.py`
- `OctoBot: packages/tentacles/Trading/Mode/dca_trading_mode`
- `binance-trading-bot: packages/strategy/trailing-trade`
- `crypto-trading-bot: src/strategy/strategies/dca_dipper.ts`

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
