# Stablecoin Depeg Arbitrage

ID: `sy-depeg-arb`
Family: Stablecoin Yield
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Buy a stablecoin below $1 when redemption at par is credible, redeem or wait.

## Source

1. What keeps stablecoins stable?. Lyons, Viswanath-Natraj, 2023, Journal of International Money and Finance. https://doi.org/10.1016/j.jimonfin.2022.102777 (Crossref DOI, fetched 2026-11-27)
2. In the Shadow of Bank Run: Lessons from the Silicon Valley Bank Failure and Its Impact on Stablecoins. Federal Reserve Board, 2025. https://www.federalreserve.gov/econres/notes/feds-notes/in-the-shadow-of-bank-run-lessons-from-the-silicon-valley-bank-failure-and-its-impact-on-stablecoins-20251217.html (fetched 2026-11-27)
3. Anatomy of a Run: The Terra Luna Crash. NBER working paper 31160. https://www.nber.org/papers/w31160 (fetched 2026-11-27)

## Claimed Edge

Primary-market mint and redeem keeps the peg in Lyons and Viswanath-Natraj.

## Post-Publication Decay

USDC traded as low as 86 cents after Circle could not access $3.3 billion at Silicon Valley Bank and recovered fully once redemptions resumed on 13 March 2023; Terra collapsed in three days in May 2022.

Decay source: Stablecoin Runs and the Centralization of Arbitrage. Ma, Zeng, Zhang, 2025. https://doi.org/10.3386/w33882 (Crossref search, fetched 2026-11-27)

## Capacity

Medium in events.

## Data Needed

[D-onchain](../../03-data-sources/cards/D-onchain.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
