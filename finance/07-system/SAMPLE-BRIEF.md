# Sample Brief

Output of `python brief.py --dry-run` in `finance/lab/`, run 2026-11-27 against live feeds, bead `bkt-q5moa.23`: five paper sleeves, the macro dashboard and a plain action section. Dry run: no ledger write, no Telegram send. A plain run prints and writes the ledger; `--send` delivers to Telegram.

```text
Finance brief Fri 27 Nov 2026 14:13 ET

MARKETS
S&P 500: 7,297.49 (+1.6%) 2026-11-27 Yahoo
VIX: 23.81 (-11.2%) 2026-11-27 Yahoo
US 10y %: 4.93 (+0.09 pts) 2026-11-27 Yahoo
US 3m %: 4.15 (-0.01 pts) 2026-11-27 Yahoo
Gold fut: 3,668.50 (+3.8%) 2026-11-27 Yahoo
Dollar idx: 104.05 (+0.4%) 2026-11-27 Yahoo
BTC-USD: 60,495.57 (+0.2%) 2026-11-26 Coinbase
ETH-USD: 1,687.61 (-0.2%) 2026-11-26 Coinbase

REGIME
10y minus 3m: +0.78 pts (upward sloping)
VIX 23.8: normal
S&P vs 200-day average: -0.8%
High-yield spread 3.77% on 2026-11-26 (FRED live)
Fed decision in Dec 2026? Kalshi: Hike 25bps 94%, Fed maintains rate 4%, Hike >25bps 2%

SIGNALS
BTC SMA50 trend: OFF, close 60,496 vs avg 74,679 (-19.0%), first reading. Runs in its own paper sleeve
CAPE context, failed lab out-of-sample test: CAPE about 46.6 (Shiller 2024-09 scaled by S&P price, an upper bound since earnings grew), 10y real return -0.9%/yr, first reading
Favorite-longshot: 150 liquid Kalshi markets close within 36h, 38 favorites, 112 longshots

PAPER SLEEVES
$1,000 of paper money each, marked daily. Promotion needs a live deflated Sharpe of 0.95 over 317 trials plus the 90-day gate.
BTC SMA50 trend: $1,000.00, holds cash, 0 days of evidence, 0 obs, live Sharpe n/a, drawdown 0.0%, live DSR n/a vs 0.95, evidence only
S&P above 200-day average: $1,000.00, holds cash, 0 days of evidence, 0 obs, live Sharpe n/a, drawdown 0.0%, live DSR n/a vs 0.95, evidence only
S&P 50/200-day cross: $999.50, holds SPX +100%, 0 days of evidence, 0 obs, live Sharpe n/a, drawdown 0.0%, live DSR n/a vs 0.95, evidence only
S&P yield gap vs 10-year: $999.00, holds IEF +100%, 0 days of evidence, 0 obs, live Sharpe n/a, drawdown 0.0%, live DSR n/a vs 0.95, evidence only
Currency carry, 10 currencies: $998.00, holds XM -33%, JP -33%, CH -33%, BR +33%, IN +33%, MX +33%, 0 days of evidence, 0 obs, live Sharpe n/a, drawdown 0.0%, live DSR n/a vs 0.95, evidence only

KALSHI MEASUREMENT BOOK
Equity $9,999.35, day +0.00%, since start -0.01%, cash $9,901.45
  KALSHI:KXAAAGASD-26NOV28-3.5300:no: 21.0000
  KALSHI:KXRAIN-26NOV27-MIN:no: 23.0000
  KALSHI:KXRAIN-26NOV27-DC:no: 21.0000
  KALSHI:KXHIGHLAX-26NOV27-T84:no: 22.0000
  KALSHI:KXHIGHMIA-26NOV27-B76.5:no: 21.0000
  buy 21.0000 KALSHI:KXAAAGASD-26NOV28-3.5300:no @ 0.9400: FLB favorite measurement
  buy 23.0000 KALSHI:KXRAIN-26NOV27-MIN:no @ 0.8400: FLB favorite measurement
  buy 21.0000 KALSHI:KXRAIN-26NOV27-DC:no @ 0.9300: FLB favorite measurement
  buy 22.0000 KALSHI:KXHIGHLAX-26NOV27-T84:no @ 0.8800: FLB favorite measurement
  buy 21.0000 KALSHI:KXHIGHMIA-26NOV27-B76.5:no @ 0.9500: FLB favorite measurement
Kill switch: clear

MACRO DASHBOARD
39 gauges: 27 ok, 3 in alert, 1 stale, 8 missing. House thresholds are working levels with no source. No gauge changes a position.
Policy and plumbing:
  Fed funds effective: 3.88 on 2026-11-25, ok. Alert rule outside 3.75 to 4.00 [Sourced]
  SOFR minus IORB, bp: +5 on 2026-11-25, ALERT. Alert rule above 0 for 5 days, or above +15 once [House]
  Standing repo usage: MISSING, RPONTSYD not in lab files. Alert rule above $0 outside quarter end [House]
  ON RRP, $B: 0.3 on 2026-11-25, ok. Alert rule above 100 [House]
  Reserve balances, $B: 2,979.7 on 2026-11-18, ok. Alert rule fall of 150 in 4 weeks, or below 2,700 [House]
  TGA, $B: 916.6 on 2026-11-18, ALERT. Alert rule above the 850 end-December target [Sourced]
  Swap line usage: MISSING, SWPT not in lab files. Alert rule above $5B [House]
  Fed total assets, $B: 6,741.5 on 2026-11-18, ok. Alert rule weekly change above 50 [House]
Rates and curve:
  2-year yield: 4.63 on 2026-11-24, ok. Alert rule 15 bp move in a day [House]
  10-year yield: 4.91 on 2026-11-24, ok. Alert rule above 5.31 [House]
  10y minus 3m: 0.51 on 2026-11-25, ok. Alert rule below 0 [Sourced]
  NY Fed recession probability: MISSING, NY Fed allmonth.xls not in lab files. Alert rule above 30% [House]
  Term premium, 10y: 0.89 on 2026-11-20, ok. Alert rule rise of 30 bp in a month [House]
  5y5y breakeven: 2.11 on 2026-11-25, ok. Alert rule above 2.50 or below 1.75 [House]
  10y TIPS real yield: 2.79 on 2026-11-24, ok. Alert rule above 3.00 [House]
  10y and 30y auctions: MISSING, TreasuryDirect auctions not in lab files. Alert rule bid-to-cover below 2.30 [House]
Inflation:
  Core CPI m/m, %: 0.30 on 2026-10-01, ok. Alert rule 0.40 or more [House]
  Headline CPI y/y, %: 4.08 on 2026-10-01, ok. Alert rule above 4.5 [House]
  Core PCE y/y, %: 3.26 on 2026-10-01, ok. Alert rule above 3.4 [Sourced]
  Median CPI: MISSING, MEDCPIM158SFRBCLE not in lab files. Alert rule above 4.0 [House]
  Michigan 1y expectation: 4.7 on 2026-10-01, ok. Alert rule above 5.0 [House]
  WTI, $: 82.24 on 2026-11-24, ok. Alert rule 10% move in 5 days [House]
Activity and labor:
  Sahm rule: 0.00 on 2026-10-01, ok. Alert rule 0.50 or more [Sourced]
  CFNAI 3-month mean: -0.05 on 2026-10-01, ok. Alert rule below -0.70 or above +0.70 [Sourced]
  Initial claims, k: 189 on 2026-11-21, ok. Alert rule 4-week average above 250 [House]
  Payrolls change, k: +165 on 2026-10-01, ok. Alert rule negative, or 3-month average below 50 [House]
  GDPNow: MISSING, GDPNOW not in lab files. Alert rule below 0.5 [House]
  Smoothed recession probability, %: 0.40 on 2026-09-01, STALE, not scored. Alert rule above 20 [House]
Credit and stress:
  NFCI: -0.444 on 2026-11-20, ok. Alert rule above 0 [Sourced]
  STLFSI4: -0.07 on 2026-11-20, ok. Alert rule above 0 [Sourced]
  HY OAS: 3.72 on 2026-11-24, ok. Alert rule above 4.61 [Lab]
  Baa minus 10y: 1.46 on 2026-10-01, ok. Alert rule above 2.91 [Lab]
  VIX: 26.80 on 2026-11-26, ok. Alert rule above 28.5 [Lab]
  SLOOS C&I tightening: 1.7 on 2026-10-01, ok. Alert rule above 20 [House]
Global and dollar:
  Broad dollar: 123.60 on 2026-11-20, ok. Alert rule 3% move in a month [House]
  USD/JPY: 158.76 on 2026-11-20, ok. Alert rule 3% move in a week [House]
  Foreign official Treasuries: MISSING, TIC table 5 not in lab files. Alert rule fall above $100B in a month [House]
  Offshore USD credit: MISSING, BIS GLI not in lab files. Alert rule y/y growth above 10% [House]
  Stablecoin supply, $B: 281.9 on 2026-11-27, ALERT. Alert rule 30-day fall above 5% [House]

EVENTS
FOMC decision Wed 09 Dec with projections, in 12 days. Source: federalreserve.gov
CPI release Thu 10 Dec 08:30 ET, in 13 days. Source: BLS release calendar

ACTION FOR GIAN
1. Nothing to do today. No sleeve is promotable, no kill switch is tripped and no live order is open.

CONTEXT, NO ACTION
- BTC trend stays OFF, 19.0% below its 50-day average. Backtest evidence: deflated Sharpe 0.75 pooled over 317 trials and 0.18 inside the 16-trial crypto family, bar 0.95; it was 0.98 over 44 trials.
- CAPE near 47 fits about -0.9% a year real for US stocks over 10 years on the full-sample line. The lab found no out-of-sample forecast power.
- Kalshi longshots priced 30 cents or less: last-trade data showed -73% ROI, an upper bound since those prints can be stale. 112 liquid longshots close in the next 36h. Favorites stay a $20 paper measurement at live asks.
- FOMC inside two weeks: expect wider BTC and rate moves. No change to rules.
- Macro alert: SOFR minus IORB, bp +5 on 2026-11-25: above 0 for 5 days, or above +15 once [House]
- Macro alert: TGA, $B 916.6 on 2026-11-18: above the 850 end-December target [Sourced]
- Macro alert: Stablecoin supply, $B 281.9 on 2026-11-27: 30-day fall above 5% [House]
- Yield gap sleeve reads Shiller earnings 2024-06, the latest in the lab file at least 6 months old.

[dry run: 12 ledger events not written, Telegram not sent]
```
