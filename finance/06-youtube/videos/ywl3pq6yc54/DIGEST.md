<!-- voice-ignore-file: transcript-derived digest -->
# 14. Portfolio Theory | MIT OpenCourseWare | ywl3pq6yc54 | 1.42 h

Teaches: Single-period portfolio optimization: Markowitz mean-variance with a two-asset simulation, the efficient frontier, the risk-free asset and the capital market line (Tobin separation), von Neumann-Morgenstern utility, practical constraints with a sector ETF example, and alternative risk measures. Lecturer: Peter Kempthorne.

Claims:
- For weights w, portfolio mean is w^T alpha and variance is w^T Sigma w with weights summing to 1. "indexed by i 1 through m single" [0:03:22]
- Two-asset simulation: asset 1 has mean 15% and volatility 25%, asset 2 has mean 20% and volatility 30%. At zero correlation, mixing in asset 2 raises return and lowers volatility; the minimum-variance weights are inversely proportional to squared volatilities. "15% 25% volatility is 20 to 30" [0:10:18]
- More negative correlation stretches the feasible set toward lower volatility; at correlation -1 a portfolio has zero variance and should earn the risk-free rate, which is how futures hedges work. "1 correlation so you could essentially hedge" [0:18:26]
- Covariances and correlations are estimated with less variability than means. "less variability in estimating covariances and correlations" [0:22:14]
- The Markowitz problem minimizes (1/2) w^T Sigma w subject to a target mean and full investment; the Lagrangian solution is w = lambda_1 Sigma^-1 alpha + lambda_2 Sigma^-1 1, the optimal variance is a parabola in the target return, and the return-maximizing and risk-aversion forms are equivalent. "matrix times lambda 1 lambda 2 and" [0:26:52]
- With a risk-free asset, optimal risky weights are a fixed vector times a scale; every optimal portfolio is a mix of cash and the same "market portfolio" (Tobin), lying on the capital market line with slope (alpha_m - r_0)/sigma_m, the market Sharpe ratio. Borrowing at the risk-free rate extends the line beyond the market portfolio. "risk free asset and the market portfolio" [0:42:10]
- Expected utility: a second-order Taylor expansion gives expected wealth minus (1/2) lambda times variance; mean-variance is exact for quadratic utility, or for any utility if returns are Gaussian. "expected wealth minus 1 2 lambda times" [0:53:54]
- Risk measures beyond volatility: mean absolute deviation, semi-variance (Markowitz), value at risk, and conditional value at risk; the lecturer expects conditional value at risk to enter bank regulation. "absolute deviation so some alternate risk measures" [1:21:58]


Worked:
- Diversification across assets with low correlation lowers volatility without losing return; the lecturer says combining market-neutral sector models gives dramatic gains. "allocations across these different sector market neutral" [1:17:41]
- Factor-model estimates of the covariance matrix give more precise optimizer inputs than sample estimates. "covariance matrix using factor models to estimate" [1:20:46]

Failed:
- The ETF example uses in-sample history, which the lecturer says is not a realistic setting. "optimization it's not really a realistic setting" [1:15:23]
- Estimates of returns, volatilities and correlations can swing the results; period choice and estimation error matter. "choices of estimation period there's estimation error" [1:20:27]
- Derivatives with nonlinear payoffs complicate risk measurement. "returns basically expecting returns above the risk" [1:09:02]
- The theory in most of the lecture assumes the means, variances and correlations are known. "those underlying return characteristics the means variances" [0:02:33]
