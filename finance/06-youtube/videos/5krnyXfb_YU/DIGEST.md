<!-- voice-ignore-file -->
# Portfolio Assets Allocation with ML and Optimization for Dividend Stocks | Algo Trading Project | QuantInsti Quantitative Learning | 5krnyXfb_YU | 1.21 h

Teaches: A QuantInsti EPAT project showcase with two talks: a machine-learning multi-asset portfolio framework, and an optimized dividend-stock portfolio for Singapore equities tested over two 10-year periods.

Claims and warnings. Figures and results are self-reported by the speakers and unverified.

- The first stage of the framework, data and preparation, takes 60 to 70% of the time. "between 60 and 70% of your of your" [0:13:47]
- Store prices in a time-series database such as TimescaleDB or InfluxDB, then handle missing data, outliers, normalization and asset selection. "You need a database optimized for time series" [0:13:50]
- Asynchronous requests let a system send 1,000 data requests in parallel, and multiprocessing uses all CPU cores. "You can send uh 1,000 requests at the same time" [0:11:44]
- Feature selection should drop constant and quasi-constant features, for example any with range variability under 5%. "constant and quasi constant features" [0:16:42]
- Non-stationary features should be removed because models assume the test set shares the training distribution. "remove no non-stationary features" [0:17:17]
- In the allocation search the best look-back was 37 weeks with no skip period, and machine-learning allocators such as HRP led. "the best performance is 37 weeks" [0:22:01]
- Self-reported: Self-reported: an inverse-volatility portfolio was the best single technique, with a Sharpe ratio of about 0.55. "inverse volatility portfolio that is a traditional technique still the best technique has a sharp ratio of 0.5" [0:22:32]
- Bootstrapping does not assume a return distribution, so run both it and Monte Carlo and compare. "bootstrapping uh can overcome this limitation of Monte Carlo" [0:26:11]
- In 90% of simulations maximum drawdown stayed below about 22%, and he uses the 5% terminal wealth and 95% drawdown percentiles to stay on the safe side. "in 90% of the cases below 20%" [0:26:56]
- Warning: The longer a system trades, the more likely it meets a tail event. "the longer you trade your system, the more the most the more likely the more likely is to to incur in a black swan" [0:27:26]
- The dividend data needed scraping and cleaning: rights mixed with payouts, percent versus dollar amounts and US dollar payouts converted to Singapore dollars. "a lot of time and effort was spent in in data cleansing" [0:45:43]
- Warning: A portfolio optimized on 2002 to 2011 underperformed the ES3 benchmark ETF in 2012 to 2021 when banks and technology stocks led. "completely um turned turned the tables" [0:51:57]
- Rebalancing every 5 or 10 years restored outperformance over the static portfolio. "portfolios actually um score better on all the metrics" [0:54:53]
- Warning: The REIT history is short and the sample carries survivorship bias. "I'm sure there's some survivorship bias in in the portfolio" [1:01:27]
- Outliers hurt linear and neural models more than tree models. "outliers b will definitely hurt linear machine learning linear models" [1:05:04]
