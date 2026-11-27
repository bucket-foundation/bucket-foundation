<!-- voice-ignore-file -->
# Unlisted Inside Algorithmic Trading: Navigating Data, Technology, and Strategy with Expert Guidance | QuantInsti Quantitative Learning | LfO5Z-hWS5E | 1.16 h

Teaches: A conference panel on algorithmic trading with a systematic fund manager, a market-data vendor executive and Indian algo practitioners: data edge, democratized tooling, backtest overfitting, execution pitfalls and retail mindset.

Claims and warnings. Figures and results are self-reported by the speakers and unverified.

- Alternative data is now commoditized, so the data hunters of 10 to 15 years ago are no longer a distinct edge. "has become a little bit more commoditized" [0:11:43]
- Early firms raced to onboard 100 datasets a year, then 500, then 1,000, and an edge comes from combining datasets under a risk management layer. "next year i'm going to unboard 500 data sets" [0:13:49]
- Cloud has democratized testing: a server once cost a few thousand dollars, which shut out 80 to 90% of individual traders. "probably 80 90% of the audience" [0:19:10]
- The firm on the panel has done natural language processing for finance for more than 20 years. "natural language processing for the last 20 plus years" [0:24:34]
- Check first that the forecast is right, such as whether you actually forecast revisions, before working out how to monetize it. "am i forecasting correctly the things i'm trying to forecast" [0:30:44]
- Overfit example: a strategy that says avoid 2008 and avoid 2022 looks great in a backtest and is garbage. "avoid 08 avoid 20 22" [0:31:28]
- Robustness check: the number of trades or signals should be large, and a simulation shows the distribution of outcomes. "that number should be large" [0:31:53]
- Metrics that depend on a handful of outliers are fragile, so use more robust metrics. "sensitive to a handful of outliers" [0:32:49]
- Common mistake: running many parameters that fit the past without asking how to estimate parameters for the future. "run a bunch of parameters that hopefully overfit the past" [0:32:59]
- Warning: strategies that trade close to close ignore that a market-on-close order joins the auction that sets the close. "you are now part of the auction that determines the close" [0:35:37]
- If 100 people trade the same signal, you are collectively a price maker even if individually a price taker. "collectively you're now a price maker" [0:36:06]
- Backtests usually run on candle closes while execution happens elsewhere, producing slippage and liquidity costs. "your execution does not happen typically on that close price" [0:46:39]
- Liquidity constraints and latency from signal to order management system hurt higher-frequency strategies. "liquidity constraints is a big one" [0:34:48]
- A panelist says traders who made nine and ten figures say risk management is what made the money. "ultimately risk management is what made us money" [0:48:17]
- No holy grail method exists, and any that does would be kept private. "there are no such methods and if there are they will be kept private" [1:04:44]
