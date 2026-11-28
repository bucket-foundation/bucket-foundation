<!-- voice-ignore-file: transcript-derived digest -->
# The Ultimate Guide to Momentum Trading: Learn Low and High Frequency Techniques | QuantInsti Quantitative Learning | Pjtuw3y6W2A | 0.89 h

Teaches: QuantInsti webinar by Nitesh Khandelwal (caption spelling "Kandelwal") on momentum trading: definition, common indicators, how it differs in high frequency trading, its risks, and an Excel model on one-minute Netflix data.

Claims:
- Momentum trading means the "trading decision is done by observing significant movements" in one direction with relatively higher volume. Newer variants use event triggers, since "you have machine readable news" and a machine can scan thousands of stocks [0:01:01]-[0:04:04].
- He borrows physics: momentum is "the mass multiplied by the velocity", and a price that moves fast should continue until an impulse such as GDP data, a rate decision or company news stops it. He adds "there's no correct answer whether it works or not", but a methodical, scientific approach makes working more likely than not [0:04:04]-[0:08:08].
- Behaviour differs across asset classes because "different asset classes you have different participants", for example retail traders in stocks against banks as market makers in FX. Seasonality also matters: in 2008 and 2009 oil exploration stocks rose while crude went up and most of the market fell [0:09:08]-[0:12:11].
- Momentum is "today's price minus the price which was there n days back". Rate of change divides that by the older price and multiplies by 100, so a $10 stock and a $500 stock can be compared. RSI below 30 reads oversold and 70 to 80 overbought, and a momentum trader may buy the overbought stock [0:14:13]-[0:19:20].
- Momentum, ROC, RSI and the stochastic oscillator are "considered as the leading indicators", while moving average crossovers and MACD are lagging because they use more past data. MACD takes the difference of two moving averages and smooths it with a 9-day exponential average as the signal line [0:20:22]-[0:23:29].
- In HFT tick data "would be running in GBs" for one day, and a day of Indian derivatives tick data can reach 25 to 30 GB, so R or MATLAB is needed. Tick data shows the order book far below the top five levels, which lets a model estimate buying and selling pressure [0:24:29]-[0:29:36].
- Transaction cost decides viability: "there's no point of having a model which is which has a 90% hit ratio" that turns to a 0% hit ratio after costs. HFT firms prefer exchange membership and a direct connection to cut costs [0:31:40]-[0:33:41].
- HFT exits must not lag, so they come from a few ticks of data or fixed stop-loss and take-profit levels. A contrarian exits when momentum is too high, like a marathon runner who sprints early and tires, and HFT firms are "always quoting rather than hitting in the market" to avoid paying the spread [0:33:41]-[0:38:45].
- Automated news strategies fail on language and hoaxes. Speaker's examples: "machines do not have common sense", algos sold after the Osama bin Laden news while the market rose, and a false "white house bombed" post [0:40:46]-[0:43:51].

Framework: The Excel model on Netflix one-minute closes takes an entry when "signal would be based on the price and volume filters", meaning short volume and price averages above long ones plus two consecutive higher closes, and exits on the acceleration of the rate of change [0:44:53]-[0:52:01].

Worked:
- In the Excel model the buy signal fired at 108.5 above 107.875 above 107.35 with both filters true; entry price was the same candle close, and the example trade entered at 107.498 [0:48:57]-[0:52:01].
- The model uses volume averages over three and eight candles and price averages over three and eight, log-based exit ROC over five candles, and exits after the accelerated ROC moves the wrong way twice in a row [0:46:56]-[0:51:01].

Failed:
- Notional momentum misleads across stocks: a $10 stock and a $500 stock show different raw values, so percentage or log terms are needed [0:15:15]-[0:17:18].
- He says the interpretation of overbought and oversold, and of the stochastic oscillator, is "never universal" and depends on the stock and back test results [0:18:18]-[0:21:24].
- A tick-by-tick version cannot be built in Excel; only low or medium frequency models fit there [0:51:01]-[0:53:03].
