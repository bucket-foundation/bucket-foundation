# Net Payout Yield

ID: `eq-net-payout-yield`
Family: Equities
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Rank on dividends plus buybacks minus issuance over market cap.

## Source

1. On the Importance of Measuring Payout Yield: Implications for Empirical Asset Pricing. Boudoukh, Michaely, Richardson, Roberts, 2004. https://doi.org/10.3386/w10651 (Crossref search, fetched 2026-11-27)
2. Quantpedia free strategy page. https://quantpedia.com/strategies/net-payout-yield-effect/ (fetched 2026-11-27)

## Claimed Edge

Net payout yield predicts returns where dividend yield alone fails.

## Post-Publication Decay

Low turnover; overlaps with value and issuance factors.

Decay source: Is There a Replication Crisis in Finance?. Jensen, Kelly, Pedersen, 2023, The Journal of Finance. https://doi.org/10.1111/jofi.13249 (Crossref DOI, fetched 2026-11-27)

## Capacity

Large.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md)

## Implementation

[alphalens-reloaded](../../08-software/alphalens-reloaded.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- NetPayoutYield
- NetPayoutYield_q
- Quantpedia net-payout-yield-effect

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
