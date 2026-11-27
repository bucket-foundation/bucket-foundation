# Synthesis: What 164 Trading and Finance Videos Agree On

Citations use `video-id @ h:mm:ss`. Video ids resolve through `INDEX.md`; each `videos/<id>/DIGEST.md` holds the full claim list.

## Common Architectures

Every build that reached a broker shares five layers: data, signal, sizing, execution, and a risk layer with veto power. The serious ones add a sixth: monitoring with a kill switch.

| Layer | What builders used | Sources |
|---|---|---|
| Data | yfinance daily bars for free research; Alpaca, Massive, Databento or IBKR feeds for live and intraday; Polymarket gamma API and Kalshi API for event contracts; Weather Next 3 through BigQuery for weather markets | gJLKVsIqiTE @ 0:36:00, zH2Mg782XhA @ 0:48:00, 0ZJXpMZobjY @ 0:02:00, -tMyq-wQZBU @ 0:04:00 |
| Signal | Rules first: 200-day regime filter, RSI-2 dips, breakouts, 12-1 momentum, gap scans. Statistical: cointegration and ADF, HMM regimes, GARCH volatility. ML: LSTM on order flow, K-means clusters, random forests | gJLKVsIqiTE @ 1:19:00, y_bsjZThP0o @ 0:13:00, 5G7YdjnRvVI @ 0:11:00, 2bE2iyRBK1E @ 0:11:00, 9Y3yaoi9rUQ @ 1:04:00 |
| Sizing | Kelly as a ceiling, half or quarter Kelly in practice, volatility targeting, CPPI to cap drawdown, 1% risk per trade | LJIwxiMxbaw @ 0:11:00, akrWQxUqjq8 @ 0:05:00, sAONff8XU80 @ 0:18:00, UgWQtQ3MEVE @ 0:12:00 |
| Execution | Alpaca paper first, IBKR TWS on port 7497, market-on-open queues, maker orders on prediction markets, RL for order timing | gJLKVsIqiTE @ 1:56:00, UgWQtQ3MEVE @ 0:03:43, sAONff8XU80 @ 0:14:00, 2bE2iyRBK1E @ 0:31:00 |
| Risk | Hardcoded circuit breakers outside the strategy code: daily loss halts at 2 to 5%, peak drawdown stop at 10%, block files that need a human to delete, idempotent order ids, broker reconciliation | y_bsjZThP0o @ 0:22:00, gJLKVsIqiTE @ 1:39:00 |
| Monitoring | Telegram alerts, Streamlit or React dashboards, weekly review, quarterly re-selection of sleeves | UgWQtQ3MEVE @ 0:21:00, y_bsjZThP0o @ 0:31:00, 0ZJXpMZobjY @ 0:16:00 |

### LLM Builds

The 2025 and 2026 builds all use Claude Code or a similar agent as the programmer, then keep the LLM out of the order path.

- AI Pathways has Claude write the system while the AI layer only reads FOMC statements and nudges the core allocation, because it cannot be backtested (gJLKVsIqiTE @ 0:31:00, 1:49:00).
- Roman Paolucci wires GPT-4 in as a portfolio commentator with no trade authority (_87QHZXOOKA @ 1:13:00).
- DaviddTech runs optimization on a server-side backtester through MCP so the LLM spends no tokens on search (86AlV6174KI @ 0:17:00).
- Jared Broad reports raw GPT-4 strategy code ran in a backtest only about 25% of the time (dHlBxjbzrtU @ 0:32:52). Vendor claim.
- Ernest Chan says ChatGPT answers on finance are about half wrong (VzF-tvz3DAk @ 0:41:00) and that it gave a wrong annualization rule (JgGOtCskLRg @ 0:21:00). His guidance: use generative models for risk and data scarcity, keep return prediction to explainable models (VzF-tvz3DAk @ 0:03:00).

### Prediction-Market Builds

Three distinct edges appear in the corpus:

1. Late-window conversion scalping on 5-minute BTC up/down contracts, buying at 0.95 in the final 35 seconds (0ZJXpMZobjY @ 0:08:00). Small edge per trade, one bad print erases a day (0ZJXpMZobjY @ 0:22:00).
2. Cross-venue mean reversion between Kalshi and Polymarket prices on the same 15-minute BTC event: ADF rejects a random walk in 93% of 194 series, half-life about 1.5 seconds (sAONff8XU80 @ 0:11:00). Settlement rules differ, so it is not a true arbitrage in the last five minutes (sAONff8XU80 @ 0:04:00).
3. Fundamental forecasting: Weather Next 3 forecasts against Kalshi NYC temperature buckets, with a 5 cent minimum edge after fees (-tMyq-wQZBU @ 0:21:00). The backtest sample was too small to claim an edge (-tMyq-wQZBU @ 0:14:00).

Nate B Jones reports arbitrage windows on Polymarket shrank from 12.3 seconds in 2024 to 2.7 seconds in early 2026 and that 94 to 95% of wallets lose money (BiqG3it0gY0 @ 0:07:00, 0:12:00). Both figures come with no source.

## What Builders Reported Working

- **Locked out-of-sample tests run once.** Train on 2022 to 2024, lock 2025 onward, test once (gJLKVsIqiTE @ 1:10:00). Of 44 sleeve ideas, 7 passed (gJLKVsIqiTE @ 1:30:00).
- **Testing the backtester.** Plant a known 1% edge, feed pure noise, and confirm a look-ahead guard trips before trusting any result (gJLKVsIqiTE @ 1:15:00).
- **Incubation.** Hold strategies on live data for months before capital; DaviddTech reports about 400 of 2,000 survive (86AlV6174KI @ 0:19:00, unverified).
- **Diversified uncorrelated books.** Chan's fund runs seven or eight intraday strategies and one model per futures contract; two strategies have carried it for four years (DW9zQ8Hz6gQ @ 0:13:00, 0:21:00).
- **Volatility for sizing.** Returns are hard to predict and volatility is predictable, so set leverage from forecast volatility (akrWQxUqjq8 @ 0:07:00; zapp8smQKhg @ 1:16:00 for GARCH).
- **Simulated paths for parameter choice.** Fit AR(1) to prices, simulate 10,000 paths, optimize there (UD92QBqA8Eo @ 0:26:00).
- **Covariance denoising and NCO.** Marchenko-Pastur denoising reports a 90 to 94 percent reduction in root mean square error (tODXAJDZtow @ 0:23:26).
- **Universal deep models on order-book data.** One LSTM pooled across stocks beat per-stock models and held up more than a year out of sample (2bE2iyRBK1E @ 0:25:00).
- **Fee modeling.** Part Time Larry's LEAN replication of an overnight SPY strategy turned a claimed beat of buy and hold into a loss once IBKR fees were included (joXDV5eqOoY @ 0:34:00).

## What Failed

- **Backtests that ignore costs and spread.** Mean reversion dies on spread (5G7YdjnRvVI @ 0:23:00); a correct mid-price call can still lose to the spread (2bE2iyRBK1E @ 0:09:00); a daily-turnover rule hands 25% of profit to costs (gJLKVsIqiTE @ 2:54:00).
- **Overfit optimization.** Unconstrained Backtesting.py search picked a degenerate result (e4ytbIm2Xg0 @ 0:21:00). Chan's optimized k underperformed a random k out of sample (UD92QBqA8Eo @ 0:36:00). A Sharpe of 0.8 at F-score 7 fell to 0.4 at 8 (dHlBxjbzrtU @ 0:21:00).
- **Multiple testing.** With 1,000 random trials the expected best Sharpe is about 3 (BRUlSm4gdQ4 @ 0:48:00). Lopez de Prado estimates about 83% of published factors are false discoveries (i2evTEaieY4 @ 0:38:00).
- **Live versus backtest gap.** Humbled Trader's bot ran "meh" next to its TradingView backtest (UgWQtQ3MEVE @ 0:24:00). Chan says nearly every early model failed live (DW9zQ8Hz6gQ @ 0:09:00).
- **Look-ahead and survivorship.** Today's S&P 500 list inflates results (9Y3yaoi9rUQ @ 0:11:00, gJLKVsIqiTE @ 2:51:00); HMM `predict` peeks, so use the forward algorithm (y_bsjZThP0o @ 0:14:00); multi-timeframe indicators repaint (86AlV6174KI @ 0:29:00).
- **Naive market making.** Stoikov's own Avellaneda-Stoikov paper test on BTC lost money and the VAMP variant crashed mid-day (S7eig5VXFpY @ 0:48:00, 1:15:00).
- **Over-leverage and Kelly contagion.** Funds deleveraging together in August 2007 pushed prices against each other (LJIwxiMxbaw @ 1:13:00). Chan says he broke his own rule on leverage (akrWQxUqjq8 @ 0:04:00).
- **Model correlation assumptions.** Gaussian copula tranche books lost about 9 billion net when default correlation went to 80 to 90% (VlOjcOp9a5U @ 0:51:00, 0:55:00).
- **Operational bugs.** Missing token allowance on Polymarket (0ZJXpMZobjY @ 0:12:00); Knight Capital lost about $40 million in 35 minutes from a bad deploy (eLLarGvuBzY @ 0:46:00); exchange rate limits block quote updates (eLLarGvuBzY @ 0:49:00).
- **Alpha decay and crowding.** Chan's Sharpe-3 FX model decayed within two years (akrWQxUqjq8 @ 0:45:00); pairs profits collapsed after decimalization (UD92QBqA8Eo @ 0:02:00); shared optimal strategies make systems fragile (8TJQhQ2GZ0Y @ 1:05:00).

## Consensus Build Order

1. Learn the statistics before the code: stationarity, volatility, multiple testing (kLJEXE5_7rI @ 0:32:00, vuGvQM-oH-0 @ 0:02:00).
2. Clean data with bid/ask, survivorship-free universes and point-in-time fields (akrWQxUqjq8 @ 0:16:00).
3. Simple rules, costs included, one locked test (gJLKVsIqiTE @ 1:10:00).
4. Count trials and deflate Sharpe (BRUlSm4gdQ4 @ 0:56:00).
5. Paper trade for at least a month, then size small (y_bsjZThP0o @ 0:32:00, UgWQtQ3MEVE @ 0:02:00).
6. Hard risk limits outside the strategy, half Kelly or less (LJIwxiMxbaw @ 0:32:00).
7. Add ML as a filter or for sizing after a rules edge exists (vuGvQM-oH-0 @ 0:16:00, BRUlSm4gdQ4 @ 0:36:00 on meta-labeling).
8. Run several uncorrelated strategies, cut the ones that decay (DW9zQ8Hz6gQ @ 0:13:00, i2evTEaieY4 @ 0:56:00).

## Gaps In The Corpus

No video shows audited live P&L. Every profit number from a builder is self-reported. Jim Simons primary interviews failed to download. Polymarket and Kalshi coverage is all retail builders; the academic counterpart is Saguillo et al. 2025 (arXiv 2508.03474), carded in `../04-quant/13-prediction-markets-sports.md`.

## Expansion Findings 2026-11-27

Drawn from the 121 videos added in the second pull: MIT 18.S096, Yale ECON 252, MIT 15.401, fund manager interviews, firm talks, money history, prediction markets, sports betting, AI agents and crypto market making.

### Lectures and Fund Managers

- With a fair-game process no bounded stopping rule changes expected wealth; stopping at +$100 or -$50 on a $1 coin game wins with probability 1/3 (TuTmC8aOQJE @ 1:16:49)
- A small edge above fees plus enough independent trials makes profit near certain (law of large numbers), while casino-style variance hides the mean over short samples (f9XFM8YLccg @ 0:55:32)
- Equal moments do not imply equal distributions, and the log-normal price model has no moment-generating function (f9XFM8YLccg @ 0:41:37)
- Euro/dollar returns fit a t distribution with 10 degrees of freedom and a six standard deviation move then has odds near 1 in 10,000 (_IFUfFuyQlU @ 0:21:49)
- Range-based volatility estimators using open, high, low and close reach efficiency 7.4 to 8.4 against 1 for close-to-close (cDlbEQz1PQk @ 0:57:14)
- Regularize by penalizing what you dislike (non-smoothness), since exact calibration of ill-posed models gives unstable surfaces; PCA hedges overfit history (aga-Tak3c3M @ 1:19:45)
- The second derivative of the call price in strike gives the risk-neutral density, and a call butterfly priced near (1/lambda) times the density is a tradable estimate (eG_aRPy1KVE @ 0:28:31)
- Real-world drift drops out of option pricing; only volatility and the interest rate enter, so Monte Carlo prices simulate at the risk-free drift (TnS8kI_KuJc @ 0:27:45)
- A model with e^(sigma B) carries drift sigma^2/2; the driftless geometric Brownian motion is exp(-sigma^2 t/2 + sigma B) (Z5yRMMVUC5w @ 0:26:16)
- Ross recovery needs a restriction on the pricing kernel; it cuts 100 unknowns to 11 for n=10 and is impossible without assumptions (vc5dotshPZc @ 1:00:00)
- CVA is roughly minus mean positive exposure times CDS par spread times duration, and 2008 CVA mark-to-market losses exceeded actual default losses (bKmcRfE3I6E @ 0:14:34)
- A structured note paying 10 percent on two market conditions: the S&P 500 was above 880 on 94 of 100 days historically, set against what the market implies (D2Jn1VrqjWI @ 1:29:56)
- Value at Risk and similar tail estimates assume near independence; a normal fit gave the 1987 crash a probability of 10 to the minus 71, so fat tails and correlation jumps need explicit modeling (QbosMr2JVrc @ 1:07:10)
- A strategy can show a high Sharpe ratio by selling the upper tail and doubling the lower tail with options; check tail exposure before trusting backtested Sharpe (3EzdvkRgToY @ 0:07:06)
- Simulated random walks with a trend look like real price charts and contain head and shoulders patterns, so visual pattern finding needs a random-walk null test (3EzdvkRgToY @ 0:55:28)
- Dollar-weighted investor returns trailed time-weighted fund returns in all 17 equity fund categories; top internet funds returned 1.5% a year while investors lost 72% (wRdx7kVNQ_E @ 0:32:59)
- Return dispersion between top and bottom quartile managers (0.5 points in bonds, 43.2 in venture capital) can serve as a measure of where skill can pay (wRdx7kVNQ_E @ 0:43:16)
- Tunneling and unstated guarantees (Fannie and Freddie, y_IMH8erqds @ 0:56:02) are recurring failure modes: audit insider incentives and implicit backstops (W2BURItNYmI @ 0:17:19)
- Basel risk weights (0% OECD sovereigns, 20% municipals and GSEs, 50% mortgages, 100% loans) turn $1 of spare capital into about $70 of Fannie and Freddie bonds versus $14 of business loans, so rule design steers credit (1mDL1fKEVZM @ 0:58:32)
- Futures fair value is (1 + r + s) x spot for storable commodities and (1 + r - y) x spot for stock indexes, so the S&P 500 futures curve carries no forecast of the market (rxHu93YzHpc @ 0:40:57 and 1:10:01)

### Firms and History

- Predictable patterns erode once traded; in a sine-wave market buyers and sellers remove the cycle, which Lo uses to define an efficient market (tL7Lcl90Sc0 @ 0:04:41)
- A forward is struck at the price where present value is zero, and forward prices embed the market's forecast of future spot (i_pLF9J3QPE @ 0:28:42)
- Futures reduce counterparty risk to one day of price movement through daily settlement, so $4,050 of margin supports about $75,000 of crude exposure (i_pLF9J3QPE @ 1:16:36)
- Forward rates are read directly from bond prices: 0.967 over 0.927 gives 4.314% for year two, and a borrow-short, lend-long pair locks that rate with zero outlay (yrmqYNvvIzs @ 0:21:28)
- Among 100 random characteristics 5% look significant by chance, so size, value and momentum anomalies need out-of-sample checks (tL7Lcl90Sc0 @ 0:36:21)
- Idiosyncratic risk earns no premium because roughly 50 stocks diversify it away, so only beta is paid for in the CAPM (N8gtnbJuMoo @ 0:57:26)
- Judge a drawdown only against a known mechanism and the expected range of chance fluctuation, as Thorp compares results with the range luck can produce (pjLbNM0jcc4 @ 0:44:04)
- Testing 10,000 ideas at a 1-in-1,000 chance finds about 10 false winners by luck; Asness requires theory, out-of-sample time and out-of-sample markets (FqaP3VTKccE @ 0:33:44)
- Thorp sizes up in stages, spending 8 of 20 warm-up hours at the smallest stakes, and cites Kelly overbetting behind 1987, LTCM and 2008 losses (pjLbNM0jcc4 @ 0:21:23)
- Simons says all scientists meet weekly so each new predictive signal is tested by others and no group keeps a private system (QUTaQvnwLzM @ 0:29:08)
- Fifteen good uncorrelated return streams of similar expected return cut risk about 80% and lift return to risk about fivefold, per Dalio's self-reported rule (eGtGKk0E_qk @ 0:05:27)
- Clients tolerate about three years of underperformance, so backtest "statistical time" overstates what a live allocator will hold (xWGlMuALK5g @ 0:05:17)
- Backtest hurdle rises with the number of trials, so log every independent trial and use the deflated Sharpe ratio (FJYgrkVbpEE @ 0:39:20)
- An agentic system reproduces and out-of-sample tests a finance paper in 2 to 3 hours against 6 to 8 weeks by hand, per Griffin (gZweef8LX7M @ 0:10:57)
- Size by streak: after losses trade small until hits return, and avoid betting big to recover (G-MlrpoMig0 @ 0:51:07)
- Mean reversion earns steady returns until a crisis gap and behaves like shorting volatility: upside capped at the mean, downside open; pair it with a trend tail hedge and use only distant catastrophe stops (sFwyS-L-aDE @ 0:09:58)
- Markowitz instability has two sources, noise from few observations and signal from high correlation; denoising plus clustering cut Monte Carlo estimation error 47% to 94% depending on portfolio (fOCzNFwmM7Y @ 0:34:40)
- A backtest is a final check and a tool to compare execution assumptions; always reconcile it against live trading each period (5qo5gxmGEt8 @ 0:16:36)
- Crypto exchange risk acts as a hurdle rate: a 20% a year strategy needs five years of assets at the venue to cover the capital at risk (5qo5gxmGEt8 @ 0:32:49)
- A firm's own HFT P&L was negatively correlated with hour-ahead crypto returns, usable as an inventory bias since it was priced into funding when traded as a short (HqCksxcX49w @ 0:41:19)

### Markets and Agents

- Trading risk is owned by independent layers. Jane Street describes separate risk checks written by different teams, event alerts, and a rule that it does not trade without monitoring [zR9PpXWsKFQ @ 0:30:00]-[0:33:00]; Optiver treats safety as getting out first and diagnosing second [NH1Tta7purM @ 0:04:00]. Both support a risk layer that can block orders in any AI trading bot.
- Aggregate-outcome alerts catch faults that service alerts miss. The "fill too good" alert caught stale market data when no health alert fired [zR9PpXWsKFQ @ 0:37:00]-[0:47:00]; the same check suits a backtest or paper bot that reports unexpectedly high profit.
- Measure in production-like conditions. Cook builds a wire-tap lab whose speedups match production [NH1Tta7purM @ 0:51:53]; he also warns his intuition on speed misleads him [NH1Tta7purM @ 0:54:09].
- Operational mistakes lose money faster than model error. Knight Capital lost about half a billion dollars in 45 minutes [zR9PpXWsKFQ @ 0:12:44]; Mizuho's one-yen order cost 27 billion yen [zR9PpXWsKFQ @ 0:07:39].
- Quant career videos supply anecdotes. The 31-minute video shows a host who says he is not a quant and sells an accelerator [M23f8jouwWU @ 0:00:00], [0:17:00]; the pay figure (IMC over $100 an hour) is self-reported [M23f8jouwWU @ 0:24:20].
- Four crisis accounts agree on bailouts without restructuring but differ on causes. Silvers blames wage suppression and deregulation [ZVU5IQpXzA0 @ 0:09:25]; Varoufakis blames the end of US surplus recycling [iVxaTC7Qp44 @ 0:12:00]-[0:19:00]; the Yale lecture stresses housing policy and securitization incentives [5v1EtiEuSEY @ 0:31:53]. Silvers and the Yale lecture both argue for principal write-downs or restructuring [ZVU5IQpXzA0 @ 1:07:18], [5v1EtiEuSEY @ 0:53:13].
- Bretton Woods ended through a creditor-debtor reversal, a theme also found in the 2011 and 2023 material. Steil dates the gold window closing to 1971 after outflows [cECouzfzqnM @ 0:51:00]-[0:52:00]; the gold film frames it as removal of fiscal discipline and predicts a collapse that the transcript does not date or verify [K07qbvcvAH0 @ 0:06:00], [0:28:00]; Varoufakis ties it to the loss of US surpluses [iVxaTC7Qp44 @ 0:12:00].
- Stablecoins fail like money market funds when reserves are weak or opaque. Terra fell from about $19 billion to near zero [0sLQ6AfNzw8 @ 0:16:00]; USDC lost assets after SVB [0sLQ6AfNzw8 @ 0:20:00]; flows jump at the 99 cent mark [0sLQ6AfNzw8 @ 0:27:00]; the Bank of England requires central bank reserves or liquid securities as backing [0sLQ6AfNzw8 @ 2:06:00].
- Moves on news are the repeatable event-market edge: Domer swing trades overreactions and counterparty-tests big positions (TJpXnvFuvZg @ 0:06:02, 0:10:08), while Prophet fades media narrative and holds to resolution (GR3gWN5ka0c @ 0:12:00). Both warn that crowds anchor on the last story.
- Domer attributes his 2024 loss to position size (TJpXnvFuvZg @ 0:17:36); error bars cut Kelly-style sizing (TJpXnvFuvZg @ 0:30:02). Prophet sized large on a 14-cent mispricing (GR3gWN5ka0c @ 0:08:00).
- Local or niche information beats consensus: Prophet's Polish election edge (GR3gWN5ka0c @ 0:07:00) and Domer's niche selection from about 2,000 markets (TJpXnvFuvZg @ 0:03:34). Thin non-US books limit size (GR3gWN5ka0c @ 0:10:00).
- Single large accounts distort thin event markets: the 2024 "French whale" (TJpXnvFuvZg @ 0:43:00) and on-chain insider concerns (GR3gWN5ka0c @ 0:19:00-0:20:00).
- Optionality in prepayment drives MBS risk: the holder is short the homeowner option (g4K3uyMdVUo @ 0:20:00), while Goetzmann shows lenders' 2006 models understated downside (lE0Eu19547Q @ 0:36:00-0:37:00) and Shiller blames extrapolation psychology (gi2uH3YxohU @ 0:53:36).
- Mortgage design history repeats a theme: 1920s balloon loans failed refinancing (gi2uH3YxohU @ 0:20:00-0:22:00) and 2000s teaser ARMs reset (gi2uH3YxohU @ 0:27:00-0:29:00); Goetzmann traces a 1920s one-building bond market that ended in the Depression (lE0Eu19547Q @ 0:22:00).
- AI capex financing risk is circular and duration-based: Nvidia backstops and equity inflate neo cloud demand (eTXixzzC-34 @ 0:17:00-0:21:00), and the interviewee sees a funding gap and a hidden Nvidia price cut (h-0NZ-oIjlk @ 0:08:00-0:09:00, 1:16:00-1:17:00). Both stress GPU life and payback in scarcity (eTXixzzC-34 @ 0:12:00; h-0NZ-oIjlk @ 0:35:00-0:36:00).
- Anonymity and scale shape regulation: 70 to 75% of stablecoin holdings sit in self-custody (i3UmPsCQGVk @ 0:15:00-0:16:00), which the a16z speakers present as a feature of cheap global payments (0biSwEL5eMQ @ 0:05:00-0:06:00) and Gopinath treats as an AML and tax gap (i3UmPsCQGVk @ 0:29:00-0:31:00).
- Bond bids at 99 on misheard words produced roughly 100-to-1 trades: iUVSHMAHrok @ 0:11:00, iUVSHMAHrok @ 0:15:00.
- The retail edge window is short: iUVSHMAHrok @ 0:37:10, MXDozNbr7Js @ 0:39:00.
- Sportsbooks limit winners: 6mTvAjmF2-A @ 0:26:22, iUVSHMAHrok @ 0:47:16.
- Kalshi fees come up in 6mTvAjmF2-A @ 0:36:55 and M1T0OlG3XEU @ 0:04:18.
- Fair value is anchored on sharp books: 6HN-d9mC0DI @ 0:08:00.
- AI helps analysis but misprices: MXDozNbr7Js @ 0:19:00, IE9OJMyyWMY @ 0:24:00.
- Liquidity caps size before Kelly does: MXDozNbr7Js @ 0:26:04.
- Self-reported profits are unverified; the title cites "$400K" and no transcript line confirms the figure.
- Fees and inventory shape market-making profit more than signal. Wintermute says 80%+ of 2019 trading profit went to exchange fees (wdQnaRL3D5w @ 0:43:00), and GSR says capital parked on spot venues is costly (F7e6SyOnOR8 @ 0:27:00).
- Adverse selection recurs in three framings: stale quotes hit by arbitrageurs (iqEFMb1aKNU @ 0:30:00), LP loss to arbitrageurs scaling with sigma squared over eight (SoB1gSmrSWM @ 0:54:00), and ADL stripping a perp hedge in a crash (pKF4M9_LpQ8 @ 0:54:00).
- Venue and wallet concentration limits matter. Wintermute caps equity at 30% on one exchange or wallet (pKF4M9_LpQ8 @ 0:44:00); GSR screens venues on controls and integrity, noting SOC 2 is rare (F7e6SyOnOR8 @ 0:33:00).
- Both Wintermute leaders credit pivots and breaks over a clean plan. The Algorand algo turned profit in January 2020 (pKF4M9_LpQ8 @ 0:23:00) and the algorithms paid off about two and a half years in (wdQnaRL3D5w @ 0:41:00).
- AI trading videos show setup rather than results. No fills or P&L appear in the copy-trade tutorial (x2pY9kI0zBY @ 0:19:00) or the Markov skill demo (ZVMTeDBmSrI @ 0:24:00); the MCP builder says AI trading is a poor fit because of latency (1iJ34tTjwwo @ 1:13:00).
- Unverified performance figures come with promotion: a 45% compound annual growth rate beside a paid community (x2pY9kI0zBY @ 0:14:58), and a free prompt pointing to a paid community (ZVMTeDBmSrI @ 0:26:00).
- Small samples and diversification show up in both quant and trend talks: 20 signals in 20 years is too few and 100 to 150 markets are needed (PHb8EHIKfeQ @ 0:33:00); Wintermute's venture math says one winner in ten yields 80% of return (wdQnaRL3D5w @ 0:20:00).
- Fund managers favor longer horizons and income carry: Gross prefers three to five year views and sells volatility (Nx1U39sL7sE @ 0:05:00, 0:21:00), while trend followers accept volatile open profit and cut losses at 25 bp (PHb8EHIKfeQ @ 0:08:00).

## Lectures 2026-11-27

Sixteen QuantInsti lecture and webinar videos, 7.98 hours, from the lecture wave. The Yale, MIT, Stanford, Berkeley, NPTEL, LSE and CFA series are queued behind YouTube rate limits and have no digests yet.

### Portfolio Construction

- Portfolio value is the weighted stream of strategy returns, and the method choice is the choice of utility: mean variance trades mean against variance, Kelly maximizes log terminal wealth, risk parity equalizes risk contributions (DYyajnadsnQ @ 0:03:04, IcRLtCjSY1I @ 0:02:05, IcRLtCjSY1I @ 0:04:08)
- Kelly dominates in long-run wealth but runs a higher short-run risk of ruin, and the speaker would not suggest it to a retiree (IcRLtCjSY1I @ 0:03:07)
- Risk parity uses risk only, which makes it more resistant to model error because risk is measured better than returns (IcRLtCjSY1I @ 0:05:11)
- Allocation across alpha strategies runs from equal weights, to regime switching, to adaptive no-regret weights; no regret fails in a sideways market (_eO48tVDjv0 @ 0:00:01, _eO48tVDjv0 @ 0:03:03)
- On five simulated assets the tangent portfolio at a 4% risk-free rate has the highest Sharpe ratio, and CAPM turns risk into contribution to the market portfolio (2o4OnPzlR0M @ 0:06:09, 2o4OnPzlR0M @ 0:10:20)

### Regimes and Mean Reversion

- Mean reversion has ten categories by what reverts, from price level to microstructure; it works in range-bound markets and fails in strong trends and after regime shifts (c2j-zs8YN3c @ 0:03:08, c2j-zs8YN3c @ 0:11:21)
- Harris shows a 1941 to 1999 S&P 500 rule that returned 27.6% a year and then lost nearly all its value after 2000 as daily returns moved from momentum to mean reversion (Vdlw6kViw4Y @ 0:05:12, VFhSKz4hyTA @ 0:00:08)

### Generative AI and Options Data

- Generative models estimate P of X as well as P of Y given X, so they can flag inputs the model has not seen and simulate regime-conditioned scenarios that a backtest cannot supply (ofdGQmxhl1I @ 0:04:12, ofdGQmxhl1I @ 0:09:20)
- Implied volatility is the number that matches model price to market price, and the same at-the-money put showed implied volatility rising as it moved out of the money (ISVFhvECvzc @ 0:05:08, ISVFhvECvzc @ 0:14:19)
- ChatGPT can summarize a paper, draw a flow diagram and write the code, but the overnight-return test covered only 2020 to 2024 and the volatility bands were invisible until rescaled (_KajD3SbRRw @ 0:10:09, _KajD3SbRRw @ 0:22:27)
