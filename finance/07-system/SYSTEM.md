# Trading System

Beads `bkt-q5moa.3`, `bkt-q5moa.16` and `bkt-q5moa.23`. As of 2026-11-27. `../lab/RESULTS-100.md` reran the evidence over 317 trials. Zero of 100 strategies pass the pooled deflated Sharpe bar of 0.95 on data the lab holds and can trade, so the brief runs an evidence-gathering paper book: five sleeves of $1,000 paper money each, one per lab-built rule that held out of sample, plus $20 Kalshi measurement bets. Nothing is promotable until a sleeve passes the pooled bar on its own live paper marks and the gate below. Every live order waits for Gian's approval.

## Evidence

Deflated Sharpe under three counts. Pooled uses all 317 trials and the Sharpe variance across every tradable trial. Family uses the trials and variance inside one asset class. The bar is 0.95 pooled, with an out-of-sample t of 2 or more.

| Signal | 44 trials | Pooled, 317 trials | Family | Status |
|---|---|---|---|---|
| BTC SMA 50 trend | 0.98 | 0.75 | 0.18 of 16 crypto trials | Fails both. Tracked, no paper capital |
| ETH SMA 50 trend | 0.95 | 0.60 | 0.10 | Fails both |
| Option smile slope, Yan 2011 | n/a | 0.99 | 1.00 of 235 equity trials | Statistics pass on the published Chen-Zimmermann return series. The lab holds no option data and never built the signal, so it counts for nothing |
| Earnings announcement return | n/a | 0.72 | 0.99 | Published return series the lab never built; counts for nothing |
| S&P yield gap, 200-day and 50/200-day averages | n/a | 0.00 | 1.00 | Pass family only, inside classes of 35 and 3 trials with low variance. Each beat buy and hold out of sample by 0.03 to 0.10 Sharpe |
| Kalshi favorites, football surebets | n/a | n/a | n/a | Indicative: last-trade or snapshot prices that cannot be shown tradable |

The pooled test is blunt: one variance across crypto, equities and bets. The family test has a low hurdle where a class holds few trials. A signal enters paper capital only when it passes the pooled bar on tradable prices.

## Signals

| Signal | Role | Lab evidence | Rule | Confidence |
|---|---|---|---|---|
| BTC SMA 50 trend | Tracked in the brief, no paper capital | Deflated Sharpe 0.75 pooled and 0.18 in its family, under the 0.95 bar; it was 0.98 over 44 trials. OOS Sharpe 0.80 vs 0.45 for holding on the 2020 split, t under 2 | The brief reports ON when the Coinbase daily close sits above its 50-day mean, OFF otherwise | Low |
| Favorite-longshot | Filter plus paper measurement | Kalshi last-trade data: longshots at 30 cents or less returned -72.7% per dollar and favorites +0.7%. Those prints can be stale, so the size is an upper bound and the 100-strategy run marks the Kalshi rows indicative. Football Pinnacle closing odds show a 5.5 pts gap, t 3.8 | Never buy Kalshi longshots. Paper-buy up to five liquid favorites at 80 to 95 cents, $20 each, at the live ask, closing within 36h, to measure the favorite edge on tradable prices | Low |

Excluded because they failed the lab bar: CAPE, whose out-of-sample R² fell from +0.14 to -0.24 once the training targets stopped leaking into the test window, and whose q70 switch lost CAGR, 7.7% vs 9.9%; risk parity over 60/40, ETF time-series momentum (OOS Sharpe 0.22), dual momentum on return, industry momentum, momentum net of costs and every equity factor after its publication year. Of the 100 strategies in `../lab/RESULTS-100.md`, 37 lost money after their split date, 13 trailed buy and hold and 35 stayed positive with an out-of-sample t under 2.

## Paper Sleeves

`../lab/lab/sleeves.py`. Each sleeve starts at $1,000 of paper money, sets its weights from the day's signal, and writes one `sleeve_mark` a day to `../lab/paper/ledger.jsonl`. A mark earns the prior mark's weights; idle cash earns the T-bill; costs are charged on weight changes. A second run on the same day writes nothing. When a price, a signal or the T-bill rate is missing, the sleeve writes no mark and the brief prints `missing`; the next mark spans the gap from the last real one.

| Sleeve | Lab row | Backtest evidence | Rule | Instruments | Cost |
|---|---|---|---|---|---|
| BTC SMA50 trend | `legacy_crypto_trend_BTC_sma50` | Fails pooled 0.75 and family 0.18 | Long when the Coinbase close sits above its 50-day mean | BTC | 25 bps |
| S&P above 200-day average | `price_above_ma200` | Family deflation only | Long when the index sits above its 200-day mean | S&P 500 index, price return | 5 bps |
| S&P 50/200-day cross | `ma_cross_50_200` | Family deflation only | Long when the 50-day mean sits above the 200-day mean | S&P 500 index, price return | 5 bps |
| S&P yield gap vs 10-year | `fed_model` | Family deflation only | Stocks when Shiller earnings over price beat the 10-year yield, IEF otherwise; earnings at least six months old | S&P 500 index, IEF | 10 bps |
| Currency carry | `fx_carry` | Held, neither deflation passed | Long the three highest BIS policy rates against USD, short the three lowest, among 10 currencies | Yahoo spot plus the rate differential | 10 bps |

The brief prints one line per sleeve: equity, holdings, days of evidence, observations, live Sharpe over T-bills, drawdown and live deflated Sharpe.

## Regime Dashboard

| Gauge | Source | Reading |
|---|---|---|
| 10y minus 3m Treasury | Yahoo `^TNX`, `^IRX` | Inverted below zero |
| VIX | Yahoo `^VIX` | Under 15 calm, 15 to 25 normal, above 25 stressed |
| S&P 500 vs 200-day mean | Yahoo `^GSPC`, Stooq fallback | Trend context for the equity book |
| High-yield OAS | FRED `BAMLH0A0HYM2`, cached file fallback | Credit stress |
| Next Fed decision odds | Kalshi `KXFEDDECISION` | Market-implied path |
| CAPE | Shiller data scaled by today's S&P | Valuation context only, failed the lab forecast test |
| FOMC and CPI dates | federalreserve.gov calendar, BLS calendar with Kalshi `KXCPI` close times as fallback | Event risk |

The dashboard informs Gian. No gauge changes a position.

## Macro Dashboard

`../lab/lab/dashboard.py` builds the block in `../16-macro/DASHBOARD-SPEC.md` from files the lab already holds: 39 gauges across policy, rates, inflation, activity, credit and the dollar. Each line shows the reading, its date, the alert rule and the basis of the threshold. 28 thresholds are tagged `House`: working levels with no source. Eight gauges the lab holds no file for print `MISSING`; a reading older than its frequency allows prints `STALE, not scored`. No value is filled or carried into a rule window.

## Position Sizing

Fractional Kelly with a hard cap, applied only to a signal that passes the bar; `signals.target_weight` returns zero while `BTC_PROMOTABLE` is false. Continuous signal: weight = 0.25 × Sharpe / vol. For BTC, 0.25 × 0.80 / 0.48 = 0.42, capped at 20% of the book. Binary contracts: 0.25 × (p − price) / (1 − price), floored at zero. The lab's +0.7% favorite edge sizes to near zero, so the favorite sleeve runs at a fixed $20 per contract set as a measurement, with at most five new positions a day.

## Risk Limits

| Limit | Value |
|---|---|
| Paper sleeves | $1,000 fixed notional each, five sleeves |
| BTC in the Kalshi book | 0% |
| Prediction market sleeve | $100 new risk a day, $20 per market |
| Daily loss | -5% of equity trips the kill switch |
| Drawdown from peak | -25% trips the kill switch |
| Data age | BTC close older than 2 days trips the kill switch |
| Leverage | None. Cash earns the 3-month T-bill |

## Kill Switches

Each sleeve has its own switch: a drawdown of 25% from its peak, a loss of 10% between marks, or signal data more than 5 days old writes a `sleeve_kill` for that sleeve alone and moves it to cash; the other sleeves keep running. `python brief.py --clear-kill` clears every switch.

For the Kalshi book, `signals.kill_switch` runs before any paper trade. A missing BTC price, an unpriced position or a failed trend read also trips it. A trip writes a `kill` event to the ledger, sells the BTC sleeve, blocks new prediction market positions and prints the reason in every brief until Gian runs `python brief.py --clear-kill`, which writes a `kill_clear` event. Per `../08-software/README.md`, the live version runs as a separate process outside strategy code, with broker reconciliation.

## Promotion Gates

Nothing is promotable until a sleeve passes two tests on its own live paper marks. First, the pooled bar: a deflated Sharpe of 0.95 or more against the 317-trial registry and its Sharpe variance of 0.166, computed in `sleeves.stats` once the sleeve has 20 observations. Second, the gate: 90 calendar days of marks, a live cap of $1,000 until 180 days enforced by `sleeves.live_cap`, a positive Sharpe over T-bills, drawdown above -25%, and a live Sharpe no lower than one standard error under the backtest. The band is one-sided for sleeves, since the pooled bar asks for a Sharpe above the backtest.

The pooled bar is far. The best of 317 zero-edge trials is expected to show an annual Sharpe of 1.19, so a sleeve needs a live Sharpe of 1.19 plus a margin in standard errors. After five years of daily marks the standard error of an annual Sharpe is sqrt(365 / 1,824), or 0.447. The 0.95 deflated Sharpe line sits at 1.19 + 1.645 × 0.447 = 1.92, and a t-stat of 2 over the hurdle at 1.19 + 2 × 0.447 = 2.08. Plan on about 2.1 or more: fat-tailed daily returns widen the error. `sleeves.required_live_sharpe` holds the arithmetic. A rule that earns its backtest Sharpe of 0.6 to 0.8 will not pass. The sleeves exist to gather evidence, and no sleeve is expected to reach live money on this bar.

The stages below apply to a sleeve that passes both.

| Stage | Entry | Exit |
|---|---|---|
| Paper sleeve | Lab-built rule that held out of sample | Pooled bar and gate pass on live marks |
| Small live | Capped at $1,000. At least 90 calendar days of paper marks; the sleeve passes the pooled bar on live marks; sleeve Sharpe over T-bills above zero and no lower than one standard error under its backtest; sleeve drawdown above -25%; Gian approves in writing | Any kill switch, or live Sharpe outside the band after 90 live days |
| Above $1,000 | At least 180 calendar days of paper marks with every check above still passing, enforced as `max_live_usd` in `signals.promotion_gate`, then 12 months of small live inside the band and a new bead | |

The gate scores each sleeve on its own marks: the change in sleeve equity between marks less the T-bill for the days between them, annualized at 365 divided by the mean gap. One mark per sleeve per date. The standard error is Lo 2002, sqrt((1 + SR²/2) / n) per period, annualized. At 90 calendar days of daily marks the standard error is about 2.0, so the gate alone shows only that the rule runs, the sign is right and the drawdown held; the pooled bar carries the weight.

Small live starts at $1,000 or less. Every live order is a recommendation Gian approves by hand before it reaches a broker. No code path submits a live order.

## Venues

From `../10-markets-law/ACCESS-MATRIX.md`, for a New Jersey resident: spot BTC on Coinbase or Kraken in a taxable account (property, no wash sale rule); Kalshi in a taxable account only, with no IRS guidance on event contract tax and NJ cert petition 26-299 pending. Polymarket international blocks US users, so Polymarket prices feed the dashboard only.

## Engine

Per `../08-software/README.md`: NautilusTrader for paper and live, since one engine covers Coinbase-style crypto, Kalshi and Polymarket with private strategies under LGPL. LEAN is the fallback. Until a signal clears the paper gate, the daily brief in `../lab/brief.py` is the whole engine: free data, a JSONL paper ledger and Telegram delivery. LLM agents stay out of the order path.

## Daily Brief

| Item | Value |
|---|---|
| Code | `../lab/brief.py`, logic in `../lab/lab/signals.py`, `sleeves.py`, `dashboard.py`, `ledger.py`, `feeds.py` |
| Data | `python fetch.py`, with `--refresh` to refetch; it retries 429 and 5xx, fails on any other error, checks crypto start dates and writes files atomically. Live: Yahoo and Stooq daily bars, Coinbase public candles, FRED, Kalshi and Polymarket public APIs, Fed and BLS calendars, Shiller file from `../lab/fetch.py` |
| Ledger | `../lab/paper/ledger.jsonl`, append-only events: deposit, trade, settle, interest, kill, kill_clear, mark, sleeve_mark, sleeve_kill |
| Action section | Lists tripped kill switches and promotable sleeves; otherwise it prints `Nothing to do today` |
| Delivery | Prints by default. `python brief.py --send` pipes the brief to `agf-tg send -`; the systemd service passes `--send` |
| Schedule | `scripts/systemd/finance-brief.timer`, weekdays 07:30 America/New_York, installed by `scripts/systemd/install-finance-brief.sh` and left disabled |
| Test | `python -m pytest` in `../lab/` |
| Sample | `SAMPLE-BRIEF.md` |

`--dry-run` prints the brief and writes nothing.

## Open

- CAPE uses Shiller data to 2024-09 scaled by price, which overstates CAPE while earnings grow. Refresh when Shiller posts newer data.
- Rerun `python run100.py` after each data refresh and update `signals.BTC_EVIDENCE`; `tests/test_system.py` fails when the constants drift from `results/`.
- Fetch Kalshi candlesticks and order book quotes so the favorite and longshot rows can move from indicative to tradable prices.
- Polymarket US access in NJ remains unconfirmed.
