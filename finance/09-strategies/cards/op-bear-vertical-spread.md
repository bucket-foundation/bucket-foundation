# Bear Vertical Spread

ID: `op-bear-vertical-spread`
Family: Options and Volatility
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Kakushadze-Serur

## Logic

Sell a lower-strike call and buy a higher one, or buy a higher-strike put and sell a lower one. Section 2.9 is the put version with the same payoff.

## Source

1. Kakushadze and Serur, 151 Trading Strategies, section 2.8. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27); Spanish edition arXiv 1912.04492 (arXiv API, fetched 2026-11-27)

## Claimed Edge

A payoff structure. The book gives the payoff and break-evens, no return figure; the result depends on the implied volatility paid or received.

## Post-Publication Decay

No decay study fetched for this structure. Index option sellers earned the variance premium after 2010 with deep losses in February 2018 and March 2020. Grade C.

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
