<!-- voice-ignore-file: transcript-derived digest -->
# 11. Time Series Analysis II | MIT OpenCourseWare | _IFUfFuyQlU | 1.40 h

Teaches: Finishes GARCH modeling (stationarity, long-run variance, heavy tails with a t distribution, euro/dollar case study) and then multivariate time series: vector autoregressions, companion form, estimation by componentwise least squares and maximum likelihood, and macroeconomic impulse responses.

Claims:
- GARCH(1,1) implies an ARMA(1,1) process for squared residuals; it is covariance stationary when alpha_1 + beta_1 < 1, and the long-run variance is alpha_0 / (1 - alpha_1 - beta_1). "squared is equal alpha 0 over 1" [0:08:00]
- ARCH models have a hard floor on volatility set by the intercept; GARCH(1,1) predicts a far wider range of volatility with fewer parameters. "cases of arch models arch orders 1" [0:02:19]
- Constrained likelihood fitting works better after transforming parameters to an unbounded scale (log for positive, log of x/(1-x) for values between 0 and 1). "to transform the parameters to a scale" [0:11:18]
- Euro/dollar residuals have fat tails under a Gaussian fit; the maximum likelihood t distribution has 10 degrees of freedom and fixes the q-q plot. A six standard deviation move then occurs about 1 in 10,000 times. "gaussian distribution that's t with 10 degrees" [0:16:40]
- A t with 30 degrees of freedom is nearly a normal; value-at-risk differences between t and Gaussian are small at 2.5% and 5% and appear only in the extreme tails. Volatility estimates under both are similar. "value at risk of like 2 5%" [0:19:05]
- GARCH captures volatility clustering and mean reversion of volatility to a long-run mean; alpha_1 + beta_1 is the persistence. RiskMetrics sets alpha_0 = 0 with alpha_1 + beta_1 = 1 (for example beta of about 0.95), tracking possibly non-stationary volatility. "0 95 so or rather the alpha" [0:28:08]
- A VAR(p) with m series is rewritten as a first-order process in a stacked vector of size m p; it is stationary when all eigenvalues of the companion matrix are below 1 in modulus, which means roots of a degree m p polynomial lie outside the unit circle. "sort of a first order time series" [0:52:52]
- Componentwise ordinary least squares on each series, regressing on lags of all series, equals generalized least squares and maximum likelihood estimation for an unconstrained VAR with any innovation covariance; the proof uses Kronecker products and the vec operator. "in fact the generalized least squared estimates" [1:08:23]


Worked:
- A t distribution with 10 degrees of freedom handles the euro return tails that a Gaussian misses. "degrees of freedom parameter which is 10" [0:16:31]
- Impulse responses from the Wold form: a unit rise in unemployment lowers the Fed funds rate, which the lecturer says matches historical Fed policy. "historically was the policy of the fed" [1:23:01]
- Concentrated likelihood: the beta estimate does not depend on sigma, so sigma can be estimated afterward. "a notion called the concentrated log likelihood" [1:15:31]

Failed:
- Gaussian GARCH fits leave extreme residuals underexplained. "compare sort of estimates of volatility under" [0:17:06]
- Parameter constraints (all positive, sum below 1) complicate maximum likelihood estimation. "complicate things actually so with maximum likelihood" [0:08:54]
- GARCH forecasts only say volatility reverts to its long-run average at rate alpha_1 + beta_1. "reverting back to that long run average" [0:27:47]
- The lecturer leaves the asymptotic distribution of the least squares estimates to the notes and only mentions the Bayesian VAR work of Litterman and Sims. "an asymptotic distribution of least squares estimates" [1:17:47]
