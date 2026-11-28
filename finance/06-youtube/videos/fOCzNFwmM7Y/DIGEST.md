<!-- voice-ignore-file: transcript-derived digest -->
# Professor Marcos Lopez de Prado on Machine Learning in Asset Management - Kapitaleierdagen 2024 | Reitan Kapital | fOCzNFwmM7Y | 0.99 h

Teaches: A conference talk on machine learning for portfolio construction. Lopez de Prado argues that price prediction is the least useful ML application, then shows why Markowitz optimization is unstable and how denoising, clustering (NCO) and ensembles of allocators repair it. He closes with questions to ask any quant.

Claims:
- A 50 by 50 covariance matrix needs about five years of daily data to invert; hierarchical risk parity needs only N-1 observations (49 days) and a Monte Carlo test shows a Sharpe gain above 31%. "shar ratio of in above of 31%" [0:10:57]
- Bet sizing via a second model that predicts whether a primary model is right (meta-labeling, "corrective AI") can make a 51% precision forecaster usable. "secondary algorithm that predicts whether the primary" [0:13:53]
- About 99% of eigenvalues of a bond-market covariance matrix fall inside the Marchenko-Pastur noise band; denoising replaces the small ones with their mean. "about 99% of the ig values fall" [0:30:02]
- Three questions for any quant: was backtest overfitting controlled (embargo, multiple testing), what is the causal mechanism, and is it an ensemble. "have you control for back this overfeeding" [0:47:36]


Worked:
- RANSAC stayed unbiased with 5% to 25% outliers where ordinary least squares tilted. "gives you the correct estimate 25% outliers" [0:15:41]
- Sentiment of news flow on Tesla preceded multi-month price trends. "the price will trend down for months" [0:18:47]

Failed:
- Price prediction papers: he calls them probably overfit and the most common mistake. "two case imagine if we are dealing" [0:36:59]
- Classical Markowitz, which he says concentrates risk and is a single point of failure. "and it's a single point of failure" [0:46:34]
- ML is no panacea and cannot replace industry knowledge. "human insight they cannot replace our knowledge" [0:47:19]
