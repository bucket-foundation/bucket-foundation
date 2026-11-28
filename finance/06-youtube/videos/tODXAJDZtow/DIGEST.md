<!-- voice-ignore-file: transcript-derived digest -->
Machine Learning for Asset Managers with Marcos Lopez de Prado | NorQuant Kapitalforvaltning | tODXAJDZtow | 1.52 h

Teaches: Lopez de Prado on why Markowitz mean-variance optimization is unstable and two fixes: denoising the covariance matrix with Marchenko-Pastur random matrix theory, and the nested clustered optimization (NCO) algorithm. The second half is a student paper competition with four finalists.

Claims:
- Markowitz solutions are unstable because the optimal portfolio uses the inverse covariance matrix, which magnifies errors when the matrix is ill conditioned; two sources are noise induced and signal induced instability. "covariance matrix is unstable is numerically condition" [0:07:30]
- Fitting eigenvalues to the Marchenko-Pastur distribution separates noise eigenvalues from signal. "associated with noise the marchenko pastore distribution" [0:13:28]
- NCO has five stages: cluster the matrix, optimize within each cluster, reduce to a K by K cluster covariance, optimize between clusters, and multiply weights. "optimal clusters associated with the covariance matrix" [0:30:29]
- Denoising reports a 90 to 94 percent reduction in root mean square error. "accomplishes around 90 94 percent reduction in the root mean square error" [0:23:26]

Architecture:
- Data: covariance matrix (for example from Barra or estimated) and expected return vector. "noise in the vector of expected returns" [0:05:30]
- Alternatives suggested include knowledge graphs, minimum spanning trees and mutual information distances. "spanning tree associated with that knowledge graph" [0:45:07]
- Evaluation: bootstrap estimation error against a known ground truth covariance matrix. "ground truth that gives us the estimation" [0:21:32]

Worked:
- Denoising and NCO reduced estimation error in the Monte Carlo experiments above (author's own experiments, results as stated by speaker). "i would say experiment take your state" [0:43:41]
- Winner of the paper contest: random forest stock selection on the Norwegian market, 10 stocks equally weighted, Sharpe ratios before costs of 2.14, 5.30 and 5.55 across her three portfolios, with the long holding one her main portfolio (captions do not pair each ratio with a portfolio. "2 14 5 30 and 5 55" [1:08:19]

Failed:
- Shrinkage can hurt by removing signal along with noise. "presentation is that a shrinkage eliminates noise" [0:34:55]
- Short holding portfolios lost most return after transaction costs, and returns declined over time. "after transaction costs but for the portfolios" [1:08:34]
- Finalist papers: tree models and neural networks forecasting; a reviewer raised survivorship bias in the crypto index selection. "so that's that's there's some survivorship bias" [1:27:53]
- Speaker says ML for finance must handle non-stationarity and time dependence. "tackle issues of time dependence and non" [0:51:42]
