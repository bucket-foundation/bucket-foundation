<!-- voice-ignore-file: transcript-derived digest -->
# 15. Factor Modeling | MIT OpenCourseWare | ro07evEWbCE | 1.43 h

Teaches: A lecture on linear factor models for asset returns: observable factors (Sharpe single index, Chen-Ross-Roll surprise factors, Fama-French, BARRA), statistical factors (maximum likelihood factor analysis, principal components), and a case study of U.S. Treasury yield changes.

Claims:
- A factor model writes each asset as a loading vector times k common factors plus a specific term; k is far smaller than the number of assets m, which simplifies covariance modeling. "modest number of underlying factors which simplifies" [0:03:24]
- Covariance of x_t equals B cov(f) B' plus a diagonal psi. An unconstrained covariance has m(m+1)/2 parameters; the factor version needs an m by k loading matrix, a k by k factor covariance and m specific variances. "unconditional covariance of x is actually equal" [0:07:50]
- Sharpe single index model: covariance equals market variance times beta beta' plus psi; specific variance is the sum of squared residuals divided by T minus 2. "estimated residuals divided by t minus 2" [0:18:23]
- Chen, Ross and Roll (1986) use surprise factors: unanticipated changes in macro variables, estimated with vector autoregressions. "modeling different macroeconomic variables with vector autoregression" [0:21:01]
- Fama-French ranks stocks into quintiles by size or price to book and trades the top fifth against the bottom fifth; the factors are written bottom minus top because value tends to outperform. "top because the value tends to outperform" [0:29:00]
- Likelihood ratio tests compare an unconstrained covariance with a k-factor fit; twice the log-likelihood difference is approximately chi-squared, so the number of factors can be tested. "at twice the difference in log likelihoods" [0:58:56]
- Daily yield-change volatility runs 3 to 6 basis points. "the standard deviation of daily yield changes" [1:14:45]
- Loadings read as level shift (PC1), long minus short spread (PC2) and curvature (PC3); the ninth component is a hedge of the 7 year yield with the 5 and 10 year. "5 and 10 year minus the 7" [1:22:37]

- Observable factors (macro, fundamental) estimated by regression; known loadings with estimated factor returns (BARRA industry, Fama-French); statistical factors by maximum likelihood with the EM algorithm; principal components from the eigen-decomposition of the covariance; case study on yields. "factors are observable those can be macroeconomic" [0:00:48]

Worked:
- Factor structure replaces estimating every covariance; the speaker calls the reduction in parameters enormous and useful for portfolio allocation and scenario-based risk management. "this so useful well in portfolio management" [0:16:54]
- Factor realizations can be rescaled into factor mimicking portfolios whose returns track the factor and can be invested in. "with the factor realization so factor mimicking" [0:39:38]
- One principal component captures about 85 percent of yield-change variance. "variable is 0 849 so basically 85%" [1:18:43]

Failed:
- A single factor does not characterize covariance structure in general. "single factor model doesn't characterize the structure" [0:19:09]
- Unequal residual variances break the Gauss-Markov assumptions; generalized least squares is needed. "more positive values and associated more generally" [0:29:04]
- Principal components give only an approximate factor model because the residual covariance need not be diagonal. "to a diagonal with a principal components" [1:05:17]
- Factors are only determined up to an invertible k by k transformation. "the factors f we can actually transform" [0:43:57]
- The case note stops short of modeling factor dynamics. "the time period in the case note" [1:24:59]
