# Currency Value

ID: `fx-value-ppp`
Family: FX
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Buy currencies cheap versus purchasing power parity, sell expensive.

## Source

1. Currency Value. Menkhoff, Sarno, Schmeling, Schrimpf, 2016, Review of Financial Studies. https://doi.org/10.1093/rfs/hhw067 (Crossref DOI, fetched 2026-11-27)
2. Kakushadze and Serur, 151 Trading Strategies, section 8.3. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27)
3. Quantpedia free strategy page. https://quantpedia.com/strategies/currency-value-factor-ppp-strategy/ (fetched 2026-11-27)

## Claimed Edge

Value earns returns tied to macro fundamentals.

## Post-Publication Decay

Slow signal with multi-year drawdowns.

Decay source: Value and Momentum Everywhere. Asness, Moskowitz, Pedersen, 2013, The Journal of Finance. https://doi.org/10.1111/jofi.12021 (Crossref DOI, fetched 2026-11-27)

## Capacity

Large.

## Data Needed

[D-macro](../../03-data-sources/cards/D-macro.md)

## Implementation

No open-source implementation in `code/`.

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- Quantpedia currency-value-factor-ppp-strategy

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
