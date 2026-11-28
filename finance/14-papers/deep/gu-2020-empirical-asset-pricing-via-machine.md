## Deep Read

Source: open-access NBER Working Paper 25398, December 2018, revised September 2019, the version published in the Review of Financial Studies 2020. Read 2026-11-27.

### Research Question

Which machine learning methods best measure stock risk premia, how large are the economic gains over linear models, and which predictors drive the forecasts?

### Data and Sample

CRSP monthly returns for nearly 30,000 US stocks, 1957 to 2016. 94 firm characteristics, 74 industry dummies and 8 macro predictors from Welch and Goyal, with characteristic times macro interactions, for about 920 signals. The first 18 years train, the next 12 validate hyperparameters, and the 30 years from 1987 to 2016 form the out-of-sample test. The model is refit each year with an expanding training window.

### Method

Thirteen models forecast next-month excess returns: OLS on all predictors with Huber loss, OLS on size, book to market and momentum (OLS-3), partial least squares, principal components regression, elastic net, a generalized linear model with group lasso, random forest, gradient boosted trees, and feedforward networks with one to five hidden layers (NN1 to NN5). Accuracy is the out-of-sample R2 measured against a zero forecast. Diebold-Mariano tests compare models (Table 3). Portfolios sort stocks into deciles on each model's forecast and hold a high-minus-low spread.

### Main Results

Table 1: monthly out-of-sample R2 across all stocks is minus 3.46 percent for full OLS, 0.16 for OLS-3, 0.11 for elastic net, 0.33 for random forest, 0.34 for boosted trees and 0.40 for NN3, the best. Among the 1,000 largest stocks NN3 reaches 0.70 percent.

Table 7: value-weighted decile spreads earn monthly Sharpe ratios that rise from 0.61 for OLS-3 to 0.98 for random forest and 1.17 for NN1. NN4 earns 2.3 percent a month with 5.8 percent monthly volatility, an annualized Sharpe ratio of 1.35. Equal weighting gives NN4 a Sharpe ratio of 2.45, and 1.69 after dropping stocks below the 20th NYSE size percentile.

Table 8: maximum drawdown for value-weighted NN4 is 51.8 percent against 69.6 percent for OLS-3. Value-weighted NN4 earns a Fama-French five factor plus momentum alpha of 1.76 percent a month, t = 6.00. Network turnover runs 110 to 130 percent a month.

Variable importance: every method ranks price trend signals first (short-term reversal, momentum, industry momentum), then liquidity, volatility and valuation ratios. Shallow networks beat deeper ones.

### Robustness

Annual horizon forecasts (Table 2), Diebold-Mariano tests with a conservative multiple-comparison adjustment (Table 3), larger OLS benchmarks with 7 and 15 predictors (Table A.11), and portfolio-level forecasts with market-timing Sharpe gains (Tables 5 and 6).

### Stated Limits

The authors attribute the poor showing of deep networks to small data and low signal-to-noise in returns. Gains come from nonlinear interactions; the methods do not identify economic mechanisms. Portfolio results are before transaction costs.

### Retail Systematic Trader

The headline Sharpe ratios are gross of costs and come from monthly turnover above 100 percent across thousands of names, with the strongest signals being short-term reversal and micro-cap effects, the costliest to trade. A retail trader should expect most of the equal-weighted edge to vanish after spreads and borrow fees. The usable lessons are the train, validate and test protocol, the finding that tree ensembles and one or two layer networks beat deep ones, and the result that predictability is strongest and cheapest to trade in the 1,000 largest stocks.
