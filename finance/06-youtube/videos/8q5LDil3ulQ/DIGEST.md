<!-- voice-ignore-file: transcript-derived digest -->
# Book2-Chapter10-Bet Sizing | Data Science for Business & Finance | 8q5LDil3ulQ | 0.28 h

Teaches: Student summary of chapter 10 of Lopez de Prado's Advances in Financial Machine Learning on bet sizing: two strategies with the same forecast make or lose money depending on size, and three sizing approaches (mixture of two Gaussians, budget, meta-labeling probabilities).

Claims:
- With the same price forecast and 25 percent upside, one bet-size sequence made 0.5 and another lost 0.125, showing sizing decides outcome. "however the first album made money 0.5" [0:02:54]
- The meta-labeling approach fits a classifier for the probability of misclassification and converts the predicted probability directly into a bet size, independent of the primary model. "the predicted probability can be directly translated" [0:08:31]
- Overwriting bets with every new signal causes excessive turnover; averaging bets across active positions and discretizing the size reduces small trades. "that could lead an excessive excessive turnover" [0:10:11]
- A dynamic position method uses a sigmoid of the price divergence to set a target position (capped near 0.95 of a 100 maximum) and a limit price. "first we calculate the sigmoid function" [0:14:08]

Architecture: none (book chapter summary; audio transcript is garbled, so formulas are not recoverable).

Worked:
- none reported

Failed:
- none reported
