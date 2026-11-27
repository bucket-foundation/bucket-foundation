# Post-Earnings Announcement Drift

ID: `eq-pead`
Family: Equities
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Buy stocks with the largest positive earnings surprise, short the largest negative. Hold about 60 trading days.

## Source

1. Post-Earnings-Announcement Drift: Delayed Price Response or Risk Premium?. Bernard, Thomas, 1989, Journal of Accounting Research. https://doi.org/10.2307/2491062 (Crossref DOI, fetched 2026-11-27)
2. Kakushadze and Serur, 151 Trading Strategies, section 3.12. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27)
3. Quantpedia free strategy page. https://quantpedia.com/strategies/post-earnings-announcement-effect/ (fetched 2026-11-27)

## Claimed Edge

Bernard and Thomas found drift of several percent over the quarter after the announcement.

## Post-Publication Decay

Martineau argues the drift has disappeared in recent data. Fetch the full paper for the cutoff year.

Decay source: Rest in Peace Post-Earnings Announcement Drift. Martineau, 2021. https://doi.org/10.31235/osf.io/z7k3p (Crossref search, fetched 2026-11-27)

## Capacity

Medium. Event-driven turnover.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[zipline-reloaded](../../08-software/zipline-reloaded.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- EarningsSurprise
- KS 3.2
- Quantpedia post-earnings-announcement-effect
- code FinGPT: fingpt/FinGPT_Sentiment_Analysis_v3/quantitative_sentiment.py
- code virattt/ai-hedge-fund: hedge_fund/signals/pead.py
- code virattt/ai-hedge-fund: hedge_fund/strategies/earnings-drift.yaml

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
