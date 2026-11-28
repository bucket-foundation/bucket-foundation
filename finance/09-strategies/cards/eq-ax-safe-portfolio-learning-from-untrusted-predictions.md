# Safe Portfolio Learning from Untrusted Predictions: Signed Trust

ID: `eq-ax-safe-portfolio-learning-from-untrusted-predictions`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: arXiv q-fin.TR or q-fin.PM 2015 to 2026

## Logic

From the abstract: A controller chooses among Safe, Follow, and Reverse portfolio actions, so signal orientation is learned rather than assumed.

## Source

1. Safe Portfolio Learning from Untrusted Predictions: Signed Trust, Abstention, and Cross-Universe Polarity Failure. Amirhossein MohammadpourAzari and co-authors, 2026, arXiv 2611.04826. https://arxiv.org/abs/2611.04826 (arXiv API, fetched 2026-11-27)

## Claimed Edge

The abstract reports: On a frozen 82-stock holdout, the pre-specified Reverse orientation fails to outperform Equal Weight; a separately labeled post-holdout diagnostic shows that permanently flipping the sign to Follow also does not recover a return edge. Under the post-holdout controller, protected wealth remains within 15.9 basis points of the Safe benchmark throughout.

## Post-Publication Decay

Single arXiv study with no out-of-sample follow-up fetched. Grade C.

## Capacity

Unknown; the abstract gives no capacity figure. Treat as Small until tested.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
