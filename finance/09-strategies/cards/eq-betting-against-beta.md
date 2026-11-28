# Betting Against Beta

ID: `eq-betting-against-beta`
Family: Equities
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Long leveraged low-beta stocks, short deleveraged high-beta stocks, beta-neutral.

## Source

1. Betting against beta. Frazzini, Pedersen, 2014, Journal of Financial Economics. https://doi.org/10.1016/j.jfineco.2013.10.005 (Crossref DOI, fetched 2026-11-27)
2. Kakushadze and Serur, 151 Trading Strategies, section 3.4. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27)
3. Quantpedia free strategy page. https://quantpedia.com/strategies/betting-against-beta-factor-in-stocks/ (fetched 2026-11-27)

## Claimed Edge

BAB earned positive risk-adjusted returns in US equities, international equities, Treasuries, credit and futures.

## Post-Publication Decay

Novy-Marx and Velikov show much of the BAB return comes from beta-shrinkage and rank-weighting choices that inflate microcap exposure.

Decay source: Betting against betting against beta. Novy-Marx, Velikov, 2022, Journal of Financial Economics. https://doi.org/10.1016/j.jfineco.2021.05.023 (Crossref DOI, fetched 2026-11-27)

## Capacity

Large in the long-only low-vol version. The leveraged long-short needs cheap financing.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[alphalens-reloaded](../../08-software/alphalens-reloaded.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- Beta
- BetaDimson
- BetaFP
- BetaSquared
- Quantpedia betting-against-beta-factor-in-stocks

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
