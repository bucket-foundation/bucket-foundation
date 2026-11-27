# Accrual Anomaly

ID: `eq-accruals`
Family: Equities
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Short firms whose earnings come from accruals, buy those whose earnings come from cash.

## Source

1. Going, Going, Gone? The Demise of the Accruals Anomaly. Green, Hand, Soliman, 2009. https://doi.org/10.2139/ssrn.1501020 (Crossref search, fetched 2026-11-27)
2. Quantpedia free strategy page. https://quantpedia.com/strategies/accrual-anomaly/ (fetched 2026-11-27)

## Claimed Edge

Sloan found the accrual component of earnings less persistent than cash flows, and prices fail to reflect it.

## Post-Publication Decay

Green, Hand and Soliman report the accrual hedge return decayed to near zero after 2000.

Decay source: Going, Going, Gone? The Demise of the Accruals Anomaly. Green, Hand, Soliman, 2009. https://doi.org/10.2139/ssrn.1501020 (Crossref search, fetched 2026-11-27)

## Capacity

Medium.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md)

## Implementation

[alphalens-reloaded](../../08-software/alphalens-reloaded.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- Accruals
- Quantpedia accrual-anomaly

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
