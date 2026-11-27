# Earnings Announcement Premium

ID: `eq-earnings-announcement-premium`
Family: Equities
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Hold stocks in the weeks they are scheduled to announce earnings.

## Source

1. Earnings Announcements and Systematic Risk. Savor, Wilson, 2016, The Journal of Finance. https://doi.org/10.1111/jofi.12361 (Crossref DOI, fetched 2026-11-27)
2. Quantpedia free strategy page. https://quantpedia.com/strategies/earnings-announcement-premium/ (fetched 2026-11-27)

## Claimed Edge

Announcing firms earn higher returns than non-announcers, linked to systematic risk at announcement.

## Post-Publication Decay

No post-publication study turned up in a Crossref search on 2026-11-27.

Decay source: Does Academic Research Destroy Stock Return Predictability?. Mclean, Pontiff, 2016, The Journal of Finance. https://doi.org/10.1111/jofi.12365 (Crossref DOI, fetched 2026-11-27)

## Capacity

Medium.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[zipline-reloaded](../../08-software/zipline-reloaded.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- Quantpedia earnings-announcement-premium

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
