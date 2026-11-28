# Sentiment-Filtered Overnight SPY

ID: `etf-sentiment-overnight`
Family: ETFs and Macro
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Quantpedia

## Logic

Hold SPY overnight only when SPY is above its 20-day average, VIX is below its average and a news sentiment index is positive.

## Source

1. Quantpedia, Market Sentiment and an Overnight Anomaly. https://quantpedia.com/strategies/market-sentiment-and-an-overnight-anomaly/ (web fetch, fetched 2026-11-27)
2. Market Sentiment and an Overnight Anomaly. Vojtko, Hanicova, 2021, Crossref. https://doi.org/10.2139/ssrn.3829582 (Crossref search, fetched 2026-11-27)

## Claimed Edge

Quantpedia, from the source paper over 2018 to 2021: 15.58% Table on page 5.

## Post-Publication Decay

No fetched post-publication study. Grade C.

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
