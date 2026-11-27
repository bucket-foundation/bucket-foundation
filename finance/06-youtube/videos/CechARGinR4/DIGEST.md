<!-- voice-ignore-file: transcript-derived digest -->
# Lecture 9: Principal Component Analysis in Finance | MIT OpenCourseWare | CechARGinR4 | 1.39 h

Teaches: A guest lecture on using PCA in quantitative finance, with US Treasury yield changes as the worked example: level, slope and curvature factors, how to read eigenvalues, and how to build uncorrelated PC portfolios for relative value bets.

Claims:
- PCA is unsupervised, implies no causality, and is a linear algebra calculation that scales; unlike regression it minimizes perpendicular distance. "optimization it's just a linear algebra calculation" [0:08:41]
- Check eigenvalues, not only eigenvectors: if the top eigenvalues are similar or cross over time, the PCA output is noisy; want separation of about an order of magnitude on a log plot. "structure and the pca output is noisy" [0:16:14]
- Always demean. "mentioned is that we need to demean" [0:25:57]
- Treasury yield changes: PC1 (level) explains roughly 85 to 90% of variance, PC2 (slope) 5 to 10%, PC3 (curvature) the least; factor shapes track regimes such as Fed policy and COVID. "pc factor explains between 5% and 10%" [0:48:53]
- PC2 and PC3 portfolios (curve trades like 2s/10s and 2s/10s/30s butterflies) hedge out PC1 and need leverage to scale volatility; speaker says that is where a lot of money is made, but PC4 and above needs prohibitive leverage. "the pc2 portfolio i have effectively hedged" [0:59:32]
- Out-of-sample projections onto PCs stayed mostly orthogonal; off-diagonal correlations of 30 to 50% would signal an unstable model. "off diagonal numbers to become 30% 50%" [0:55:37]

Architecture:
- Data: daily Federal Reserve Treasury yields for 2, 3, 5, 7, 10, 30 year maturities, converted to daily yield changes. "3 year bonds 5 year bonds 7" [0:40:58]
- Model: eigen decomposition or SVD; PC portfolios from loadings. "eigenvalue matrix that's the svd decomposition there's" [0:18:55]
- Event-day volatility doubles. "events where the market is very volatile" [1:06:12]

Worked:
- PC factor loadings were stable and interpretable (level, slope, curvature) across 2008, post-crisis, COVID. "often they're quite meaningful in 2008 crisis" [0:52:16]
- A toy momentum/mean-reversion strategy on PC1 was built in an accompanying notebook; speaker says it does not work great and is only an illustration. "a momentum mean reversion strategy for pc1" [1:11:17]

Failed:
- When data has no dominant direction, PCA output is hypersensitive to a single data point. "have a dominant direction then the pca" [0:13:02]
- PCA on un-demeaned prices finds nothing. "is centered at 0 and pca finds" [0:26:23]
- COVID changed loadings overnight with no history to recalibrate. "the dynamics of the curve changed overnight" [1:08:11]
