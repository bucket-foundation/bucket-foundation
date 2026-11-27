# Strategies In Code

Every strategy found in the source of the repos carded in this folder, checked 2026-11-27. Input for the strategy catalog bead. Logic lines describe the code as shipped; none is a claim of edge. QuantDinger rows come from each file's docstring.

| Repo | File | Logic |
|---|---|---|
| freqtrade | freqtrade/templates/sample_strategy.py | Long when RSI crosses above 30 with TEMA under Bollinger middle and rising; exit when RSI crosses 70 with TEMA above middle and falling; shorts mirrored |
| freqtrade | freqtrade/templates/FreqaiExampleStrategy.py | FreqAI model predicts mean forward close change; enter when the prediction clears a threshold and the outlier check passes |
| freqtrade | freqtrade/templates/FreqaiExampleHybridStrategy.py | FreqAI classifier up/down label combined with RSI and TEMA rules |
| hummingbot | hummingbot/strategy/pure_market_making/ | Quote bid and ask around mid with inventory skew and periodic refresh |
| hummingbot | hummingbot/strategy/avellaneda_market_making/ | Avellaneda-Stoikov reservation price and optimal spread from volatility and inventory |
| hummingbot | hummingbot/strategy/cross_exchange_market_making/ | Quote on maker venue, hedge fills on taker venue |
| hummingbot | hummingbot/strategy/amm_arb/ | Buy on one venue and sell on another when the price gap beats fees and gas |
| hummingbot | hummingbot/strategy/spot_perpetual_arbitrage/ | Open spot and opposite perpetual when basis is wide, close when it converges |
| hummingbot | hummingbot/strategy/perpetual_market_making/ | Pure market making on perpetuals with position management |
| hummingbot | hummingbot/strategy/liquidity_mining/ | Quote across many pairs to earn liquidity rewards |
| hummingbot | controllers/directional_trading/bollinger_v1.py | Long when Bollinger %B below lower threshold, short above upper threshold |
| hummingbot | controllers/directional_trading/bollinger_v2.py | Bollinger %B extremes with extra range filter |
| hummingbot | controllers/directional_trading/macd_bb_v1.py | Long when %B low, MACD histogram positive and MACD negative; short on mirror |
| hummingbot | controllers/directional_trading/supertrend_v1.py | Trade SuperTrend direction when price is within a percent of the SuperTrend line |
| hummingbot | controllers/directional_trading/dman_v3.py | Bollinger mean reversion entered as a DCA ladder with shifted mid |
| hummingbot | controllers/directional_trading/bollingrid.py | Bollinger signal launches a grid executor on the signal side |
| hummingbot | controllers/directional_trading/ai_livestream.py | Trade long or short from external ML signals received over MQTT |
| hummingbot | controllers/generic/stat_arb.py | Pairs trade on two cointegrated assets, enter on spread z-score extremes |
| hummingbot | controllers/generic/grid_strike.py | Fixed price-range grid of buy and sell orders |
| hummingbot | controllers/generic/multi_grid_strike.py | Several independent grids on one pair |
| hummingbot | controllers/generic/quantum_grid_allocator.py | Grids per asset sized to keep target portfolio weights |
| hummingbot | controllers/generic/hedge_asset.py | Keep a perpetual short equal to spot balance times a hedge ratio, rebalance past a notional threshold |
| hummingbot | controllers/generic/arbitrage_controller.py | Cross-venue arbitrage including AMM venues with gas accounting |
| hummingbot | controllers/generic/xemm_multiple_levels.py | Cross-exchange market making with several quote levels |
| hummingbot | controllers/generic/pmm_v1.py | Port of legacy pure market making with multi-level spreads and inventory skew |
| hummingbot | controllers/generic/pmm_mister.py | Market making variant with position-aware spreads |
| hummingbot | controllers/market_making/pmm_simple.py | Fixed spreads around mid on several levels |
| hummingbot | controllers/market_making/pmm_dynamic.py | Spreads scaled by NATR, mid shifted by MACD signal |
| hummingbot | controllers/market_making/dman_maker_v2.py | Market making with DCA ladders per side |
| hummingbot | scripts/v2_funding_rate_arb.py | Long perpetual on the low-funding venue, short on the high-funding venue, collect the gap |
| hummingbot | scripts/simple_vwap.py | Slice a large order into VWAP-paced child orders |
| hummingbot | scripts/simple_xemm.py | Minimal cross-exchange market making |
| jesse | jesse/strategies/RealStrategyRegression1/__init__.py | Long when local and 4h trend agree, ADX and CMO above thresholds, Stochastic RSI under 20 |
| jesse | jesse/strategies/RealStrategyRegression2/__init__.py | Donchian breakout with price above 4h SMA and ATR above its average; mirrored short |
| jesse | jesse/strategies/RealStrategyRegression3/__init__.py | Long when DI+ > DI-, ADX > 50, Williams %R < -80; short on mirror with %R > -20 |
| backtrader | backtrader/strategies/sma_crossover.py | Long on fast SMA crossing above slow SMA, exit on cross below |
| backtrader | samples/btfd/btfd.py | Buy after a one-day drop beyond a threshold, exit after N bars |
| backtrader | samples/kselrsi/ksignal.py | Long when RSI under 35, exit when RSI crosses 50 |
| backtrader | samples/macd-settings/macd-settings.py | Long on MACD crossing above signal with falling SMA filter, ATR trailing stop |
| backtrader | samples/gold-vs-sp500/gold-vs-sp500.py | MA crossover with Pearson correlation of gold against S&P 500 |
| backtrader | samples/pinkfish-challenge/pinkfish-challenge.py | Enter on new high after a lookback, exit after a hold period |
| backtesting.py | doc/examples/Quick Start User Guide.py | 10 and 20 SMA crossover, long on cross up, short on cross down |
| backtesting.py | doc/examples/Parameter Heatmap & Optimization.py | Two SMAs for entry and two for exit, grid-optimized |
| backtesting.py | doc/examples/Multiple Time Frames.py | Long when daily and weekly RSI exceed 70 and 10>20>50>100 SMAs stack, 8% stop |
| backtesting.py | doc/examples/Strategies Library.py | SMA cross signal with ATR trailing stop |
| backtesting.py | doc/examples/Trading with Machine Learning.py | kNN predicts next move from price features with SL and TP; walk-forward variant retrains every 20 bars |
| FinRL | finrl/applications/stock_trading/stock_trading.py | DRL agents (A2C, DDPG, PPO, SAC, TD3) choose share counts on Dow 30 from indicators |
| FinRL | finrl/applications/stock_trading/ensemble_stock_trading.py | Retrain A2C, PPO, DDPG each quarter, trade the agent with best validation Sharpe; liquidate on turbulence spike |
| FinRL | finrl/meta/env_portfolio_allocation/env_portfolio.py | DRL agent outputs softmax portfolio weights from covariance and indicators |
| FinRL | finrl/agents/portfolio_optimization/ | EIIE policy-gradient portfolio weights |
| FinGPT | fingpt/FinGPT_Forecaster/ | LoRA Llama 2 reads past week news and financials, predicts next-week direction and percent band |
| FinGPT | fingpt/FinGPT_ForexIntelligence/trade_generator.py | Pair strongest currency with weakest from macro and sentiment scores, rank by confidence and session |
| FinGPT | fingpt/FinGPT_ForexIntelligence/timing_model.py | Delay or avoid entries around scheduled high-impact events |
| FinGPT | fingpt/FinGPT_Sentiment_Analysis_v3/quantitative_sentiment.py | Label earnings positive or negative when EPS surprise exceeds 5% |
| FinGPT | fingpt/FinGPT_Others/FinGPT_Trading/ | ChatGPT reads news and returns buy or sell per ticker |
| Financial-Models-Numerical-Methods | 6.1 Ornstein-Uhlenbeck process and applications.ipynb | Fit OU to a spread, trade when it deviates from the mean by a band |
| Financial-Models-Numerical-Methods | src/FMNM/Kalman_filter.py | Kalman time-varying beta for a dynamic hedge ratio |
| mlfinlab | mlfinlab/filters/filters.py | CUSUM filter triggers events when cumulative move exceeds a threshold |
| mlfinlab | mlfinlab/labeling/labeling.py | Triple-barrier labels with meta-labeling to size primary signals |
| mlfinlab | mlfinlab/labeling/trend_scanning.py | Label by the sign of the strongest linear trend t-value |
| microsoft/qlib | qlib/contrib/strategy/signal_strategy.py TopkDropoutStrategy | hold the top k names by model score, replace the n lowest-ranked holdings each rebalance |
| microsoft/qlib | qlib/contrib/strategy/signal_strategy.py EnhancedIndexingStrategy | optimize weights to beat a benchmark under a factor risk model and tracking-error cap |
| microsoft/qlib | qlib/contrib/strategy/cost_control.py SoftTopkStrategy | top k weights moved toward target with a per-step turnover limit |
| microsoft/qlib | qlib/contrib/strategy/rule_strategy.py TWAPStrategy | split a parent order evenly across intraday steps |
| microsoft/qlib | qlib/contrib/strategy/rule_strategy.py SBBStrategyEMA | split order into bar pairs, trade the better bar of each pair predicted by EMA trend |
| microsoft/qlib | qlib/contrib/strategy/rule_strategy.py ACStrategy | Almgren-Chriss schedule trading off volatility risk against impact |
| microsoft/qlib | qlib/rl/order_execution | PPO or DQN policy chooses child order sizes to beat TWAP |
| microsoft/qlib | qlib/contrib/model/*.py | 30+ return forecasters (LightGBM, XGBoost, LSTM, GRU, GATs, Transformer, TRA, HIST, DoubleEnsemble) feeding top-k |
| nautechsystems/nautilus_trader | crates/trading/src/examples/strategies/ema_cross/strategy.rs | buy when fast EMA crosses above slow EMA, sell on cross below |
| nautechsystems/nautilus_trader | crates/trading/src/examples/strategies/grid_mm/strategy.rs | symmetric limit grid around mid, skewed against inventory, requote when mid moves past a bps threshold |
| nautechsystems/nautilus_trader | crates/trading/src/examples/strategies/composite_market_maker/strategy.rs | quote bid and ask around mid, shift by a synthetic-signal residual and opposite to inventory |
| nautechsystems/nautilus_trader | crates/trading/src/examples/strategies/orderbook_imbalance/strategy.rs | take the thinner side of the best quote when bid/ask size ratio exceeds a threshold |
| nautechsystems/nautilus_trader | crates/trading/src/examples/strategies/delta_neutral_vol/strategy.rs | sell an OTM strangle and delta hedge with the perpetual on threshold or timer |
| nautechsystems/nautilus_trader | crates/trading/src/examples/strategies/hurst_vpin_directional/strategy.rs | Hurst exponent on dollar bars picks trend regime, VPIN aggressor flow picks direction, quotes time the entry |
| nautechsystems/nautilus_trader | examples/live/architect_ax/strategies.py BBMeanReversion | buy below lower Bollinger Band, sell above upper band |
| nautechsystems/nautilus_trader | examples/backtest/finfeed_kalshi_nfl_ema_cross.py | EMA crossover on Kalshi NFL contract prices |
| nautechsystems/nautilus_trader | examples/backtest/finfeed_polymarket_book_imbalance.py | order book imbalance taker on Polymarket |
| nautechsystems/nautilus_trader | examples/backtest/fx_market_maker_gbpusd_bars.py | volatility-band market maker on GBPUSD bars |
| polakowo/vectorbt | examples/BitcoinDMAC.ipynb | dual moving average crossover on BTC over a window grid |
| polakowo/vectorbt | examples/MACDVolume.ipynb | MACD crossover grid with volume filter |
| polakowo/vectorbt | examples/PairsTrading.ipynb | trade spread z-score of a cointegrated pair, exit at mean |
| polakowo/vectorbt | examples/PortfolioOptimization.ipynb | rebalance to random and PyPortfolioOpt max-Sharpe weights |
| polakowo/vectorbt | examples/StopSignals.ipynb | random entries with stop-loss, trailing and take-profit exits compared |
| polakowo/vectorbt | examples/TelegramSignals.ipynb | scheduled Bollinger signal scan pushed to Telegram |
| Polymarket/agents | agents/application/trade.py one_best_trade | RAG-filter events, LLM superforecast picks one market and side, size a market order |
| Polymarket/agents | agents/application/creator.py | LLM proposes new prediction markets to list |
| QuantConnect/Lean | Algorithm.Framework/Alphas/EmaCrossAlphaModel.py | up insight on fast EMA above slow EMA, down on reverse |
| QuantConnect/Lean | Algorithm.Framework/Alphas/MacdAlphaModel.py | direction from MACD minus signal beyond a bounce threshold |
| QuantConnect/Lean | Algorithm.Framework/Alphas/RsiAlphaModel.py | up below RSI 30, down above RSI 70 |
| QuantConnect/Lean | Algorithm.Framework/Alphas/HistoricalReturnsAlphaModel.py | direction equals sign of trailing return |
| QuantConnect/Lean | Algorithm.Framework/Alphas/PearsonCorrelationPairsTradingAlphaModel.py | pick most correlated pair, trade spread beyond 2 std |
| QuantConnect/Lean | Algorithm.Framework/Portfolio/MeanReversionPortfolioConstructionModel.py | OLMAR online moving-average reversion weights |
| QuantConnect/Lean | Algorithm.Framework/Portfolio/BlackLittermanOptimizationPortfolioConstructionModel.py | blend insights as views into Black-Litterman weights |
| QuantConnect/Lean | Algorithm.Framework/Portfolio/RiskParityPortfolioConstructionModel.py | equal risk contribution weights |
| QuantConnect/Lean | Algorithm.Framework/Execution/VolumeWeightedAveragePriceExecutionModel.py | slice orders to a share of volume, buy below VWAP |
| QuantConnect/Lean | Algorithm.Framework/Execution/StandardDeviationExecutionModel.py | fill only when price is 2 std better than its mean |
| QuantConnect/Lean | Algorithm.Framework/Risk/TrailingStopRiskManagementModel.py | liquidate a position after a trailing drawdown percent |
| QuantConnect/Lean | Algorithm.Python/Alphas/ContingentClaimsAnalysisDefaultPredictionAlpha.py | Merton model default probability, short names with high default risk |
| QuantConnect/Lean | Algorithm.Python/Alphas/GasAndCrudeOilEnergyCorrelationAlpha.py | natural gas ETF move leads crude oil ETF trade |
| QuantConnect/Lean | Algorithm.Python/Alphas/GlobalEquityMeanReversionIBSAlpha.py | rank country ETFs by internal bar strength, long lowest, short highest |
| QuantConnect/Lean | Algorithm.Python/Alphas/GreenblattMagicFormulaAlpha.py | rank by EV/EBITDA and ROC, buy combined top ranks |
| QuantConnect/Lean | Algorithm.Python/Alphas/IntradayReversalCurrencyMarketsAlpha.py | hourly FX, long on cross below SMA, short on cross above, 10am to 3pm |
| QuantConnect/Lean | Algorithm.Python/Alphas/MeanReversionLunchBreakAlpha.py | fade the morning move around midday on liquid stocks |
| QuantConnect/Lean | Algorithm.Python/Alphas/MortgageRateVolatilityAlpha.py | mortgage rate volatility spikes give short insights on real estate ETFs |
| QuantConnect/Lean | Algorithm.Python/Alphas/PriceGapMeanReversionAlpha.py | fade price gaps larger than 3 times volatility |
| QuantConnect/Lean | Algorithm.Python/Alphas/RebalancingLeveragedETFAlpha.py | trade in the direction of 2x and 3x ETF end-of-day rebalancing flows |
| QuantConnect/Lean | Algorithm.Python/Alphas/ShareClassMeanReversionAlpha.py | dollar-neutral long cheap and short rich share class of the same company |
| QuantConnect/Lean | Algorithm.Python/Alphas/SykesShortMicroCapAlpha.py | short pumped penny stocks expecting reversion |
| QuantConnect/Lean | Algorithm.Python/Alphas/TriangleExchangeRateArbitrageAlpha.py | trade FX triangle when the cross rate diverges from the implied rate |
| QuantConnect/Lean | Algorithm.Python/Alphas/TripleLeverageETFPairVolatilityDecayAlpha.py | short both bull and bear 3x ETFs to harvest volatility decay |
| QuantConnect/Lean | Algorithm.Python/Alphas/VIXDualThrustAlpha.py | Dual Thrust range breakout with k1 0.63 on volatility products |
| QuantConnect/Lean | Algorithm.Python/BubbleAlgorithm.py | ride momentum while CAPE is high, exit before crash signals |
| QuantConnect/Lean | Algorithm.Python/ETFGlobalRotationAlgorithm.py | rotate into the global ETF with best trailing momentum |
| QuantConnect/Lean | Algorithm.Python/FuturesMomentumAlgorithm.py | trend follow futures with fast and slow EMA |
| QuantConnect/Lean | Algorithm.Python/MACDTrendAlgorithm.py | long when MACD above signal by tolerance, flat otherwise |
| QuantConnect/Lean | Algorithm.Python/MovingAverageCrossAlgorithm.py | fast/slow EMA cross on SPY |
| QuantConnect/Lean | Algorithm.Python/DisplacedMovingAverageRibbon.py | buy when a ribbon of displaced SMAs is ordered upward, exit when ordered down |
| QuantConnect/Lean | Algorithm.Python/EmaCrossFuturesFrontMonthAlgorithm.py | EMA cross on the front-month future |
| QuantConnect/Lean | Algorithm.Python/EmaCrossUniverseSelectionAlgorithm.py | universe of stocks whose fast EMA is above slow EMA |
| QuantConnect/Lean | Algorithm.Python/CapmAlphaRankingFrameworkAlgorithm.py | rank Dow 30 by CAPM alpha, hold the top names |
| QuantConnect/Lean | Algorithm.Python/CoarseFundamentalTop3Algorithm.py | hold the 3 highest dollar-volume stocks |
| QuantConnect/Lean | Algorithm.Python/MeanReversionPortfolioAlgorithm.py | OLMAR portfolio on a stock basket |
| QuantConnect/Lean | Algorithm.Python/RiskParityPortfolioAlgorithm.py | risk parity weights on a basket |
| QuantConnect/Lean | Algorithm.Python/NLTKSentimentTradingAlgorithm.py | NLTK sentiment score of text data sets long or short |
| QuantConnect/Lean | Algorithm.Python/KerasNeuralNetworkAlgorithm.py | Keras net forecasts next price, buy if above current |
| QuantConnect/Lean | Algorithm.Python/IronCondorStrategyAlgorithm.py | sell iron condor on index options |
| QuantConnect/Lean | Algorithm.Python/IndexOptionBullPutSpreadAlgorithm.py | sell bull put spread on SPX |
| QuantConnect/Lean | Algorithm.Python/LongAndShortStraddleStrategiesAlgorithm.py | buy and sell ATM straddles |
| QuantConnect/Lean | Algorithm.Python/CoveredAndProtectiveCallStrategiesAlgorithm.py | covered call and protective call combos |
| QuantConnect/Lean | Algorithm.Python/IndexOptionCallCalendarSpreadAlgorithm.py | sell near, buy far call calendar on index |
| stefan-jansen/machine-learning-for-trading | case_studies/etfs | rank 100 ETFs by ML forecast of 21-day forward return |
| stefan-jansen/machine-learning-for-trading | case_studies/crypto_perps_funding | predict 8-hour perp returns from funding rate features |
| stefan-jansen/machine-learning-for-trading | case_studies/nasdaq100_microstructure | 15-minute intraday return forecast from order flow features |
| stefan-jansen/machine-learning-for-trading | case_studies/fx_pairs | daily G10 FX return forecast |
| stefan-jansen/machine-learning-for-trading | case_studies/cme_futures | 5-day futures return forecast across 30 products |
| stefan-jansen/machine-learning-for-trading | case_studies/sp500_options | delta-hedged straddle 10-day return forecast |
| stefan-jansen/machine-learning-for-trading | 21_rl_execution_hedging/03_market_making_ppo.py | PPO agent sets quotes to earn spread under inventory penalty |
| stefan-jansen/machine-learning-for-trading | 21_rl_execution_hedging/05_deep_hedging_pfhedge.py | neural deep hedging of an option under costs |
| stefan-jansen/zipline-reloaded | src/zipline/examples/dual_moving_average.py | long AAPL when 100-day SMA above 300-day SMA |
| stefan-jansen/zipline-reloaded | src/zipline/examples/dual_ema_talib.py | EMA crossover using TA-Lib |
| stefan-jansen/zipline-reloaded | src/zipline/examples/momentum_pipeline.py | Pipeline ranks by momentum, rebalance into the top names |
| stefan-jansen/zipline-reloaded | src/zipline/examples/olmar.py | On-Line Moving Average Reversion portfolio weights |
| stefan-jansen/zipline-reloaded | src/zipline/examples/buy_and_hold.py | buy and hold benchmark |
| virattt/ai-hedge-fund | hedge_fund/signals/pead.py | long positive and short negative earnings surprises for the drift window |
| virattt/ai-hedge-fund | hedge_fund/signals/buffett.py | LLM in Buffett persona scores quality and moat as bullish, neutral or bearish |
| virattt/ai-hedge-fund | hedge_fund/signals/graham.py | LLM in Graham persona scores margin of safety |
| virattt/ai-hedge-fund | hedge_fund/signals/munger.py | LLM in Munger persona scores quality at a fair price |
| virattt/ai-hedge-fund | hedge_fund/signals/lynch.py | LLM in Lynch persona scores growth at a reasonable price |
| virattt/ai-hedge-fund | hedge_fund/signals/druckenmiller.py | LLM in Druckenmiller persona scores fundamental inflections |
| virattt/ai-hedge-fund | hedge_fund/strategies/deep-value.yaml | long-only blend, Graham double weight with Buffett and Munger |
| virattt/ai-hedge-fund | hedge_fund/strategies/fundamental-ls.yaml | five personas, dollar-neutral long/short, shorts need Druckenmiller |
| virattt/ai-hedge-fund | hedge_fund/strategies/inflections.yaml | Druckenmiller and Lynch long/short on fundamental rate of change |
| virattt/ai-hedge-fund | hedge_fund/strategies/earnings-drift.yaml | PEAD long/short conviction weighted, gross 1.0 |
| pysystemtrade | systems/provided/rules/ewmac.py | EWMA crossover (fast minus slow) divided by price vol, scaled forecast |
| pysystemtrade | systems/provided/rules/breakout.py | Position of price within rolling min-max range over lookback, smoothed |
| pysystemtrade | systems/provided/rules/carry.py | Annualized roll yield divided by vol, smoothed 90 days; relative_carry subtracts asset-class median |
| pysystemtrade | systems/provided/rules/accel.py | Change in EWMAC forecast over the fast span, trend acceleration |
| pysystemtrade | systems/provided/rules/mr_wings.py | Fade extreme short-term moves beyond a vol band |
| pysystemtrade | systems/provided/rules/rel_mom.py | Instrument momentum relative to its asset-class average |
| pysystemtrade | systems/provided/rules/cs_mr.py | Cross-sectional mean reversion: short recent outperformers within the asset class |
| pysystemtrade | systems/provided/rules/factors.py | Demeaned factor value as forecast, optional conditioning |
| pysystemtrade | sysexecution/algos/algo_original_best.py | Passive limit order that switches to aggressive on adverse move or timeout |
| pysystemtrade | systems/risk_overlay.py | Scale positions down when portfolio risk, correlation shock or gearing exceeds limits |
| bt | bt/algos.py SelectMomentum + WeighInvVol | Pick top-N by trailing return, weigh by inverse vol, rebalance on schedule |
| bt | bt/algos.py WeighERC / WeighMeanVar / TargetVol | Equal risk contribution, mean-variance, and portfolio vol targeting |
| qstrader | examples/sixty_forty.py | 60% SPY / 40% AGG monthly rebalance |
| qstrader | examples/momentum_taa.py | Tactical allocation to top sector ETFs by trailing momentum, monthly |
| qstrader | examples/long_short.py | Fixed long one ETF, short another, dollar-weighted |
| qstrader | examples/buy_and_hold.py | Single asset buy and hold |
| rqalpha | rqalpha/examples/golden_cross.py | Buy when short MA crosses above long MA, sell on cross below |
| rqalpha | rqalpha/examples/macd.py | Trade MACD line crossing signal line |
| rqalpha | rqalpha/examples/rsi.py | Buy RSI below oversold, sell above overbought |
| rqalpha | rqalpha/examples/pair_trading.py | Spread z-score entry and exit on two cointegrated futures |
| rqalpha | rqalpha/examples/turtle.py | Donchian breakout entries with ATR unit sizing and pyramiding |
| rqalpha | rqalpha/examples/buy_and_hold.py | Buy once and hold |
| hftbacktest | examples/GLFT Market Making Model and Grid Trading.ipynb | GLFT optimal quotes from inventory, volatility and order arrival intensity |
| hftbacktest | examples/High-Frequency Grid Trading.ipynb | Symmetric grid of limit orders around mid, skewed by position |
| hftbacktest | examples/Market Making with Alpha - Order Book Imbalance.ipynb | Shift quote mid by standardized book imbalance |
| hftbacktest | examples/Market Making with Alpha - Basis.ipynb | Shift quote mid by spot-futures basis |
| hftbacktest | examples/Market Making with Alpha - APT.ipynb | Shift quote mid by factor-model fair value |
| hftbacktest | examples/Queue-Based Market Making in Large Tick Size Assets.ipynb | Quote only when queue position gives fill priority |
| poly-maker | src/polymaker/strategy/quoting.py | Post-only BUY YES and BUY NO around fair value with inventory skew |
| poly-maker | src/polymaker/strategy/regime.py | Pull quotes when volatility or toxicity regime flips to news |
| poly-maker | src/polymaker/catalog/scoring.py | Rank markets by reward plus rebate income against spread and vol risk |
| prediction-market-backtesting | strategies/binary_pair_arbitrage.py | Buy YES and NO when combined ask is under 1 minus fees |
| prediction-market-backtesting | strategies/late_favorite_limit_hold.py | Late in the window, buy the favorite with a limit and hold to resolution |
| prediction-market-backtesting | strategies/final_period_momentum.py | Follow price direction in the final period before close |
| prediction-market-backtesting | strategies/deep_value.py | Buy contracts priced far under a value threshold and hold |
| prediction-market-backtesting | strategies/panic_fade.py | Buy after a sharp drop, exit on rebound |
| prediction-market-backtesting | strategies/microprice_imbalance.py | Enter when microprice from book imbalance sits above the mid |
| prediction-market-backtesting | strategies/vwap_reversion.py | Buy below VWAP by a band, exit at VWAP |
| prediction-market-backtesting | strategies/rsi_reversion.py | Buy on low RSI, exit on recovery |
| prediction-market-backtesting | strategies/mean_reversion.py | Buy below rolling mean by a threshold |
| prediction-market-backtesting | strategies/ema_crossover.py | Long when fast EMA crosses above slow EMA |
| prediction-market-backtesting | strategies/breakout.py | Long on break above rolling high |
| prediction-market-backtesting | strategies/threshold_momentum.py | Long when price crosses a fixed probability threshold |
| prediction-market-backtesting | strategies/passive_pair_accumulation.py | Rest bids on both sides and accumulate a pair under 1 |
| prediction-market-backtesting | backtests/polymarket_btc_5m_late_favorite_taker_hold.py | BTC 5-minute up/down: take the favorite late and hold |
| kalshi-ai-trading-bot | src/strategies/safe_compounder.py | NO side only when NO ask above 80c and estimated edge above 3c; maker order 1c under ask; 10% cap |
| kalshi-ai-trading-bot | src/strategies/market_making.py | Two-sided Kalshi quotes for spread capture with fixed capital base |
| kalshi-ai-trading-bot | src/strategies/category_scorer.py | Score categories on past performance; block below 30, tiered allocation above |
| kalshi-ai-trading-bot | src/strategies/portfolio_optimization.py | Kelly-style allocation across LLM-scored opportunities |
| KalshiMarketMaker | kalshi_market_maker/core/avellaneda.py | Avellaneda-Stoikov reservation price and optimal spread with inventory-dependent gamma |
| poly-kalshi-arb | src/execution.rs | Buy YES on one venue and NO on the other when total cost is under 0.995 |
| polymarket-kalshi-weather-bot | backend/core/weather_signals.py | P(high above bucket) from 31 GFS ensemble members vs market; trade at 8% edge, 0.15 Kelly |
| polymarket-kalshi-weather-bot | backend/core/signals.py | BTC 5-min up/down: RSI, momentum, VWAP dev, SMA cross, skew; 3 of 4 agree, entry 55c or less, 2% edge |
| LLM-Trading-Lab | Experiments/chatgpt_micro-cap/scripts/processing/trading_script.py | ChatGPT picks micro-caps daily; human executes; per-position stop loss |
| FinMem | puppy/agent.py | LLM buy/hold/sell per day from layered memory of news, filings and reflections |
| lumibot | lumibot/example_strategies/classic_60_40.py | 60/40 stock-bond rebalance |
| lumibot | lumibot/example_strategies/drift_rebalancer.py | Rebalance when weights drift past a threshold |
| lumibot | lumibot/example_strategies/stock_momentum.py | Rotate into the top trailing-return symbol |
| lumibot | lumibot/example_strategies/stock_top_market_cap.py | Hold the largest market-cap stocks |
| lumibot | lumibot/example_strategies/stock_revenue_growth_low_debt.py | Screen for revenue growth with low debt |
| lumibot | lumibot/example_strategies/strangle.py | Buy OTM call and put before an expected move |
| lumibot | lumibot/example_strategies/crypto_50_50.py | 50/50 BTC-ETH rebalance |
| lumibot | lumibot/example_strategies/kalshi_favorite_backtest.py | Buy the Kalshi favorite and hold |
| lumibot | lumibot/example_strategies/polymarket_prediction_contract.py | Buy a Polymarket contract by rule |
| lumibot | lumibot/example_strategies/ai_opening_range_breakout.py | Opening range breakout with LLM filter |
| lumibot | lumibot/example_strategies/ai_iron_condor.py | LLM-chosen iron condor |
| lumibot | lumibot/example_strategies/ai_credit_spread.py | LLM-chosen credit spread |
| lumibot | lumibot/example_strategies/ai_wheel | Cash-secured puts then covered calls |
| lumibot | lumibot/example_strategies/ai_0dte_options_trading_bot.py | LLM-picked 0DTE options |
| lumibot | lumibot/example_strategies/ai_vwap.py | VWAP reversion with LLM check |
| lumibot | lumibot/example_strategies/ai_fear_and_greed_trading_bot.py | Allocate on the fear and greed index |
| lumibot | lumibot/example_strategies/ai_insider_trading_bot.py | Follow insider buys |
| lumibot | lumibot/example_strategies/ai_nancy_pelosi_copy_trading_bot.py | Copy congressional trade disclosures |
| lumibot | lumibot/example_strategies/agent_m2_liquidity.py | LLM allocates risk on M2 money supply trend |
| lumibot | lumibot/example_strategies/agent_news_sentiment.py | LLM trades on news sentiment |
| lumibot | lumibot/example_strategies/agent_macro_risk.py | LLM sets risk on and off from macro data |
| lumibot | lumibot/example_strategies/agent_momentum_allocator.py | LLM momentum allocation across ETFs |
| lumibot | lumibot/example_strategies/ai_trading_team_*.py | Persona teams (Buffett value, Dalio, Ackman, Citadel pods, bull/bear) debate then trade |
| OctoBot | packages/tentacles/Trading/Mode/grid_trading_mode | Fixed grid of buy and sell orders around price |
| OctoBot | packages/tentacles/Trading/Mode/dca_trading_mode | Periodic or signal-triggered buys with take profit and stop |
| OctoBot | packages/tentacles/Trading/Mode/staggered_orders_trading_mode | Ladder of orders across a price range |
| OctoBot | packages/tentacles/Trading/Mode/dip_analyser_trading_mode | Buy dips flagged by the dip evaluator, sell at staged targets |
| OctoBot | packages/tentacles/Trading/Mode/index_trading_mode | Hold and rebalance a crypto index basket |
| OctoBot | packages/tentacles/Trading/Mode/arbitrage_trading_mode | Cross-exchange price arbitrage |
| OctoBot | packages/tentacles/Trading/Mode/market_making_trading_mode | Two-sided quotes around reference price |
| OctoBot | packages/tentacles/Trading/Mode/daily_trading_mode | Trade on aggregated evaluator score thresholds |
| OctoBot | packages/tentacles/Trading/Mode/trading_view_signals_trading_mode | Execute TradingView webhook alerts |
| OctoBot | packages/tentacles/Trading/Mode/ai_trading_mode | LLM produces the trade signal from market context |
| binance-trading-bot | packages/strategy/trailing-trade | Grid ladder buy on dips, trailing sell, technicals and mean-reversion gates |
| binance-trading-bot | packages/strategy/momentum | Breakout with MA cluster, OBV lead, relative strength, trend filter, trailing stop |
| binance-trading-bot | packages/strategy/rebalance | Rebalance to target weights |
| binance-trade-bot | binance_trade_bot/strategies/default_strategy.py | Jump from held coin to another when pair ratio beats stored ratio plus fees |
| binance-trade-bot | binance_trade_bot/strategies/multiple_coins_strategy.py | Same ratio scouting across all held coins |
| crypto-trading-bot | src/strategy/strategies/awesome_oscillator_cross_zero.ts | Trade AO crossing zero |
| crypto-trading-bot | src/strategy/strategies/cci.ts | CCI extremes with SMA trend filter |
| crypto-trading-bot | src/strategy/strategies/cci_macd.ts | CCI plus MACD confirmation |
| crypto-trading-bot | src/strategy/strategies/macd.ts | MACD histogram cross |
| crypto-trading-bot | src/strategy/strategies/obv_pump_dump.ts | OBV spike over its average signals pump |
| crypto-trading-bot | src/strategy/strategies/parabolicsar.ts | Trade PSAR flips |
| crypto-trading-bot | src/strategy/strategies/pivot_reversal_strategy.ts | Pivot high/low reversal entries |
| crypto-trading-bot | src/strategy/strategies/dca_dipper.ts | DCA buys on dips below Bollinger band |
| crypto-trading-bot | src/strategy/strategies/dip_catcher.ts | Buy sharp dips with trend filter |
| tradingview-mcp | core/services/backtest_service.py | rsi, bollinger, macd, ema_cross, supertrend, donchian with walk-forward variant |
| finmarketpy | finmarketpy_examples/tradingmodelfxtrend_example.py | FX trend following on total-return indices with vol targeting |
| gs-quant | gs_quant/backtests/strategy_systematic.py | Systematic option overlays with delta hedge triggers |
| Qbot | qbot/strategies/*.py | adx, arbr, bigger_than_ema, boll, k_lines, lstm, multi_strategy, rl, sma_cross, ssa, undervalued_stock_picking |
| Qbot | pytrader/strategies/*.py | CCI, StochRSI, aroon, k-line, lgb, monte_carlo, multi_factor, q-learning, rsi_departure, svm |
| QuantDinger | library/strategies/001_quantdinger_bollinger_breakout.py | Long-only volatility breakout with a configurable band-based exit. |
| QuantDinger | library/strategies/002_quantdinger_donchian_breakout.py | Long-only channel breakout with lower-channel or midpoint exit selection. |
| QuantDinger | library/strategies/003_quantdinger_ema_atr_long.py | Long-only trend strategy using a smoothed price and ATR envelope. |
| QuantDinger | library/strategies/004_quantdinger_obv_oscillator.py | One-way long and short reversal strategy driven by OBV oscillator EMA crosses. |
| QuantDinger | library/strategies/005_quantdinger_dual_ma_angle.py | One-way reversal strategy combining a recent moving-average cross with trend angle. |
| QuantDinger | library/strategies/006_quantdinger_trend_reversal.py | Long-only candle resistance strategy using three-bar directional confirmation. |
| QuantDinger | library/strategies/007_quantdinger_evwma_vwap_cross.py | One-way reversal strategy comparing a volume-weighted average with EVWMA. |
| QuantDinger | library/strategies/008_quantdinger_high_low_channel.py | One-way channel breakout strategy with optional signal reversal. |
| QuantDinger | library/strategies/009_quantdinger_support_resistance.py | One-way reversal strategy using confirmed moving-average crossing levels. |
| QuantDinger | library/strategies/010_quantdinger_ssl_channel.py | One-way reversal strategy driven by SSL channel crosses. |
| QuantDinger | library/strategies/011_quantdinger_atr_trailing_line.py | One-way reversal strategy using the highest ATR-adjusted trailing level. |
| QuantDinger | library/strategies/012_quantdinger_uhl_ma_system.py | One-way adaptive trend strategy comparing UHL price and mean filters. |
| QuantDinger | library/strategies/013_quantdinger_ichimoku_cloud.py | One-way cloud regime strategy using displaced Donchian midpoints. |
| QuantDinger | library/strategies/014_quantdinger_evwma_vwap_macd.py | One-way reversal strategy using fast and slow smoothing of the VWAP-EVWMA spread. |
| QuantDinger | library/strategies/015_quantdinger_turtle_system.py | One-way Donchian breakout strategy with independent exit channels. |
| QuantDinger | library/strategies/016_quantdinger_dual_ema_cross.py | One-way trend strategy driven by two exponential moving averages. |
| QuantDinger | library/strategies/017_quantdinger_fractal_breakout.py | One-way breakout strategy using confirmed plateau-aware fractal levels. |
| QuantDinger | library/strategies/018_quantdinger_grover_activator.py | One-way adaptive trend strategy using an ATR-scaled recursive activator. |
| QuantDinger | library/strategies/019_quantdinger_hhll_bollinger.py | One-way volatility breakout strategy with optional signal reversal. |
| QuantDinger | library/strategies/020_quantdinger_hull_tsi.py | One-way momentum strategy using double Hull smoothing and price direction. |
| QuantDinger | library/strategies/021_quantdinger_kpl_swing.py | One-way channel regime strategy using a dynamic trailing swing line. |
| QuantDinger | library/strategies/022_quantdinger_sma_10_20_cross.py | One-way trend strategy driven by a simple moving-average crossover. |
| QuantDinger | library/strategies/023_quantdinger_rsi_buy_dips.py | Long-only mean-reversion strategy filtered by a simple moving average. |
| QuantDinger | library/strategies/024_quantdinger_price_action_bollinger.py | One-way reversal strategy combining candle contraction with Bollinger extremes. |
| QuantDinger | library/strategies/025_quantdinger_ut_bot.py | One-way ATR trailing-stop strategy with an optional Heikin-Ashi close source. |
| QuantDinger | library/strategies/026_quantdinger_heikin_ashi_price_action.py | # @param use_heikin_ashi bool true |
| QuantDinger | library/strategies/027_quantdinger_state_aware_ma_cross.py | # @param target_pct float 0.95 range=0.05:1:0.05 |
| QuantDinger | library/strategies/028_quantdinger_triple_dema.py | # @param fast_length int 8 range=1:200:1 |
| QuantDinger | library/strategies/029_quantdinger_zigzag_rsi_15m.py | # @param rsi_length int 5 range=2:100:1 |
| QuantDinger | library/strategies/030_quantdinger_three_signal_trend.py | # @param average_length int 50 range=2:300:1 |
| QuantDinger | library/strategies/031_quantdinger_parabolic_sar_close.py | # @param start float 0.02 range=0.001:0.2:0.001 |
| QuantDinger | library/strategies/032_quantdinger_alpha_trend.py | # @param multiplier float 1.0 range=0.1:10:0.1 |
| QuantDinger | library/strategies/033_quantdinger_friction_trend.py | # @param bars_back int 500 range=50:1500:50 |
| QuantDinger | library/strategies/034_quantdinger_atr_parabolic_sar.py | # @param atr_length int 14 range=1:300:1 |
| QuantDinger | library/strategies/035_quantdinger_dual_atr_trails.py | # @param fast_period int 5 range=1:300:1 |
| QuantDinger | library/strategies/036_quantdinger_rsi_reversal.py | # @param rsi_length int 14 range=2:300:1 |
| QuantDinger | library/strategies/037_quantdinger_trapped_countertrend.py | # @param rsi_length int 5 range=2:100:1 |
| QuantDinger | library/strategies/038_quantdinger_ma_adx_filter.py | # @param fast_length int 20 range=1:300:1 |
| QuantDinger | library/strategies/039_quantdinger_moving_average_scalper.py | # @param signal_length int 9 range=1:100:1 |
| QuantDinger | library/strategies/040_quantdinger_heikin_rsi_threshold.py | # @param rsi_length int 8 range=2:200:1 |
| QuantDinger | library/strategies/041_quantdinger_scalping_system.py | # @param sma_length int 25 range=1:300:1 |
| QuantDinger | library/strategies/042_quantdinger_turtle_donchian_atr.py | # @param entry_period int 20 range=2:300:1 |
| QuantDinger | library/strategies/043_quantdinger_bollinger_rsi_reversion.py | # @param band_length int 20 range=2:300:1 |
| QuantDinger | library/strategies/044_quantdinger_kama_slope.py | # @param efficiency_length int 10 range=2:300:1 |
| QuantDinger | library/strategies/045_quantdinger_ut_bot_range.py | # @param key_value float 1.0 range=0.1:20:0.1 |
| QuantDinger | library/strategies/046_quantdinger_previous_day_breakout.py | # @param target_pct float 0.95 range=0.05:1:0.05 |
| QuantDinger | library/strategies/047_quantdinger_double_extreme_hunter.py | # @param period int 100 range=10:500:1 |
| QuantDinger | library/strategies/048_quantdinger_super_scalper_15m.py | # @param atr_length int 14 range=1:300:1 |
| QuantDinger | library/strategies/049_quantdinger_ema_slope_trend.py | # @param source_length int 130 range=2:600:1 |
| QuantDinger | library/strategies/050_quantdinger_reversal_rsi_combo.py | # @param stochastic_length int 14 range=2:300:1 |
| QuantDinger | library/strategies/051_quantdinger_reversal_volatility_combo.py | # @param stochastic_length int 14 range=2:300:1 |
| QuantDinger | library/strategies/052_quantdinger_pivot_supertrend.py | # @param pivot_period int 2 range=1:50:1 |
| QuantDinger | library/strategies/053_quantdinger_ema_accelerator_combo.py | # @param ema_length int 14 range=1:300:1 |
| QuantDinger | library/strategies/054_quantdinger_heikin_psar.py | # @param start float 0.02 range=0.001:0.2:0.001 |
| QuantDinger | library/strategies/055_quantdinger_ut_bot_v2.py | # @param multiplier float 1.0 range=0.1:20:0.1 |
| QuantDinger | library/strategies/056_quantdinger_accurate_5m_composite.py | # @param score_threshold float 10 range=1:30:1 |
| QuantDinger | library/strategies/057_quantdinger_adaptive_trend_flow.py | # @param trend_length int 2 range=2:100:1 |
| QuantDinger | library/strategies/058_quantdinger_adx_dmi_trend.py | # @param adx_length int 14 range=2:100:1 |
| QuantDinger | library/strategies/059_quantdinger_alpha_trend_mfi.py | # @param multiplier float 1.0 range=0.1:10:0.1 |
| QuantDinger | library/strategies/060_quantdinger_standard_bar_reversal.py | # @param use_ma_cross bool false |
| QuantDinger | library/strategies/061_quantdinger_supertrend_cci.py | # @param cci_period int 28 range=2:300:1 |
| QuantDinger | library/strategies/062_quantdinger_sma_trailing_profit.py | # @param fast_length int 20 range=2:300:1 |
| QuantDinger | library/strategies/063_quantdinger_wpr_trend_helper.py | # @param reversal_lookback int 14 range=2:300:1 |
| QuantDinger | library/strategies/064_quantdinger_chandelier_risk.py | # @param atr_period int 22 range=1:300:1 |
| QuantDinger | library/strategies/065_quantdinger_chop_dmi_psar.py | # @param lookback int 14 range=2:300:1 |
| QuantDinger | library/strategies/066_quantdinger_crsi_vwma_waves.py | # @param rsi_length int 14 range=2:100:1 |
| QuantDinger | library/strategies/067_quantdinger_ma_pullback.py | # @param long_length int 200 range=20:600:1 |
| QuantDinger | library/strategies/068_quantdinger_dema_entry_exit.py | # @param signal_length int 8 range=1:100:1 |
| QuantDinger | library/strategies/069_quantdinger_dynamic_swing_vwap.py | # @param swing_period int 50 range=2:500:1 |
| QuantDinger | library/strategies/070_quantdinger_easy_system_score.py | # @param entry_points float 15 range=0:36:1 |
| QuantDinger | library/strategies/071_quantdinger_ema_rsi_adx.py | # @param fast_length int 9 range=1:200:1 |
| QuantDinger | library/strategies/072_quantdinger_ema_ratio_cross.py | # @param length int 20 range=1:300:1 |
| QuantDinger | library/strategies/073_quantdinger_flexi_supertrend.py | # @param atr_length int 10 range=2:100:1 |
| QuantDinger | library/strategies/074_quantdinger_gaussian_channel.py | # @param poles int 4 range=1:9:1 |
| QuantDinger | library/strategies/075_quantdinger_golden_vector.py | # @param atr_length int 14 range=1:100:1 |
| QuantDinger | library/strategies/076_quantdinger_gradient_trend_filter.py | # @param length int 25 range=2:300:1 |
| QuantDinger | library/strategies/077_quantdinger_timed_sma_cross.py | # @param fast_length int 14 range=1:300:1 |
| QuantDinger | library/strategies/078_quantdinger_hull_fisher.py | # @param hull_length int 14 range=2:200:1 |
| QuantDinger | library/strategies/079_quantdinger_ichimoku_momentum.py | # @param tenkan_length int 10 range=1:100:1 |
| QuantDinger | library/strategies/080_quantdinger_kama_atr.py | # @param kama_length int 10 range=2:300:1 |
| QuantDinger | library/strategies/081_quantdinger_macd_reloaded.py | # @param fast_length int 12 range=1:200:1 |
| QuantDinger | library/strategies/082_quantdinger_macd_rsi_momentum.py | # @param fast_length int 12 range=1:200:1 |
| QuantDinger | library/strategies/083_quantdinger_ma_band.py | # @param ma_length int 40 range=1:400:1 |
| QuantDinger | library/strategies/084_quantdinger_displaced_envelope.py | # @param ema_period int 9 range=1:300:1 |
| QuantDinger | library/strategies/085_quantdinger_regression_band.py | # @param window int 80 range=5:500:1 |
| QuantDinger | library/strategies/086_quantdinger_engulfing_stability.py | # @param stability float 0.5 range=0:1:0.05 |
| QuantDinger | library/strategies/087_quantdinger_renko_emulation.py | # @param brick_size float 3 range=0.1:10000:0.1 |
| QuantDinger | library/strategies/088_quantdinger_optimized_trend_tracker.py | # @param ma_length int 2 range=1:100:1 |
| QuantDinger | library/strategies/089_quantdinger_pivot_supertrend.py | # @param pivot_period int 2 range=1:20:1 |
| QuantDinger | library/strategies/090_quantdinger_pmax_explorer.py | # @param ma_length int 10 range=1:200:1 |
| QuantDinger | library/strategies/091_quantdinger_rsi_t3_pmax.py | # @param rsi_length int 14 range=2:100:1 |
| QuantDinger | library/strategies/092_quantdinger_golden_edge.py | # @param fast_length int 3 range=1:100:1 |
| QuantDinger | library/strategies/093_quantdinger_pmax_long.py | # @param ma_length int 10 range=1:200:1 |
| QuantDinger | library/strategies/094_quantdinger_quasimodo.py | # @param pivot_period int 5 range=2:20:1 |
| QuantDinger | library/strategies/095_quantdinger_rci_cross.py | # @param rci_length int 10 range=2:100:1 |
| QuantDinger | library/strategies/096_quantdinger_atr_renko.py | # @param atr_length int 10 range=1:200:1 |
| QuantDinger | library/strategies/097_quantdinger_rsi_divergence.py | # @param rsi_length int 14 range=2:100:1 |
| QuantDinger | library/strategies/098_quantdinger_smc_zones.py | # @param swing_length int 8 range=2:100:1 |
| QuantDinger | library/strategies/099_quantdinger_stochastic_ott.py | # @param stochastic_length int 250 range=10:500:1 |
| QuantDinger | library/strategies/100_quantdinger_hma_supertrend.py | # @param hull_length int 50 range=2:300:1 |
| QuantDinger | library/strategies/101_quantdinger_super_guppy.py | # @param use_short bool true |
| QuantDinger | library/strategies/102_quantdinger_supertrend_cloud.py | # @param multiplier_fast float 2.4 range=0.1:20:0.1 |
| QuantDinger | library/strategies/103_quantdinger_supertrend.py | # @param atr_length int 10 range=1:200:1 |
| QuantDinger | library/strategies/104_quantdinger_continuous_trailing_long.py | # @param initial_stop_pct float 3 range=0.1:30:0.1 |
| QuantDinger | library/strategies/105_quantdinger_channel_breakout.py | # @param entry_length int 100 range=2:500:1 |
| QuantDinger | library/strategies/106_quantdinger_triangular_hull.py | # @param length int 40 range=3:300:1 |
| QuantDinger | library/strategies/107_quantdinger_twin_ott.py | # @param length int 40 range=1:300:1 |
| QuantDinger | library/strategies/108_quantdinger_ut_bot_v5.py | # @param ma_period int 2 range=1:100:1 |
| QuantDinger | library/strategies/109_quantdinger_vegas_supertrend.py | # @param atr_period int 10 range=1:200:1 |
| QuantDinger | library/strategies/110_quantdinger_vwma_knn.py | # @param fast_length int 13 range=2:100:1 |
| QuantDinger | library/strategies/111_quantdinger_yinyang_rsi_volume.py | # @param length int 80 range=10:300:1 |
| QuantDinger | library/strategies/112_quantdinger_3_ema_rsi_with_trail_stop_free990_low_tf.py | # @param fast_length int 10 range=2:100:1 |
| QuantDinger | library/strategies/113_quantdinger_abcd_strategy.py | # @param fast_length int 5 range=2:100:1 |
| QuantDinger | library/strategies/114_quantdinger_backtest_traders_dynamic_index_indicator_alert_by_just.py | # @param fast_length int 5 range=2:100:1 |
| QuantDinger | library/strategies/115_quantdinger_bbtrend_w_supertrend_decision_strategy_presenttrading.py | # @param fast_length int 10 range=2:100:1 |
| QuantDinger | library/strategies/116_quantdinger_btcusd_supertrend_ema_trend_filter_1h.py | # @param fast_length int 10 range=2:100:1 |
| QuantDinger | library/strategies/117_quantdinger_bjorgum_double_tap.py | # @param fast_length int 14 range=2:100:1 |
| QuantDinger | library/strategies/118_quantdinger_volume_confirmed_support_resistance_breakout_strategy.py | # @param fast_length int 12 range=2:100:1 |
| QuantDinger | library/strategies/119_quantdinger_breaks_and_retests_free990.py | # @param fast_length int 10 range=2:100:1 |
| QuantDinger | library/strategies/120_quantdinger_bsl_ssl_sweep_fvg_strategy_fixed_entry_logic.py | # @param fast_length int 8 range=2:100:1 |
| QuantDinger | library/strategies/121_quantdinger_buy_sell_strategy_depends_on_ao_stoch_rsi_atr_by_serda.py | # @param fast_length int 5 range=2:100:1 |
| QuantDinger | library/strategies/122_quantdinger_buythedip.py | # @param fast_length int 9 range=2:100:1 |
| QuantDinger | library/strategies/123_quantdinger_alculation_a_position_size_based_on_risk.py | # @param fast_length int 12 range=2:100:1 |
| QuantDinger | library/strategies/124_quantdinger_crypto_crew_university.py | # @param fast_length int 7 range=2:100:1 |
| QuantDinger | library/strategies/125_quantdinger_crypto_bot_lower_timeframes.py | # @param fast_length int 12 range=2:100:1 |
| QuantDinger | library/strategies/126_quantdinger_delta_rsi_strategy_with_filters.py | # @param fast_length int 10 range=2:100:1 |
| QuantDinger | library/strategies/127_quantdinger_divergence_for_many_indicators_v4_st.py | # @param fast_length int 7 range=2:100:1 |
| QuantDinger | library/strategies/128_quantdinger_double_triple_pattern_ts_indie.py | # @param fast_length int 14 range=2:100:1 |
| QuantDinger | library/strategies/129_quantdinger_elder_ray_bull_power_tp_and_sl.py | # @param fast_length int 8 range=2:100:1 |
| QuantDinger | library/strategies/130_quantdinger_ema_rsi_atr_hidden_div_strat_1_min.py | # @param fast_length int 12 range=2:100:1 |
| QuantDinger | library/strategies/131_quantdinger_larry_connors_strategy_josemetal.py | # @param fast_length int 10 range=2:100:1 |
| QuantDinger | library/strategies/132_quantdinger_fib_confluence_scanner.py | # @param fast_length int 8 range=2:100:1 |
| QuantDinger | library/strategies/133_quantdinger_fibonacci_rsi_strategy.py | # @param fast_length int 8 range=2:100:1 |
| QuantDinger | library/strategies/134_quantdinger_fixed_percent_stop_loss_take_profit.py | # @param fast_length int 5 range=2:100:1 |
| QuantDinger | library/strategies/135_quantdinger_flawless_victory_strategy_15min_btc_machine_learning_s.py | # @param fast_length int 12 range=2:100:1 |
| QuantDinger | library/strategies/136_quantdinger_forex_fractal_ema_scalper.py | # @param fast_length int 8 range=2:100:1 |
| QuantDinger | library/strategies/137_quantdinger_bollinger_bands_rsi_and_adx_trading_system.py | # @param fast_length int 8 range=2:100:1 |
| QuantDinger | library/strategies/138_quantdinger_gap_filling_strategy.py | # @param fast_length int 8 range=2:100:1 |
| QuantDinger | library/strategies/139_quantdinger_gold_intraday_ema_bb_vwap_atr_sl_tp_session_weekday_fi.py | # @param fast_length int 9 range=2:100:1 |
| QuantDinger | library/strategies/140_quantdinger_gold_scalping_strategy_with_precise_entries.py | # @param fast_length int 5 range=2:100:1 |
| QuantDinger | library/strategies/141_quantdinger_golden_trident_swing_anchored_vwap_trend_system.py | # @param fast_length int 9 range=2:100:1 |
| QuantDinger | library/strategies/142_quantdinger_high_low_channel_multi_averages_crypto_swing_strategy.py | # @param fast_length int 12 range=2:100:1 |
| QuantDinger | library/strategies/143_quantdinger_hybrid_rsi_breakout_dashboard.py | # @param fast_length int 10 range=2:100:1 |
| QuantDinger | library/strategies/144_quantdinger_ichimoku_backtester_with_optional_rsi_tp_and_sl.py | # @param fast_length int 9 range=2:100:1 |
| QuantDinger | library/strategies/145_quantdinger_js_techtrading_vwap_momentum_pullback_strategy.py | # @param fast_length int 7 range=2:100:1 |
| QuantDinger | library/strategies/146_quantdinger_lanz_strategy_2_0_backtest.py | # @param fast_length int 12 range=2:100:1 |
| QuantDinger | library/strategies/147_quantdinger_lanz_strategy_4_0_backtest.py | # @param fast_length int 20 range=2:100:1 |
| QuantDinger | library/strategies/148_quantdinger_linear_regression_channel_breakout_strategy.py | # @param fast_length int 10 range=2:100:1 |
| QuantDinger | library/strategies/149_quantdinger_liquidity_sweep_breakout_lsb.py | # @param fast_length int 8 range=2:100:1 |
| QuantDinger | library/strategies/150_quantdinger_macd_bb_rsi_alorse.py | # @param fast_length int 12 range=2:100:1 |
| QuantDinger | library/strategies/151_quantdinger_macd_liquidity_tracker_strategy_quant_trading.py | # @param fast_length int 25 range=2:100:1 |
| QuantDinger | library/strategies/152_quantdinger_macd_pullback_sniper_trend_adx_filtered_strategy.py | # @param fast_length int 12 range=2:100:1 |
| QuantDinger | library/strategies/153_quantdinger_momentum_sequence_strategy_herman.py | # @param fast_length int 8 range=2:100:1 |
| QuantDinger | library/strategies/154_quantdinger_nononsense_forex_high_timeframe_trading_absurd_non_rep.py | # @param fast_length int 12 range=2:100:1 |
| QuantDinger | library/strategies/155_quantdinger_open_close_cross_strategy_norepaint_version_by_justunc.py | # @param fast_length int 10 range=2:100:1 |
| QuantDinger | library/strategies/156_quantdinger_profit_maximizer_strategy.py | # @param fast_length int 12 range=2:100:1 |
| QuantDinger | library/strategies/157_quantdinger_rob_booker_adx_breakout.py | # @param fast_length int 8 range=2:100:1 |
| QuantDinger | library/strategies/158_quantdinger_rsi_divergence_strategy.py | # @param fast_length int 7 range=2:100:1 |
| QuantDinger | library/strategies/159_quantdinger_scalping_the_bull_two_ema_strategy.py | # @param fast_length int 10 range=2:100:1 |
| QuantDinger | library/strategies/160_quantdinger_bill_williams_alligator_improved.py | # @param fast_length int 8 range=2:100:1 |
| QuantDinger | library/strategies/161_quantdinger_sequence_snap_rsi_confirmed_reversal_scalper.py | # @param fast_length int 5 range=2:100:1 |
| QuantDinger | library/strategies/162_quantdinger_smart_grid_scalping_pullback_strategy_bullbyte.py | # @param fast_length int 9 range=2:100:1 |
| QuantDinger | library/strategies/163_quantdinger_stop_loss_and_take_profit_in_example.py | # @param fast_length int 14 range=2:100:1 |
| QuantDinger | library/strategies/164_quantdinger_strategy_rs_open_session_breakout_trader.py | # @param fast_length int 8 range=2:100:1 |
| QuantDinger | library/strategies/165_quantdinger_strategy_template.py | # @param fast_length int 5 range=2:100:1 |
| QuantDinger | library/strategies/166_quantdinger_strategy_ul_price_divergence_strategy_v1_0.py | # @param fast_length int 12 range=2:100:1 |
| QuantDinger | library/strategies/167_quantdinger_supertrend_backtester.py | # @param fast_length int 7 range=2:100:1 |
| QuantDinger | library/strategies/168_quantdinger_supertrend_regime_confluence.py | # @param fast_length int 10 range=2:100:1 |
| QuantDinger | library/strategies/169_quantdinger_thinktech_ai_signals.py | # @param fast_length int 9 range=2:100:1 |
| QuantDinger | library/strategies/170_quantdinger_tradeiq_crazy_scalping_trading_strategy_kaspricci.py | # @param fast_length int 5 range=2:100:1 |
| QuantDinger | library/strategies/171_quantdinger_trendlines_with_alerts.py | # @param fast_length int 10 range=2:100:1 |
| QuantDinger | library/strategies/172_quantdinger_triple_ema_rsi_atr.py | # @param fast_length int 9 range=2:100:1 |
| QuantDinger | library/strategies/173_quantdinger_triple_ema_trend.py | # @param fast_length int 30 range=2:100:1 |
| QuantDinger | library/strategies/174_quantdinger_two_bar_fib_retrace_strategy_futures.py | # @param fast_length int 8 range=2:100:1 |
| QuantDinger | library/strategies/175_quantdinger_vwap_breakout_strategy_emas_clean_cycle_tp_sl_plots.py | # @param fast_length int 9 range=2:100:1 |
| QuantDinger | library/strategies/176_quantdinger_wyckoff_range_strategy_by_deperp.py | # @param fast_length int 8 range=2:100:1 |
| QuantDinger | library/strategies/177_quantdinger_xauusd_scalping_v2_agresiv.py | # @param fast_length int 5 range=2:100:1 |
| QuantDinger | library/strategies/178_quantdinger_zero_lag_ma_trend_following.py | # @param fast_length int 12 range=2:100:1 |
| QuantDinger | library/strategies/179_quantdinger_2xtp_sl_to_entry.py | # @param fast_length int 7 range=2:100:1 |
| QuantDinger | library/strategies/180_quantdinger_advanced_position_management_mr_rakun.py | # @param fast_length int 9 range=2:100:1 |
| QuantDinger | library/strategies/181_quantdinger_advanced_vwap_pullback_strategy_trend_template_qualifi.py | # @param fast_length int 9 range=2:100:1 |
| QuantDinger | library/strategies/182_quantdinger_ai_volume_supertrend_strategy_presenttrading.py | # @param fast_length int 10 range=2:100:1 |
| QuantDinger | library/strategies/183_quantdinger_automated_bitcoin_btc_investment_strategy.py | # @param fast_length int 9 range=2:100:1 |
| QuantDinger | library/strategies/184_quantdinger_backtest_template_backtest_terminal.py | # @param fast_length int 9 range=2:100:1 |
| QuantDinger | library/strategies/185_quantdinger_double_ai_super_trend_trading_strategy_presenttrading.py | # @param fast_length int 10 range=2:100:1 |
| QuantDinger | library/strategies/186_quantdinger_elliott_wave_with_supertrend_exit_strategy_presenttrad.py | # @param fast_length int 10 range=2:100:1 |
| QuantDinger | library/strategies/187_quantdinger_ema_crossover_strategy_with_take_profit_and_candle_hig.py | # @param fast_length int 9 range=2:100:1 |
| QuantDinger | library/strategies/188_quantdinger_fibonacci_5_candles_retracement_version_2_close_bar.py | # @param fast_length int 8 range=2:100:1 |
| QuantDinger | library/strategies/189_quantdinger_grab_trading_system.py | # @param fast_length int 10 range=2:100:1 |
| QuantDinger | library/strategies/190_quantdinger_kahlman_hullma_wt_cross_strategy.py | # @param fast_length int 3 range=2:100:1 |
| QuantDinger | library/strategies/191_quantdinger_keltner_channel_eth_usdt_1h.py | # @param fast_length int 10 range=2:100:1 |
| QuantDinger | library/strategies/192_quantdinger_luxalgo_smc_pro_ultimate.py | # @param fast_length int 8 range=2:100:1 |
| QuantDinger | library/strategies/193_quantdinger_multi_step_flexima_strategy_presenttrading.py | # @param fast_length int 9 range=2:100:1 |
| QuantDinger | library/strategies/194_quantdinger_multi_step_flexisupertrend_strategy_presenttrading.py | # @param fast_length int 10 range=2:100:1 |
| QuantDinger | library/strategies/195_quantdinger_orb_strategy_lucitech.py | # @param fast_length int 8 range=2:100:1 |
| QuantDinger | library/strategies/196_quantdinger_precision_confluence_trading_strategy_joat.py | # @param fast_length int 8 range=2:100:1 |
| QuantDinger | library/strategies/197_quantdinger_stepped_trailing_strategy_example.py | # @param fast_length int 8 range=2:100:1 |
| QuantDinger | library/strategies/198_quantdinger_superatr_7_step_profit_strategy_presenttrading.py | # @param fast_length int 8 range=2:100:1 |
| QuantDinger | library/strategies/199_quantdinger_supertrend_advance.py | # @param fast_length int 12 range=2:100:1 |
| QuantDinger | library/strategies/200_quantdinger_supply_demand_zones_order_block_pro_fusion_auto_order.py | # @param fast_length int 8 range=2:100:1 |
| QuantDinger | library/strategies/201_quantdinger_the_flash_strategy_momentum_rsi_ema_crossover_atr.py | # @param fast_length int 9 range=2:100:1 |
| QuantDinger | library/strategies/202_quantdinger_tradingview_alerts_to_mt4_mt5_dynamic_variables_non_re.py | # @param fast_length int 7 range=2:100:1 |
| QuantDinger | library/strategies/203_quantdinger_tradingview_alerts_to_mt4_mt5_forex_indices_commoditie.py | # @param fast_length int 7 range=2:100:1 |
| QuantDinger | library/strategies/204_quantdinger_sl1_pips_after_tp1_ma.py | # @param fast_length int 10 range=2:100:1 |
| QuantDinger | library/strategies/205_quantdinger_y_profit_maximizer_strategy_with_exit_points.py | # @param fast_length int 10 range=2:100:1 |
| aat | see card | `sell_plus_percent.py`, IEX `golden_death.py` (30/10 moving average cross) and `momentum.py` (intraday trigger, profit and stop in basis points), plus buy-and-hold and read-only samples for Coinbase, IB, IEX and CSV. |
| adamant-tradebot | see card | Order book builder, liquidity provider with VWAP price correction, spread maintainer, antigap and ladder modules referenced in the price watcher header. |
| ai-hedge-fund-crypto | see card | `MacdStrategy` (weighted blend of trend, mean reversion, momentum, volatility and stat-arb signals across 30m, 1h and 4h), `RSIStrategy`, and a `MyStrategy` template. |
| akquant | see card | Sixty-plus example scripts under `examples/`, including parameter optimization, walk-forward ML, target-weight rebalancing and trailing orders. |
| algo-trader | see card | `simple_sma.py` SMA 5/20 crossover; `connors_rsi2.py` RSI2 mean reversion with SMA exit; `history_cosine_similarity.py` and `history_bucket_compare.py` match current indicator buckets against stored history returns. |
| algorithmic-trading-with-python | see card | SMA, MACD, Bollinger and Chaikin money flow signal examples; grid-search parameter optimizer; white-noise and bootstrap preference matrices as significance tests; triple-barrier labels with a CUSUM filter and a classifier simulation. |
| alphagpt | see card | Formula tokens generated by the model are evaluated by `StackVM` over feature tensors and backtested; the best formula scores new tokens. |
| alphasift | see card | 12 YAML screens such as `momentum_quality`, `dual_low`, `oversold_reversal`, `volume_breakout`, `shrink_pullback`, `blue_chip_income`, plus 9 candle patterns. |
| ashare | see card | `Demo1.py` and `Demo2.py` compute MA, MACD and similar indicators on fetched bars and print crossovers. |
| autohedge | see card | `experimental/market_making.py`: spread, order size and max inventory parameters for a BTC/USDT quoting loop. |
| banbot | see card | Time-series Go strategies, a multi-factor cross-sectional engine with portfolio policy, and statistical arbitrage (pairs, PCA, spot-perp carry). |
| barbotine-arbitrage-bot | see card | Cross-exchange spot arbitrage that pre-positions balances on every venue so no transfers occur. |
| barter-rs | see card | Traits `AlgoStrategy` and `ClosePositionsStrategy`; examples only, no tuned strategy. |
| basana | see card | `samples/strategies/`: SMA, dual moving average crossover (`dmac`), RSI, Bollinger bands and pairs trading. |
| binance-triangle-arbitrage | see card | `CalculationNode.optimize`: steps investment size from MIN to MAX and keeps the best profit percent per triangle, walking order book depth for each leg. |
| binance_grid_trader | see card | Spot grid, futures long grid, and futures long-short grid. |
| bitcoin-arbitrage | see card | `arbitrer.py`: cross-exchange depth walk, buy on the lowest ask and sell on the highest bid while ask is below bid. |
| bitquant | see card | `backtest/demo_strategy.py`: moving-average parameter template (long 110, short 70) with a placeholder signal; the broker has a grid `optimize_strategy`. |
| blankly | see card | `examples/`: golden_cross, macd, rsi, rsi_screener, take_profit, leveragedSPY, futures_rsi, mlp_model. |
| btrader | see card | Triangular arbitrage: `calculate_relationship` sweeps investment sizes and keeps the best fee-adjusted result. |
| bytex | see card | `examples/Bytex.Examples/Strategies/EmaCross.cs`. Strategy documents define data, indicators, conditions, actions and risk as a validated graph. |
| cloddsbot | see card | Combinatorial and cross-platform arbitrage in `opportunity/`, venue arbitrage scanners, `strategies/hft-divergence`, `strategies/crypto-hft`, `trading/market-making`, copy trading. |
| cointrader | see card | `DemoStrategy`, `SimpleStatefulStrategy` base class and `ConsoleStrategy`. No tuned production strategy. |
| cointrol | see card | `trader/strategies.py`: `FixedStrategy` (fixed buy and sell prices) and `RelativeStrategy` (percent offset from the last order price). |
| crypto-arbitrage-framework | see card | Multi-lateral arbitrage over a currency network, solved as a linear program with a second program sizing each leg against order book levels. |
| crypto-signal | see card | Indicators `rsi`, `macd`, `mfi`, `obv`, `stoch_rsi`, `ichimoku`, `momentum`; informants `sma`, `ema`, `bollinger_bands`, `vwap`, `ohlcv`; `crossover.py` compares two indicator keys. Thresholds set hot and cold labels per pair. |
| cryptocurrency-arbitrage | see card | Cross-exchange spot spread: for every coin quoted on two or more exchanges, sort prices, form each ordered pair and rank by price ratio. |
| czsc | see card | `czsc-signals/src` holds signal families (`cxt.rs` structure signals, `tas.rs` indicator signals, `bar.rs`, `vol.rs`, `pos.rs`). `strategy.rs` defines `CzscStrategyBase` which combines signals into positions with open and exit rules. |
| day-trader-skill | see card | Daily setups (20-day high breakout, bull flag, reclaimed 20-day average, oversold bounce) and 15-minute opening-range breakout with a 2R target. |
| defi | see card | `farmSimulate` replays a liquidity pool position at a given APR over historical prices and reports value against holding. |
| ea31337 | see card | Lite defaults: Meta Scalper (M15), Meta Trend (M30), Meta RSI (H1, H6, H8), Meta Volatility (H2), Momentum (H3), Meta Conditions (H4), SAR (H12). Strategy sources sit in the unfetched submodule. |
| eiten | see card | `eigen_portfolio_strategy.py` weights from principal eigenvectors of the covariance matrix, `minimum_variance_strategy.py`, `maximum_sharpe_ratio_strategy.py`, `genetic_algo_strategy.py` which mutates weight vectors for 50 iterations toward the best Sharpe ratio. |
| eth-arbitrage | see card | Two-venue arbitrage between 0x and OneSplit with flash-loaned capital. |
| example-hftish | see card | `tick_taker.py`: order book imbalance. Buy at the ask when bid size exceeds 1.8 times ask size after a trade of 100 or more shares prints at the ask; sell at the bid on the mirror condition. Trades within 50 ms of a level change are skipped. |
| fast-trade | see card | YAML examples only: `example_backtest.yml` (RSI plus ZLEMA crossover on BTCUSD, 4H), `regime_example.yml`, `hmm_screen_example.yml`. Strategies are datapoint lists plus enter and exit rules. |
| finlab-ai | see card | `factor-examples.md` lists technical indicators (ADX, RSI, MACD, momentum, rate of change) and fundamental factor recipes as code snippets. No strategy files. |
| finvizfinance | see card | Screener filters and signal presets from Finviz. |
| freqtrade-strategies | see card | `Strategy001` to `Strategy005`, `Supertrend`, `Bandtastic`, `MultiMa`, `PatternRecognition`, `SwingHighToSky`, `TrendRiderStrategy`, `UniversalMACD`, `VolatilitySystem`, plus about 30 more. |
| friestrader | see card | LLM thesis screening over a watchlist plus a scan; sizing, stop, take-profit and trim scripts apply the rules. |
| gekko | see card | `RSI.js`, `MACD.js`, `PPO.js`, `DEMA.js`, `TMA.js`, `CCI.js`, `StochRSI.js`, `TSI.js`, plus TA-Lib and Tulip wrappers. |
| go-trader | see card | `cmd/algo/main.go`: state machine that buys at the best ask, then exits at a profit target or a loss limit. `cmd/marketmaker` quotes symbols from `configs/instruments.txt`. |
| godzilla-community | see card | `strategies/triangular_arbitrage`, `binance_delisting_monitor`, `trap_screener` (Binance perp universe, funding, open interest and market cap scan), `demo_future.py`, `demo_spot.py`, benchmark strategies. |
| golang-crypto-trading-bot | see card | `examples/interval.go`: `Watch5Sec` market print, Telegram and Discord notification examples. `examples/websocket.go`: websocket demo. |
| hftengine | see card | Grid market making with inventory skew and a queue-position strategy, both taken from hftbacktest examples. |
| hyper-alpha-arena | see card | Program Trader runs user or AI written Python strategies under `program_trader/`; `factors/` has momentum and support factors; `backtest/` includes a virtual account and execution simulator. |
| indicatorts | see card | `examples/`: buy and hold, plus about 30 indicator strategies by family: momentum (RSI2, Awesome Oscillator, Ichimoku, Stochastic, Williams %R), trend (MACD, Aroon, KDJ, Parabolic SAR, Vortex, VWMA), volatility (Bollinger Bands, Acceleration Bands), volume (Chaikin Money Flow, Ease of Movement). |
| itch | see card | `Algo_fixedSpread.py` quotes at a fixed spread in ticks; `Algo_lowRegret.py` adapts quotes with a regret-minimizing rule. |
| kalshi-trading-bot-cli | see card | Edge strategy: model probability minus market probability. `backtest/variants.ts` ranks variants (NO only, YES only, edge bands, entry price bands, high confidence). |
| kelp | see card | `buysell`, `sell`, `mirror`, `balanced`, `pendulum`, `delete`, `sell_twap`, `buy_twap` (see `plugins/factory.go`). |
| krypto-trading-bot | see card | Quoting modes Top, Mid, Join, InverseJoin, InverseTop, HamelinRat and Depth in `trading-bot.data.h`; fair value on order book or size-weighted midpoints. |
| learn_backtrader | see card | Many `TestStrategy` classes per lesson: SMA cross, TA-Lib indicator strategy (`TALibStrategy`), exponential average with stochastic filter, custom observers for buy and sell markers and trades (`Lesson7.py`). |
| live-sports-arbitrage-bet-finder | see card | Two-way live arbitrage across a pair of sportsbooks, with `payoff_matrix.py` for the outcome table. |
| maverick-mcp | see card | `backtesting/strategies/templates.py` catalog: SMA cross, RSI, MACD, Bollinger, momentum, EMA cross, mean reversion, breakout, volume momentum, plus online learning, regime-aware and ensemble. `screening/screens.py` scores bullish, bearish and supply-demand setups. |
| ninjabot | see card | `examples/strategies`: `emacross.go`, `turtle.go`, `trailingstop.go`, `ocosell.go`. Parameters are declarative structs; specs load from YAML (`examples/specs/emacross.yaml`). |
| nof0 | see card | LLM models decide actions from market prompts. |
| nothing-ever-happens | see card | `nothing_happens`: spreads small buys of "No" across non-sports markets, a favorite-longshot bet that the stated event does not occur. |
| open-trading-api | see card | `strategy_builder/strategy` templates and a visual builder that exports to the backtester. |
| optopsy | see card | About 40 option structures: long and short calls and puts, straddles, strangles, vertical spreads, butterflies, condors, iron condor and butterfly, calendars, diagonals, covered call, collar, cash-secured put, back and front spreads. |
| oracle3-prediction-market-agent | see card | Arbitrage: event-sum, exclusivity, implication, cross-market. Statistical: cointegration spread, lead-lag, premium decay, order book imbalance, market making, momentum with mean reversion. |
| oskhquant | see card | Strategy templates in docs and indicator library (MyTT, Chan lines). |
| pairs-trading-with-python | see card | Cointegration pairs trade on the ADBE to MSFT price ratio using a z-score of the 5-day mean against the 60-day mean and standard deviation. Long ratio below -1, short above 1. |
| panwatch | see card | `strategy_engine.py` scores factors; `entry_candidates.py` ranks entry candidates; `factor_calibration.py`, `factor_eval.py` and `factor_weights.py` tune weights; `strategy/backtest` has engine, cost model and metrics. |
| peregrine | see card | Triangular and longer cycle arbitrage on one exchange via negative cycles with log-weighted edges and fees; cross-exchange spread between two venues. |
| polybot | see card | `GabagoolDirectionalEngine`: quotes both outcomes of short-horizon up/down markets, with complete-set top-up logic that buys the lagging side when the hedged edge clears a threshold. `QuoteCalculator` prices quotes. |
| polymarket-paper-trader | see card | `examples/`: `momentum.py`, `mean_reversion.py`, `limit_grid.py`, `jev_edge.py`. |
| polyterm | see card | `arbitrage.py` scans Polymarket and Kalshi for mispriced pairs and negative-risk sets; whale and print scanners; volume spike detection. |
| portfolio-optimization | see card | Rebalancing strategies in `rebalance_portfolio.re_optimize`: periodic, percent-change, drift-from-optimal and drawdown triggers, compared with equal-weight and buy-and-hold benchmarks. |
| prediction-market | see card | `src/lib/arbitrage-quote.ts`: pairs YES on one venue with NO on the other across book levels and reports edge, cost and payout. `src/lib/market-making-pricing.ts`: market-making price rules for admin markets. |
| prediction-markets-trading-bot-toolkits | see card | Copy trading, BTC up/down arbitrage, cross-venue arbitrage, directional arbitrage, spread farming, sports execution, resolution sniper, order book imbalance, market making, whale signal. |
| pumpfun-bonkfun-bot | see card | Sniper bots by detection source (`bot-sniper-1-geyser`, `-2-logs`, `-3-blocks`, `-5-shreds`, `-6-stonkfun`). Exit modes: time_based, tp_sl and manual. |
| pylivetrader | see card | Examples only: MACD, portfolio management and a pipeline example in `examples/`. |
| pysystemtrade-examples | see card | `breakout/breakout.py`, `regressionrule/tradingrule.py`, and forecast studies in `forecasting/` and `mythbusting/ewmacperformance.py`. |
| pytrendfollow | see card | `trading/rules.py`: EWMAC at four speeds, carry (spot, next, prev), breakout, mean reversion, buy and hold, sell and hold, weather rule, open-close. |
| qtpylib | see card | `examples/strategy.py`: every tenth tick on ES futures, random side bracket order with 0.5 tick target and stop, exit after five ticks. Demonstration only. |
| qtrader | see card | `examples/demo_strategy/demo_strategy.py` only, built on `finta` indicators. |
| quant | see card | `swensen.py`: six-ETF Swensen allocation (TIP, TLT, VNQ, EEM, EFA, VTI at 15/15/15/10/15/30). `vti_agg_*.py`: VTI and AGG stock-bond mixes at 50/50, 60/40 and 70/30. `spy_100.py`: all-SPY benchmark. |
| quantdom | see card | `examples/simple_strategies.py` has `ThreeBarStrategy`: opens a position after a run of consecutive higher or lower bars and flips on the opposite signal. |
| quantgpt | see card | Factor expressions evolve in `example_factor/` and the library. No order-level strategies. |
| quantjourney-bt | see card | Sample strategies in `strategies/` run through `strategy_runner.py`; targets are weights or explicit orders. |
| quantmuse | see card | `builtin_strategies.py`: Momentum, Value, QualityGrowth, MultiFactor and MeanReversion, each selecting names from factor screens; `strategy_optimizer.py` tunes parameters. |
| quantresearch | see card | `turtle.py`, `r_breaker.py`, `dual_thrust.py`, `dynamic_breakout_ii.py`, `bollinger_bands.py`, `ma_cross.py`, `ma_double_cross.py`, `mebane_faber_taa.py`, `comdty_roll.py`, `comdty_spread_roll.py`, `portfolio_optimization.py`. |
| quantsbin | see card | `StdStrategies` prices 17 named option structures: bull and bear call and put spreads, box spread, butterflies, calendars, straddles, strangles, strip and strap. |
| quantstrat | see card | Demos: MACD, Bollinger bands, Faber rotation, and a Luxor SMA series with parameter sets, MAE and MFE stops, and walk-forward. |
| quanttrader | see card | In `examples/strategy/`: dual thrust, dual time frame, moving average cross, double moving average cross, active buy sell strength, order per interval, and buy and hold. |
| risk-aware-trading-agents | see card | `examples/strategies/`: `vix_fear_dip.py` (buy broad ETFs when fear is high), `news_earnings_drift.py`, `reference_strategies.py`. |
| risk_engine | see card | Eight demo flows: simple, ruleset, tree, matrix, scorecard, abtest, conditional and multifeature. |
| riskparity-py | see card | Vanilla risk parity and a modern formulation solved by successive convex approximation. |
| rockyzsu-stock | see card | `backtest/ma_line_backtest.py` uses backtrader on a moving-average line; `new_stock_break.py` tracks new-listing limit breaks; Jisilu bond scripts rank convertible bonds. |
| seaprotocol | see card | `grid.move` computes price and quantity levels for a grid order: buy orders flip to sell when filled and the reverse. |
| smartinvest | see card | `RotationStrategy.py`: hold CSI 300 or CSI 500 by 20-day momentum, with a cash variant. `TrendStrategy.py`: dual moving average and Bollinger band timing. `TimingByPERank.py`: flat above 0.8 PE percentile over five years, long again below 0.5. `CalendarStrategy.py`: hold index on trading days 1 to 5 of each month. `SmartMortgage.py`: mortgage against investment return calculato |
| socktrader | see card | `apps/demo/src/strategies/movingAverageStrategy.ts`: 12 and 24 period SMA crossover on BTCUSDT hourly candles, one position at a time. `localMovingAverageStrategy.ts` backtests it on a Coinbase BTCUSD file. `testStrategy.ts`. |
| solana-jupiter-bot | see card | `pingpongStrategy` and `arbitrageStrategy` in `src/bot/index.js`. |
| solana-mev-agent-py | see card | Peer-to-peer intent matching with `both_fillable`; routing against Jupiter quotes. |
| spectre | see card | `examples/dual_ema_on_apple.py` and `examples/smart_beta.py` (weight by dollar volume, rebalanced before close). |
| stock | see card | Ten screens in `core/strategy/`: turtle breakout, MA250 pullback, platform breakout, high tight flag, parking apron, climax limit-down, low ATR, keep increasing, low-backtrace increase, plus `enter.py` volume rise. `rate_stats.py` measures forward returns of each screen. |
| stock-analysis-engine | see card | Indicator-driven algorithms configured from `cfg/default_algo.json`: buy and sell rules over 25 indicator modules (ADX, ATR, Bollinger Bands, EMA, MACD, MFI, RSI, stochastics, Williams %R and others). |
| stock-pattern | see card | `src/utils.py` detectors: bullish and bearish flags, VCP, double top and bottom, triangles, head and shoulders and its reverse, uptrend and downtrend lines, bullish and bearish ABCD. `backtest.py` runs scans through history. |
| stockrl | see card | Learned policies from A2C, DDPG, PPO, SAC and TD3 with listed hyperparameters, compared with the index on the held-out period. |
| tai | see card | `examples/`: `ping_pong` (passive entry inside the quote, flip on fill), `log_spread`, `log_trade`. |
| the0 | see card | Example bots: SMA crossover in Rust, C++, C#, Scala and Haskell on Yahoo Finance prices; `typescript-price-alerts`; `python-portfolio-tracker`; `python-macro-event-guard`. |
| tickflow-stock-panel | see card | `strategy/builtin/`: Bollinger breakout, MACD golden cross, MA golden cross, trend breakout, oversold bounce, pullback to MA20, N-day low reversal, limit-up momentum, consecutive limit ups, volume-price surge, low volatility leader and others. |
| tickgrinder | see card | Author keeps strategies private. The optimizer is a runner that toggles conditions on tick processors. |
| trade-frame | see card | Basket trading with option overlays, hedged Bollinger, pivot crossing, weeklies and OverUnder scanners, and gold option trading. |
| trader | see card | `brother2.py`: channel breakout trend following with long and short smoothed averages and ATR stop. `kronos.py` forecasts main-contract bars with the Kronos model. |
| trading-backtest | see card | `CointegrationTradingStrategy`: Kalman filter estimates the hedge ratio and intercept between two prices; trade both legs when the error exceeds the 15-bar standard deviation, close on sign change. `BuyAndHold`. `MultipleTradingStrategy` runs several pairs by weight. |
| trading-server | see card | `model.py` holds an abstract `Model` and one test-only EMA cross model. |
| tradingview-api | see card | `src/backtest/` runs signal functions over history with fees, no look-ahead and a random-entry baseline. `signals.ts` holds a reference RSI divergence signal with an EMA trend filter; `exits.ts` and `simulate.ts` apply stops and targets. |
| tribeca | see card | Quoting modes Top, Mid, Join, InverseJoin, InverseTop, PingPong and Depth. Fair value is best bid and offer or size-weighted BBO. |
| trump-code | see card | Surviving keyword and timing rules found by brute force, `dual_platform_signal.py` (Truth Social to X delay), `signal_market_mapper.py` (signal type to prediction market), `rule_evolver.py` (crossover and mutation of rules). |
| uniswap-sushiswap-arbitrage-bot | see card | Two-pool arbitrage: `computeProfitMaximizingTrade` in `Utils.sol` picks direction and size from both pools' reserves. |
| visualhft | see card | Market studies: VPIN order flow toxicity, LOB imbalance, market resilience with a bias variant, and order-to-trade ratio. |
| wagerbrain | see card | `strats/arb.py` (`arb_percentage`, `arb_profit`, `basic_arbitrage`) and `strats/value.py` (spread helpers for home dog and favorite). |
| whirlpools | see card | `examples/rust-sdk/whirlpool_repositioning_bot`: keeps an LP position centered on the current price using `open_position_instructions` and `close_position_instructions`. |
| wolfbot | see card | 133 files: RSI, MACD, DEMA, Ichimoku, BollingerBands, Wyckoff, PingPong, Scalper, OrderBookPressure, WhaleWatcher, CurrencyPairArbitrage, CopyTrader, SwapInterestCollector. |
| zeus-options-terminal | see card | `ema_pop_backtest` backtest config; `pre_trade_checkup` layers; `stock_picker` selection. || opentrader | packages/bot-templates/src/templates/grid-bot.ts | Fixed-range grid of buy and sell orders re-placed on each fill |
| opentrader | packages/bot-templates/src/templates/dca.ts | DCA ladder of safety orders with take-profit on the averaged entry |
| opentrader | packages/bot-templates/src/templates/rsi.ts | Buy when RSI falls below a low threshold, sell above a high one |
| alphapy | alphapy/system.py | Rule systems over feature columns with long and short signals scored by the portfolio module |
| alpha-rptr | src/strategies/SMA.py | Fast and slow SMA crossover with hyperopt-tuned lengths |
| alpha-rptr | src/strategies/SAR.py | Parabolic SAR flips set long or short |
| alpha-rptr | src/strategies/Doten.py | Donchian channel breakout entries |
| alpha-rptr | src/strategies/SupertrendStrat.py | Trade the SuperTrend direction |
| alpha-rptr | src/strategies/MACDLongOnly.py | Long on MACD cross up, flat on cross down |
| alpha-rptr | src/strategies/TV.py | Execute signals received from TradingView alert emails |
| alpaca-backtrader-api | sample/strategy_sma_crossover.py | SMA crossover on Alpaca data |
| bbgo | pkg/strategy/grid2 | Grid of limit orders across a price range with profit per grid |
| bbgo | pkg/strategy/bollmaker | Market making with Bollinger-width spreads and trend skew |
| bbgo | pkg/strategy/xmaker | Quote on one venue, hedge fills on a second |
| bbgo | pkg/strategy/xfunding | Hedge spot with perpetual short to earn funding |
| bbgo | pkg/strategy/tri | Triangular arbitrage across three pairs |
| bbgo | pkg/strategy/supertrend | SuperTrend direction trades with DEMA filter |
| bbgo | pkg/strategy/emacross | Fast and slow EMA crossover |
| bbgo | pkg/strategy/rebalance | Rebalance holdings to target weights on a schedule |
| bbgo | pkg/strategy/dca2 | Recursive DCA with take-profit rounds |
| finquant | finquant/moving_average.py | Moving-average crossover buy and sell bands |
| fooltrader | fooltrader/botsamples | Moving-average sample bots on daily bars |
| metatrader5-experts | Experts/BBRSI.mq5 | Bollinger Band touch confirmed by RSI extremes |
| metatrader5-experts | Experts/3MACD.mq5 | Three MACD timeframes must agree |
| metatrader5-experts | Experts/2MACDSTO.mq5 | MACD signal plus stochastic confirmation |
| metatrader5-experts | Experts/3MAF.mq5 | Three moving averages aligned plus filter |
| metatrader5-experts | Experts/CEZLSMA.mq5 | Chandelier Exit with ZLSMA trend filter |
| algotrading-ivopetiz | cryptoalgotrading/entry.py | Entry rules from moving averages, RSI and volume change |
| algotrading-ivopetiz | cryptoalgotrading/exit.py | Exit on target, stop loss or trailing stop |
| volatility-trading | volatility/models | Range-based volatility estimators compared across windows to build volatility cones |
| ffn | ffn/core.py | Inverse-volatility, mean-variance and equal-risk-contribution weights |
| skfolio | src/skfolio/optimization | Mean-risk, hierarchical risk parity, nested clusters and Black-Litterman allocation estimators |
| pycryptobot | models/Strategy.py | Buy on EMA12 above EMA26 with MACD and candlestick confirmation, sell on reverse or stop |
| gekko-strategies | BBRSI | Bollinger Band touch with RSI filter |
| gekko-strategies | DEMACrossover | Fast and slow DEMA crossover |
| gekko-strategies | MK_RSI_BULL_BEAR | RSI thresholds switch between bull and bear regimes |
| gekko-strategies | CUSTOM_RSI | RSI oversold buy, overbought sell |
| gekko-strategies | Neapticator | Neuroevolution price predictor trades the forecast |
| binance-news-sentiment-bot | news-analysis.py | Buy coin when average headline sentiment and headline count clear thresholds, exit on take-profit or stop-loss |
| amm-arbitrageur | contracts/FlashBot.sol | Flash-borrow from the cheaper pair, sell into the dearer pair, revert unless net profit is positive |
| uniswap-arbitrage-analysis | src/dfs.py | Depth-first search for token cycles whose product of rates exceeds one after fees |
| machinelearningstocks | stock_prediction.py | Classifier predicts whether a stock beats the index by a margin from fundamentals |
| wallstreet | wallstreet/blackandscholes.py | Black-Scholes price, delta, gamma, vega and implied volatility |
| xalpha | xalpha/policy.py | Periodic buy, scale-in on drawdown and value averaging policies |
