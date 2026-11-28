# Covered Interest Parity Arbitrage

ID: `fx-cip-deviation`
Family: FX
Retail feasibility: **D**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Borrow dollars, convert, lend in foreign currency and hedge forward when the cross-currency basis is wide.

## Source

1. Deviations from Covered Interest Rate Parity. Du, Tepper, Verdelhan, 2018, The Journal of Finance. https://doi.org/10.1111/jofi.12620 (Crossref DOI, fetched 2026-11-27)

## Claimed Edge

CIP deviations are large, persistent arbitrage opportunities, strongest for contracts on bank balance sheets at quarter-end.

## Post-Publication Decay

Deviations persist because bank balance sheets are costly; only banks capture it.

Decay source: Deviations from Covered Interest Rate Parity. Du, Tepper, Verdelhan, 2018, The Journal of Finance. https://doi.org/10.1111/jofi.12620 (Crossref DOI, fetched 2026-11-27)

## Capacity

Large for banks.

## Data Needed

[D-macro](../../03-data-sources/cards/D-macro.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
