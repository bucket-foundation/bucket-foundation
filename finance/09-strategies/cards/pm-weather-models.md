# Weather Market Forecast Edge

ID: `pm-weather-models`
Family: Prediction Markets
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Price Kalshi and Polymarket temperature contracts from NOAA ensemble forecasts and trade gaps.

## Source

1. API Web Service. web. https://www.weather.gov/documentation/services-web-api (web page, fetched 2026-11-27)

## Claimed Edge

Ensemble forecasts give calibrated probabilities that thin markets may misprice.

## Post-Publication Decay

Edge depends on other traders ignoring public models.

Decay source: Makers and Takers: The Economics of the Kalshi Prediction Market. Bürgi, Deng, Whelan, 2025. https://doi.org/10.2139/ssrn.5502658 (Crossref search, fetched 2026-11-27)

## Capacity

Tiny.

## Data Needed

[D-macro](../../03-data-sources/cards/D-macro.md)

## Implementation

[polymarket-kalshi-weather-bot](../../08-software/polymarket-kalshi-weather-bot.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- code polymarket-kalshi-weather-bot: backend/core/weather_signals.py

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
