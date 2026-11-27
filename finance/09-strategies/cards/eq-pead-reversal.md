# Reversal of Prior Earnings Reaction

ID: `eq-pead-reversal`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Quantpedia

## Logic

The day before an earnings date, buy stocks with a negative abnormal reaction at the previous announcement and short those with a positive one.

## Source

1. Quantpedia, Reversal in Post-Earnings Announcement Drift. https://quantpedia.com/strategies/reversal-in-post-earnings-announcement-drift/ (web fetch, fetched 2026-11-27)
2. Miliian: Overreacting to a History of Underreaction? https://www.aeaweb.org/conference/2014/retrieve.php?pdfid=731. http://papers.ssrn.com/sol3/papers.cfm?abstract_id=2229479 (linked from Quantpedia; SSRN blocked the fetch )

## Claimed Edge

Quantpedia, from the source paper over 1996 to 2010: 40.32% per annum.

## Post-Publication Decay

No fetched post-publication study. Grade C.

Decay source: Does Academic Research Destroy Stock Return Predictability?. MCLEAN, PONTIFF, 2016, The Journal of Finance. https://doi.org/10.1111/jofi.12365 (Crossref search, fetched 2026-11-27)

## Capacity

Medium.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
