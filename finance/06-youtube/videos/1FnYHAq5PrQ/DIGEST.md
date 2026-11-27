<!-- voice-ignore-file -->
# Quantum Hierarchical Risk Parity by Maxwell Rounds at QuantCon NYC 2017 | Quantopian | 1FnYHAq5PrQ | 0.77 h

Teaches: A QuantCon 2017 talk by Maxwell Rounds of 1QBit on hierarchical risk parity and a version that uses a D-Wave quantum annealer for the clustering step.

Claims and warnings. Figures and results are self-reported by the speakers and unverified.

- The method applies quantum computing to the clustering step of Lopez de Prado's hierarchical risk parity. "applying quantum computing in the form of clustering to a portfolio optimization technique" [0:13:36]
- The stated goal is low out-of-sample risk with high returns and little numerical instability. "the goal is specifically to produce something with low out-of-sample risk high returns" [0:14:18]
- Thirty stocks carry 435 pairwise correlations, each with its own estimation noise. "30 stocks here how many correlations are there 435" [0:18:11]
- The S&P 500 carries about 125,000 correlations, which makes estimating all of them fragile. "a hundred twenty-five thousand correlations" [0:19:03]
- A positive semi-definite correlation matrix for 500 stocks needs at least 500 observations, about two years of data. "you would need in order for your correlation matrix to be positive semi-definite 500 data points or two years of data" [0:19:16]
- Risk parity is applied at every node of the cluster tree, blending sub-portfolios upward. "you apply it at every node as you work your way up the tree" [0:24:19]
- Weights within a cluster are proportional to inverse volatility or inverse CVaR. "making your weights proportional to those figures or inverse C var" [0:26:34]
- Within a cluster only risks are used, and correlation re-enters when clusters are blended at the next level. "you are ignoring the correlations between them at the time you consider their convex combination" [0:27:51]
- The quantum step splits the full asset set into two groups, internally close and mutually far, then repeats down the tree. "we divide everything into two so we take all the socks all 30 all 50 all 500" [0:31:41]
- A 2,000-qubit machine handles roughly 60 assets in this clustering framework. "for most portfolio applications you can use around 60 assets using that 2,000 bit machine" [0:34:34]
- Self-reported: On a diversified futures universe, quantum hierarchical risk parity had the lowest realized variance of the three methods, below minimum variance by a couple of basis points to about one volatility point. "the lowest varies from a couple of basis points in the middle of 2012" [0:37:34]
- Warning: The resulting portfolios are very low volatility and would need constraints in practice. "in practice you would want to impose some constraints to not make it quite so boring" [0:39:33]
- Sensitivity to the clustering method is negligible at 10 assets and significant at 500. "for a 10 asset portfolio no difference for a 500 asset portfolio there is a significant difference" [0:43:52]
