# The Importance of Low Latency to Order Book Imbalance Trading Strategies

ID: `eq-ax-the-importance-of-low-latency-to-order-book-imbala`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: arXiv q-fin.TR or q-fin.PM 2015 to 2026

## Logic

From the abstract: Accordingly, we investigate the relationship between latency of access to order book information and profitability of trading strategies exploiting that information with an agent-based interactive discrete event simulation in which thousands of agents pursue archetypal trading strategies. Our experiments support that latency is inversely related to profit for the OBI traders, but more show that latency rank, rather than absolute magnitude, is the key factor in allocating returns among agents pursuing a similar strategy.

## Source

1. The Importance of Low Latency to Order Book Imbalance Trading Strategies. David Byrd and co-authors, 2020, arXiv 2006.08682. https://arxiv.org/abs/2006.08682 (arXiv API, fetched 2026-11-27)

## Claimed Edge

The abstract reports: There is a pervasive assumption that low latency access to an exchange is a key factor in the profitability of many high-frequency trading strategies. We introduce experimental traders pursuing a low-latency order book imbalance (OBI) strategy in a controlled manner across thousands of simulated trading days, and analyze OBI trader profit while varying distance (latency) from the exchange.

## Post-Publication Decay

Single arXiv study with no out-of-sample follow-up fetched. Grade C.

## Capacity

Unknown; the abstract gives no capacity figure. Treat as Small until tested.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
