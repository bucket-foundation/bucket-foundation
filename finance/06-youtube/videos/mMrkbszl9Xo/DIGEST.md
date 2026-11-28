<!-- voice-ignore-file: transcript-derived digest -->
# Dr. Ernest Chan: His Unheard Approach To AI in Trading | Moon Dev | mMrkbszl9Xo | 0.77 h

Teaches: Ernest Chan on the Moon Dev podcast (2024): use machine learning to size and filter an existing strategy rather than predict price ("corrective AI"), regime as a point in a high-dimensional space, tail-hedge strategies, and avoiding look-ahead and selection bias.

Claims:
- Chan applies machine learning in a different way from price prediction, citing Lopez de Prado's talk on the top seven reasons most machine learning funds fail. "the top seven reasons why most machine learning" [0:05:15]
- Corrective AI cuts the risk taken when the model's probability of profit is low, with a fixed maximum risk and a stop loss suited to a momentum strategy. "based on the probal profit" [0:10:14]
- A momentum strategy predictably loses in calm, low-volatility markets and a mean-reversion strategy loses in volatile ones, a signature risk exposure that can be learned. "a very calm Market very low Vol Market" [0:07:29]
- Regime is a point in a space of 20 to 100 axes learned by a model, so transitions are smooth rather than discrete on-off states. "a regime is just a point within this High dimensional space" [0:20:20]
- Language models convert headlines, press releases, earnings transcripts and analyst reports into a 0 to 1 sentiment score that feeds other models. "converted into a numerical score 0 to one" [0:18:38]
- Backtests must avoid look-ahead bias, which is more likely in machine learning strategies, and must not be used to discover strategies, since a blind search over 100 thresholds finds one that works historically by selection bias. "without a caal model you can you are doing Blind search" [0:28:21]
- A quantity predicted with high accuracy does not necessarily translate to good returns, so Chan emphasizes market understanding over choosing LSTM or CNN. "the quantities that you can predict with high accuracy does not necessarily translate to good returns" [0:36:08]

Architecture: Corrective AI meta-model on top of a momentum strategy: base signal, ML probability of profit, risk scaled by that probability under a fixed maximum and stop loss.

Worked:
- none reported

Failed:
- Pure machine learning price prediction, which Chan says most ML funds fail at because financial data is sparse. "most machine learning h fund fail" [0:05:17]
