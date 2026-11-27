# Neural Network Crypto Forecast

ID: `cy-ann-forecast`
Family: Crypto
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Kakushadze-Serur

## Logic

Train a neural network on lagged normalized returns, classify the next period into return quantiles and trade the predicted direction.

## Source

1. Kakushadze and Serur, 151 Trading Strategies, section 18.2. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27); Spanish edition arXiv 1912.04492 (arXiv API, fetched 2026-11-27)

## Claimed Edge

The book gives the method and cites crypto ANN studies with positive backtests.

## Post-Publication Decay

No fetched post-publication study for this strategy. Grade C.

## Capacity

Medium.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
