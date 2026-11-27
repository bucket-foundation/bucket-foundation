# Option Expiration Week Effect

ID: `op-opex-week`
Family: Options and Volatility
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Hold large optionable stocks during expiration week.

## Source

1. Option-Expiration Week Effect - Quantpedia. web. https://quantpedia.com/strategies/option-expiration-week-effect/ (web page, fetched 2026-11-27)
2. Quantpedia free strategy page. https://quantpedia.com/strategies/option-expiration-week-effect/ (fetched 2026-11-27)
3. Cboe to Add Tuesday and Thursday Expirations for SPX Weeklys Options. Cboe, 2022. https://ir.cboe.com/news/news-details/2022/Cboe-to-Add-Tuesday-and-Thursday-Expirations-for-SPX-Weeklys-Options-04-13-2022/default.aspx (fetched 2026-11-27)

## Claimed Edge

Quantpedia lists higher returns in expiration weeks for stocks with high option open interest.

## Post-Publication Decay

In April 2022 Cboe announced Tuesday and Thursday SPX Weeklys expirations to give an expiry every trading day; SPX Weeklys carried nearly 72 percent of SPX options volume in 2021.

Decay source: Does Academic Research Destroy Stock Return Predictability?. Mclean, Pontiff, 2016, The Journal of Finance. https://doi.org/10.1111/jofi.12365 (Crossref DOI, fetched 2026-11-27)

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[vectorbt](../../08-software/vectorbt.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- Quantpedia option-expiration-week-effect

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
