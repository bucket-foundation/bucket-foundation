<!-- voice-ignore-file: transcript-derived digest -->
# 6. Regression Analysis | MIT OpenCourseWare | l1kLCrxL9Hk | 1.37 h

Teaches: Linear regression foundations for the MIT 18.S096 finance course: model setup, ordinary least squares in matrix form, the hat matrix, the Gauss-Markov theorem and its generalized form, normal-model distribution theory, QR decomposition and the link to maximum likelihood.

Claims:
- Goals of regression include prediction (where the lecturer used it most in finance), causal inference, function approximation and validating functional relationships. "analysis to uncover functional relationships and validate" [0:04:00]
- Modeling a stock price on a log scale suits percentage changes. "was discussing problems of modeling stock prices" [0:08:47]
- Five-step protocol: specify the model, pick an estimator criterion, characterize and apply the best estimator, check assumptions on the residuals, then modify and repeat. "to characterize the best estimator and apply" [0:11:22]
- Gauss-Markov assumptions: residuals have zero mean, constant variance and are uncorrelated (weaker than independent); a nonlinear curve fitted by a line gives correlated residuals. "gauss markov assumptions is that the residuals" [0:16:02]
- OLS minimizes (y - X beta)^T (y - X beta), giving beta hat = (X^T X)^-1 X^T y, which needs X to have full column rank. "x inverse needs to have full rank" [0:37:02]
- The hat matrix H = X (X^T X)^-1 X^T is an orthogonal projection onto the column space of X; residuals (I - H) y are orthogonal to every column of X. "projecting the data onto the space orthogonal" [0:42:58]
- Gauss-Markov theorem: under its assumptions the least squares estimate of any linear combination of the betas has the smallest variance among linear unbiased estimators (BLUE). "smallest variance amongst all linear unbiased estimators" [0:51:16]
- With a known covariance matrix, multiplying data by Sigma^(-1/2) restores the standard setting (generalized least squares); with normal residuals beta hat is multivariate normal, the sum of squared residuals is sigma^2 times chi-squared on n minus p degrees of freedom, and the coefficient t statistic has n minus p degrees of freedom. "mu plus 1 2 t transpose sigma" [1:03:39]


Worked:
- QR through Gram-Schmidt gives beta hat = R^-1 Q^T y, covariance sigma^2 (X^T X)^-1 and hat matrix Q Q^T. "for r 1 2 so we actually" [1:11:09]
- Residual diagnostics, influence diagnostics and outlier detection check the assumptions; outliers can be explained away or can lead to model extensions. "ok finally there's outlier detection with outliers" [0:28:16]

Failed:
- Rank-deficient X gives non-unique least squares estimates, harmless for prediction only. "full rank then our least squares estimate" [0:38:37]
- A few influential cases can drive an estimate even in a large data set. "very small number of cases so influence" [0:27:36]
- Gaussian residuals do not always fit. "of the response variables now the gauss" [0:51:06]
- He says probably all statistical modeling is essentially subjective, and he warns against fitting simple linear regression to everything. "might be correlated in a regression model" [0:21:03]
