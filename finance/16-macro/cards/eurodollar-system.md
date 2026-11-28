# Eurodollar System

ID `M-eurodollar-system`. As of 2026-11-27. Section: money market plumbing.

## What It Is
Dollar borrowing and lending outside the United States, by foreign banks and firms that have no access to Fed reserves. The BIS global liquidity indicators track foreign currency credit to non-bank borrowers outside each currency area, through bank loans and international debt securities. Grade A.

## Current State
BIS GLI, USD credit to non-bank borrowers outside the US, bank loans and debt securities, fetched via the BIS API. Grade A.
| Quarter | $ trillions |
|---|---|
| 2025 Q2 | 14.00 |
| 2025 Q3 | 14.24 |
| 2025 Q4 | 14.26 |
| 2026 Q1 | 14.77 |
| 2026 Q2 | 15.13 |
Growth 8.1% in the year to 2026 Q2, faster than US nominal GDP. Latest release 29 Oct 2026.

## Mechanism
Offshore borrowers owe dollars they cannot print. A stronger dollar or a funding squeeze raises their cost of rolling debt, and they sell dollar assets, Treasuries included. The Fed's [swap lines and FIMA repo](fed-swap-lines.md) cap the squeeze.

## Market Reaction
Watch the [dollar index](dollar-index.md), SWPT usage and cross-currency basis.

## Sources
- [BIS global liquidity indicators](https://data.bis.org/topics/GLI), fetched 2026-11-27. Grade A.
- [BIS stats API, WS_GLI Q.USD.3P.N.A.I.B.USD](https://stats.bis.org/api/v1/data/BIS,WS_GLI,1.0/Q.USD.3P.N.A.I.B.USD?lastNObservations=5&format=csv), fetched 2026-11-27. Grade A.
