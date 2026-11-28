<!-- voice-ignore-file: transcript-derived digest -->
Lecture 19: Volatility Modeling | MIT OpenCourseWare | zapp8smQKhg | 1.37 h

Teaches: Peter Kempthorne's lecture on measuring and forecasting realized volatility: historical and EWMA estimators, range based estimators (Parkinson, Garman-Klass, Yang-Zhang), ARIMA forecasting of volatility, jump diffusion, Laplace returns, and ARCH/GARCH models.

Claims:
- Annualize daily volatility by multiplying by the square root of 252 (52 weekly, 12 monthly); log returns add across periods. "square root of 252 for daily returns" [0:06:54]
- RiskMetrics (JP Morgan, 1990s) uses an exponential moving average with decay factor around 0.95, chosen by predictive mean squared error, as an agreed benchmark rather than the best estimator. "0 9 it's more like 0 95" [0:12:16]
- Using high and low prices improves efficiency: Parkinson about 5.2 times close to close, Garman-Klass about 6.2, composite about 8.4; Yang-Zhang (drift independent) is currently preferred. "composite estimator which has efficiency 8 4" [0:31:46]
- Rolling close to close volatility keeps a return spike in the window until it drops out, so other estimators may recover faster after spikes and forecast better. "you have a rolling window of close" [0:40:12]
- For the S&P 500, 21 day annualized volatility was often 12 to 15% in calm periods with big spikes (COVID). "lag and so there are some spikes" [0:44:36]
- Laplace (exponentially distributed observation times) fit S&P 500 daily returns far better than Gaussian by Q-Q plot. "the autocorrelations of the s p 500" [1:10:28]

Architecture: none (statistical methods; R case studies using FPP2 and rugarch).

Worked:
- Close to close, Parkinson, Garman-Klass and Yang-Zhang estimates all peaked at the same times, with visible differences between them. "those and then finally this yang zhang" [0:37:43]
- Residuals from the seasonal ARIMA looked more like white noise and more Gaussian. "do look a lot like white noise" [0:57:55]
- GARCH(1,1) captured time varying volatility with fewer parameters than ARCH(10) on dollar-pound returns. "of having 10 autoregressive parameters in arch" [1:17:30]

Failed:
- Naive random walk forecast of volatility left significant residual autocorrelation and non-normal residuals. "model for yt and the random walk" [0:42:56]
- Gaussian model fit daily returns poorly (Q-Q plot). "gaussian as a model for independent daily" [1:08:15]
- Estimator choices depend on simplifying assumptions such as zero mean. "developments they're simplifying assumptions like the mean" [0:31:00]
