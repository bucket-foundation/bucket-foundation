<!-- voice-ignore-file: transcript-derived digest -->
# QuantConnect + Interactive Brokers (IBKR): Run Multiple Strategies on One Account | Tim Sergeev | QVaeMBsRMLk | 0.17 h

Teaches: Tim Sergeev (2026) on running several QuantConnect strategies on one Interactive Brokers account: no overlapping instruments, combining strategies in one algorithm to pay for one live node, and a futures multi-strategy example. Promotes his cohort; results self-reported.

Claims:
- More uncorrelated strategies make a portfolio more resilient across bull, bear and neutral markets. "The more uncorrelated traded strategies you have, the more resilient your portfolio is" [0:00:25]
- Strategies cannot share one account if they trade the same instrument on opposite sides, because they cancel each other. "this instrument is overdoed" [0:01:20]
- One live node per strategy is the costly route; combining strategies into one algorithm needs one node, and he builds and combines them with AI. "the number of strategies directly correlates to the number of live node environments" [0:02:35]
- Three uncorrelated futures strategies (MNQ, MBT, MES) combined returned 41 percent annual in backtest (self-reported); adding gold and Russell micro futures raised CAGR by 14 points with only two points more drawdown. "increased the sharper ratio with only two points of increase of the draw down" [0:04:21]
- A single-strategy deployment to an account is possible; the IBKR login needs phone verification. "verification message on my phone" [0:08:25]

Architecture: One QuantConnect algorithm holding five instrument sub-strategies on one live node connected to one IBKR account.

Worked:
- none reported

Failed:
- none reported
