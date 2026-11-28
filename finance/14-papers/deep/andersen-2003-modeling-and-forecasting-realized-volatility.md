## Deep Read

Source: open-access working paper version of the article published in Econometrica 71(2), 2003. The PDF's front matter uses a broken font and does not extract; the body and tables extract cleanly. Read 2026-11-27.

### Research Question

Can volatility built from high-frequency returns be treated as observed, modeled directly with standard time series tools, and used to forecast volatility and return distributions better than GARCH-type models fit to daily data?

### Data and Sample

Several million Deutschemark/dollar and yen/dollar spot quotes from Olsen & Associates, December 1, 1986 to June 30, 1999. Daily realized volatility is built from 30-minute squared returns. In-sample estimation runs to December 1, 1996; the out-of-sample period is December 2, 1996 to June 30, 1999, 596 days.

### Method

Propositions 1 and 2 show that for an arbitrage-free price process, realized variance from summed squared intraday returns converges to the quadratic variation, the integrated variance, as sampling becomes frequent. The authors fit a trivariate fractionally integrated VAR to the logs of the DM/$, yen/$ and yen/DM realized volatilities (VAR-RV), with the long-memory filter (1 minus L) to the power 0.401. They compare one-day and ten-day forecasts against RiskMetrics, daily GARCH(1,1) and a VAR on absolute daily returns, using Mincer-Zarnowitz regressions of realized volatility on each forecast. Density forecasts combine VAR-RV with a lognormal-normal mixture and are checked by probability integral transforms.

### Main Results

Table 1: daily DM/$ returns have kurtosis 5.28; standardized by realized volatility, kurtosis falls to 2.57, close to normal. The same holds for yen/$ (6.64 to 2.66).

Table 2: log realized volatility is close to Gaussian (kurtosis 3.29 for DM/$) with Ljung-Box Q(20) of 7,659.6, and a long-memory parameter d near 0.4.

Table 3A, in sample, one day ahead, DM/$: the R2 of realized on forecast volatility is 0.353 for VAR-RV against 0.262 for RiskMetrics and 0.261 for GARCH. Adding GARCH to VAR-RV raises R2 only to 0.356.

Table 3B, out of sample: DM/$ R2 is 0.249 for VAR-RV against 0.097 for RiskMetrics and 0.096 for GARCH; adding either to VAR-RV leaves R2 at 0.249. Yen/$ shows 0.329 against 0.297 for GARCH.

Table 4: out-of-sample probability integral transforms sit close to their nominal quantiles; for DM/$ the 5 percent point is 0.045 and the 95 percent point 0.941, so density forecasts are close to calibrated.

### Robustness

Ten-day-ahead forecasts (Tables 3C and 3D) keep the ranking; DM/$ in-sample R2 is 0.436 for VAR-RV against 0.374 for GARCH. Results hold for the cross rate and an equally weighted portfolio.

### Stated Limits

The theory needs frequent sampling, but microstructure noise in quotes limits how fine the sampling can go; the authors pick 30 minutes as a compromise. The sample covers two currency pairs.

### Retail Systematic Trader

Volatility targeting and position sizing improve when volatility is measured from intraday bars. A retail trader can build daily realized volatility from 5 to 30 minute bars, model its log with a long-memory or heterogeneous autoregression, and size positions by the forecast. Returns scaled by realized volatility are close to normal, which makes stop distances and VaR estimates more reliable than raw daily return tails suggest.
