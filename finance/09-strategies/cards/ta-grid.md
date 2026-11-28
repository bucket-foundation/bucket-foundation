# Grid Trading

ID: `ta-grid`
Family: Technical Analysis
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Strategies in code

## Logic

Place buy orders at fixed steps below price and sell orders above inside a range; each fill re-posts the opposite order.

## Source

1. Simple Technical Trading Rules and the Stochastic Properties of Stock Returns. BROCK and co-authors, 1992, The Journal of Finance. https://doi.org/10.1111/j.1540-6261.1992.tb04681.x (Crossref search, fetched 2026-11-27)
2. Source code in `finance/code/`: 6 implementations listed in `08-software/STRATEGIES-IN-CODE.md` (read 2026-11-27).

## Claimed Edge

The code ships the rule with no performance claim. Grids earn in ranges and carry unbounded inventory in trends.

## Post-Publication Decay

Sullivan, Timmermann and White 1999 tested 7,846 technical rules with a data-snooping bootstrap: the best rule beat the Dow from 1897 to 1986 and showed no edge from 1987 to 1996. Park and Irwin 2007 found most profitable results predate the 1990s.

Decay source: Data‐Snooping, Technical Trading Rule Performance, and the Bootstrap. Sullivan and co-authors, 1999, The Journal of Finance. https://doi.org/10.1111/0022-1082.00163 (Crossref search, fetched 2026-11-27)

## Capacity

Medium.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OctoBot](../../08-software/octobot.md), [hummingbot](../../08-software/hummingbot.md)

## Code

- `hummingbot: controllers/directional_trading/bollingrid.py`
- `hummingbot: controllers/generic/grid_strike.py`
- `hummingbot: controllers/generic/multi_grid_strike.py`
- `hummingbot: controllers/generic/quantum_grid_allocator.py`
- `OctoBot: packages/tentacles/Trading/Mode/grid_trading_mode`
- `OctoBot: packages/tentacles/Trading/Mode/staggered_orders_trading_mode`

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
