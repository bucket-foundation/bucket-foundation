<!-- voice-ignore-file: transcript-derived digest -->
# The Do's and Don't's of Quant Trading | Quantopian | akrWQxUqjq8 | 0.99 h

Teaches: Ernest Chan's lessons from about ten years of quant trading: do not over-lever, do not chase short-term performance, invest profits in data, equipment and people, and study market phenomena with simple strategies. Closes with a Q&A.

Claims:
- Kelly leverage is too high even at half Kelly, because returns are non-Gaussian with serial correlation and Kelly is sensitive to the sample period; use it only as a maximum. "kelly leverage will be much too high" [0:07:07]
- Returns are hard to predict but volatility is predictable, so set leverage by expected volatility or downside, not expected return. "year it is extraordinarily hard to predict" [0:08:13]
- Short-term performance should not be used to pick managers or strategies: a 2017 study ("Folly of hiring winners and firing losers") found it useless because performance mean reverts; it can be used to scale down allocation for risk management. "hiring winners and firing losers is an" [0:11:27]
- Data quality matters: good data is rarely cheap, survivorship bias and not using bid/ask or auction prices inflate equity backtests; CRSP is the gold standard but expensive. "cast because for equity data survivorship bias" [0:16:58]
- Simple ideas last because of execution, risk management and removing bad trades; multiple predictors combined in layers slow alpha decay; collaboration and idea sharing help. "down the the alpha decay by removing" [0:37:22]

Architecture: none (advice on process: volatility-targeted leverage, trade filtering, multi-predictor strategies, team and data investment).

Worked:
- Removing a few bad trades can double a Sharpe ratio per his example. "a sudden your sharpe ratio might double" [0:33:53]

Failed:
- That forex model suffered significant alpha decay in the last two years. "other models has suffered significant offer decay" [0:45:35]
- Most machine learning funds fail per Lopez de Prado quote; currency trading programs in the index were down over two years. "unequivocally that most machine learning funds fail" [0:02:36]
- Chan says he personally violated every "don't": over-levering in good times and picking managers on short-term results. "to lever too high when the times" [0:05:10]
