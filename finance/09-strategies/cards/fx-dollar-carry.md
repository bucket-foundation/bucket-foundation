# Dollar Carry

ID: `fx-dollar-carry`
Family: FX
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Long a basket of currencies against the dollar when average foreign rates exceed US rates, short otherwise.

## Source

1. Countercyclical Currency Risk Premia. Lustig, Roussanov, Verdelhan, 2010. https://doi.org/10.3386/w16427 (Crossref search, fetched 2026-11-27)
2. Quantpedia free strategy page. https://quantpedia.com/strategies/dollar-carry-trade/ (fetched 2026-11-27)

## Claimed Edge

Dollar carry earned high Sharpe ratios in 1983-2010.

## Post-Publication Decay

Few regime switches means few independent bets.

Decay source: Does Academic Research Destroy Stock Return Predictability?. Mclean, Pontiff, 2016, The Journal of Finance. https://doi.org/10.1111/jofi.12365 (Crossref DOI, fetched 2026-11-27)

## Capacity

Large.

## Data Needed

[D-macro](../../03-data-sources/cards/D-macro.md)

## Implementation

No open-source implementation in `code/`.

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- KS 8.3
- Quantpedia dollar-carry-trade

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
