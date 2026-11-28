# Pre-FOMC Announcement Drift

ID: `eq-pre-fomc-drift`
Family: Equities
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Hold US equities in the 24 hours before scheduled FOMC announcements.

## Source

1. The Pre‐FOMC Announcement Drift. Lucca, Moench, 2015, The Journal of Finance. https://doi.org/10.1111/jofi.12196 (Crossref DOI, fetched 2026-11-27)
2. Quantpedia free strategy page. https://quantpedia.com/strategies/federal-open-market-committee-meeting-effect-in-stocks/ (fetched 2026-11-27)

## Claimed Edge

Large average excess returns on US equities before scheduled FOMC decisions, a sizable share of annual realized returns.

## Post-Publication Decay

Later work finds the drift weaker after 2015.

Decay source: The Disappearing Pre-FOMC Announcement Drift. Gilbert, Kurov, Wolfe, 2018, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3134546 (Crossref search, fetched 2026-11-27)

## Capacity

Large via index futures.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md), [D-macro](../../03-data-sources/cards/D-macro.md)

## Implementation

[vectorbt](../../08-software/vectorbt.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- Quantpedia federal-open-market-committee-meeting-effect-in-stocks

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
