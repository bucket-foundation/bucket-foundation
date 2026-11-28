<!-- voice-ignore-file: transcript-derived digest -->
# The 7 Reasons Most Machine Learning Funds Fail Marcos Lopez de Prado from QuantCon 2018 | Quantopian | BRUlSm4gdQ4 | 1.23 h

Teaches: Marcos Lopez de Prado lists seven pitfalls in applying machine learning to finance: working in silos, integer differentiation, time-bar sampling, fixed-horizon labeling, non-IID sample weighting, cross-validation leakage, and backtest overfitting without counting trials. Each comes with an alternative method.

Claims:
- Integer differencing (returns) removes memory; fractional differentiation finds the smallest order that achieves stationarity: for the 100 most liquid futures the needed order is at most 0.5, mostly 0.2 to 0.3, and an order of 0.35 gives ADF about -2.86 while keeping 0.995 correlation to the price series. "achieve a level of minus 2 3" [0:21:20]
- Label with the triple barrier method (profit take, stop loss, time limit) rather than fixed time horizon returns; meta-labeling adds an ML layer to size bets on a primary model. "what i call meta leveling meta labeling" [0:36:17]
- Overlapping labels create non-IID samples. "serial correlation and the labels are overlapping" [0:46:22]
- With 1,000 random-walk trials the expected maximum Sharpe is about 3, and with a million trials about 5; report the number of trials and use the deflated Sharpe ratio; backtesting is not a research tool. "compute x the expected maximum sharpe ratio" [0:54:12]

Architecture:
- Data: bars sampled by dollar, volume or imbalance rather than time; fractionally differentiated features. "the same time the differentiated series fractional" [0:22:21]
- Signal/model: ML for feature importance and meta-labeling a primary fundamental or econometric model for bet size; use ML as a research tool to find relevant variables then derive a theory. "theoretical model whether the model is econometric" [0:36:34]

Worked:
- Fractional differentiation retained memory (blue line stayed depressed after 2008) while passing stationarity tests. "you can observe that when after 2008" [0:20:05]
- Dollar bars gave the most stable bar counts per day. "that you compute you sample one bar" [0:28:16]
- Accounting for uniqueness raised out-of-sample accuracy "dramatically" per the speaker (no figure). "your out of sample accuracy increases dramatically" [0:45:00]

Failed:
- Most finance discoveries are false because nobody controls for multiple testing (cites Harvey). "conclusion most discoveries in finance are false" [0:52:50]
- Tick bar counts per day varied from about 25 to 100 over time due to HFT and FIX changes. "starts at the level of around 25" [0:28:29]
- Standard time-bar labeling ignores stop-outs. "crash you know that the stop outs" [0:35:00]
