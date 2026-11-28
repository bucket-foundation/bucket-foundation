<!-- voice-ignore-file: transcript-derived digest -->
# Causality in Factor Investing: Marcos López de Prado, PhD & Vincent Zoonekynd, PhD | CFA Institute Research Foundation | NHQ0Q30fAP4 | 0.59 h

Teaches: Marcos Lopez de Prado and Vincent Zoonekynd on their CFA Institute Research Foundation primer: factor models are attribution models, so variable choice must follow a causal graph, and adding colliders improves fit while reversing beta signs.

Claims:
- The factor zoo comes from p-hacking, where repeated regressions over many trials eventually produce a false discovery that fails out of sample. "given a certain um all discovery rate eventually they will identify um a discovery" [0:03:25]
- A second failure source is specification error: adding variables that raise fit but are consequences of the target is fine for forecasting and wrong for explaining. "you could end up um adding variables that are not causes of what you are trying to forecast" [0:05:32]
- A confounder is a common cause of the cause and the effect and belongs in the regression; a collider is a consequence of both and does not. "the collidum is a consequence of both the cause and the effect" [0:08:12]
- Colliders improve adjusted R squared and lower p values, yet they flip the sign of betas so you buy what you should sell, and they cannot be monetized because the effect has already happened. "you end up buying what you should be selling and selling what you should be buying" [0:10:18]
- Granger causality tests precedence, not cause, and factor models use same-period returns and exposures, so time ordering cannot rule out colliders. "a factor is not a variable that attempts to predict a return" [0:21:29]
- Standard factor regressions explain the cross-section of one month's returns from that month's ratios, because next-month forecasts have a very low signal to noise ratio. "you take the factor exposures, you take the the stock returns for that month" [0:22:23]
- Recommended workflow: start from a causal graph built from domain knowledge, then check it with causal discovery algorithms (PC, GES, LiNGAM) that can take prior constraints; deep learning variants need cleaner data than finance offers. "the PC algorithm" [0:28:05]
- Disclose the causal graph behind every regression, since nearly all factor papers present regressions without one. "it is important to disclose the causal graph that inform your choice of variables" [0:31:47]

Architecture: none (podcast on causal graphs for factor model specification; PC and GES discovery on Barra factors).

Worked:
- none reported

Failed:
- Factor models that add variables for fit or p-value fail as investments because colliders bias the betas. "do not pursue model specifications just for the sake of improving your adjusted R square" [0:31:17]
