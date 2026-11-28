# GPU Ownership and Rental

ID: `gp-gpu-rental`
Family: GPU and Compute
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Buy GPUs, rent them on marketplaces such as Vast.ai, earn the hourly rate minus power.

## Source

1. https://vast.ai/pricing. web. https://vast.ai/pricing (web page, fetched 2026-11-27)
2. The Price of Compute: Hedonic Evidence from GPU Rental Markets. Shek, 2026. https://doi.org/10.2139/ssrn.7541938 (Crossref DOI, fetched 2026-11-27)

## Claimed Edge

Payback depends on hourly rate, utilization and power cost.

## Post-Publication Decay

Across 556 GPU rental listings, spot contracts trade at a 62.6% discount and hyperscalers charge 138.9% more than specialized clouds (Shek, 2026); check the live marketplace before buying.

Decay source: The Price of Compute: Hedonic Evidence from GPU Rental Markets. Shek, 2026. https://doi.org/10.2139/ssrn.7541938 (Crossref DOI, fetched 2026-11-27)

## Capacity

Small.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
