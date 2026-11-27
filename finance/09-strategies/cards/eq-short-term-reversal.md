# Short-Term Reversal

ID: `eq-short-term-reversal`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Buy last month's losers, short last month's winners, hold one month.

## Source

1. Evidence of Predictable Behavior of Security Returns. Jegadeesh, 1990, The Journal of Finance. https://doi.org/10.1111/j.1540-6261.1990.tb05110.x (Crossref DOI, fetched 2026-11-27)
2. Kakushadze and Serur, 151 Trading Strategies, section 3.9. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27)
3. Quantpedia free strategy page. https://quantpedia.com/strategies/short-term-reversal-in-stocks/ (fetched 2026-11-27)

## Claimed Edge

Negative first-order serial correlation in monthly returns is significant; extreme-decile forecast portfolios differ in abnormal returns.

## Post-Publication Decay

The raw effect is mostly a liquidity premium. After costs it is near zero for retail turnover.

Decay source: Replicating Anomalies. Hou, Xue, Zhang, 2018, The Review of Financial Studies. https://doi.org/10.1093/rfs/hhy131 (Crossref DOI, fetched 2026-11-27)

## Capacity

Small. Weekly or monthly turnover.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[backtesting-py](../../08-software/backtesting-py.md), [vectorbt](../../08-software/vectorbt.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- Quantpedia short-term-reversal-in-stocks
- STreversal

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
