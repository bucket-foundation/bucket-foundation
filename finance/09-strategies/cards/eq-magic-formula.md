# Magic Formula

ID: `eq-magic-formula`
Family: Equities
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Strategies in code

## Logic

Rank stocks on earnings yield, EBIT over enterprise value, and return on capital; buy the top combined ranks, hold a year.

## Source

1. Source code in `finance/code/`: 1 implementations listed in `08-software/STRATEGIES-IN-CODE.md` (read 2026-11-27).

## Claimed Edge

Greenblatt 2005 reported high returns from 1988 to 2004 in his book. QuantConnect ships the rule.

## Post-Publication Decay

No fetched post-publication study. Grade C.

## Capacity

Large.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[QuantConnect/Lean](../../08-software/lean.md)

## Code

- `QuantConnect/Lean: Algorithm.Python/Alphas/GreenblattMagicFormulaAlpha.py`

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
