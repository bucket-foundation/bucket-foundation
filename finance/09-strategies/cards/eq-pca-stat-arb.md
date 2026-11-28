# PCA Statistical Arbitrage

ID: `eq-pca-stat-arb`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Regress each stock on ETF or PCA factors, model the residual as an Ornstein-Uhlenbeck process, trade its s-score.

## Source

1. Statistical arbitrage in the US equities market. Avellaneda, Lee, 2010, Quantitative Finance. https://doi.org/10.1080/14697680903124632 (Crossref DOI, fetched 2026-11-27)
2. Kakushadze and Serur, 151 Trading Strategies, section 3.18. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27)

## Claimed Edge

Avellaneda and Lee report positive Sharpe ratios for PCA and ETF residual signals before costs.

## Post-Publication Decay

Avellaneda and Lee report performance deteriorated after 2002 and in the August 2007 quant crash.

Decay source: Statistical arbitrage in the US equities market. Avellaneda, Lee, 2010, Quantitative Finance. https://doi.org/10.1080/14697680903124632 (Crossref DOI, fetched 2026-11-27)

## Capacity

Medium. High turnover.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[mlfinlab](../../08-software/mlfinlab.md), [nautilus_trader](../../08-software/nautilus_trader.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- KS 3.10

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
