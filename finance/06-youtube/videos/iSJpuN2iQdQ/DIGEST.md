<!-- voice-ignore-file: transcript-derived digest -->
# Cómo usar el Sharpe RatioMarcos López de Prado, Abu Dhabi Investment Authority (ADIA) | Robotrader World | iSJpuN2iQdQ | 1.05 h

Teaches: Marcos Lopez de Prado (ADIA) on how to use the Sharpe ratio correctly (talk in Spanish-language auto-translation): common mistakes, sampling error of the estimator, why Lo's 2003 variance formula fails for non-Gaussian autocorrelated returns, and a corrected probabilistic Sharpe test.

Claims:
- Common Sharpe mistakes include assuming returns are normal and independent, computing it on small samples with low-power tests, and mishandling the frequency of observation. "this hypothesis has no empirical support" [0:03:02]
- The Sharpe ratio is invariant to leverage but depends on observation frequency, so daily, weekly and monthly estimates of the same process differ. "it is not invariant to the frequency of observations" [0:10:50]
- Annualizing is not enough to compare two Sharpe ratios; their estimation variances must be compared too. "annualizing is not enough" [0:14:48]
- The variance of the Sharpe estimator falls with sample size and depends on the true Sharpe ratio. "the variance of this estimator is also a function of the Sharpe ratio" [0:17:38]
- Lo's 2003 variance equation assumes unrealistic conditions and went unimproved for 24 years; with autocorrelation and fat tails it understated Sharpe error badly, giving estimates 43 percent lower and variance errors of 400 to 500 percent. "after 24 years since the publication of this article, this equation has not been improved" [0:21:50]
- A Sharpe ratio of 1 with standard deviation 0.5 becomes insignificant if the true standard deviation is double, which is why 5 or 10 percent errors do not matter and 400 percent errors do. "it is no longer significant" [0:38:28]
- The three-year track record rule of thumb for monthly data is justified by the derived equation, and Bayes' theorem converts the probability of the data under the null into the probability that a strategy is false. "around 3 years of monthly observations" [0:49:41]

Architecture: none (talk; Monte Carlo of 10,000 samples to check variance formulas).

Worked:
- none reported

Failed:
- none reported
