# Compute Forward Contracts

ID: `gp-compute-forward`
Family: GPU and Compute
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Buy GPU cluster time forward on a compute exchange, resell shorter blocks when spot rates rise.

## Source

1. SF Compute. web. https://sfcompute.com/ (web page, fetched 2026-11-27)

## Claimed Edge

Term structure in GPU-hours lets buyers lock rates or sell unused time.

## Post-Publication Decay

Decay source: SF Compute. web. https://sfcompute.com/ (web page, fetched 2026-11-27)

## Capacity

Small.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
