<!-- voice-ignore-file: transcript-derived digest -->
# Book2-Chapter2-Financial Data Structures | Data Science for Business & Finance | I0vCTh0Sv9o | 0.31 h

Teaches: Student presentation of chapter 2 of Lopez de Prado's Advances in Financial Machine Learning: the four financial data types, standard bars (time, tick, volume, dollar), information-driven bars (imbalance, runs), the ETF trick and PCA roll for futures, and CUSUM event sampling.

Claims:
- Start from raw data, because other people's processed datasets only reproduce what they already found. "one will most likely find find what others have already found" [0:00:46]
- Four data types: fundamental (low frequency, lagged, often back-filled), market, analytics (derived, little added value) and alternative (satellite, search, chat), where the edge is largest. "alternative data such as satellites" [0:01:47]
- Time bars should be avoided because markets do not process information at a constant interval and time-sampled series show heteroskedasticity, serial correlation and non-normal returns. "time sample series have poor statistical properties" [0:08:09]
- Dollar bars beat tick and volume bars because outstanding shares change through splits and mergers while traded value stays comparable. "the best methodology to deal with with all this stuff is dollar bars" [0:10:34]
- Tick, volume and dollar imbalance bars sample when order flow diverges from expectation, aiming to detect informed trading as early as possible. "the objective here is to detect information as early as possible" [0:11:33]
- The ETF trick turns a multi-product dataset into one series that behaves like a total-return ETF so only cash-like products need modeling. "resembles the total return cash a ETF" [0:13:52]
- Event-based sampling with a CUSUM filter flags when an observation moves away from the target mean, then lets the model learn only around those events. "detect a shift in the mean of value of a measured quantity" [0:18:04]

Architecture: none (book chapter summary; bars then labeling pipeline per Lopez de Prado).

Worked:
- none reported

Failed:
- none reported
