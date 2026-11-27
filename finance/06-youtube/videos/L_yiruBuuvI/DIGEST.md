<!-- voice-ignore-file: transcript-derived digest -->
# Book2-Chapter12-Backtesting through Cross-Validation | Data Science for Business & Finance | L_yiruBuuvI | 0.28 h

Teaches: Student summary of chapter 12 of Advances in Financial Machine Learning: walk-forward, ordinary cross-validation and combinatorial purged cross-validation (CPCV) as backtesting schemes, and why a single historical path misleads.

Claims:
- Walk-forward backtesting has a clear historical reading and little leakage between training and test sets, but it tests one scenario and is prone to overfit it. "you're still testing a single scenario" [0:05:04]
- Cross-validation drops the time ordering, so test sets near training data can leak information and overfit the model. "leakage can occur" [0:09:37]
- Combinatorial purged cross-validation splits the data into many train and test combinations so one strategy yields many backtest paths and a distribution of forecasts. "combinatorial burst cross validation method" [0:10:17]
- Because CPCV uses more observations and many paths, it lowers variance, reduces overfitting and exposes Sharpe ratios that look high only because of leakage. "there could be high sharp ratios due to these problems of leakage" [0:14:42]

Architecture: none (book chapter summary).

Worked:
- none reported

Failed:
- none reported
