<!-- voice-ignore-file: transcript-derived digest -->
# False Discoveries: the false discovery rate in finance | FIT Centre: Finance, Innovation and Technology | i2evTEaieY4 | 1.05 h

Teaches: Marcos Lopez de Prado explains why most published investment factors fail: papers report p-values as if one trial was run, when many trials were searched and only the best was published. He estimates the false discovery rate from a factor database under stated assumptions.

Claims:
- The "single trial assumption" is the core problem: reviewers see one result with no multiple-testing correction, and the distribution of the best Sharpe ratio shifts right without bound as the number of trials grows. "there is no correction for multiple testing" [0:12:36]
- A sensitivity example: 95% null prevalence, true Sharpe 0.3, 10 trials, threshold 1.96 gives a false discovery rate of about 58%; a world with 15% null prevalence and a single trial gives about 8.3%, and the two cases cannot be told apart from published statistics. "is sharp of 3 after 10 trials" [0:31:15]
- Performance falls to about zero from the moment of paper submission, before publication, which he says fits overfitting and not alpha decay after publication. "paper is submitted before is and one" [0:22:50]
- His portfolio-construction papers use Monte Carlo experiments on a stated data generating process (volatility clustering, serial correlation, skew, excess kurtosis) instead of backtests. "data sets like volatility clustering serial correlation" [0:50:35]

Architecture: Process for using literature: assume K trials, deflate Sharpe ratios for multiple testing, keep factors that survive (about 20 to 30), run them as a book, monitor alpha decay with the probabilistic Sharpe ratio, and replace decayed factors; ADIA runs an "alpha lab and factory" for this [0:56:00]-[0:58:00].

Worked:
- Monte Carlo evaluation of allocation algorithms is reproducible by anyone with a different random seed. "with a different random seed and reproduce" [0:50:02]
- Selecting factors that survive deflation and rotating out decayed ones is described as the way to extract value from the literature. "likely able to to survive the deflation" [0:57:14]

Failed:
- About 83% of top-journal factors are estimated to be false from the start, under the stated assumptions. "83% of all publications in the top" [0:42:06]
- Peer review cannot distinguish true from false strategies from in-sample statistics, and researchers often keep no record of trials. "um the researchers the the peer reviewers" [0:19:49]
- Published studies assuming IID normal returns misstate Sharpe distributions. "sharp ratio under those iid normal assumptions" [0:08:17]
