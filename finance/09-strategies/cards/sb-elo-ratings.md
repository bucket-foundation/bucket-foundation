# Elo Rating Models

ID: `sb-elo-ratings`
Family: Sports Betting
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Rate teams with Elo and convert rating gaps into win probabilities.

## Source

1. Using ELO ratings for match result prediction in association football. Hvattum, Arntzen, 2010, International Journal of Forecasting. https://doi.org/10.1016/j.ijforecast.2009.10.002 (Crossref DOI, fetched 2026-11-27)

## Claimed Edge

Elo forecasts beat simpler benchmarks but trail bookmaker odds.

## Post-Publication Decay

No edge over closing lines.

Decay source: Using ELO ratings for match result prediction in association football. Hvattum, Arntzen, 2010, International Journal of Forecasting. https://doi.org/10.1016/j.ijforecast.2009.10.002 (Crossref DOI, fetched 2026-11-27)

## Capacity

Tiny.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
