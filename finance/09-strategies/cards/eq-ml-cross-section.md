# Machine Learning Return Prediction

ID: `eq-ml-cross-section`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Train trees and neural nets on 94 firm characteristics and macro data to predict next-month returns.

## Source

1. Empirical Asset Pricing via Machine Learning. Gu, Kelly, Xiu, 2020, The Review of Financial Studies. https://doi.org/10.1093/rfs/hhaa009 (Crossref DOI, fetched 2026-11-27)

## Claimed Edge

Trees and neural nets double the performance of leading regression-based strategies in some cases.

## Post-Publication Decay

Gains concentrate in hard-to-arbitrage stocks; trading costs remove much of it in later work.

Decay source: Machine Learning Versus Economic Restrictions: Evidence from Stock Return Predictability. Avramov, Cheng, Metzker, 2019, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3450322 (Crossref search, fetched 2026-11-27)

## Capacity

Medium.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md), [D-filings](../../03-data-sources/cards/D-filings.md)

## Implementation

[qlib](../../08-software/qlib.md), [machine-learning-for-trading](../../08-software/machine-learning-for-trading.md), [finrl](../../08-software/finrl.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- code microsoft/qlib: qlib/contrib/model/*.py
- code stefan-jansen/machine-learning-for-trading: case_studies/etfs

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
