# Put-Call Parity Deviations

ID: `op-put-call-parity`
Family: Options and Volatility
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Buy stocks whose calls are expensive versus puts, short the reverse.

## Source

1. Deviations from Put-Call Parity and Stock Return Predictability. Cremers, Weinbaum, 2010, Journal of Financial and Quantitative Analysis. https://doi.org/10.1017/s002210901000013x (Crossref search, fetched 2026-11-27)

## Claimed Edge

Long-short earned about 50 basis points a week in 1996-2005.

## Post-Publication Decay

Cremers and Weinbaum report predictability fell over their sample.

Decay source: Deviations from Put-Call Parity and Stock Return Predictability. Cremers, Weinbaum, 2010, Journal of Financial and Quantitative Analysis. https://doi.org/10.1017/s002210901000013x (Crossref search, fetched 2026-11-27)

## Capacity

Small.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
