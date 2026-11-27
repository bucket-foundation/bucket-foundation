# Prediction Markets and Sports Odds

A binary contract price approximates a probability, biased by fees, risk preference and the favorite-longshot effect. Edges come from better forecasts, cross-venue spreads, and logical arbitrage across linked contracts.

## Papers

- Wolfers and Zitzewitz 2004, Prediction Markets, J. Economic Perspectives. doi:10.1257/0895330041371321
- Manski 2006, Interpreting the predictions of prediction markets, Economics Letters (NBER w10359). Price need not equal mean belief.
- Hanson 2003, Combinatorial Information Market Design, Information Systems Frontiers. doi:10.1023/a:1022058209073. LMSR market maker.
- Snowberg and Wolfers 2010, Explaining the Favorite-Long Shot Bias, JPE. doi:10.1086/655844
- Levitt 2004, Why are Gambling Markets Organised so Differently from Financial Markets?, Economic Journal. doi:10.1111/j.1468-0297.2004.00207.x
- Saguillo, Ghafouri, Kiffer et al. 2025, Unravelling the Probabilistic Forest: Arbitrage in Prediction Markets, arXiv:2508.03474. Empirical arbitrage on Polymarket condition sets that should sum to $1.

## In The Video Corpus

- 0ZJXpMZobjY @ 0:08:00 late-window scalping
- sAONff8XU80 @ 0:04:00 Kalshi vs Polymarket differential
- -tMyq-wQZBU @ 0:21:00 weather forecast edge with 5 cent threshold
- BiqG3it0gY0 @ 0:07:00 arbitrage windows 12.3 s to 2.7 s (unsourced)

## Open Question

Settlement-rule mismatch makes cross-venue spreads basis risk; read both rulebooks before calling it arbitrage.

## Derivation

### Brier and Log-Loss Scoring

Assumptions: a binary event \(Y \in \{0,1\}\) with true probability \(p\); a forecaster reports \(q \in [0,1]\); scores are losses, lower is better. A rule is strictly proper if the reporter's expected loss is uniquely minimized at \(q = p\).

1. Brier score: \(B(q, Y) = (q - Y)^2\). Expected loss \(E[B] = p(1-q)^2 + (1-p)q^2\).
2. Differentiate: \(\frac{d}{dq}E[B] = -2p(1-q) + 2(1-p)q = 2(q - p)\). Zero at \(q = p\); second derivative 2 > 0.
3. Expected loss at a report: \(E[B] = p(1-p) + (q-p)^2\). The first term is irreducible uncertainty, the second is miscalibration.
4. Log loss: \(L(q,Y) = -Y\ln q - (1-Y)\ln(1-q)\). Expected loss \(E[L] = -p\ln q - (1-p)\ln(1-q)\).
5. Differentiate: \(-p/q + (1-p)/(1-q) = 0\) gives \(q = p\); second derivative \(p/q^2 + (1-p)/(1-q)^2 > 0\). At the optimum, \(E[L] = H(p)\), the binary entropy, and the excess is the Kullback-Leibler divergence:
\[ E[L(q)] - E[L(p)] = p\ln\frac pq + (1-p)\ln\frac{1-p}{1-q} = D_{KL}(p\,\|\,q) \ge 0 \]
\[ \boxed{\,\arg\min_q E[B] = \arg\min_q E[L] = p\,} \]
Both rules are strictly proper.
6. Murphy-style decomposition over \(n\) forecasts binned by forecast value \(q_k\), with \(n_k\) items and observed frequency \(\bar o_k\), base rate \(\bar o\):
\[ \bar B = \underbrace{\tfrac1n\textstyle\sum_k n_k(q_k - \bar o_k)^2}_{\text{reliability}} - \underbrace{\tfrac1n\textstyle\sum_k n_k(\bar o_k - \bar o)^2}_{\text{resolution}} + \underbrace{\bar o(1-\bar o)}_{\text{uncertainty}} \]
7. Link to trading: the log score is the wealth growth of a Kelly bettor. Betting fraction \(q\) on outcome 1 and \(1-q\) on 0 against a market at price \(c\) grows log wealth by \(Y\ln(q/c) + (1-Y)\ln\frac{1-q}{1-c}\). Its expectation is \(D_{KL}(p\|c) - D_{KL}(p\|q)\), so the forecaster with lower log loss than the market price earns.

Sources: Brier, Verification of Forecasts Expressed in Terms of Probability, Monthly Weather Review 78(1):1-3, 1950, doi:10.1175/1520-0493(1950)078<0001:VOFEIT>2.0.CO;2. Good, Rational Decisions, JRSS B 14(1):107-114, 1952, doi:10.1111/j.2517-6161.1952.tb00104.x. Gneiting and Raftery, Strictly Proper Scoring Rules, Prediction, and Estimation, JASA 102(477):359-378, 2007, doi:10.1198/016214506000001437. Crossref records fetched 2026-11-27.
