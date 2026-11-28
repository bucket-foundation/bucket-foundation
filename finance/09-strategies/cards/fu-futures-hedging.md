# Futures Hedging

ID: `fu-futures-hedging`
Family: Futures and CTA
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Kakushadze-Serur

## Logic

Offset a spot exposure with futures at the minimum-variance hedge ratio, including cross hedges and rate hedges with bond futures, sections 10.1.1 and 10.1.2.

## Source

1. Kakushadze and Serur, 151 Trading Strategies, section 10.1. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27); Spanish edition arXiv 1912.04492 (arXiv API, fetched 2026-11-27)

## Claimed Edge

A risk transfer. Cost is basis risk and roll.

## Post-Publication Decay

No fetched post-publication study for this strategy. Grade C.

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

## Merged Duplicates

- code hummingbot: controllers/generic/hedge_asset.py

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
