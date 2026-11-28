# Bond ETF Discount to NAV

ID: `cr-bond-etf-discount`
Family: Credit
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Buy bond ETFs trading at deep discounts to NAV in stress, sell when the gap closes.

## Source

1. When Selling Becomes Viral: Disruptions in Debt Markets in the COVID-19 Crisis and the Fed’s Response. Haddad, Moreira, Muir, 2020. https://doi.org/10.3386/w27168 (Crossref search, fetched 2026-11-27)

## Claimed Edge

In March 2020, corporate bond ETFs traded at discounts of several percent before Fed intervention.

## Post-Publication Decay

Event-only; the Fed backstop may not repeat.

Decay source: When Selling Becomes Viral: Disruptions in Debt Markets in the COVID-19 Crisis and the Fed’s Response. Haddad, Moreira, Muir, 2020. https://doi.org/10.3386/w27168 (Crossref search, fetched 2026-11-27)

## Capacity

Medium.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
