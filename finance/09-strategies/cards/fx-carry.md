# Currency Carry Trade

ID: `fx-carry`
Family: FX
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Long high-interest currencies, short low-interest currencies through forwards.

## Source

1. Common Risk Factors in Currency Markets. Lustig, Roussanov, Verdelhan, 2011, Review of Financial Studies. https://doi.org/10.1093/rfs/hhr068 (Crossref DOI, fetched 2026-11-27)
2. Kakushadze and Serur, 151 Trading Strategies, section 8.2. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27)
3. Quantpedia free strategy page. https://quantpedia.com/strategies/fx-carry-trade/ (fetched 2026-11-27)

## Claimed Edge

Carry earns positive average returns explained by a global risk factor.

## Post-Publication Decay

Brunnermeier, Nagel and Pedersen show carry crashes when funding liquidity dries up, as in 2008.

Decay source: Carry Trades and Currency Crashes. Brunnermeier, Nagel, Pedersen, 2008, NBER Macroeconomics Annual. https://doi.org/10.1086/593088 (Crossref DOI, fetched 2026-11-27)

## Capacity

Large.

## Data Needed

[D-macro](../../03-data-sources/cards/D-macro.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[pysystemtrade](../../08-software/pysystemtrade.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- KS 8.2
- Quantpedia fx-carry-trade

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
