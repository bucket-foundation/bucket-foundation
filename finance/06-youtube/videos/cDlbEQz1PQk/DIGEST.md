<!-- voice-ignore-file: transcript-derived digest -->
# 9. Volatility Modeling | MIT OpenCourseWare | cDlbEQz1PQk | 1.35 h

Teaches: Model selection and unit-root testing for ARMA models, then volatility: historical estimators, geometric Brownian motion, the Garman-Klass range estimators, Poisson jump diffusions, and ARCH and GARCH models fitted to the euro/dollar rate.

Claims:
- AIC adds a penalty of 2 per parameter, BIC adds log n, and Hannan-Quinn adds 2 log log n; AIC amounts to keeping a variable when its squared t statistic exceeds 2, a weaker bar than the usual t of about 2. "t statistic for estimating the additional parameter" [0:06:21]
- Dickey-Fuller tests phi = 1 in an AR(1); AIC picks an AR(7). "to monthly data and actually 1 7" [0:15:51]
- Volatility is the annualized standard deviation of price changes. "the annualized standard deviation of the change" [0:22:36]
- RiskMetrics-style estimators: simple moving average, exponential moving average (1 - beta times current plus beta times previous estimate). The lecturer says the exponential average works well for many instruments, with an effective window of roughly 45 to 90 days. "i guess a 45 and a 90" [0:30:38]
- Under geometric Brownian motion, log returns over an interval are independent normal with mean mu times the length and variance sigma^2 times the length; the maximum likelihood estimates for equal intervals are the sample mean and variance with 1/n. "mean given by mu times the length" [0:34:21]
- Time scale matters: euro volatility is 10.25% on trading-day time and 12.2% on clock time; normal q-q plots show fat tails (leptokurtic returns) and clock time fits the extremes slightly better. "normal model with the trading day time" [0:42:15]
- Garman-Klass: close-to-close squared return has variance 2 sigma^4; averaging open-to-close and close-to-open pieces gives efficiency 2; Parkinson's (high minus low)^2 / (4 log 2) gives 5.2; a scale-invariant combination gives 7.4 and the best found gives 8.4. "to get an efficiency of 7 4" [0:57:52]
- ARCH(p) makes variance a weighted sum of past squared residuals (alphas nonnegative, summing below 1). "is this weighted average of the past" [1:09:31]


Worked:
- Range-based estimators give the precision of several days of close-to-close data from one day of open, high, low and close. "the open high close for one day" [0:54:58]
- GARCH(1,1) fits time-varying volatility with few parameters, which the lecturer links to the infinite-order point of the Wold theorem. "like so basically the time varying volatility" [1:20:01]
- Jump diffusion maximum likelihood runs through the EM algorithm treating jump counts as missing data. "in your data then the maximum likelihood" [1:03:53]

Failed:
- Geometric Brownian motion and jump diffusion assume stationary volatility. "lagrange multiplier test but we were assuming" [1:12:25]
- Risk-metric methods are ad hoc, chosen for empirical success. "i guess they're a bit ad hoc" [0:30:45]
- ARCH(p) needs positivity and stability constraints that complicate estimation, and its volatility has a floor set by alpha_0. "positive so if any of these alphas" [1:08:37]
- Daily trading-day time may be the wrong clock; the lecturer suggests subordinated processes and cumulative trading volume. "the volume of trading sort of cumulative" [0:41:48]
