<!-- voice-ignore-file: transcript-derived digest -->
# "Advances in Financial Machine Learning" Live Interview with Marcos López de Prado | Quantopian | FJYgrkVbpEE | 1.01 h

Teaches: López de Prado summarizes seven pitfalls of financial machine learning from his book: generalist quants, integer differencing, time bars, fixed-horizon labels, overlapping samples, k-fold leakage and backtest overfitting, with the fix for each. Slide-led talk with audience Q and A.

Claims:
- Traditional linear models on traditional data left little alpha, and alternative data needs nonlinear tools. "result there is very little alpha left" [0:04:06]
- The book began as a manual to train new recruits, and he wrote it in 2017. "a manual that would train new recruits" [0:05:22]
- Financial machine learning differs from machine learning applied to finance because financial data has its own properties. "is not machine learning applies to finance" [0:08:53]
- Quants should specialize in one stage of the pipeline instead of being forced into portfolio manager roles. "the direction of becoming a portfolio manager" [0:11:45]
- Fractional differencing at d about 0.4 passes a unit root test while keeping a 0.995 correlation to the original series. "is still very high" [0:20:39]
- Sample by information arrival with volume, dollar and dollar-imbalance bars instead of time bars; imbalance in order flow signals informed traders. "apply volume bars dollar bars dollar imbalance" [0:26:06]
- Triple-barrier labels (profit take, stop loss, maximum holding time) fit real trading better than fixed-horizon returns; meta-labeling raises precision at the cost of recall. "a maximum not for a fixed horizon" [0:30:44]
- Weight overlapping observations by uniqueness; use purging and embargo to remove train-test leakage in cross-validation. "this with embargo you need to remove" [0:38:38]
- Backtest overfitting grows with the number of trials; the deflated Sharpe ratio raises the hurdle with trial count and variance of Sharpe estimates. "the sh ratios that you have estimated" [0:40:24]
- Combinatorial purged cross-validation generates many paths and gives a distribution of Sharpe ratios, so the median is harder to overfit than a single path. "combinatorial cross validation how can we generate" [0:47:13]
- Large funds need an industrial lab; small alpha capacity stays open to small teams, and more data sets are expanding opportunity. "lab structure like this sort of industrial" [0:54:57]


Worked:
- The numeric differencing example (d about 0.4, correlation 0.995 against price) shows the tradeoff between stationarity and memory. "a degree of something like 0 4" [0:20:22]
- Ensembling is described as one of the few free lunches because it lowers variance. "of course but in most cases ensemble" [0:51:41]

Failed:
- K-fold cross-validation leaks information when observations are serially correlated. "is how do we do cross validation" [0:35:46]
- Fixed-horizon labels ignore stop-outs and margin calls. "labels are essentially taking the return the" [0:28:23]
- Single-path backtests are easy to overfit by repeated tuning. "pit for number seven is back overfitting" [0:39:11]
- Academic claims of market efficiency may come from over-differenced series. "essentially one of the claims that academia" [0:23:08]
