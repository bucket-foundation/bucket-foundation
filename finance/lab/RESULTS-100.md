# 100 Strategy Replications

Bead `bkt-q5moa.16`. Run 2026-11-27 on the files in `data/raw`. Reproduce inside `finance/lab/.venv` with `python fetch.py --only=openap && python run100.py && python report100.py`. Each strategy is one function under `lab/strategies/`; its numbers sit in `results/trials/<function>.json`, family files in `results/<family>.json`, the full trial list in `results/registry.json` and the totals in `results/summary.json`.

## Result

Zero of 100 strategies pass the pooled bar on data the lab holds and can trade.

44 of the 100 are built from prices the lab holds. Of those, 3 held out of sample and passed deflation inside their own asset class only, 1 held with neither deflation passed, 18 lost money after their split date, 13 trailed buy and hold and 9 stayed positive with an out-of-sample t under 2.

52 rows replay a published portfolio return series, the 40 Chen-Zimmermann long-short series and 12 Ken French sorts, less a cost haircut. The lab never built those portfolios from stock-level data, and 5 of them need paid analyst or option data for the signal. They are scored and cannot count as held or survived. 1 clears the pooled statistics, the option smile slope series, and 6 more hold out of sample.

4 rows rest on prices that cannot be shown tradable, football arbitrage among them.

The 40 Chen-Zimmermann rows are the top in-sample t-stats out of 212, so their in-sample numbers carry a winner's curse. Their median Sharpe goes from 0.77 in sample to 0.17 after publication; part of that fall is selection and part is decay. The whole set of 212, with no selection, goes from 0.35 to 0.02, and the 172 left out of the table go from 0.31 to 0.00. 7 of the 40 and 25 of the 212 kept an out-of-sample t of 2 or more. All figures are net of costs.

## Method

| Item | Choice |
|---|---|
| Selection | From the 645 cards marked `y` in `../09-strategies/registry.csv`. Equities: the 40 Chen-Zimmermann signals with the highest in-sample t-stat in their own replication, lowest 4.8, a selection on the in-sample outcome, plus 16 cards the Ken French library can rebuild. Other families: every card with A or B family evidence that the files in `data/raw` can price, 44 in all, including the weaker crypto, prediction market and sports cards needed to cover those asset classes |
| Trial registry | `lab/trials.py`, loaded by `trials.load_all()`. 317 trials: 61 hand-built trials, the 60 reported functions with one preset variant each and the first surebet specification, all 212 Chen-Zimmermann long-short series since the 40 shown were picked from them, and the 44 variants and factor series behind `RESULTS.md` |
| Signal timing | Weights set at the close of period t earn period t+1 in `lab/backtest.py`. Fitted forecasts train only on targets that ended on or before the forecast date, through `common.expanding_forecast` |
| Split | The end of the paper's publication year, written in each `@strategy` decorator before the first run. Ten decorator years differ from the card's source year by one to six years, from working paper dates or a card that cites a later paper; the decorator year stands. Moving them to the card year would change three verdicts: quality and channel breakout from Weak to Failed, short index volatility from Weak to Held. With under three years of data on either side the split moves to the sample midpoint, marked `mid`; 8 strategies |
| Equity costs | Monthly haircut by rebalance tier, on the scale of Novy-Marx and Velikov 2016: annual sorts 8 bps, quarterly 20, monthly 30, momentum 65, short-term reversal 150. About 95 bps per unit of one-way turnover across both legs |
| Other costs | Index and ETF trades 5 bps per unit traded, industry and country portfolios 10 to 20, Treasuries 2, currencies 10, Binance 10, Coinbase 25, Kalshi fee `ceil(0.07 p (1-p))` plus 1 cent of spread, Polymarket 1 cent of spread, bookmaker margin inside the quoted odds |
| Cash and Sharpe | Funded strategies earn the T-bill on idle cash and their Sharpe is over the T-bill. Long-short series are self-financing |
| Turnover | One-way, annualized. `est` marks the tier assumption where the source gives returns without holdings |
| Benchmark | Rules that switch between one asset and cash show buy and hold beside their out-of-sample Sharpe, over the same dates |
| Bet sizing | 1% of bankroll a bet, at most 20% a week; Kalshi spreads 10% a day across that day's contracts. Returns are weekly or daily changes in bankroll |
| Deflated Sharpe, pooled | Bailey and López de Prado 2014 with N of 317 and the variance of annual Sharpe across every trial with valid prices, 0.17. The best of 317 zero-edge trials is expected to show a Sharpe of 1.19. The untradable trials count in N and stay out of the variance; with them it would be 17.6 |
| Deflated Sharpe, family | The same test inside one asset class: its own trial count and its own Sharpe variance |
| Cash rate and benchmark coverage | `run100.py` stops with `CoverageError` when the cash series starts after a strategy, ends more than three periods before it, or a benchmark covers under 98% of its dates. Carried-forward periods are logged and stored as `rf_periods_carried_forward` |

## Deflation

The pooled test is a blunt tool. It mixes daily crypto rules, century-long equity sorts and weekly bets into one variance, so a high-variance class raises the hurdle for a low-variance one, and the count of 212 equity series dominates N. The family test fixes the mix and has the opposite fault: a class with few trials has a noisy variance and a low hurdle, and a class with one trial has none. Read the two together.

| Asset class | Trials | Tradable | Variance of annual Sharpe | Expected best zero-edge Sharpe |
|---|---|---|---|---|
| Equities | 235 | 235 | 0.087 | 0.83 |
| ETFs and Macro | 35 | 35 | 0.025 | 0.34 |
| Futures and CTA | 7 | 7 | 0.054 | 0.32 |
| Technical Analysis | 3 | 3 | 0.013 | 0.10 |
| Options and Volatility | 2 | 2 | 0.142 | 0.20 |
| Rates | 4 | 4 | 0.044 | 0.22 |
| Credit | 1 | 1 | 0.000 | 0.00 |
| FX | 5 | 5 | 0.076 | 0.33 |
| Commodities | 1 | 0 | 0.000 | 0.00 |
| Crypto | 16 | 16 | 0.841 | 1.65 |
| Prediction Markets | 4 | 2 | 0.617 | 0.83 |
| Sports Betting | 4 | 2 | 3.982 | 2.10 |
| Pooled | 317 | n/a | 0.166 | 1.19 |

## Survival Bar

Held means all four: out-of-sample Sharpe above zero with a t-stat of 2 or more, out-of-sample Sharpe above buy and hold where a benchmark applies, prices a retail account can trade, and positions built by the lab from data it holds. `run100.tradable` applies the last two: a row with `precomputed` or `needs_paid_data` set, or with untradable prices, cannot be held. Survived adds a pooled deflated Sharpe of 0.95 or more. The family list adds a family deflated Sharpe of 0.95 or more.

### Survived

None.

### Held With Family Deflation Passed

- **Fed Model Yield Gap Timing**, `fed_model`: OOS Sharpe 0.79 against 0.71 for S&P, OOS t 4.1, DSR pooled 0.00, DSR family 1.00, full-sample Sharpe 0.71, CAGR 8.9%, max drawdown -82%. Built on Shiller monthly average prices.
- **Two Moving Average Crossover**, `ma_cross_50_200`: OOS Sharpe 0.63 against 0.52 for US market, OOS t 3.6, DSR pooled 0.00, DSR family 1.00, full-sample Sharpe 0.49, CAGR 8.8%, max drawdown -62%.
- **Price and Slope versus Moving Average**, `price_above_ma200`: OOS Sharpe 0.56 against 0.52 for US market, OOS t 3.2, DSR pooled 0.00, DSR family 1.00, full-sample Sharpe 0.69, CAGR 10.7%, max drawdown -34%.

### Held

- **Currency Carry Trade**, `fx_carry`: OOS Sharpe 0.73, OOS t 2.8, DSR pooled 0.00, DSR family 0.94, full-sample Sharpe 0.63, CAGR 5.5%, max drawdown -24%.

### Published Series With Passing Statistics

These rows meet the out-of-sample test and do not count, since the lab replays the published returns and holds no stock-level or option data to build them.

- **Predicted div yield next month**, `cz_divyieldst`: OOS Sharpe 0.74, OOS t 5.0, DSR pooled 0.00, DSR family 0.00, full-sample Sharpe 0.55, CAGR 3.7%, max drawdown -45%.
- **Earnings announcement return**, `cz_announcementreturn`: OOS Sharpe 0.84, OOS t 4.5, DSR pooled 0.72, DSR family 0.99, full-sample Sharpe 1.30, CAGR 8.0%, max drawdown -17%.
- **Put volatility minus call volatility**, `cz_smileslope`: OOS Sharpe 1.00, OOS t 3.3, DSR pooled 0.99, DSR family 1.00, full-sample Sharpe 1.58, CAGR 11.8%, max drawdown -14%. Chen-Zimmermann equal-weight long-short returns less a 30 bps haircut. The lab holds no option data and never built the signal.
- **Net debt financing**, `cz_netdebtfinance`: OOS Sharpe 0.57, OOS t 2.5, DSR pooled 0.19, DSR family 0.95, full-sample Sharpe 1.06, CAGR 6.8%, max drawdown -26%.
- **Return on assets qtrly**, `cz_roaq`: OOS Sharpe 0.64, OOS t 2.5, DSR pooled 0.00, DSR family 0.03, full-sample Sharpe 0.57, CAGR 9.7%, max drawdown -68%.
- **Earnings surprise streak**, `cz_earningsstreak`: OOS Sharpe 0.68, OOS t 2.4, DSR pooled 0.36, DSR family 0.92, full-sample Sharpe 1.12, CAGR 7.5%, max drawdown -15%.
- **Industry return of big firms**, `cz_indretbig`: OOS Sharpe 0.48, OOS t 2.0, DSR pooled 0.02, DSR family 0.91, full-sample Sharpe 0.97, CAGR 13.0%, max drawdown -68%.

### Indicative

No deflated Sharpe is printed for these rows.

- **Favorite-Longshot Bias in Prediction Markets**, `kalshi_favorites`: OOS Sharpe 91.52, OOS t 29.9, DSR pooled n/a, DSR family n/a, full-sample Sharpe 68.75, CAGR 781.5%, max drawdown 0%. Prices are last trades over 11 weeks; see Limits.
- **Sports Arbitrage, Surebets**, `surebets`: OOS Sharpe 5.65, OOS t 19.1, DSR pooled n/a, DSR family n/a, full-sample Sharpe 4.57, CAGR 0.6%, max drawdown 0%. After the stale-quote filter, the 1% minimum edge and the 50% haircut. The snapshot cannot show that the best prices were live at the same moment.
- **Near-Certain Outcome Harvesting**, `kalshi_near_certain`: OOS Sharpe 35.15, OOS t 11.5, DSR pooled n/a, DSR family n/a, full-sample Sharpe 28.46, CAGR 35.1%, max drawdown -0%. Prices are last trades over 11 weeks; see Limits.
- **Commodity Momentum**, `commodity_momentum`: OOS Sharpe -0.52, OOS t -2.2, DSR pooled n/a, DSR family n/a, full-sample Sharpe -0.01, CAGR -1.3%, max drawdown -91%. Spot prices with no futures roll.

## Scorecard

Medians cover every row with valid prices, published series included.

| Family | Strategies | Indicative | Published series or paid data | Median IS Sharpe | Median OOS Sharpe | OOS t of 2 or more | Held | Survived |
|---|---|---|---|---|---|---|---|---|
| Equities | 55 | 0 | 52 | 0.63 | 0.06 | 7 | 0 | 0 |
| ETFs and Macro | 14 | 0 | 0 | 0.48 | 0.42 | 7 | 1 | 0 |
| Futures and CTA | 2 | 0 | 0 | 0.25 | -0.04 | 0 | 0 | 0 |
| Technical Analysis | 3 | 0 | 0 | 0.77 | 0.56 | 3 | 2 | 0 |
| Options and Volatility | 2 | 0 | 0 | 0.19 | 0.23 | 0 | 0 | 0 |
| Rates | 4 | 0 | 0 | 0.30 | -0.16 | 0 | 0 | 0 |
| Credit | 1 | 0 | 0 | 0.14 | 0.20 | 0 | 0 | 0 |
| FX | 5 | 0 | 0 | 0.49 | 0.08 | 1 | 1 | 0 |
| Commodities | 1 | 1 | 0 | n/a | n/a | 0 | 0 | 0 |
| Crypto | 6 | 0 | 0 | 0.09 | 0.07 | 0 | 0 | 0 |
| Prediction Markets | 4 | 2 | 0 | -0.90 | -0.70 | 0 | 0 | 0 |
| Sports Betting | 3 | 1 | 0 | -1.46 | -0.82 | 0 | 0 | 0 |
| All | 100 | 4 | 52 | 0.49 | 0.11 | 18 | 4 | 0 |

## Earlier Trials

`RESULTS.md` deflated 44 trials and passed BTC SMA 50 at 0.98. Under the registry of 317 it fails both tests, as do the other crypto trend variants. The first draft of this file showed its pooled figure at 0.30; it moved to 0.75 when the surebet trials left the pooled variance as untradable, which cut the variance from 0.279 to 0.166 and the expected best zero-edge Sharpe from 1.54 to 1.19. `../07-system/SYSTEM.md` now carries BTC SMA 50 as a tracked signal with no promotion path.

| Earlier trial | Sharpe | DSR, 44 trials | DSR pooled | DSR family | Family trials |
|---|---|---|---|---|---|
| BTC SMA 50 | 1.39 | 0.98 | 0.75 | 0.18 | 16 |
| ETH SMA 50 | 1.26 | 0.95 | 0.60 | 0.10 | 16 |
| BTC SMA 100 | 1.21 | 0.93 | 0.53 | 0.07 | 16 |
| 60/40, 3-month rebalance | 0.74 | 0.44 | 0.02 | 0.97 | 35 |

## Results

Verdict key: Survived, Held and the family mark as defined above; Published series and Paid data rows show how their statistics came out and count for nothing; Weak has a positive out-of-sample Sharpe with t under 2; Trails names the benchmark that beat it; Failed has an out-of-sample Sharpe at or below zero; Indicative rests on untradable prices. CAGR, vol, Sharpe, drawdown and turnover cover the full sample, net of costs. `OOS SR` shows the benchmark after `vs`.

### Equities

| Strategy | Paper | Paper claim | Cost | Start | CAGR | Vol | Sharpe | Max DD | Turnover | Split | IS SR | OOS SR | OOS t | DSR pooled | DSR family | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| [Accrual Anomaly](../09-strategies/cards/eq-accruals.md) | Sloan 1996, The Accounting Review | Sloan found the accrual component of earnings less persistent than cash flows, and prices fail to reflect it. | 8 bps a month haircut, annual tier | 1963-07 | 1.9% | 10.2% | 0.24 | -46% | 1.0 est | 1996-12 | 0.44 | 0.06 | 0.3 | 0.00 | 0.00 | Published series, weak |
| [Asset Growth and Investment](../09-strategies/cards/eq-asset-growth.md) | Cooper, Gulen, Schill, 2008, The Journal of Finance | Asset growth predicts abnormal returns and keeps its power in large caps. | 8 bps a month haircut, annual tier | 1963-07 | 2.2% | 12.3% | 0.23 | -56% | 1.0 est | 2008-12 | 0.40 | -0.11 | -0.5 | 0.00 | 0.00 | Published series, failed |
| [Betting Against Beta](../09-strategies/cards/eq-betting-against-beta.md) | Frazzini, Pedersen, 2014, Journal of Financial Economics | BAB earned positive risk-adjusted returns in US equities, international equities, Treasuries, credit and futures. | 30 bps a month haircut, monthly tier | 1963-07 | -8.5% | 24.8% | -0.23 | -100% | 3.6 est | 2014-12 | -0.23 | -0.24 | -0.8 | 0.00 | 0.00 | Published series, failed |
| [Cross-Sectional Stock Momentum](../09-strategies/cards/eq-momentum-12-1.md) | Jegadeesh, Titman, 1993, The Journal of Finance | Significant positive returns over 3 to 12 month holding periods in US stocks; part of the first-year return dissipates over the next two years. | 65 bps a month haircut, momentum tier | 1927-01 | 1.3% | 27.6% | 0.22 | -98% | 8.2 est | 1993-12 | 0.32 | 0.03 | 0.2 | 0.00 | 0.00 | Published series, weak |
| [Factor Momentum](../09-strategies/cards/eq-factor-momentum.md) | Ehsani, Linnainmaa, 2022, The Journal of Finance | Factor momentum explains most of individual stock momentum in Ehsani and Linnainmaa. | 30 bps a month haircut, monthly tier | 1927-02 | 1.7% | 6.5% | 0.30 | -41% | 3.6 est | 2019-12 | 0.32 | -0.05 | -0.1 | 0.00 | 0.00 | Failed |
| [Gross Profitability](../09-strategies/cards/eq-gross-profitability.md) | Novy-Marx, 2013, Journal of Financial Economics | Gross profitability predicts returns with the same power as book-to-market, and the two hedge each other. | 8 bps a month haircut, annual tier | 1963-07 | 0.8% | 14.9% | 0.13 | -67% | 1.0 est | 2013-12 | 0.10 | 0.25 | 0.9 | 0.00 | 0.00 | Published series, weak |
| [January Effect](../09-strategies/cards/eq-january-effect.md) | Keim, 1983, Journal of Financial Economics | Keim found half the size premium arrived in January, much of it in the first week. | 100 bps charged each January for the round trip on both legs | 1926-07 | 4.8% | 9.6% | 0.53 | -17% | 2.0 est | 1983-12 | 0.66 | 0.27 | 1.8 | 0.00 | 0.00 | Published series, weak |
| [Low Idiosyncratic Volatility](../09-strategies/cards/eq-low-idio-vol.md) | Ang, Hodrick, Xing, Zhang, 2006, The Journal of Finance | Stocks with high idiosyncratic volatility relative to Fama-French have abysmally low average returns. | 30 bps a month haircut, monthly tier | 1963-07 | -4.1% | 21.5% | -0.08 | -94% | 3.6 est | 2006-12 | -0.01 | -0.24 | -1.1 | 0.00 | 0.00 | Published series, failed |
| [Net Share Issuance](../09-strategies/cards/eq-share-issuance.md) | Pontiff, Woodgate, 2008, The Journal of Finance | Share issuance predicts returns with a t-statistic above value and momentum in Pontiff and Woodgate. | 8 bps a month haircut, annual tier | 1963-07 | 2.8% | 11.8% | 0.29 | -40% | 1.0 est | 2008-12 | 0.36 | 0.17 | 0.7 | 0.00 | 0.00 | Published series, weak |
| [Quality Minus Junk](../09-strategies/cards/eq-quality-minus-junk.md) | Asness, Frazzini, Pedersen, 2018, Review of Accounting Studies | QMJ earned significant risk-adjusted returns in the US and internationally. | 8 bps a month haircut, annual tier | 1963-07 | 5.8% | 18.1% | 0.40 | -66% | 1.0 est | 2013-12 | 0.53 | 0.04 | 0.1 | 0.00 | 0.00 | Published series, weak |
| [Same-Month Return Seasonality](../09-strategies/cards/eq-return-seasonality.md) | Heston, Sadka, 2005 | Stocks with high same-month returns in past years outperform in that month. | 10 bps per unit traded | 1936-07 | 0.3% | 13.5% | 0.09 | -87% | 20.7 | 2008-12 | 0.28 | -0.61 | -2.6 | 0.00 | 0.00 | Failed |
| [Small-Cap Premium](../09-strategies/cards/eq-size-small-cap.md) | Banz, 1981, Journal of Financial Economics | Banz found small NYSE firms earned higher risk-adjusted returns 1936-1975. | 8 bps a month haircut, annual tier | 1926-07 | 1.6% | 25.1% | 0.17 | -86% | 1.0 est | 1981-12 | 0.30 | -0.13 | -0.8 | 0.00 | 0.00 | Published series, failed |
| [Style Index Momentum](../09-strategies/cards/etf-style-momentum.md) | Quantpedia, Momentum Factor and Style Rotation Effect | Quantpedia, from the source paper over 1972 to 2005: 9.25% per annum, Sharpe 0.33. | 10 bps per unit traded | 1927-07 | 5.6% | 16.6% | 0.41 | -59% | 5.6 | 2004-12 | 0.51 | -0.03 | -0.1 | 0.00 | 0.00 | Failed |
| [Value and Book to Market](../09-strategies/cards/eq-value-book-to-market.md) | Fama, French, 1992, The Journal of Finance | Size and book-to-market capture the cross-section of average returns; the beta-return relation is flat. | 8 bps a month haircut, annual tier | 1926-07 | 2.0% | 22.1% | 0.19 | -84% | 1.0 est | 1992-12 | 0.23 | 0.10 | 0.6 | 0.00 | 0.00 | Published series, weak |
| [Value and Momentum Everywhere](../09-strategies/cards/etf-value-momentum-everywhere.md) | Asness, Moskowitz, Pedersen, 2013, The Journal of Finance | Value and momentum premia appear in eight markets, and value and momentum are negatively correlated with each other. | 36.5 bps a month haircut, half annual and half momentum tier | 1990-11 | 1.3% | 5.9% | 0.24 | -42% | 4.6 est | 2013-12 | 0.35 | 0.01 | 0.0 | 0.00 | 0.00 | Published series, weak |
| [Abnormal Accruals](../09-strategies/cards/eq-cz-abnormalaccruals.md) | Xie 2001, AR | Abnormal Accruals: Chen-Zimmermann in-sample t 4.8; original paper 0.92% a month | 8 bps a month haircut, annual tier | 1972-07 | 0.6% | 7.9% | 0.11 | -60% | 1.0 est | 2001-12 | 0.49 | -0.25 | -1.2 | 0.00 | 0.00 | Published series, failed |
| [Book-to-market and accruals](../09-strategies/cards/eq-cz-accrualsbm.md) | Bartov and Kim 2004, RFQA | Book-to-market and accruals: Chen-Zimmermann in-sample t 5.0; original paper 0.21% a month | 8 bps a month haircut, annual tier | 1964-07 | 13.0% | 18.6% | 0.75 | -49% | 1.0 est | 2004-12 | 0.94 | 0.41 | 1.9 | 0.00 | 0.25 | Published series, weak |
| [Change in Taxes](../09-strategies/cards/eq-cz-chtax.md) | Thomas and Zhang 2011, JAR | Change in Taxes: Chen-Zimmermann in-sample t 9.1; original paper 1.30% a month | 20 bps a month haircut, quarterly tier | 1962-10 | 8.7% | 8.8% | 1.00 | -23% | 2.4 est | 2011-12 | 1.13 | 0.41 | 1.5 | 0.10 | 0.87 | Published series, weak |
| [Change in capex two years](../09-strategies/cards/eq-cz-grcapx.md) | Anderson and Garcia-Feijoo 2006, JF | Change in capex (two years): Chen-Zimmermann in-sample t 5.2; original paper 0.57% a month | 8 bps a month haircut, annual tier | 1953-07 | 3.3% | 6.1% | 0.56 | -26% | 1.0 est | 2006-12 | 0.71 | 0.22 | 1.0 | 0.00 | 0.01 | Published series, weak |
| [Change in capital inv ind adj](../09-strategies/cards/eq-cz-chinvia.md) | Abarbanell and Bushee 1998, AR | Change in capital inv (ind adj): Chen-Zimmermann in-sample t 5.5 | 8 bps a month haircut, annual tier | 1952-07 | 2.7% | 5.9% | 0.48 | -42% | 1.0 est | 1998-12 | 0.75 | 0.20 | 1.0 | 0.00 | 0.00 | Published series, weak |
| [Change in current operating assets](../09-strategies/cards/eq-cz-delcoa.md) | Richardson et al. 2005, JAE | Change in current operating assets: Chen-Zimmermann in-sample t 6.0 | 8 bps a month haircut, annual tier | 1952-07 | 3.4% | 6.3% | 0.56 | -34% | 1.0 est | 2005-12 | 0.75 | -0.01 | -0.1 | 0.00 | 0.01 | Published series, failed |
| [Change in financial liabilities](../09-strategies/cards/eq-cz-delfinl.md) | Richardson et al. 2005, JAE | Change in financial liabilities: Chen-Zimmermann in-sample t 12.0 | 8 bps a month haircut, annual tier | 1952-07 | 4.7% | 4.7% | 1.01 | -24% | 1.0 est | 2005-12 | 1.36 | 0.22 | 1.0 | 0.08 | 0.93 | Published series, weak |
| [Change in net financial assets](../09-strategies/cards/eq-cz-delnetfin.md) | Richardson et al. 2005, JAE | Change in net financial assets: Chen-Zimmermann in-sample t 8.8 | 8 bps a month haircut, annual tier | 1952-07 | 2.5% | 5.0% | 0.51 | -33% | 1.0 est | 2005-12 | 0.79 | -0.12 | -0.5 | 0.00 | 0.00 | Published series, failed |
| [Change in net operating assets](../09-strategies/cards/eq-cz-dnoa.md) | Hirshleifer, Hou, Teoh, Zhang 2004, JAE | change in net operating assets: Chen-Zimmermann in-sample t 9.4 | 30 bps a month haircut, monthly tier | 1962-07 | 4.8% | 8.4% | 0.60 | -43% | 3.6 est | 2004-12 | 0.94 | -0.30 | -1.4 | 0.00 | 0.03 | Published series, failed |
| [Change in ppe and inv/assets](../09-strategies/cards/eq-cz-investppeinv.md) | Lyandres, Sun and Zhang 2008, RFS | change in ppe and inv/assets: Chen-Zimmermann in-sample t 8.0; original paper 0.57% a month | 30 bps a month haircut, monthly tier | 1952-01 | 2.3% | 6.3% | 0.39 | -50% | 3.6 est | 2008-12 | 0.55 | -0.24 | -1.0 | 0.00 | 0.00 | Published series, failed |
| [Change in put vol minus change in call vol](../09-strategies/cards/eq-cz-dcpvolspread.md) | An, Ang, Bali, Cakici 2014, JF | Change in put vol minus change in call vol: Chen-Zimmermann in-sample t 7.5; original paper 1.68% a month | 30 bps a month haircut, monthly tier | 1996-03 | 8.8% | 7.9% | 1.11 | -14% | 3.6 est | 2014-12 | 1.27 | 0.69 | 2.0 | 0.33 | 0.94 | Paid data, weak |
| [Change in recommendation](../09-strategies/cards/eq-cz-changeinrecommendation.md) | Jegadeesh et al. 2004, JF | Change in recommendation: Chen-Zimmermann in-sample t 6.7; original paper 0.23% a month | 30 bps a month haircut, monthly tier | 1993-12 | 2.7% | 5.3% | 0.53 | -20% | 3.6 est | 2004-12 | 1.91 | -0.10 | -0.4 | 0.00 | 0.05 | Paid data, failed |
| [Composite debt issuance](../09-strategies/cards/eq-cz-compositedebtissuance.md) | Lyandres, Sun and Zhang 2008, RFS | Composite debt issuance: Chen-Zimmermann in-sample t 5.2; original paper 0.52% a month | 8 bps a month haircut, annual tier | 1956-07 | 1.5% | 4.3% | 0.37 | -22% | 1.0 est | 2008-12 | 0.48 | 0.04 | 0.2 | 0.00 | 0.00 | Published series, weak |
| [Conglomerate return](../09-strategies/cards/eq-cz-retconglomerate.md) | Cohen and Lou 2012, JFE | Conglomerate return: Chen-Zimmermann in-sample t 6.6; original paper 1.18% a month | 30 bps a month haircut, monthly tier | 1976-02 | 8.5% | 13.3% | 0.68 | -27% | 3.6 est | 2012-12 | 0.83 | 0.20 | 0.7 | 0.00 | 0.14 | Published series, weak |
| [Dividend Initiation](../09-strategies/cards/eq-cz-divinit.md) | Michaely, Thaler and Womack 1995, JF | Dividend Initiation: Chen-Zimmermann in-sample t 5.5; original paper 0.62% a month | 30 bps a month haircut, monthly tier | 1926-02 | -0.2% | 13.0% | 0.06 | -71% | 3.6 est | 1995-12 | 0.09 | -0.02 | -0.1 | 0.00 | 0.00 | Published series, failed |
| [Down forecast EPS](../09-strategies/cards/eq-cz-downrecomm.md) | Barber et al. 2001, JF | Down forecast EPS: Chen-Zimmermann in-sample t 5.2 | 30 bps a month haircut, monthly tier | 1993-12 | 0.1% | 4.1% | 0.05 | -41% | 3.6 est | 2001-12 | 1.29 | -0.44 | -2.1 | 0.00 | 0.00 | Paid data, failed |
| [Earnings announcement return](../09-strategies/cards/eq-cz-announcementreturn.md) | Chan, Jegadeesh and Lakonishok 1996, JF | Earnings announcement return: Chen-Zimmermann in-sample t 12.5 | 30 bps a month haircut, monthly tier | 1971-09 | 8.0% | 6.1% | 1.30 | -17% | 3.6 est | 1996-12 | 2.22 | 0.84 | 4.5 | 0.72 | 0.99 | Published series, stats held |
| [Earnings streak length](../09-strategies/cards/eq-cz-numearnincrease.md) | Loh and Warachka 2012, MS | Earnings streak length: Chen-Zimmermann in-sample t 6.5 | 30 bps a month haircut, monthly tier | 1964-01 | 1.6% | 4.5% | 0.38 | -32% | 3.6 est | 2012-12 | 0.52 | -0.01 | -0.0 | 0.00 | 0.00 | Published series, failed |
| [Earnings surprise streak](../09-strategies/cards/eq-cz-earningsstreak.md) | Loh and Warachka 2012, MS | Earnings surprise streak: Chen-Zimmermann in-sample t 10.4; original paper 0.96% a month | 30 bps a month haircut, monthly tier | 1984-11 | 7.5% | 6.7% | 1.12 | -15% | 3.6 est | 2012-12 | 1.32 | 0.68 | 2.4 | 0.36 | 0.92 | Published series, stats held |
| [Efficient frontier index](../09-strategies/cards/eq-cz-frontier.md) | Nguyen and Swanson 2009, JFQA | Efficient frontier index: Chen-Zimmermann in-sample t 6.2; original paper 0.96% a month | 8 bps a month haircut, annual tier | 1963-07 | 12.9% | 19.1% | 0.73 | -58% | 1.0 est | 2009-12 | 0.94 | 0.21 | 0.8 | 0.00 | 0.20 | Published series, weak |
| [Employment growth](../09-strategies/cards/eq-cz-hire.md) | Bazdresch, Belo and Lin 2014, JPE | Employment growth: Chen-Zimmermann in-sample t 5.6; original paper 0.87% a month | 8 bps a month haircut, annual tier | 1965-07 | 3.9% | 7.5% | 0.54 | -31% | 1.0 est | 2014-12 | 0.70 | 0.01 | 0.0 | 0.00 | 0.01 | Published series, weak |
| [Enterprise Multiple](../09-strategies/cards/eq-cz-entmult.md) | Loughran and Wellman 2011, JFQA | Enterprise Multiple: Chen-Zimmermann in-sample t 5.5; original paper 0.95% a month | 8 bps a month haircut, annual tier | 1951-07 | 6.3% | 12.1% | 0.57 | -52% | 1.0 est | 2011-12 | 0.69 | 0.13 | 0.5 | 0.00 | 0.01 | Published series, weak |
| [Firm Age - Momentum](../09-strategies/cards/eq-cz-firmagemom.md) | Zhang 2006, JF | Firm Age - Momentum: Chen-Zimmermann in-sample t 5.8; original paper 2.90% a month | 65 bps a month haircut, momentum tier | 1927-05 | 3.8% | 18.0% | 0.30 | -90% | 8.2 est | 2006-12 | 0.34 | 0.12 | 0.5 | 0.00 | 0.00 | Published series, weak |
| [Industry return of big firms](../09-strategies/cards/eq-cz-indretbig.md) | Hou 2007, RFS | Industry return of big firms: Chen-Zimmermann in-sample t 9.8 | 30 bps a month haircut, monthly tier | 1926-02 | 13.0% | 13.5% | 0.97 | -68% | 3.6 est | 2007-12 | 1.08 | 0.48 | 2.0 | 0.02 | 0.91 | Published series, stats held |
| [Intermediate Momentum](../09-strategies/cards/eq-cz-intmom.md) | Novy-Marx 2012, JFE | Intermediate Momentum: Chen-Zimmermann in-sample t 6.1; original paper 1.20% a month | 65 bps a month haircut, momentum tier | 1927-01 | 2.9% | 23.3% | 0.27 | -95% | 8.2 est | 2012-12 | 0.32 | -0.03 | -0.1 | 0.00 | 0.00 | Published series, failed |
| [Inventory Growth](../09-strategies/cards/eq-cz-chinv.md) | Thomas and Zhang 2002, RAS | Inventory Growth: Chen-Zimmermann in-sample t 6.3; original paper 0.95% a month | 8 bps a month haircut, annual tier | 1952-07 | 5.6% | 7.4% | 0.78 | -28% | 1.0 est | 2002-12 | 1.02 | 0.21 | 1.0 | 0.00 | 0.31 | Published series, weak |
| [Inventory Growth](../09-strategies/cards/eq-cz-invgrowth.md) | Belo and Lin 2012, RFS | Inventory Growth: Chen-Zimmermann in-sample t 7.4; original paper 0.89% a month | 8 bps a month haircut, annual tier | 1952-07 | 6.8% | 8.9% | 0.79 | -38% | 1.0 est | 2012-12 | 0.90 | 0.33 | 1.2 | 0.00 | 0.34 | Published series, weak |
| [Mohanram G-score](../09-strategies/cards/eq-cz-ms.md) | Mohanram 2005, RAS | Mohanram G-score: Chen-Zimmermann in-sample t 5.1; original paper 1.57% a month | 30 bps a month haircut, monthly tier | 1974-09 | 5.4% | 15.7% | 0.41 | -49% | 3.6 est | 2005-12 | 0.46 | 0.30 | 1.4 | 0.00 | 0.00 | Published series, weak |
| [Momentum in high volume stocks](../09-strategies/cards/eq-cz-momvol.md) | Lee and Swaminathan 2000, JF | Momentum in high volume stocks: Chen-Zimmermann in-sample t 5.1; original paper 1.55% a month | 20 bps a month haircut, quarterly tier | 1928-01 | 6.7% | 29.5% | 0.40 | -99% | 2.4 est | 2000-12 | 0.42 | 0.36 | 1.8 | 0.00 | 0.00 | Published series, weak |
| [Net Operating Assets](../09-strategies/cards/eq-cz-noa.md) | Hirshleifer et al. 2004, JAE | Net Operating Assets: Chen-Zimmermann in-sample t 7.6; original paper 1.48% a month | 30 bps a month haircut, monthly tier | 1963-01 | 4.8% | 11.6% | 0.46 | -70% | 3.6 est | 2004-12 | 0.87 | -0.26 | -1.2 | 0.00 | 0.00 | Published series, failed |
| [Net debt financing](../09-strategies/cards/eq-cz-netdebtfinance.md) | Bradshaw, Richardson, Sloan 2006, JAE | Net debt financing: Chen-Zimmermann in-sample t 7.8; original paper 0.68% a month | 8 bps a month haircut, annual tier | 1972-07 | 6.8% | 6.4% | 1.06 | -26% | 1.0 est | 2006-12 | 1.38 | 0.57 | 2.5 | 0.19 | 0.95 | Published series, stats held |
| [Off season long-term reversal](../09-strategies/cards/eq-cz-momoffseason.md) | Heston and Sadka 2008, JFE | Off season long-term reversal: Chen-Zimmermann in-sample t 5.2; original paper 1.25% a month | 30 bps a month haircut, monthly tier | 1927-02 | 6.3% | 19.3% | 0.40 | -78% | 3.6 est | 2008-12 | 0.49 | -0.01 | -0.1 | 0.00 | 0.00 | Published series, failed |
| [Percent Total Accruals](../09-strategies/cards/eq-cz-pcttotacc.md) | Hafzalla, Lundholm, Van Winkle 2011, AR | Percent Total Accruals: Chen-Zimmermann in-sample t 4.8; original paper 0.71% a month | 8 bps a month haircut, annual tier | 1988-07 | 3.2% | 6.1% | 0.55 | -24% | 1.0 est | 2011-12 | 0.63 | 0.43 | 1.6 | 0.00 | 0.05 | Published series, weak |
| [Predicted div yield next month](../09-strategies/cards/eq-cz-divyieldst.md) | Litzenberger and Ramaswamy 1979, JFE | Predicted div yield next month: Chen-Zimmermann in-sample t 5.3 | 30 bps a month haircut, monthly tier | 1926-05 | 3.7% | 7.0% | 0.55 | -45% | 3.6 est | 1979-12 | 0.45 | 0.74 | 5.0 | 0.00 | 0.00 | Published series, stats held |
| [Put volatility minus call volatility](../09-strategies/cards/eq-cz-smileslope.md) | Yan 2011, JFE | Put volatility minus call volatility: Chen-Zimmermann in-sample t 8.2; original paper 1.80% a month | 30 bps a month haircut, monthly tier | 1996-02 | 11.8% | 7.2% | 1.58 | -14% | 3.6 est | 2011-12 | 1.98 | 1.00 | 3.3 | 0.99 | 1.00 | Paid data, stats pass |
| [Return on assets qtrly](../09-strategies/cards/eq-cz-roaq.md) | Balakrishnan, Bartov and Faurel 2010, JAE | Return on assets (qtrly): Chen-Zimmermann in-sample t 5.5; original paper 0.84% a month | 30 bps a month haircut, monthly tier | 1966-07 | 9.7% | 19.8% | 0.57 | -68% | 3.6 est | 2010-12 | 0.54 | 0.64 | 2.5 | 0.00 | 0.03 | Published series, stats held |
| [Return skewness](../09-strategies/cards/eq-cz-returnskew.md) | Bali, Engle and Murray 2015, Book | Return skewness: Chen-Zimmermann in-sample t 5.6; original paper 0.47% a month | 30 bps a month haircut, monthly tier | 1926-02 | 2.4% | 7.3% | 0.36 | -57% | 3.6 est | 2015-12 | 0.41 | -0.03 | -0.1 | 0.00 | 0.00 | Published series, failed |
| [Revenue Surprise](../09-strategies/cards/eq-cz-revenuesurprise.md) | Jegadeesh and Livnat 2006, JAE | Revenue Surprise: Chen-Zimmermann in-sample t 5.7 | 30 bps a month haircut, monthly tier | 1963-06 | 3.2% | 6.5% | 0.52 | -25% | 3.6 est | 2006-12 | 0.70 | 0.13 | 0.6 | 0.00 | 0.01 | Published series, weak |
| [Trend Factor](../09-strategies/cards/eq-cz-trendfactor.md) | Han, Zhou, Zhu 2016, JFE | Trend Factor: Chen-Zimmermann in-sample t 13.4; original paper 1.63% a month | 65 bps a month haircut, momentum tier | 1926-03 | 11.4% | 14.1% | 0.84 | -67% | 8.2 est | 2016-12 | 0.94 | -0.22 | -0.6 | 0.00 | 0.53 | Published series, failed |
| [Up Forecast](../09-strategies/cards/eq-cz-uprecomm.md) | Barber et al. 2001, JF | Up Forecast: Chen-Zimmermann in-sample t 4.8 | 30 bps a month haircut, monthly tier | 1993-12 | 0.6% | 4.2% | 0.17 | -31% | 3.6 est | 2001-12 | 1.59 | -0.24 | -1.2 | 0.00 | 0.00 | Paid data, failed |

### ETFs and Macro

| Strategy | Paper | Paper claim | Cost | Start | CAGR | Vol | Sharpe | Max DD | Turnover | Split | IS SR | OOS SR | OOS t | DSR pooled | DSR family | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| [Asset Class Momentum Rotation](../09-strategies/cards/etf-asset-class-momentum-rotation.md) | Quantpedia, Momentum Asset Allocation Strategy | Quantpedia, from the source paper over 1973 to 2009: 14.49% per annum, Sharpe 0.78. | 5 bps per unit traded | 2004-05 | 10.6% | 12.4% | 0.74 | -17% | 3.4 | 2010-12 | 0.99 | 0.62 vs 0.87 | 2.5 | 0.02 | 0.97 | Trails SPY |
| [Country CAPE Value](../09-strategies/cards/etf-country-cape.md) | Quantpedia, Value Factor - CAPE Effect within Countries | Quantpedia, from the source paper over 1980 to 2011: 14.7% per annum, Sharpe 0.56. | 20 bps per unit traded | 1872-12 | 3.6% | 14.2% | 0.32 | -51% | 0.7 | 2012-12 | 0.35 | -0.65 | -1.8 | 0.00 | 0.42 | Failed |
| [Country Index Mean Reversion](../09-strategies/cards/fu-equity-index-mean-reversion.md) | Balvers, Wu, Gilliland, 2000, The Journal of Finance | Mean reversion across 18 national markets with a half-life of 3 to 3.5 years. | 20 bps per unit traded | 1874-12 | -2.1% | 15.0% | -0.06 | -96% | 0.9 | 1997-12 | -0.04 | -0.24 | -1.2 | 0.00 | 0.00 | Failed |
| [Country Index Momentum and Reversal](../09-strategies/cards/etf-country-momentum.md) | Winner-Loser Reversals in National Stock Market Indices. Richards | Country indexes show momentum at one year and reversal over several years. | 20 bps per unit traded | 1872-12 | 2.1% | 13.7% | 0.22 | -61% | 1.4 | 1997-12 | 0.26 | -0.05 | -0.2 | 0.00 | 0.07 | Failed |
| [Fed Model Yield Gap Timing](../09-strategies/cards/etf-fed-model.md) | Quantpedia, FED Model | Quantpedia, from the source paper over 1959 to 2003: 11% per annum. | 10 bps per unit traded | 1871-09 | 8.9% | 13.3% | 0.71 | -82% | 0.2 | 1997-12 | 0.69 | 0.79 vs 0.71 | 4.1 | 0.00 | 1.00 | Held, family DSR |
| [Internal Bar Strength Reversal](../09-strategies/cards/etf-ibs-mean-reversion.md) | Kakushadze and Serur, 151 Trading Strategies, section 4.4 | The book cites Pagonidis 2014 on IBS predicting next-day ETF returns. | 5 bps per unit traded | 1993-02 | 7.2% | 10.2% | 0.49 | -26% | 36.2 | 2013-12 | 0.49 | 0.48 vs 0.68 | 1.7 | 0.00 | 0.82 | Trails SPY |
| [January Barometer](../09-strategies/cards/etf-january-barometer.md) | Quantpedia, January Barometer | Quantpedia, from the source paper over 1857 to 2008: 10.38% per annum. | 5 bps per unit traded | 1927-01 | 9.4% | 14.6% | 0.47 | -77% | 0.4 | 2006-12 | 0.45 | 0.59 vs 0.65 | 2.6 | 0.00 | 0.90 | Trails US market |
| [Oil Price Changes Predict Stocks](../09-strategies/cards/etf-oil-predicts-equity.md) | Driesprong, Jacobsen, Maat, 2008, Journal of Financial Economics | Oil price changes predict stock market returns in many developed markets. | 5 bps per unit traded | 1987-03 | 10.3% | 15.0% | 0.53 | -48% | 0.6 | 2008-12 | 0.26 | 0.86 vs 0.90 | 3.6 | 0.00 | 0.87 | Trails US market |
| [Paired Switching](../09-strategies/cards/etf-paired-switching.md) | Quantpedia, Paired Switching | Quantpedia, from the source paper over 1991 to 2011: 11.3% per annum, Sharpe 0.78. | 5 bps per unit traded | 2003-01 | 7.7% | 14.1% | 0.48 | -28% | 1.9 | 2011-12 | 0.67 | 0.36 vs 0.92 | 1.4 | 0.00 | 0.75 | Trails SPY |
| [Pre-Holiday Effect](../09-strategies/cards/etf-pre-holiday.md) | Quantpedia, Pre-Holiday Effect | Quantpedia, from the source paper over 1896 to 2002: 6.39% calculated from daily return (0.239%) in table 12 do DJ Index. | 5 bps per unit traded | 1926-07 | 4.2% | 2.8% | 0.42 | -8% | 8.5 | 1990-12 | 0.61 | 0.05 vs 0.55 | 0.3 | 0.00 | 0.83 | Trails US market |
| [Sector Momentum Rotation](../09-strategies/cards/etf-sector-momentum.md) | Kakushadze and Serur, 151 Trading Strategies, section 4.1 | The book cites Faber 2010 on sector rotation beating buy-and-hold. | 10 bps per unit traded | 1927-07 | 13.7% | 18.3% | 0.62 | -71% | 2.3 | 2010-12 | 0.59 | 0.82 vs 0.87 | 3.2 | 0.00 | 1.00 | Trails US market |
| [Sell in May](../09-strategies/cards/etf-sell-in-may.md) | Bouman, Jacobsen, 2002, American Economic Review | Bouman and Jacobsen find the Halloween pattern in most of the markets they study. | 5 bps per unit traded | 1926-08 | 8.6% | 12.1% | 0.47 | -57% | 1.0 | 2002-12 | 0.45 | 0.57 vs 0.72 | 2.8 | 0.00 | 0.92 | Trails US market |
| [Turn of the Month](../09-strategies/cards/eq-turn-of-month.md) | Ariel, 1987, Journal of Financial Economics | Ariel found nearly all positive US stock returns arrived in the first half of the month. | 5 bps per unit traded | 1926-07 | 7.8% | 7.1% | 0.67 | -24% | 11.5 | 1988-12 | 0.87 | 0.35 vs 0.54 | 2.2 | 0.00 | 1.00 | Trails US market |
| [Volatility-Managed Portfolios](../09-strategies/cards/etf-volatility-targeting.md) | Moreira, Muir, 2017, The Journal of Finance | Volatility-managed factor portfolios raise Sharpe ratios and produce large alphas. | 5 bps per unit traded | 1927-07 | 10.0% | 16.9% | 0.46 | -77% | 3.4 | 2017-12 | 0.48 | 0.24 vs 0.72 | 0.7 | 0.00 | 0.87 | Trails US market |

### Futures and CTA

| Strategy | Paper | Paper claim | Cost | Start | CAGR | Vol | Sharpe | Max DD | Turnover | Split | IS SR | OOS SR | OOS t | DSR pooled | DSR family | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| [Century of Trend Following](../09-strategies/cards/etf-century-of-trend.md) | Hurst, Ooi, Pedersen, 2017, The Journal of Portfolio Management | Trend following earned positive returns across a long history with low correlation to stocks. | 5 bps per unit traded | 1927-08 | 3.3% | 6.8% | 0.50 | -35% | 3.7 | 2017-12 | 0.55 | -0.12 | -0.4 | 0.00 | 0.96 | Failed |
| [Channel Breakout](../09-strategies/cards/fu-donchian-breakout.md) | Szakmary, Shen, Sharma, 2010, Journal of Banking &amp; Finance | Trend rules earned profits in most commodity futures in a long sample. | 5 bps per unit traded | 1993-04 | 2.3% | 8.0% | 0.01 | -27% | 3.9 | 2007-12 | -0.06 | 0.04 | 0.2 | 0.00 | 0.04 | Weak |

### Technical Analysis

| Strategy | Paper | Paper claim | Cost | Start | CAGR | Vol | Sharpe | Max DD | Turnover | Split | IS SR | OOS SR | OOS t | DSR pooled | DSR family | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| [Oscillator Oversold Reversion](../09-strategies/cards/ta-oscillator-reversion.md) | BROCK and co-authors, 1992, The Journal of Finance | The code ships the rule with no performance claim. | 5 bps per unit traded | 1993-11 | 6.9% | 6.4% | 0.68 | -15% | 8.1 | 2008-12 | 0.85 | 0.55 vs 0.76 | 2.3 | 0.00 | 1.00 | Trails SPY |
| [Price and Slope versus Moving Average](../09-strategies/cards/ta-price-above-ma.md) | BROCK and co-authors, 1992, The Journal of Finance | Brock, Lakonishok and LeBaron found buy signals followed by higher returns than sell signals on the Dow, 1897 to 1986 | 5 bps per unit traded | 1927-03 | 10.7% | 11.3% | 0.69 | -34% | 2.7 | 1992-12 | 0.77 | 0.56 vs 0.52 | 3.2 | 0.00 | 1.00 | Held, family DSR |
| [Two Moving Average Crossover](../09-strategies/cards/ta-two-ma-crossover.md) | BROCK and co-authors, 1992, The Journal of Finance | Brock, Lakonishok and LeBaron found buy signals followed by higher returns than sell signals on the Dow, 1897 to 1986 | 5 bps per unit traded | 1927-03 | 8.8% | 12.6% | 0.49 | -62% | 0.5 | 1992-12 | 0.42 | 0.63 vs 0.52 | 3.6 | 0.00 | 1.00 | Held, family DSR |

### Options and Volatility

| Strategy | Paper | Paper claim | Cost | Start | CAGR | Vol | Sharpe | Max DD | Turnover | Split | IS SR | OOS SR | OOS t | DSR pooled | DSR family | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| [Option Expiration Week Effect](../09-strategies/cards/op-opex-week.md) | Option-Expiration Week Effect - Quantpedia. web | Quantpedia lists higher returns in expiration weeks for stocks with high option open interest. | 5 bps per unit traded | 1926-07 | 2.1% | 8.2% | -0.08 | -75% | 11.5 | 2013-12 | -0.09 | 0.00 vs 0.69 | 0.0 | 0.00 | 0.00 | Trails US market |
| [Short Index Volatility](../09-strategies/cards/op-short-index-vol.md) | Carr, Wu, 2008, Review of Financial Studies | Carr and Wu find strongly negative variance risk premia in index options. | Sold half a vol point under VIX | 1993-02 | 2.1% | 4.9% | 0.46 | -23% | 12.0 est | 2009-12 | 0.46 | 0.45 | 1.9 | 0.00 | 0.82 | Weak |

### Rates

| Strategy | Paper | Paper claim | Cost | Start | CAGR | Vol | Sharpe | Max DD | Turnover | Split | IS SR | OOS SR | OOS t | DSR pooled | DSR family | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| [Bond Carry and Roll-Down](../09-strategies/cards/rt-bond-carry.md) | Koijen, Moskowitz, Pedersen, Vrugt, 2018, Journal of Financial Economics | Carry predicts returns in global bonds, equities, currencies and commodities. | 2 bps per unit traded | 1969-08 | 0.8% | 3.4% | 0.26 | -19% | 5.5 | 2018-12 | 0.34 | -0.57 | -1.6 | 0.00 | 0.62 | Failed |
| [Forward-Rate Term Premium Factor](../09-strategies/cards/rt-cochrane-piazzesi.md) | Cochrane, Piazzesi, 2005, American Economic Review | The factor forecasts one-year excess bond returns with R-squared up to 44%. | 2 bps per unit traded | 1987-06 | -0.8% | 4.3% | -0.16 | -35% | 1.7 | 2005-12 | -0.14 | -0.18 | -0.8 | 0.00 | 0.01 | Failed |
| [Government Bond Value](../09-strategies/cards/rt-bond-value.md) | Kakushadze and Serur, 151 Trading Strategies, section 5.10 | The book cites Asness, Moskowitz and Pedersen 2013, who found value pays across country bonds. | 2 bps per unit traded | 1967-01 | 1.4% | 5.1% | 0.30 | -16% | 0.3 | 2013-12 | 0.34 | 0.27 | 1.0 | 0.00 | 0.74 | Weak |
| [Low-Risk Bond Factor](../09-strategies/cards/rt-low-risk-bonds.md) | Kakushadze and Serur, 151 Trading Strategies, section 5.9 | The book cites Frazzini and Pedersen 2014, who found betting against beta works in Treasuries and credit. | 2 bps per unit traded | 1976-07 | 0.8% | 5.0% | 0.18 | -27% | 0.3 | 2014-12 | 0.26 | -0.14 | -0.5 | 0.00 | 0.40 | Failed |

### Credit

| Strategy | Paper | Paper claim | Cost | Start | CAGR | Vol | Sharpe | Max DD | Turnover | Split | IS SR | OOS SR | OOS t | DSR pooled | DSR family | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| [Credit Risk Premium](../09-strategies/cards/cr-credit-risk-premium.md) | Asvanunt, Richardson, 2016, The Journal of Fixed Income | Credit excess returns over duration-matched Treasuries are positive across 1936-2014. | 5 bps per unit traded | 2002-09 | 0.8% | 5.9% | 0.16 | -26% | 0.2 | 2017-12 | 0.14 | 0.20 | 0.6 | 0.00 | 0.78 | Weak |

### FX

| Strategy | Paper | Paper claim | Cost | Start | CAGR | Vol | Sharpe | Max DD | Turnover | Split | IS SR | OOS SR | OOS t | DSR pooled | DSR family | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| [Currency Carry Trade](../09-strategies/cards/fx-carry.md) | Lustig, Roussanov, Verdelhan, 2011, Review of Financial Studies | Carry earns positive average returns explained by a global risk factor. | 10 bps per unit traded | 1995-03 | 5.5% | 9.2% | 0.63 | -24% | 0.7 | 2011-12 | 0.57 | 0.73 | 2.8 | 0.00 | 0.94 | Held |
| [Currency Momentum](../09-strategies/cards/fx-momentum.md) | Menkhoff, Sarno, Schmeling, Schrimpf, 2012, Journal of Financial Economics | Menkhoff and co-authors find high excess returns for currency momentum. | 10 bps per unit traded | 1996-03 | 0.5% | 8.5% | 0.10 | -42% | 4.6 | 2012-12 | 0.17 | -0.00 | -0.0 | 0.00 | 0.11 | Failed |
| [Currency Value](../09-strategies/cards/fx-value-ppp.md) | Menkhoff, Sarno, Schmeling, Schrimpf, 2016, Review of Financial Studies | Value earns returns tied to macro fundamentals. | 10 bps per unit traded | 1996-03 | -0.5% | 7.5% | -0.03 | -48% | 2.2 | 2013-12 | 0.27 | -0.45 | -1.6 | 0.00 | 0.02 | Failed |
| [Dollar Carry](../09-strategies/cards/fx-dollar-carry.md) | Lustig, Roussanov, Verdelhan, 2010 | Dollar carry earned high Sharpe ratios in 1983-2010. | 10 bps per unit traded | 1971-03 | 2.5% | 6.5% | 0.42 | -24% | 0.6 | 2014-12 | 0.50 | 0.08 | 0.3 | 0.00 | 0.74 | Weak |
| [FX Momentum and Carry Combination](../09-strategies/cards/fx-momentum-carry-combo.md) | Kakushadze and Serur, 151 Trading Strategies, section 8.4 | The book cites Olszweski and Zhou 2013 on combining the two FX premia. | 10 bps per unit traded | 1996-03 | 3.1% | 6.7% | 0.48 | -19% | 2.5 | 2015-12 | 0.49 | 0.48 | 1.6 | 0.00 | 0.78 | Weak |

### Commodities

| Strategy | Paper | Paper claim | Cost | Start | CAGR | Vol | Sharpe | Max DD | Turnover | Split | IS SR | OOS SR | OOS t | DSR pooled | DSR family | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| [Commodity Momentum](../09-strategies/cards/cm-momentum.md) | Miffre, Rallis, 2005 | Miffre and Rallis find 13 profitable momentum strategies at about 9% a year. | 10 bps per unit traded | 1961-03 | -1.3% | 14.9% | -0.01 | -91% | 4.4 | 2007-12 | 0.22 | -0.52 | -2.2 | n/a | n/a | Indicative |

### Crypto

| Strategy | Paper | Paper claim | Cost | Start | CAGR | Vol | Sharpe | Max DD | Turnover | Split | IS SR | OOS SR | OOS t | DSR pooled | DSR family | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| [Bitcoin Intraday Seasonality](../09-strategies/cards/cy-intraday-seasonality.md) | Overnight Seasonality in Bitcoin - Quantpedia. web | Quantpedia lists hour-of-day patterns tied to US and Asian sessions. | 10 bps per side, two trades a day | 2017-08 | -35.3% | 18.6% | -2.24 | -99% | 365.0 | 2022-04 mid | -1.29 | -4.01 | -8.6 | 0.00 | 0.00 | Failed |
| [Crypto Rebalancing Premium](../09-strategies/cards/cy-rebalancing.md) | Rebalancing Premium in Cryptocurrencies - Quantpedia. web | Quantpedia lists a rebalancing premium from high vol and low correlation. | 10 bps per unit traded | 2019-01 | -4.3% | 15.8% | -0.20 | -51% | 2.1 | 2021-12 | -0.27 | -0.14 | -0.3 | 0.00 | 0.00 | Failed |
| [Crypto Size and Momentum Factors](../09-strategies/cards/cy-cross-section-factors.md) | Liu, Tsyvinski, Wu, 2022, The Journal of Finance | Three factors price the cross-section of crypto returns. | 10 bps per unit traded | 2020-03 | -1.2% | 73.6% | 0.36 | -79% | 52.4 | 2023-07 mid | 0.44 | 0.27 | 0.5 | 0.02 | 0.00 | Weak |
| [Evaluation of Dynamic Cointegration-Based Pairs Trading Strategy in the Cryptocurrency Market](../09-strategies/cards/cy-ax-evaluation-of-dynamic-cointegration-based-pairs-tr.md) | Masood Tadi and co-authors, 2021, arXiv 2109.10662 | The abstract reports: Another large finding is that we implement a numerous collection of cryptocurrency coins to formulate the model's spread, whi... | 10 bps per unit traded | 2017-10 | -8.6% | 21.9% | -0.30 | -63% | 7.9 | 2021-12 | -0.34 | -0.28 | -0.6 | 0.00 | 0.00 | Failed |
| [Optimal vs. Naive Diversification in the Cryptocurrencies Market: The Role of Time-Varying Moments and Transaction Costs](../09-strategies/cards/cy-ax-optimal-vs-naive-diversification-in-the-cryptocurr.md) | Naive Diversification in the Cryptocurrencies Market: The Role of Time-Varyin... | The abstract reports: First, whether time-varying moment estimators outperform conventional sample estimators in practical portfolio construction. | 10 bps per unit traded | 2018-07 | 32.1% | 100.5% | 0.66 | -79% | 1.0 | 2022-08 mid | 0.92 | 0.31 vs 0.65 | 0.6 | 0.04 | 0.00 | Trails BTC |
| [Stablecoin Mint Flow Signal](../09-strategies/cards/cy-stablecoin-flows.md) | Griffin, Shams, 2020, The Journal of Finance | Griffin and Shams link Tether flows to bitcoin price support in 2017-2018. | 25 bps per unit traded | 2017-12 | 29.7% | 55.8% | 0.70 | -65% | 3.7 | 2020-12 | 0.86 | 0.60 vs 0.45 | 1.5 | 0.08 | 0.00 | Weak |

### Prediction Markets

| Strategy | Paper | Paper claim | Cost | Start | CAGR | Vol | Sharpe | Max DD | Turnover | Split | IS SR | OOS SR | OOS t | DSR pooled | DSR family | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| [Favorite-Longshot Bias in Prediction Markets](../09-strategies/cards/pm-favorite-longshot.md) | Wolfers, Zitzewitz, 2004, Journal of Economic Perspectives | Wolfers and Zitzewitz report longshots are overpriced in prediction markets as at racetracks. | Kalshi fee ceil(0.07 p (1-p)) plus 1 cent of spread per contract | 2026-07 | 781.5% | 3.2% | 68.75 | 0% | 36.5 | 2026-08 mid | 57.68 | 91.52 | 29.9 | n/a | n/a | Indicative |
| [Final-Period Momentum](../09-strategies/cards/pm-late-momentum.md) | Source code in `finance/code/`: 1 implementations listed in `08-software/STRA... | The backtest framework ships it with no claim. | 1 cent of spread per contract, no fee | 2024-07 | -4.5% | 15.6% | -0.22 | -16% | 0.6 | 2025-09 mid | -0.11 | -0.30 | -0.3 | 0.02 | 0.06 | Failed |
| [Near-Certain Outcome Harvesting](../09-strategies/cards/pm-near-certain-harvest.md) | Overview - Polymarket Documentation. web | Small return per trade with short holding time. | Kalshi fee ceil(0.07 p (1-p)) plus 1 cent of spread per contract | 2026-07 | 35.1% | 1.1% | 28.46 | -0% | 36.3 | 2026-08 mid | 24.34 | 35.15 | 11.5 | n/a | n/a | Indicative |
| [Probability Threshold Cross](../09-strategies/cards/pm-threshold-cross.md) | Source code in `finance/code/`: 2 implementations listed in `08-software/STRA... | The backtest framework ships it with no claim. | 1 cent of spread per contract, no fee | 2024-07 | -5.7% | 4.3% | -1.33 | -15% | 0.3 | 2025-09 mid | -1.68 | -1.11 | -1.2 | 0.00 | 0.00 | Failed |

### Sports Betting

| Strategy | Paper | Paper claim | Cost | Start | CAGR | Vol | Sharpe | Max DD | Turnover | Split | IS SR | OOS SR | OOS t | DSR pooled | DSR family | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| [Poisson Goal Models](../09-strategies/cards/sb-dixon-coles.md) | Dixon, Coles, 1997, Journal of the Royal Statistical Society Series C: Applie... | Dixon and Coles found positive returns against 1990s UK bookmaker odds. | Bet365 margin inside the odds | 2004-08 | -59.7% | 31.8% | -2.67 | -100% | 8.6 | 2014-12 mid | -3.00 | -2.34 | -7.6 | 0.00 | 0.00 | Failed |
| [Soft Book Value Betting](../09-strategies/cards/sb-soft-book-value.md) | Beating the bookies with their own numbers - and how the online sports bettin... | Kaunitz, Zhong and Kreiner earned positive returns in football until bookmakers limited them. | Bookmaker margin inside the odds | 2005-07 | 1.1% | 18.7% | 0.15 | -74% | 1.7 | 2017-12 | 0.07 | 0.69 | 1.9 | 0.00 | 0.00 | Weak |
| [Sports Arbitrage, Surebets](../09-strategies/cards/sb-surebets.md) | Franck, Verbeek, Nüesch, 2010 | Franck, Verbeek and Nüesch find arbitrage between bookmakers and exchanges in football. | Bookmaker margin inside the odds; half the quoted edge kept | 2009-03 | 0.6% | 0.1% | 4.57 | 0% | 0.8 | 2013-12 | 2.83 | 5.65 | 19.1 | n/a | n/a | Indicative |

## Construction

| Strategy | Function | Asset | Rule and data |
|---|---|---|---|
| Accrual Anomaly | `accruals` | US equities | Card rule as written |
| Asset Growth and Investment | `asset_growth` | US equities | Card rule as written |
| Betting Against Beta | `betting_against_beta` | US equities | Dollar-neutral low minus high beta decile; the paper levers the low-beta leg to beta-neutral |
| Cross-Sectional Stock Momentum | `momentum_12_1` | US equities | Card rule as written |
| Factor Momentum | `factor_momentum` | US equities | 12 French factors, US and developed ex US; sign of the prior 12-month return |
| Gross Profitability | `profitability` | US equities | French operating profitability sort stands in for gross profits to assets |
| January Effect | `january_effect` | US equities | Card rule as written |
| Low Idiosyncratic Volatility | `low_idio_vol` | US equities | Card rule as written |
| Net Share Issuance | `share_issuance` | US equities | Card rule as written |
| Quality Minus Junk | `quality_minus_junk` | US equities | High profitability, low investment corner minus the opposite corner of the French 5x5 sort |
| Same-Month Return Seasonality | `return_seasonality` | US equities | 49 French industries; same-calendar-month mean over the prior 20 years |
| Small-Cap Premium | `size_small_cap` | US equities | Card rule as written |
| Style Index Momentum | `style_momentum` | US equities | Six French size and book-to-market portfolios |
| Value and Book to Market | `value_book_to_market` | US equities | Card rule as written |
| Value and Momentum Everywhere | `value_momentum_everywhere` | Developed equities | French regional HML and WML for four regions; the paper adds bonds, FX and commodities |
| Asset Class Momentum Rotation | `asset_class_rotation` | ETFs | Card rule as written |
| Country CAPE Value | `country_value` | Country equity indexes | JST annual equity returns in USD over the US bill, 18 countries, top minus bottom third; years with a fivefold currency move or redenomination dropped, and one 700% post-war reopening year; dividend yield stands in for CAPE |
| Country Index Mean Reversion | `country_reversal` | Country equity indexes | JST annual equity returns in USD over the US bill, 18 countries, top minus bottom third; years with a fivefold currency move or redenomination dropped, and one 700% post-war reopening year |
| Country Index Momentum and Reversal | `country_momentum` | Country equity indexes | JST annual equity returns in USD over the US bill, 18 countries, top minus bottom third; years with a fivefold currency move or redenomination dropped, and one 700% post-war reopening year |
| Fed Model Yield Gap Timing | `fed_model` | US stocks and bonds | Shiller monthly averages; earnings lagged six months and the signal one extra month |
| Internal Bar Strength Reversal | `ibs_reversion` | ETFs | SPY and QQQ, long the next session when internal bar strength is under 0.2 |
| January Barometer | `january_barometer` | US equity index | Card rule as written |
| Oil Price Changes Predict Stocks | `oil_predicts_equity` | US equity index | Expanding regression of next-month excess return on the oil price change, from 1973 |
| Paired Switching | `paired_switching` | ETFs | Card rule as written |
| Pre-Holiday Effect | `pre_holiday` | US equity index | Pre-holiday days read from the trading calendar: the next session skips exactly one weekday |
| Sector Momentum Rotation | `sector_momentum` | US sectors | Ten French industries stand in for sector ETFs |
| Sell in May | `sell_in_may` | US equity index | Card rule as written |
| Turn of the Month | `turn_of_month` | US equity index | Card rule as written |
| Volatility-Managed Portfolios | `volatility_managed_market` | US equity index | Weight is inverse realized variance over its own expanding mean, so the average weight is one with no look-ahead |
| Century of Trend Following | `century_of_trend` | multi-asset | US equity from 1926, 10-year Treasury from 1962, five currencies from the 1970s; the paper uses 67 markets |
| Channel Breakout | `donchian_breakout` | ETFs | Long and short, 55-day entry and 20-day exit channels on 12 ETFs |
| Oscillator Oversold Reversion | `rsi2_reversion` | ETFs | SPY: buy when 2-day RSI is under 10 above the 200-day mean, exit above the 5-day mean |
| Price and Slope versus Moving Average | `price_above_ma200` | US equity index | Card rule as written |
| Two Moving Average Crossover | `ma_cross_50_200` | US equity index | Card rule as written |
| Option Expiration Week Effect | `opex_week` | US equity index | Whole market stands in for the S&P 100 |
| Short Index Volatility | `short_index_variance` | S&P 500 variance | Synthetic one-month variance swap: VIX squared against SPY realized variance, three units of variance notional |
| Bond Carry and Roll-Down | `bond_carry` | US Treasuries | Yield over the 3-month bill per unit of duration; legs sized to five years of duration |
| Forward-Rate Term Premium Factor | `cochrane_piazzesi` | US Treasuries | Par yields treated as zero yields, 4-year point interpolated; expanding fit with 12-month targets ended before each forecast date |
| Government Bond Value | `bond_value` | US Treasuries | US only: long the 10-year when its real yield sits above the expanding median; the paper ranks countries |
| Low-Risk Bond Factor | `low_risk_bonds` | US Treasuries | Long the 2-year levered to the 10-year's duration, short the 10-year |
| Credit Risk Premium | `credit_risk_premium` | US investment-grade credit | LQD minus IEF, rebalanced monthly; durations differ by about a year |
| Currency Carry Trade | `fx_carry` | 10 currencies vs USD | FRED spot plus BIS policy-rate differential; five developed and five emerging currencies |
| Currency Momentum | `fx_momentum` | 10 currencies vs USD | FRED spot plus BIS policy-rate differential; five developed and five emerging currencies |
| Currency Value | `fx_value` | 10 currencies vs USD | FRED spot plus BIS policy-rate differential; five developed and five emerging currencies; value is the five-year fall in the real exchange rate, annual CPI lagged a year |
| Dollar Carry | `fx_dollar_carry` | 10 currencies vs USD | FRED spot plus BIS policy-rate differential; five developed and five emerging currencies |
| FX Momentum and Carry Combination | `fx_momentum_carry` | 10 currencies vs USD | FRED spot plus BIS policy-rate differential; five developed and five emerging currencies |
| Commodity Momentum | `commodity_momentum` | Spot commodities | World Bank monthly average spot prices with one month skipped; no futures roll, so this is a spot proxy and cannot be traded as shown |
| Bitcoin Intraday Seasonality | `btc_evening_hours` | BTC | Long BTC from 21:00 to 23:00 UTC each day |
| Crypto Rebalancing Premium | `crypto_rebalancing_premium` | Binance spot, 30 coins | Monthly equal-weight rebalance minus the same basket left to drift within each calendar year |
| Crypto Size and Momentum Factors | `crypto_xs_momentum` | Binance spot, 30 coins | Three-week momentum, top five minus bottom five, weekly; no size leg without market caps; shorts need perpetuals |
| Evaluation of Dynamic Cointegration-Based Pairs Trading Strategy in the Cryptocurrency Market | `btc_eth_pairs` | BTC and ETH | 60-day z-score of the log ETH/BTC ratio: enter at 2, exit at 0; fixed 60-day window in place of the rolling cointegration test |
| Optimal vs. Naive Diversification in the Cryptocurrencies Market: The Role of Time-Varying Moments and Transaction Costs | `crypto_equal_weight` | Binance spot, 30 coins | Equal weight across listed coins, monthly rebalance, long only |
| Stablecoin Mint Flow Signal | `stablecoin_flow_btc` | BTC | Long BTC when total stablecoin supply grew over the prior 30 days, supply lagged one day |
| Favorite-Longshot Bias in Prediction Markets | `kalshi_favorites` | Kalshi, all settled binaries with volume of 100 or more | Buy the side priced 0.70 to 0.97 a day before close; equal stakes summing to 10% of bankroll a day; price is the last trade 24 hours earlier |
| Final-Period Momentum | `polymarket_late_momentum` | Polymarket, 377 high-volume binaries with daily history | Three days before the end, buy the side that gained over the prior week; 1% of bankroll a bet, 20% a week at most |
| Near-Certain Outcome Harvesting | `kalshi_near_certain` | Kalshi, all settled binaries with volume of 100 or more | Buy the side priced 0.95 to 0.97 a day before close; equal stakes summing to 10% of bankroll a day |
| Probability Threshold Cross | `polymarket_threshold_cross` | Polymarket, 377 high-volume binaries with daily history | Buy YES the first day the price closes above 0.60, at least two days before the end; 1% of bankroll a bet, 20% a week at most |
| Poisson Goal Models | `poisson_value_bets` | European football, 22 leagues | Plain independent Poisson fitted on the two prior seasons of each league; bet Bet365 odds at a modelled edge above 10%, 1% of bankroll a bet |
| Soft Book Value Betting | `soft_book_value` | European football, 22 leagues | Bet the best listed odds when they beat the average-odds probability less 0.05; 1% of bankroll a bet, 20% a week at most; accounts get limited in practice |
| Sports Arbitrage, Surebets | `surebets` | European football, 22 leagues | Stake all three results at the best listed odds when the edge tops 1%; a match is dropped as stale when any best price sits more than 10% above the panel average; half the edge is given up to moved prices, voids and stake caps; 1% of bankroll an arbitrage |

The 40 Chen-Zimmermann rows use the long-short return series from release 2026.10 as published, with the weights and rebalance period of each original paper, less the tier haircut.

## Tests

`python -m pytest` passes 225 tests. `tests/test_leakage.py` reruns the 60 hand-built functions, five Chen-Zimmermann series and the 44 earlier trials with the data cut at three dates each. Weights up to the cut and returns before it must match the full run to 1e-9. Three planted leaks must fail the same check. `tests/test_replication100.py` covers each new metric path: tier haircut, rank weights, bet sizing, bond returns, split rule, out-of-sample t, cash rate and benchmark coverage, pooled and family deflation, the surebet filters, Kalshi pricing, Poisson fit.

## Limits

- The trial count is a floor. Bet sizing changed once, from equal weekly exposure to 1% a bet. The volatility-managed scale, the JST currency conversion and the Poisson base rate were repaired after a first run. The minimum data on each side of a split went from 20% of the sample to three years, which returned most midpoint splits to their publication year. None of these added a registry entry.
- 184 of 212 Chen-Zimmermann portfolios are equal weighted, so their returns lean on microcaps that cost more to trade than the haircut assumes.
- French sorts stand in for some paper definitions: operating profitability for gross profitability, a dollar-neutral beta spread for the levered BAB factor, a profitability and investment corner for quality.
- Kalshi history covers 11 weeks, 2026-07-13 to 2026-09-27, and gives the last trade a day before settlement. YES contracts last traded at 30 to 50 cents won 8% of the time, the mark of stale prints on dead contracts, so both Kalshi rows are indicative.
- Polymarket has daily price paths for 377 markets.
- Currency returns use central bank policy rates for the interest leg and start in 1995, when six currencies have both series.
- Treasury returns come from par yields repriced monthly. The Cochrane-Piazzesi factor treats par yields as zero yields.
- Shiller prices are monthly averages; the yield-gap rule lags its signal an extra month for that reason.
- Football odds are the best price across the bookmaker panel in a pre-match snapshot. The surebet row drops matches where a best price sits more than 10% above the panel average, needs a 1% edge and keeps half of it. Without those filters it showed 23,520 arbitrages and a Sharpe of 6.27, kept in the registry as `surebets_unfiltered`. Neither version can prove the quotes were live together, and bookmakers limit accounts that win, so the row is indicative.
- Crypto short legs need perpetuals; funding payments are left out.
- JST country returns are annual, so the three country rules have 149 observations or fewer.
