# Cash-Secured Put Writing

ID: `op-putwrite`
Family: Options and Volatility
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Sell one-month at-the-money index puts each month, collateralized with T-bills.

## Source

1. The Cash-secured PutWrite Strategy and Performance of Related Benchmark Indexes. Ungar, Moran, 2009, The Journal of Alternative Investments. https://doi.org/10.3905/jai.2009.11.4.043 (Crossref search, fetched 2026-11-27)
2. Kakushadze and Serur, 151 Trading Strategies, section 2.6. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27)
3. White Paper Shows Volatility Risk Premium Facilitated Higher Risk-Adjusted Returns for PUT Index. Cboe, Bondarenko white paper. https://www.cboe.com/insights/posts/white-paper-shows-volatility-risk-premium-facilitated-higher-risk-adjusted-returns-for-put-index (fetched 2026-11-27)

## Claimed Edge

The CBOE PUT index delivered equity-like returns with lower volatility over its history to 2008.

## Post-Publication Decay

Through 2018 the PUT Index kept higher Sharpe, Sortino and Stutzer ratios than the S&P 500, with annualized volatility of 9.95% against 14.93%.

Decay source: Covered Calls Uncovered. Israelov, Nielsen, 2014. https://doi.org/10.2139/ssrn.2444999 (Crossref search, fetched 2026-11-27)

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
