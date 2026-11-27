# Debt Dynamics and r minus g

ID `M-debt-dynamics-r-minus-g`. As of 2026-11-27. Section: fiscal.

## What It Is
The debt ratio d moves by the primary deficit plus (r - g) x d, where r is the average interest rate on debt and g nominal GDP growth. With r below g, a country can run primary deficits and hold d steady; with r above g, the ratio compounds upward unless primary surpluses offset it. The algebra is an identity; the inputs are below.

## Current State
House calculation from fetched inputs, 2026-11-27.
- r: average rate on marketable debt 3.570%, 31 Oct 2026, Fiscal Data. Grade A.
- g: nominal GDP growth, lab FRED `GDP`; real growth 2.29% plus PCE inflation 3.84% puts nominal growth near 6%. Grade A inputs.
- r - g near -2.5 points: the average rate lags market yields, so r rises as debt rolls; new 10-year debt costs 4.91%.
- Debt held by the public $32,953B on 24 Nov 2026. Grade A.

## Projections
CBO long-term outlook, Feb and Mar 2026, as summarized by CRFB on 2 Mar 2026: debt held by the public reaches 175% of GDP, $168 trillion, by 2056, from about 99% at the end of FY2025; interest rises to 6.9% of GDP by 2056 from a record 3.2% in 2025. A CBO alternative scenario with rates 1 point higher puts 2056 debt at 222% of GDP. Grade B.

## Market Reaction
Term premium and auction tails are the market channel; see [term-premium-acm](term-premium-acm.md) and [treasury-auctions](treasury-auctions.md).

## Data
FRED `GFDEGDQ188S` ([lab](../../lab/data/raw/fred/GFDEGDQ188S.csv)): 121.19% gross debt to GDP for 2026 Q2. Grade A.

## Sources
- [Fiscal Data average interest rates](https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/avg_interest_rates), fetched 2026-11-27. Grade A.
- [CRFB on CBO long-term outlook, 2 Mar 2026](https://www.crfb.org/blogs/debt-rises-175-gdp-under-cbos-long-term-outlook), fetched 2026-11-27. Grade B.
- [CBO alternative scenarios, search result](https://www.cbo.gov/publication/62758), 2026-11-27; the CBO site returned 403. Grade B.
