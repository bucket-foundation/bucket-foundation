<!-- voice-ignore-file: transcript-derived digest -->
# 7. Value At Risk (VAR) Models | MIT OpenCourseWare | 92WaNz9mPeY | 1.35 h

Teaches: A risk manager at a large bank explains value at risk: the one-asset normal case, the variance/covariance quadratic form for portfolios, and Monte Carlo simulation using a factored covariance matrix. Includes practical warnings on data quality, units and signs.

Claims:
- Under a normal distribution, 1% of observations lie beyond 2.33 standard deviations and 5% beyond 1.645. "2 33 standard deviations for 95%" [0:21:16]
- In that example the 4.2% loss was exceeded 1.5% of the time instead of 1%, which indicates fat tails; speaker says roughly three quarters of financial series have fat tails. "4 2% 1 5% of the time" [0:27:08]
- Portfolio variance is x transpose sigma x, where x is the position vector in dollars (signed for long/short, with units like yen per dollar mattering) and sigma is the covariance matrix. "covariance structure the variance of this portfolio" [0:47:34]
- Choice of exponential smoothing weights materially changes measured volatility; the speaker prefers equal weights, about 100 observations minimum, and at least a year of data for regulators. "one year of data there are regulators" [0:53:52]
- Monte Carlo VaR: factor the covariance matrix with eigenvectors and eigenvalues, multiply by uncorrelated normals to get correlated draws, sort 10,000 outcomes and take the 100th worst for 1%. "from actually doing it about 1 000" [1:08:13]
- Covariance matrices must be positive semidefinite; unequal data lengths can produce negative eigenvalues, so missing data must be filled. "i care whether it's positive semidefinite covariance" [1:09:02]

Architecture:
- Data: daily prices from Bloomberg or Federal Reserve H.15/H.10, graphed to catch errors; fill gaps by interpolation, prior day, Brownian bridge or regression. "gives me data mom i'm graphing it" [0:30:02]
- Model: variance/covariance (parametric), Monte Carlo with Gaussian copula, historical simulation (empirical, captures fat tails). "as a quadratic form monte carlo simulation" [0:06:31]
- Fixed income: convert yield changes to price changes using PV01. "in fixed income markets isn't a price" [0:32:14]

Worked:
- Variance/covariance was used by about 80% of European banks in 1996 per the speaker. "1996 that 80% of the european banks" [0:51:19]
- Simulated correlations matched the source matrix within sampling error (for example 0.54 vs 0.52). "84 0 64 0 52 0 54" [1:17:16]

Failed:
- Normal assumption understates tail risk; eight standard deviation talk is unrealistic. "you tell me a two standard deviation" [0:25:17]
- A programmer passing a float to a fixed type corrupted a matrix check. "was passing a float to a fixed" [0:44:13]
