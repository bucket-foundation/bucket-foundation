# 100 Strategy Replications

Bead `bkt-q5moa.16`. Run 2026-11-27 on the files in `data/raw`. Reproduce inside `finance/lab/.venv` with `python fetch.py --only=openap && python run100.py && python report100.py`. Each strategy is one function under `lab/strategies/`; its numbers sit in `results/trials/<function>.json`, family files in `results/<family>.json`, the full trial list in `results/registry.json` and the totals in `results/summary.json`.

## Result

Zero of 100 strategies pass the pooled bar on data the lab holds and can trade.

{n_tradable} of the 100 are built from prices the lab holds. Of those, {n_family} held out of sample and passed deflation inside their own asset class only, {n_held} held with neither deflation passed, {n_failed_exec} lost money after their split date, {n_trail} trailed buy and hold and {n_weak} stayed positive with an out-of-sample t under 2.

{n_published} rows replay a published portfolio return series, the 40 Chen-Zimmermann long-short series and 12 Ken French sorts, less a cost haircut. The lab never built those portfolios from stock-level data, and {n_paid} of them need paid analyst or option data for the signal. They are scored and cannot count as held or survived. {n_pub_pass} clears the pooled statistics, the option smile slope series, and {n_pub_held} more hold out of sample.

{n_indicative} rows rest on prices that cannot be shown tradable, football arbitrage among them.

The 40 Chen-Zimmermann rows are the top in-sample t-stats out of {n_all_cz}, so their in-sample numbers carry a winner's curse. Their median Sharpe goes from {cz_is} in sample to {cz_oos} after publication; part of that fall is selection and part is decay. The whole set of {n_all_cz}, with no selection, goes from {all_is} to {all_oos}, and the {n_rest} left out of the table go from {rest_is} to {rest_oos}. {cz_t2} of the 40 and {all_t2} of the {n_all_cz} kept an out-of-sample t of 2 or more. All figures are net of costs.

## Method

| Item | Choice |
|---|---|
| Selection | From the 645 cards marked `y` in `../09-strategies/registry.csv`. Equities: the 40 Chen-Zimmermann signals with the highest in-sample t-stat in their own replication, lowest {cz_min_t}, a selection on the in-sample outcome, plus 16 cards the Ken French library can rebuild. Other families: every card with A or B family evidence that the files in `data/raw` can price, 44 in all, including the weaker crypto, prediction market and sports cards needed to cover those asset classes |
| Trial registry | `lab/trials.py`, loaded by `trials.load_all()`. {n_trials} trials: {n_new} hand-built trials, the 60 reported functions with one preset variant each and the first surebet specification, all {n_cz} Chen-Zimmermann long-short series since the 40 shown were picked from them, and the {n_legacy} variants and factor series behind `RESULTS.md` |
| Signal timing | Weights set at the close of period t earn period t+1 in `lab/backtest.py`. Fitted forecasts train only on targets that ended on or before the forecast date, through `common.expanding_forecast` |
| Split | The end of the paper's publication year, written in each `@strategy` decorator before the first run. Ten decorator years differ from the card's source year by one to six years, from working paper dates or a card that cites a later paper; the decorator year stands. Moving them to the card year would change three verdicts: quality and channel breakout from Weak to Failed, short index volatility from Weak to Held. With under three years of data on either side the split moves to the sample midpoint, marked `mid`; {n_mid} strategies |
| Equity costs | Monthly haircut by rebalance tier, on the scale of Novy-Marx and Velikov 2016: annual sorts 8 bps, quarterly 20, monthly 30, momentum 65, short-term reversal 150. About 95 bps per unit of one-way turnover across both legs |
| Other costs | Index and ETF trades 5 bps per unit traded, industry and country portfolios 10 to 20, Treasuries 2, currencies 10, Binance 10, Coinbase 25, Kalshi fee `ceil(0.07 p (1-p))` plus 1 cent of spread, Polymarket 1 cent of spread, bookmaker margin inside the quoted odds |
| Cash and Sharpe | Funded strategies earn the T-bill on idle cash and their Sharpe is over the T-bill. Long-short series are self-financing |
| Turnover | One-way, annualized. `est` marks the tier assumption where the source gives returns without holdings |
| Benchmark | Rules that switch between one asset and cash show buy and hold beside their out-of-sample Sharpe, over the same dates |
| Bet sizing | 1% of bankroll a bet, at most 20% a week; Kalshi spreads 10% a day across that day's contracts. Returns are weekly or daily changes in bankroll |
| Deflated Sharpe, pooled | Bailey and López de Prado 2014 with N of {n_trials} and the variance of annual Sharpe across every trial with valid prices, {var}. The best of {n_trials} zero-edge trials is expected to show a Sharpe of {emax}. The untradable trials count in N and stay out of the variance; with them it would be {var_all} |
| Deflated Sharpe, family | The same test inside one asset class: its own trial count and its own Sharpe variance |
| Cash rate and benchmark coverage | `run100.py` stops with `CoverageError` when the cash series starts after a strategy, ends more than three periods before it, or a benchmark covers under 98% of its dates. Carried-forward periods are logged and stored as `rf_periods_carried_forward` |

## Deflation

The pooled test is a blunt tool. It mixes daily crypto rules, century-long equity sorts and weekly bets into one variance, so a high-variance class raises the hurdle for a low-variance one, and the count of 212 equity series dominates N. The family test fixes the mix and has the opposite fault: a class with few trials has a noisy variance and a low hurdle, and a class with one trial has none. Read the two together.

{family_table}

## Survival Bar

Held means all four: out-of-sample Sharpe above zero with a t-stat of 2 or more, out-of-sample Sharpe above buy and hold where a benchmark applies, prices a retail account can trade, and positions built by the lab from data it holds. `run100.tradable` applies the last two: a row with `precomputed` or `needs_paid_data` set, or with untradable prices, cannot be held. Survived adds a pooled deflated Sharpe of 0.95 or more. The family list adds a family deflated Sharpe of 0.95 or more.

### Survived

{survived}

### Held With Family Deflation Passed

{passes_family}

### Held

{held}

### Published Series With Passing Statistics

These rows meet the out-of-sample test and do not count, since the lab replays the published returns and holds no stock-level or option data to build them.

{published_pass}

### Indicative

No deflated Sharpe is printed for these rows.

{indicative}

## Scorecard

Medians cover every row with valid prices, published series included.

{scorecard}

## Earlier Trials

`RESULTS.md` deflated 44 trials and passed BTC SMA 50 at 0.98. Under the registry of {n_trials} it fails both tests, as do the other crypto trend variants. The first draft of this file showed its pooled figure at 0.30; it moved to 0.75 when the surebet trials left the pooled variance as untradable, which cut the variance from 0.279 to 0.166 and the expected best zero-edge Sharpe from 1.54 to 1.19. `../07-system/SYSTEM.md` now carries BTC SMA 50 as a tracked signal with no promotion path.

{legacy}

## Results

Verdict key: Survived, Held and the family mark as defined above; Published series and Paid data rows show how their statistics came out and count for nothing; Weak has a positive out-of-sample Sharpe with t under 2; Trails names the benchmark that beat it; Failed has an out-of-sample Sharpe at or below zero; Indicative rests on untradable prices. CAGR, vol, Sharpe, drawdown and turnover cover the full sample, net of costs. `OOS SR` shows the benchmark after `vs`.

{tables}

## Construction

{construction}

The 40 Chen-Zimmermann rows use the long-short return series from release 2026.10 as published, with the weights and rebalance period of each original paper, less the tier haircut.

## Tests

`python -m pytest` passes {n_tests} tests. `tests/test_leakage.py` reruns the 60 hand-built functions, five Chen-Zimmermann series and the 44 earlier trials with the data cut at three dates each. Weights up to the cut and returns before it must match the full run to 1e-9. Three planted leaks must fail the same check. `tests/test_replication100.py` covers each new metric path: tier haircut, rank weights, bet sizing, bond returns, split rule, out-of-sample t, cash rate and benchmark coverage, pooled and family deflation, the surebet filters, Kalshi pricing, Poisson fit.

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
