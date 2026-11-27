<!-- voice-ignore-file: transcript-derived digest -->
Hedge Fund Manager Ernie Chan: Use GenAI to Manage Risk, Not Predict Return | Odds on Open | VzF-tvz3DAk | 0.88 h

Teaches: Ernie Chan on where machine learning works in trading: limited financial data pushes use toward risk management and portfolio optimization, with generative pre-training as a promising way to ease data scarcity. Also covers regime change, backtest honesty and career advice.

Claims:
- Traditional answer is to use AI for risk management and portfolio optimization with close to linear or piecewise linear explainable models, not direct return prediction. "for risk management and uh portfolio optimization" [0:03:12]
- Generative pre-training can use unrelated time series (electricity demand, shipping) and then fine-tune on the target; modeling P(X) as well as P(Y|X) needs less labeled data (semi-supervised). "that to train a pre trained model" [0:08:28]
- Unlabeled text (Fed conferences, analyst reports) can be used with a few labeled samples instead of paying a vendor for sentiment scores. "label a few of these analyst reports" [0:14:57]
- Replicating published AI papers takes months to years of expertise, so access to papers gives no edge; large funds are slowed by bureaucracy. "takes months just to replicate it and" [0:17:22]
- Regime change only hurts if the strategy ignores regime inputs. "it so the idea of regime change" [0:27:38]

Architecture:
- Data: returns of the instrument, related instruments and indices first; macro variables and text as extras. "be returns of instrument that are related" [0:05:59]
- Signal and model: pre-trained generative model fine-tuned on target data; regression trees or near-linear models for explainability. "peacewise linear such as uh regression trees" [0:03:40]
- Risk: use AI for risk and portfolio optimization; QTS runs a crisis alpha index futures strategy that profits from turbulence about every two years. "in particular index futures and that strategy" [0:25:04]

Worked:
- QTS crisis alpha strategy on index futures has run over 10 years and "still generating alpha" per Chan (unverified). "for over 10 years is still generating" [0:26:05]
- Chan says people built successful hedge funds from his first book (anecdote, unverified). "that there are actually successful hash funds" [0:43:06]

Failed:
- His early forex strategies almost never lost for months, then lost money and alpha vanished. "forex strategy that almost never lose money" [0:24:38]
- Overfitting trap: tweaking on out of sample data until a Sharpe of 1.5 appears, then live Sharpe is 0.5. "tweaking finally you got to 1 5" [0:48:17]
- Chan says ChatGPT answers are about 50% wrong, so you must be able to tell which are right. "expect 50% of the answers are wrong" [0:41:26]
- Key lesson: be aware of risk and never be overconfident, citing large firms that failed from overconfidence. "lesson is be aware of risk uh" [0:51:59]
