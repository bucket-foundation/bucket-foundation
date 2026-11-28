# Time Series

Prices are close to a random walk; returns are close to uncorrelated; volatility clusters. ARMA models the conditional mean, ARCH and GARCH model the conditional variance, and cointegration handles non-stationary series that move together.

## Papers

- Engle 1982, ARCH, Econometrica 50(4). Variance conditioned on past squared shocks.
- Bollerslev 1986, Generalized autoregressive conditional heteroskedasticity, J. Econometrics. doi:10.1016/0304-4076(86)90063-1
- Engle and Granger 1987, Co-Integration and Error Correction, Econometrica. doi:10.2307/1913236
- Lo and MacKinlay 1988, Stock Market Prices Do Not Follow Random Walks, RFS (NBER w2168, doi:10.3386/w2168). Variance-ratio test rejects the random walk for weekly returns.
- Hamilton 1989, A New Approach to the Economic Analysis of Nonstationary Time Series and the Business Cycle, Econometrica. doi:10.2307/1912559. Markov regime switching.

## In The Video Corpus

- zapp8smQKhg @ 1:16:00 GARCH(1,1) beats ARCH(10) on FX
- zapp8smQKhg @ 0:26:00 range estimators 5 to 8 times more efficient than close-to-close
- BRUlSm4gdQ4 @ 0:15:00 fractional differentiation keeps memory while passing ADF

## Open Question

Stationarity tests on short windows have low power; Paolucci calls unit-root tests largely useless in practice (kLJEXE5_7rI @ 0:20:00) while Chan builds pairs on them (5G7YdjnRvVI @ 0:11:00).

## Derivation

### ARIMA

Assumptions: \(\{\varepsilon_t\}\) is white noise with mean 0 and variance \(\sigma^2\); \(L\) is the lag operator, \(L y_t = y_{t-1}\).

1. ARMA\((p,q)\): \(\phi(L) y_t = \theta(L)\varepsilon_t\) with \(\phi(L) = 1 - \phi_1 L - \dots - \phi_p L^p\) and \(\theta(L) = 1 + \theta_1 L + \dots + \theta_q L^q\).
2. Stationarity: if every root of \(\phi(z) = 0\) lies outside the unit circle, \(\phi(L)^{-1}\) has a power series with \(\sum_j|\psi_j| < \infty\), and \(y_t = \psi(L)\varepsilon_t = \sum_{j\ge0}\psi_j\varepsilon_{t-j}\) with \(\psi(L) = \theta(L)/\phi(L)\). Mean and autocovariances are then time-invariant: \(\gamma_k = \sigma^2\sum_j \psi_j\psi_{j+k}\).
3. AR(1) case: \(\psi_j = \phi^j\), so \(\operatorname{Var}(y_t) = \sigma^2/(1-\phi^2)\) and \(\rho_k = \phi^k\), finite only for \(|\phi| < 1\).
4. Unit root: if \(\phi(L) = (1-L)^d\,\tilde\phi(L)\) with \(\tilde\phi\) stationary, the series is not stationary, but \(\Delta^d y_t = (1-L)^d y_t\) is. Model the differenced series as ARMA:
\[ \boxed{\,\tilde\phi(L)\,(1-L)^d\,y_t = \theta(L)\,\varepsilon_t\,} \]
This is ARIMA\((p,d,q)\). Prices behave near \(d = 1\); returns near \(d = 0\).
5. Model check: if the fitted model is right, residual autocorrelations \(\hat r_k\) for \(k = 1..m\) satisfy \(n\sum_{k=1}^m \hat r_k^2 \approx \chi^2_{m-p-q}\) for large \(n\).

Source: Box and Pierce, Distribution of Residual Autocorrelations in Autoregressive-Integrated Moving Average Time Series Models, JASA 65(332):1509-1526, 1970, doi:10.1080/01621459.1970.10481180, Crossref record fetched 2026-11-27.

### GARCH

Assumptions: \(r_t = \mu + \varepsilon_t\), \(\varepsilon_t = \sigma_t z_t\), \(z_t\) i.i.d. with mean 0 and variance 1, \(z_t\) independent of the past \(\mathcal F_{t-1}\).

1. ARCH\((q)\) (Engle 1982): \(\sigma_t^2 = \omega + \sum_{i=1}^q \alpha_i\varepsilon_{t-i}^2\).
2. GARCH\((p,q)\) (Bollerslev 1986) adds lagged variance: \(\sigma_t^2 = \omega + \sum_{i=1}^q\alpha_i\varepsilon_{t-i}^2 + \sum_{j=1}^p\beta_j\sigma_{t-j}^2\).
3. GARCH(1,1): \(\sigma_t^2 = \omega + \alpha\varepsilon_{t-1}^2 + \beta\sigma_{t-1}^2\) with \(\omega > 0\), \(\alpha, \beta \ge 0\).
4. Take unconditional expectations. \(E[\varepsilon_{t-1}^2] = E[\sigma_{t-1}^2 z_{t-1}^2] = E[\sigma_{t-1}^2]\). Under stationarity \(E[\sigma_t^2] = \bar\sigma^2\), so \(\bar\sigma^2 = \omega + (\alpha+\beta)\bar\sigma^2\):
\[ \boxed{\,\bar\sigma^2 = \frac{\omega}{1 - \alpha - \beta},\quad \alpha + \beta < 1\,} \]
5. ARMA form: set \(\nu_t = \varepsilon_t^2 - \sigma_t^2\), a martingale difference. Then \(\varepsilon_t^2 = \omega + (\alpha+\beta)\varepsilon_{t-1}^2 + \nu_t - \beta\nu_{t-1}\), an ARMA(1,1) in squared shocks. Volatility clusters with persistence \(\alpha+\beta\).
6. \(h\)-step forecast: \(E_t[\sigma_{t+h}^2] = \bar\sigma^2 + (\alpha+\beta)^{h-1}(\sigma_{t+1}^2 - \bar\sigma^2)\). Half-life of a shock is \(\ln 0.5/\ln(\alpha+\beta)\).
7. Estimation: Gaussian quasi-likelihood \(\ell = -\tfrac12\sum_t\big(\ln\sigma_t^2 + \varepsilon_t^2/\sigma_t^2\big)\), maximized over \((\omega,\alpha,\beta)\).

Sources: Engle 1982, Econometrica 50(4):987, doi:10.2307/1912773. Bollerslev 1986, doi:10.1016/0304-4076(86)90063-1. Crossref records fetched 2026-11-27.

### Kalman Filter

Assumptions: linear Gaussian state space. State \(x_t = F x_{t-1} + w_t\), \(w_t \sim N(0,Q)\). Observation \(y_t = H x_t + v_t\), \(v_t \sim N(0,R)\). \(w, v\) independent of each other and of \(x_0 \sim N(\hat x_0, P_0)\).

1. Predict. Given \(x_{t-1}\mid y_{1:t-1} \sim N(\hat x_{t-1}, P_{t-1})\), linearity gives \(x_t\mid y_{1:t-1} \sim N(\hat x_{t|t-1}, P_{t|t-1})\) with
\[ \hat x_{t|t-1} = F\hat x_{t-1},\qquad P_{t|t-1} = F P_{t-1} F^\top + Q \]
2. The pair \((x_t, y_t)\) given \(y_{1:t-1}\) is jointly Gaussian: \(E[y_t] = H\hat x_{t|t-1}\), \(\operatorname{Cov}(y_t) = S_t = H P_{t|t-1}H^\top + R\), \(\operatorname{Cov}(x_t, y_t) = P_{t|t-1}H^\top\).
3. Condition a Gaussian: \(E[x\mid y] = E[x] + \Sigma_{xy}\Sigma_{yy}^{-1}(y - E[y])\) and \(\operatorname{Cov}(x\mid y) = \Sigma_{xx} - \Sigma_{xy}\Sigma_{yy}^{-1}\Sigma_{yx}\).
4. Define the gain \(K_t = P_{t|t-1}H^\top S_t^{-1}\). Then
\[ \boxed{\,\hat x_t = \hat x_{t|t-1} + K_t\,(y_t - H\hat x_{t|t-1}),\qquad P_t = (I - K_t H)\,P_{t|t-1}\,} \]
5. Without Gaussianity the same recursion is the best linear unbiased estimator under squared loss; this is Kalman's orthogonal-projection argument.

In pairs trading the state is the hedge ratio and intercept, \(F = I\), and \(H_t = [p^B_t, 1]\), so the filter tracks a drifting hedge ratio.

Source: Kalman, A New Approach to Linear Filtering and Prediction Problems, J. Basic Engineering 82(1):35-45, 1960, doi:10.1115/1.3662552, Crossref record fetched 2026-11-27.
