<!-- voice-ignore-file: transcript-derived digest -->
# 12. Time Series Analysis III | MIT OpenCourseWare | 9G1IDAqrWkg | 1.29 h

Teaches: Interpreting a macro vector autoregression, then cointegration (with a crude oil, gasoline and heating oil crack spread example), the linear state-space representation of regressions and ARMA models, and the Kalman filter.

Claims:
- A VAR on unemployment, Fed funds and CPI levels has a characteristic root of 1.002 (the software reports inverse roots), so the series is non-stationary and the fit is redone on first differences. "of the characteristic polynomial are 1 002" [0:01:08]
- In the differenced fit, a rise in unemployment lowers the Fed funds rate the next month (coefficient -0.71); the lag-1 Fed funds term has t = 7.97, which the lecturer reads as the Fed moving gradually; the lag-2 term is negative (about -0.17 as stated), which adds an acceleration effect. "rate coefficient is a negative 0 71" [0:07:49]
- A series is integrated of order d if its d-th difference is stationary; a multivariate series is cointegrated if some vector beta makes beta prime X_t stationary, a long-run equilibrium; examples are interest-rate spreads, purchasing power parity, covered interest parity, and spot versus futures. "structure of interest rates purchase power parity" [0:17:33]
- Subtracting lags from the VAR gives delta X_t = C + Pi X_(t-1) + lagged differences; Pi is singular with rank r below m and Pi = alpha beta prime, where the columns of beta are the cointegrating vectors and are not unique. "series so we subtract x t 1" [0:28:26]
- Sims, Stock and Watson show that ordinary least squares on this form gives consistent estimates with the same asymptotics as maximum likelihood; Johansen's reduced-rank method tests the rank. "models johansen does describe maximum likelihood estimation" [0:37:48]
- Energy futures: crude is quoted per barrel, gasoline and heating oil per gallon with 42 gallons a barrel; the differences (crack spreads) look stationary. Augmented Dickey-Fuller p-values are 0.164 for crude and 0.3265 for heating oil, so unit roots stand; the Johansen result is marginal, rank at most one, with weights 1 on crude, 1.3 on gasoline and -1.7 on heating oil. "that the original series had unit roots" [0:32:53]
- State-space form: an observation error vector and a state transition innovation error vector with possibly different dimensions. "there's an observation error vector at time t" [0:47:11]
- The Kalman filter computes the density of the next state and observation recursively: predict, update with a filter gain, forecast, smooth; the product of one-step conditional densities gives the likelihood for parameter estimation. "smoothing step which is characterizing the conditional" [1:14:29]


Worked:
- Futures were chosen because refiners hedge there; the first-month contract is the most liquid. "of these contracts and so i chose" [0:44:42]
- Setting the random-walk variances to zero in the time-varying regression recovers ordinary regression; the state-space form also gives recursive updating. "would give us recursive estimates for updating" [0:56:25]
- Harvey's ARMA state representation made estimation of ARMA models much easier. "with a nice representation for the states" [1:03:44]

Failed:
- Differencing everything throws away the stationary relationships among the levels, which cointegration retains. "differences might be stationary the overall level" [0:17:50]
- With only three macro series the structural drivers are not identified; the lecturer says 10 to 12 variables are needed. "up to about 10 or 12 variables" [0:06:02]
- The Johansen test for the oil spreads is only marginal at the 10% level, and the lecturer ignores seasonality in the fit. "is almost significant at the 10% level" [0:42:19]
- Multiple lags make coefficients hard to read without rewriting them as levels and changes. "rate so when you see multiple lags" [0:09:57]
