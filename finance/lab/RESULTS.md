# Strategy Replication Results

Bead `bkt-q5moa.2`, revised under `bkt-q5moa.3` after critic round 1. Run 2026-11-27 on data pulled the same day. Reproduce with `python fetch.py && python run.py` inside `finance/lab/.venv`. Raw numbers live in `data/results/results.json`; the data files and their sha256 hashes in `data/raw/MANIFEST.jsonl`.

## Method

| Item | Choice |
|---|---|
| Signal timing | Weights set at the close of period t earn period t+1 returns. CAPE timing uses one lag, from the backtest |
| Costs | ETFs 5 bps per unit traded, crypto 25 bps, industry and CAPE portfolios 10 bps, Kalshi exchange fee `ceil(0.07 p (1-p))` per contract. Cost is booked in the period of the trade; the entry trade is charged in the first return |
| Factor costs | Fixed monthly haircut, an assumption at the scale reported by Novy-Marx and Velikov 2016: SMB 3 bps, HML, RMW, CMA 5 bps, Mom 65 bps |
| Cash | 3-month T-bill from FRED `TB3MS` and `DTB3`, daily rate over 365 days for crypto; leverage borrows at the same rate |
| Sharpe | Excess of T-bill. CAPE timing uses raw returns since stocks and bonds are both in the book |
| Turnover | One-way, annualized, drift included |
| Split | ETF families: in-sample to 2014-12, out-of-sample 2015 on. Crypto: split 2020-12. CAPE: split 1997-12, the year before Campbell and Shiller 1998. Factors: split at each paper's publication year |
| Selection | The variant with the best in-sample Sharpe is the pick. Its out-of-sample Sharpe is the number to trust |
| Deflated Sharpe | Bailey and López de Prado 2014. `DSR fam` uses the variants in that family; `DSR lab` uses all 44 trials, the 38 strategy variants plus the six factor series, and the cross-trial Sharpe variance. Read `DSR lab`: above 0.95 passes. The count is a floor: the split dates and the variant grids were chosen after reading the papers, and those choices are not counted |

## Scorecard

| Strategy | Paper | Paper claim | Our pick, full sample | OOS Sharpe | DSR lab | Verdict |
|---|---|---|---|---|---|---|
| 60/40 | Asness, Frazzini, Pedersen 2012, FAJ | 60/40 Sharpe near 0.3 over 1926-2010 | SR 0.74, CAGR 8.2%, DD -28% | 0.66 vs SPY 0.75 | 0.44 | Matches over the long run: JST 16 countries 1900-2020 give 60/40 Sharpe 0.31 vs equity 0.29. The 2002-2026 ETF run is a bond bull market |
| Risk parity | Asness, Frazzini, Pedersen 2012, FAJ | Levered risk parity beats 60/40 on Sharpe | SR 0.62, CAGR 7.2%, DD -17% | 0.59 | 0.26 | Failed. Lower Sharpe than 60/40 in both halves. Lower drawdown held |
| GTAA trend | Faber 2007, J. Wealth Mgmt | Equity-like return with about 7% vol and drawdown under 10%, 1973 on | SR 0.59, CAGR 5.3%, vol 6.4%, DD -9% | 0.37 | 0.21 | Drawdown claim survived. Return claim failed: 5% CAGR vs SPY 11% |
| Time-series momentum | Moskowitz, Ooi, Pedersen 2012, JFE | Sharpe above 1 on 58 futures 1985-2009, 12-month lookback best | SR 0.54, CAGR 9.7%, DD -33% | 0.22 | 0.15 | Failed out of sample on a 12-ETF universe. 12-month lookback did rank first in-sample, as the paper says |
| Dual momentum | Antonacci 2014, book | GEM about 17% CAGR, -23% DD over 1974-2013 | SR 0.62, CAGR 8.9%, DD -21% | 0.43 | 0.25 | Failed on return; drawdown cut held. Trailed SPY after 2014 |
| Industry momentum | Moskowitz, Grinblatt 1999, JF | Long winners, short losers among industries earns a premium | SR 0.12, CAGR 4.0% | 0.05 | 0.00 | Failed with 10 coarse industries and costs |
| Factor tilts | Fama, French 1993, 2015, JFE; Carhart 1997, JF | SMB, HML, Mom, RMW, CMA earn premia | See factor table | See table | n/a | Premia shrank after publication, as McLean and Pontiff 2016 predict. RMW kept the most |
| Crypto trend | Liu, Tsyvinski 2021, RFS | Time-series momentum predicts crypto returns | BTC SMA50: SR 1.39, CAGR 78%, DD -60% | 0.80 vs BTC hold 0.45 | 0.98 vs BTC hold 0.79 | Survived. Only family to pass DSR lab |
| CAPE timing | Campbell, Shiller 1998, JPM | High CAPE predicts low 10-year returns | q70 rule: SR 0.66, CAGR 7.7% vs stocks 9.9% | 0.58 vs stocks 0.71 | 0.10 | Failed. In-sample fit holds; out-of-sample R² turns negative once training targets stop at 1987. The switch lost return |
| Favorite-longshot | Snowberg, Wolfers 2010, JPE; Page, Clemen 2013, EJ | Longshots lose more per dollar than favorites | See prediction table | n/a | n/a | Survived in football and Kalshi; Polymarket sample too small |

## ETF and Crypto Detail

Full-sample numbers per variant. `*` marks the in-sample pick.

| Family | Variant | Start | CAGR | Vol | Sharpe | Max DD | Turnover | DSR fam | DSR lab | IS SR | OOS SR |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 60/40 | rebal 1m | 2002-09 | 8.1% | 9.0% | 0.73 | -29% | 0.11 | 1.00 | 0.43 | 0.79 | 0.67 |
| 60/40 | rebal 3m * | 2002-09 | 8.2% | 8.9% | 0.74 | -28% | 0.06 | 1.00 | 0.44 | 0.82 | 0.66 |
| 60/40 | rebal 12m | 2002-09 | 8.1% | 8.8% | 0.73 | -27% | 0.03 | 1.00 | 0.43 | 0.80 | 0.67 |
| Risk parity | 63d unlevered * | 2006-06 | 7.2% | 9.3% | 0.62 | -17% | 0.50 | 0.99 | 0.26 | 0.66 | 0.59 |
| Risk parity | 63d 10% vol | 2006-06 | 7.8% | 11.0% | 0.60 | -23% | 0.96 | 0.99 | 0.23 | 0.61 | 0.58 |
| Risk parity | 126d unlevered | 2006-09 | 7.2% | 9.3% | 0.62 | -18% | 0.31 | 0.99 | 0.26 | 0.63 | 0.61 |
| Risk parity | 126d 10% vol | 2006-09 | 7.6% | 10.7% | 0.59 | -24% | 0.57 | 0.99 | 0.22 | 0.54 | 0.62 |
| Risk parity | 252d unlevered | 2007-03 | 6.9% | 9.4% | 0.60 | -19% | 0.22 | 0.99 | 0.24 | 0.55 | 0.64 |
| Risk parity | 252d 10% vol | 2007-03 | 6.9% | 10.4% | 0.55 | -23% | 0.37 | 0.99 | 0.18 | 0.46 | 0.61 |
| GTAA | SMA 6 * | 2006-08 | 5.3% | 6.4% | 0.59 | -9% | 1.41 | 0.99 | 0.21 | 0.84 | 0.37 |
| GTAA | SMA 8 | 2006-10 | 5.4% | 6.8% | 0.57 | -11% | 1.08 | 0.99 | 0.19 | 0.60 | 0.55 |
| GTAA | SMA 10, Faber's rule | 2006-12 | 5.1% | 6.7% | 0.54 | -11% | 0.99 | 0.99 | 0.16 | 0.56 | 0.52 |
| GTAA | SMA 12 | 2007-02 | 5.2% | 6.5% | 0.57 | -10% | 0.95 | 0.99 | 0.20 | 0.71 | 0.48 |
| TSMOM | 1m | 2003-08 | -0.4% | 17.5% | -0.03 | -50% | 17.2 | 0.08 | 0.00 | 0.09 | -0.15 |
| TSMOM | 3m | 2003-08 | 7.1% | 17.4% | 0.38 | -31% | 9.05 | 0.71 | 0.03 | 0.66 | 0.13 |
| TSMOM | 6m | 2003-11 | 6.3% | 16.4% | 0.35 | -33% | 6.71 | 0.65 | 0.02 | 0.47 | 0.23 |
| TSMOM | 9m | 2004-02 | 7.8% | 15.5% | 0.45 | -23% | 5.82 | 0.81 | 0.07 | 0.72 | 0.24 |
| TSMOM | 12m * | 2004-05 | 9.7% | 16.2% | 0.54 | -33% | 4.76 | 0.90 | 0.15 | 0.93 | 0.22 |
| Dual momentum | 6m | 2004-04 | 6.7% | 11.5% | 0.47 | -25% | 3.09 | 0.97 | 0.08 | 0.81 | 0.21 |
| Dual momentum | 9m | 2004-07 | 7.2% | 11.8% | 0.50 | -21% | 2.23 | 0.98 | 0.12 | 0.72 | 0.34 |
| Dual momentum | 12m * | 2004-10 | 8.9% | 12.3% | 0.62 | -21% | 1.62 | 0.99 | 0.25 | 0.85 | 0.43 |
| Industry mom | 6m | 1927-01 | 2.8% | 13.7% | 0.04 | -63% | 6.80 | 0.53 | 0.00 | 0.04 | 0.04 |
| Industry mom | 12m * | 1927-07 | 4.0% | 13.8% | 0.12 | -53% | 4.95 | 0.80 | 0.00 | 0.15 | 0.05 |
| Crypto | BTC SMA 10 | 2015-07 | 38% | 47% | 0.87 | -76% | 30.6 | 0.98 | 0.64 | 1.59 | -0.03 |
| Crypto | BTC SMA 20 | 2015-08 | 51% | 46% | 1.08 | -70% | 19.1 | 1.00 | 0.86 | 1.84 | 0.15 |
| Crypto | BTC SMA 50 * | 2015-09 | 78% | 48% | 1.39 | -60% | 8.82 | 1.00 | 0.98 | 1.88 | 0.80 |
| Crypto | BTC SMA 100 | 2015-10 | 67% | 51% | 1.21 | -66% | 6.63 | 1.00 | 0.93 | 1.62 | 0.72 |
| Crypto | BTC SMA 200 | 2016-02 | 58% | 52% | 1.10 | -71% | 3.28 | 1.00 | 0.86 | 1.64 | 0.47 |
| Crypto | ETH SMA 10 | 2016-05 | 51% | 66% | 0.91 | -74% | 32.3 | 0.99 | 0.68 | 1.58 | 0.14 |
| Crypto | ETH SMA 20 | 2016-06 | 89% | 68% | 1.23 | -60% | 17.9 | 1.00 | 0.94 | 1.87 | 0.55 |
| Crypto | ETH SMA 50 | 2016-07 | 90% | 66% | 1.26 | -62% | 9.24 | 1.00 | 0.95 | 1.69 | 0.83 |
| Crypto | ETH SMA 100 | 2016-08 | 66% | 70% | 1.04 | -76% | 7.70 | 0.99 | 0.81 | 1.52 | 0.54 |
| Crypto | ETH SMA 200 | 2016-12 | 93% | 73% | 1.23 | -81% | 3.00 | 1.00 | 0.93 | 1.65 | 0.84 |
| CAPE | q50 | 1901-01 | 7.2% | 11.7% | 0.65 | -63% | 0.29 | 1.00 | 0.09 | 0.68 | 0.59 |
| CAPE | q60 | 1901-01 | 7.3% | 12.1% | 0.64 | -64% | 0.26 | 1.00 | 0.08 | 0.67 | 0.57 |
| CAPE | q70 * | 1901-01 | 7.7% | 12.4% | 0.66 | -67% | 0.34 | 1.00 | 0.10 | 0.69 | 0.58 |
| CAPE | q80 | 1901-01 | 7.7% | 12.9% | 0.64 | -70% | 0.31 | 1.00 | 0.08 | 0.68 | 0.49 |
| CAPE | q90 | 1901-01 | 8.1% | 13.4% | 0.65 | -70% | 0.26 | 1.00 | 0.10 | 0.67 | 0.59 |

Benchmarks over the same windows: SPY buy and hold 2002-2026 CAGR 10.8%, vol 14.7%, Sharpe 0.66, DD -51%, OOS Sharpe 0.75. Shiller stocks 1901-2024 CAGR 9.9%, Sharpe 0.71, DD -82%, DSR lab 0.28. BTC buy and hold 2015-2026 CAGR 60%, Sharpe 1.01, DD -84%, OOS Sharpe 0.45, DSR lab 0.79. `DSR fam` sits near 1.00 for most ETF families because their variants are near copies, so the cross-trial variance is tiny; that is why the lab-wide column is the one to read.

BTC hold over the full Coinbase history compounds 60% a year with an -84% drawdown; the SMA 50 rule beat it on return (78%) with a -60% drawdown, and out of sample on Sharpe, 0.80 against 0.45.

## Factor Detail

Long-short factors from Ken French, July 1963 to September 2026, net of the haircut above. Pre and post split at the publication year.

| Factor | Paper | Split | Gross %/mo pre | Gross %/mo post | Net Sharpe pre | Net Sharpe post | Full Max DD | DSR fam |
|---|---|---|---|---|---|---|---|---|
| SMB | Fama, French 1993 | 1993 | 0.32 | 0.05 | 0.34 | 0.02 | -59% | 0.42 |
| HML | Fama, French 1993 | 1993 | 0.45 | 0.14 | 0.54 | 0.10 | -61% | 0.75 |
| Mom | Carhart 1997 | 1997 | 0.83 | 0.33 | 0.19 | -0.21 | -88% | 0.03 |
| RMW | Fama, French 2015 | 2015 | 0.26 | 0.18 | 0.33 | 0.18 | -42% | 0.78 |
| CMA | Fama, French 2015 | 2015 | 0.30 | -0.00 | 0.43 | -0.07 | -29% | 0.85 |
| Equal-weight five | combination | 2015 | 0.37 | 0.03 | 0.55 | -0.32 | -34% | 0.93 |

Gross premia fell between 30% and 100% after publication. Momentum lives or dies on the cost assumption: gross it earned 0.33%/mo after 1997, and the 65 bps haircut turns that negative.

## CAPE Forecast

Regression of 10-year forward real log return on log CAPE, monthly overlapping windows. The in-sample fit uses only months whose 10-year target ends before the 1998 split, so it stops at 1987-12.

| Sample | Slope | R² | Obs |
|---|---|---|---|
| 1881-1987 | -0.087 | 0.38 | 1284 |
| 1998-2014 | -0.179 | 0.86 | 198 |
| Out-of-sample R², 1881-1987 fit, Campbell-Thompson | | -0.24 | |

The post-1998 window holds two independent decades, so its R² carries little weight. The first run reported +0.14 out of sample; that fit used targets running to 2007 and leaked the test window. Without the leak the pre-1988 line forecasts worse than the historical mean, because valuations stayed above their old range and returns stayed above the line's forecast.

## Favorite-Longshot Bias

Return per $1 staked, after the bookmaker margin or Kalshi fee. Favorite means price at least 0.70; longshot means price at most 0.30.

| Market | Price used | Bets | ROI favorites | ROI longshots | Difference | t |
|---|---|---|---|---|---|---|
| Football, Pinnacle closing | 1/odds, 5 leagues 2013-2025 | 64,983 | +0.1% | -5.3% | 5.5 pts | 3.8 |
| Football, market average closing | 1/odds | 32,121 | -2.4% | -7.8% | 5.4 pts | 2.6 |
| Kalshi, 16 series | last price 24h before close | 11,201 | +0.7% | -72.7% | 73 pts | 31 |
| Polymarket, top 500 by volume | price 7 days before end | 193 | -0.8% | +84% | -85 pts | -1.6 |

Football shows the textbook pattern at modest size. Kalshi shows a large one, mostly from 2 to 10 cent contracts on temperature and S&P range markets that won 1.1% of the time against a 4.1% price; the 24h-before price can be a stale last trade, so treat the size as an upper bound. Polymarket's sample is 193 hand-picked high-volume markets and runs the other way with wide errors.

## What Survived

1. Crypto trend: BTC SMA 50 passes DSR lab at 0.98 with OOS Sharpe 0.80 against 0.45 for holding, and cuts drawdown. ETH SMA 50 passes at 0.95. BTC SMA 100 (0.93) and SMA 200 (0.86) fall short.
2. Trend and dual momentum drawdown cuts: GTAA kept drawdown near -10% and dual momentum near -21% against SPY's -51%, at a return cost.
3. Favorite-longshot bias in football and Kalshi.

Failed or too weak to trade after costs and the trial count: risk parity over 60/40, ETF time-series momentum, industry momentum, momentum factor net of costs, every equity factor after its publication date, and CAPE both as a forecast and as a switch.

## Limits

ETF history starts 2002 to 2007, one rate regime, survivorship-free only because the tickers are live funds. Yahoo prices are adjusted closes. TSMOM runs on 12 ETFs; the paper used 58 futures. Kalshi pulls cover 2025-2026 and favor temperature and index range series. Polymarket closed-market paging capped at 500 markets. Shiller CAPE runs to 2024-09; prices with dividends and the 10-year yield stop at 2024-06.
