# Cointegration Pairs Trading

ID: `eq-pairs-cointegration`
Family: Equities
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Strategies in code

## Logic

Test pairs for cointegration, model the spread as an Ornstein-Uhlenbeck process, enter at z-score extremes and exit at the mean.

## Source

1. Co-Integration and Error Correction: Representation, Estimation, and Testing. Engle, Granger, 1987, Econometrica. https://doi.org/10.2307/1913236 (Crossref search, fetched 2026-11-27)
2. The Profitability of Pairs Trading Strategies: Distance, Cointegration, and Copula Methods. Rad and co-authors, 2015, Crossref. https://doi.org/10.2139/ssrn.2614233 (Crossref search, fetched 2026-11-27)
3. Source code in `finance/code/`: 4 implementations listed in `08-software/STRATEGIES-IN-CODE.md` (read 2026-11-27).

## Claimed Edge

Engle and Granger 1987 gave the test. Rad, Low and Faff 2016 compared distance, cointegration and copula pairs methods on US stocks from 1962 to 2014.

## Post-Publication Decay

No fetched post-publication study. Grade C.

## Capacity

Medium.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[Financial-Models-Numerical-Methods](../../08-software/financial-models-numerical-methods.md), [hummingbot](../../08-software/hummingbot.md), [polakowo/vectorbt](../../08-software/vectorbt.md), [rqalpha](../../08-software/rqalpha.md)

## Code

- `hummingbot: controllers/generic/stat_arb.py`
- `Financial-Models-Numerical-Methods: 6.1 Ornstein-Uhlenbeck process and applications.ipynb`
- `polakowo/vectorbt: examples/PairsTrading.ipynb`
- `rqalpha: rqalpha/examples/pair_trading.py`

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
