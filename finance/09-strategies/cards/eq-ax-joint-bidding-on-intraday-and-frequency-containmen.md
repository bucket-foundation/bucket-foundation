# Joint Bidding on Intraday and Frequency Containment Reserve Markets

ID: `eq-ax-joint-bidding-on-intraday-and-frequency-containmen`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: arXiv q-fin.TR or q-fin.PM 2015 to 2026

## Logic

From the abstract: Our approach utilizes a mixed integer linear programming implementation of the rolling intrinsic algorithm for intraday decisions and state of charge recovery, alongside a learned classifier strategy (LCS) that determines optimal capacity allocation between markets., our method closes the gap to a theoretical perfect foresight strategy to just 4%, demonstrating the effectiveness of dynamic, learning-based allocation in a complex, multi-market environment.

## Source

1. Joint Bidding on Intraday and Frequency Containment Reserve Markets. Yiming Zhang and co-authors, 2025, arXiv 2510.03209. https://arxiv.org/abs/2510.03209 (arXiv API, fetched 2026-11-27)

## Claimed Edge

The abstract reports: A comprehensive out-of-sample backtest over more than one year of historical German market data validates our approach: The LCS increases overall profits by over 4% compared to the best-performing static strategy and by more than 3% over a naive dynamic benchmark.

## Post-Publication Decay

Single arXiv study with no out-of-sample follow-up fetched. Grade C.

## Capacity

Unknown; the abstract gives no capacity figure. Treat as Small until tested.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
