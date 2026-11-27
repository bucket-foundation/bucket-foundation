<!-- voice-ignore-file: transcript-derived digest -->
# 8. Time Series Analysis I | MIT OpenCourseWare | uBeM1FUk4Ps | 1.27 h

Teaches: The end of regression (maximum likelihood, M estimators, a CAPM case study on GE and Exxon) and the start of univariate time series: stationarity, the Wold representation, lag operators, AR and MA models with the Yule-Walker equations, differencing and ARIMA, and information criteria.

Claims:
- For a normal linear model, least squares equals maximum likelihood; the maximum likelihood error variance is Q(beta hat)/n, which is biased, and the unbiased version divides by n minus the rank of X. "error variance is q of beta hat" [0:06:05]
- CAPM case study: excess return of GE on excess return of the S&P 500 fits well; adding crude oil returns gives a coefficient of -0.03 with t = -3.561 for GE, and +0.13 with t = 16 for Exxon Mobil. "on crude oil it's negative 0 03" [0:22:25]
- Covariance stationarity means constant mean, constant variance and covariance that depends only on the lag. "deviations so those translated variables have mean" [0:31:17]
- Wold representation: any zero-mean covariance stationary series is a deterministic part V_t plus a weighted sum of white noise with psi_0 = 1 and square-summable psi_i. The impulse response is psi_j and the long-run cumulative response is the sum of the psi_i. "psi 0 is 1 and the sum" [0:33:09]
- An AR process is covariance stationary if and only if all roots of its characteristic equation lie outside the unit circle; for AR(1), the condition is |phi| < 1 and the variance is sigma^2 over (1 - phi^2) as written in the lecture's expression, with mean reversion for phi between 0 and 1. "characteristic equation lie outside the unit circle" [0:54:28]
- Yule-Walker equations link autocovariances to the AR coefficients through a Toeplitz matrix and amount to a method-of-moments estimate; differencing (Box and Jenkins) removes trends, giving ARIMA models. "sigma squared so these yule walker equations" [1:04:45]


Worked:
- Mean reversion in AR(1) with phi in (0, 1); the lecturer ties it to the Vasicek and Ornstein-Uhlenbeck models for interest-rate spreads and real exchange rates. "interest rate spreads or real exchange rates" [1:00:01]
- Adding a second factor (oil) improved the explanation of GE and Exxon returns, which the lecturer says supports building factor pricing models for trading. "you can build factor asset pricing models" [0:23:03]

Failed:
- The maximum likelihood variance estimate is biased and an exact fit appears when parameters equal observations. "professor yes you'd have an exact fit" [0:07:35]
- Mean-reverting models have limited use over long ranges because the level they revert to changes. "you're reverting to changes so these models" [1:00:21]
- At phi = 1 the process is a non-stationary random walk, and above 1 it is explosive. "stationary if phi is greater than 1" [1:01:15]
- The ARIMA estimation and criteria (Akaike, Bayes, Hannan-Quinn) are rushed and left to the next lecture. "bayes information criterion or the hannan quinn" [1:14:33]
