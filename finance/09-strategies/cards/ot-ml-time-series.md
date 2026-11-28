# Machine Learning Time-Series Forecast

ID: `ot-ml-time-series`
Family: Other
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Strategies in code

## Logic

Train gradient boosting, SVM, LSTM or FreqAI models on lagged features of one asset, funding, order flow or FX, and trade the sign of the forecast above a threshold.

## Source

1. Source code in `finance/code/`: 6 implementations listed in `08-software/STRATEGIES-IN-CODE.md` (read 2026-11-27).

## Claimed Edge

Repos report backtests only.

## Post-Publication Decay

No fetched post-publication study. Grade C.

## Capacity

Medium.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[freqtrade](../../08-software/freqtrade.md), [stefan-jansen/machine-learning-for-trading](../../08-software/machine-learning-for-trading.md)

## Code

- `freqtrade: freqtrade/templates/FreqaiExampleStrategy.py`
- `freqtrade: freqtrade/templates/FreqaiExampleHybridStrategy.py`
- `stefan-jansen/machine-learning-for-trading: case_studies/crypto_perps_funding`
- `stefan-jansen/machine-learning-for-trading: case_studies/nasdaq100_microstructure`
- `stefan-jansen/machine-learning-for-trading: case_studies/fx_pairs`
- `stefan-jansen/machine-learning-for-trading: case_studies/cme_futures`

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
