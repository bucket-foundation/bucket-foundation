# MlFinLab

https://github.com/hudson-and-thames/mlfinlab · proprietary license (LICENSE.txt, GitHub reports NOASSERTION) · 4,980 stars · last push 2023-10-02 · Python · checked 2026-11-27

## Architecture
Function library implementing Lopez de Prado, *Advances in Financial Machine Learning*. No engine. The public repo froze in 2023; current releases are paid and closed. The license forbids use without accepting Hudson and Thames terms.

## Data Layer
`mlfinlab/data_structures/`: time, tick, volume, dollar bars, imbalance bars and run bars from tick data. `mlfinlab/datasets/` sample tick data and ETF loaders. `mlfinlab/data_generation/`: bootstrap, correlated random walks, CorrGAN, vines, HCBM for synthetic data.

## Event Loop
None.

## Execution
None.

## Risk
`mlfinlab/bet_sizing/bet_sizing.py`: size from predicted probability, dynamic size from forecast price, budget and reserve sizing via EF3M mixture fit. `mlfinlab/backtest_statistics/statistics.py`: drawdown and time under water, Sharpe, probabilistic Sharpe, deflated Sharpe, minimum track record length, bet concentration. `mlfinlab/backtest_statistics/backtests.py`: haircut Sharpe and profit hurdle.

## Strategies Shipped
None as tradable strategies. Building blocks:
- `mlfinlab/filters/filters.py`: CUSUM filter and z-score filter pick event times.
- `mlfinlab/labeling/labeling.py`: triple-barrier labels and meta-labels.
- `mlfinlab/labeling/trend_scanning.py`: label by sign of the most significant t-value of a linear trend.
- `mlfinlab/labeling/` others: fixed horizon, bull/bear, tail sets, matrix flags, excess over mean or median, return vs benchmark.
- `mlfinlab/multi_product/etf_trick.py`: build a single tradable series from a rolling basket.
- `mlfinlab/structural_breaks/`: Chow, CUSUM, SADF bubble tests.

## AI Components
`mlfinlab/cross_validation/`: purged k-fold and combinatorial purged CV. `mlfinlab/ensemble/sb_bagging.py`: sequentially bootstrapped bagging. `mlfinlab/feature_importance/`: MDI, MDA, SFI, orthogonal features. `mlfinlab/features/fracdiff.py`: fractional differentiation. `mlfinlab/clustering/onc.py`: optimal number of clusters. No LLM.

## Connectors
None.

## Fit
Reference for overfitting control: deflated Sharpe, purged CV, triple-barrier labeling. License blocks redistribution; reimplement the needed formulas from the book.
