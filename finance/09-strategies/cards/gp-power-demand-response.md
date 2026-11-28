# Flexible Load Power Arbitrage

ID: `gp-power-demand-response`
Family: GPU and Compute
Retail feasibility: **D**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Run compute or miners when power is cheap, curtail and sell back during price spikes in ERCOT.

## Source

1. Electric Reliability Council of Texas. web. https://www.ercot.com/ (web page, fetched 2026-11-27)

## Claimed Edge

Curtailment credits in summer 2023 exceeded mining revenue for some Texas miners.

## Post-Publication Decay

Decay source: Electric Reliability Council of Texas. web. https://www.ercot.com/ (web page, fetched 2026-11-27)

## Capacity

Medium.

## Data Needed

[D-macro](../../03-data-sources/cards/D-macro.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
