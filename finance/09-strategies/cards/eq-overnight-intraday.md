# Overnight versus Intraday Returns

ID: `eq-overnight-intraday`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Momentum stocks earn their returns overnight; buy at close, sell at open for the overnight leg.

## Source

1. A tug of war: Overnight versus intraday expected returns. Lou, Polk, Skouras, 2019, Journal of Financial Economics. https://doi.org/10.1016/j.jfineco.2019.03.011 (Crossref DOI, fetched 2026-11-27)
2. Quantpedia free strategy page. https://quantpedia.com/strategies/market-sentiment-and-an-overnight-anomaly/ (fetched 2026-11-27)

## Claimed Edge

Lou, Polk and Skouras find momentum profits accrue overnight and other anomalies accrue intraday.

## Post-Publication Decay

Two trades a day per name make costs the binding constraint.

Decay source: Replicating Anomalies. Hou, Xue, Zhang, 2018, The Review of Financial Studies. https://doi.org/10.1093/rfs/hhy131 (Crossref DOI, fetched 2026-11-27)

## Capacity

Small.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[hftbacktest](../../08-software/hftbacktest.md)

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
