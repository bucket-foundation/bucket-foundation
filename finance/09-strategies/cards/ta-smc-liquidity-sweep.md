# Liquidity Sweep and Order Blocks

ID: `ta-smc-liquidity-sweep`
Family: Technical Analysis
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Strategies in code

## Logic

Wait for price to run past a prior high or low, then enter back inside the range at an order block or fair value gap, as in smart money concept and Wyckoff spring setups.

## Source

1. Simple Technical Trading Rules and the Stochastic Properties of Stock Returns. BROCK and co-authors, 1992, The Journal of Finance. https://doi.org/10.1111/j.1540-6261.1992.tb04681.x (Crossref search, fetched 2026-11-27)
2. Source code in `finance/code/`: 7 implementations listed in `08-software/STRATEGIES-IN-CODE.md` (read 2026-11-27).

## Claimed Edge

The code ships the rule with no performance claim; no peer-reviewed test found.

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

- `QuantDinger: library/strategies/094_quantdinger_quasimodo.py`
- `QuantDinger: library/strategies/098_quantdinger_smc_zones.py`
- `QuantDinger: library/strategies/120_quantdinger_bsl_ssl_sweep_fvg_strategy_fixed_entry_logic.py`
- `QuantDinger: library/strategies/149_quantdinger_liquidity_sweep_breakout_lsb.py`
- `QuantDinger: library/strategies/176_quantdinger_wyckoff_range_strategy_by_deperp.py`
- `QuantDinger: library/strategies/192_quantdinger_luxalgo_smc_pro_ultimate.py`
- `QuantDinger: library/strategies/200_quantdinger_supply_demand_zones_order_block_pro_fusion_auto_order.py`

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
