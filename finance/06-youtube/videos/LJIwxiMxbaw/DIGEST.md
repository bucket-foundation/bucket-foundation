<!-- voice-ignore-file: transcript-derived digest -->
# Ernest Chan - Capital Allocation and Risk Management (Kelly) | futures io | LJIwxiMxbaw | 1.65 h

Teaches: Ernest Chan explains the continuous Kelly formula for leverage and capital allocation, the half-Kelly and constant proportion portfolio insurance (CPPI) variants, and the practical limits, with quiz-style worked examples.

Claims:
- Kelly serves three uses: avoiding ruin, setting optimal leverage for maximum compounded growth, and allocating capital across strategies. "use of califormia is optimal capital allocation" [0:05:23]
- Optimal leverage for one strategy is mean excess return over variance (f = m / s squared), with m measured as unlevered return on gross market value; a negative mean implies no money management scheme can fix a losing strategy. "by by that you mean losing strategy" [0:11:32]
- After a $20,000 gain on $90,000 equity it becomes $550,000. "naturally your equity is reduced to $90" [0:14:46]
- Use half Kelly because mean and variance are estimates that change; being over-leveraged risks ruin while under-leveraged does not. "the variance of returns are all estimates" [0:33:29]
- Example: $120K equity, 20% max drawdown, Kelly 10x gives a $240K order. "20% draw down because even if you" [0:45:55]
- Multi-strategy allocation is F = C inverse times M (covariance matrix inverse times mean excess return vector); covariance estimates are often poor when strategies rarely trade together. "covariance estimation is often inaccurate and it's" [1:10:54]

Architecture: Risk and sizing layer: estimate unlevered mean and variance over a long window (he uses data since 2007), compute Kelly leverage, apply half Kelly (or full Kelly inside the risky CPPI account), rebalance at the end of day, run separate accounts per strategy, and apply a broker leverage cap by dropping the weaker strategy.

Worked:
- Separate accounts per strategy let him shut down a bad one instead of subsidizing it. "best strategy the good strategy to subsidize" [1:32:38]
- His total return including private trading, fund and managed accounts has been positive since his first losing year (self-reported, unverified). "have been positive uh since that year" [1:35:06]

Failed:
- Kelly under-levers positively skewed strategies and over-levers fat negative-tail ones. "had a fat tail in the negative" [0:57:18]
- His first year as an independent trader lost money on an XLE and crude oil pair because he misunderstood return on futures. "first year i became a independent trader" [1:34:37]
- Hidden Markov models never worked for him in finance. Backtests with stop-loss and profit-cap optimization rarely predict the future. "best historical odds um this keeps him" [1:03:24]
