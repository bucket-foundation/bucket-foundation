## Deep Read

Source: open-access FAU Erlangen-Nurnberg IWF Discussion Paper 11/2017 via EconStor, the version published in the European Journal of Operational Research 270(2), 2018. Read 2026-11-27.

### Research Question

Do LSTM networks predict next-day relative performance of S&P 500 stocks better than random forests, standard deep nets and logistic regression, and where does any profit come from?

### Data and Sample

Daily total returns for S&P 500 constituents, with survivorship-free monthly membership lists, from January 1990 to October 2015 (Table 1). Trading runs from December 1992 to October 2015.

### Method

Following Krauss et al. (2017), the sample splits into study periods of 750 training days and 250 trading days, rolled forward without overlap. Inputs are sequences of 240 standardized past daily returns for each stock. The target is whether a stock beats the cross-sectional median return the next day. An LSTM with one layer of 25 cells and dropout is trained with RMSprop and early stopping. Benchmarks: random forest (RAF), a feedforward deep net (DNN) and logistic regression (LOG). Each day the strategy buys the k = 10 stocks with the highest predicted probability and shorts the 10 lowest, equal-weighted; costs are 5 basis points per half-turn. Accuracy is compared with Diebold-Mariano tests (Table 2); returns, risk and Sharpe ratios in Table 3; sources of profit in Table 4.

### Main Results

Abstract and Table 3, before costs: the LSTM k = 10 portfolio earns 0.46 percent a day with a Sharpe ratio of 5.8.

Table 3, after costs: the LSTM earns 82.29 percent a year with 33.23 percent volatility, Sharpe 2.34 and maximum drawdown 52.33 percent; RAF earns 67.87 percent, Sharpe 1.87; DNN 24.60 percent; LOG 7.11 percent, with daily mean 0.06 percent and t = 1.67, insignificant; the market 9.25 percent. The LSTM's 1 percent daily VaR is minus 5.45 percent.

Over time: strong results 1993 to 2000; a weaker period 2001 to 2009; from 2010 to October 2015 the random forest loses more than $1 per $1 average daily investment, while the LSTM roughly breaks even after costs.

Table 4: stocks the LSTM picks have high volatility and a short-term reversal profile. A rule that buys the 10 biggest 5-day losers and shorts the 10 biggest 5-day winners earns 0.23 percent a day before costs and 0.03 percent after; it explains 52.1 percent of the variance of LSTM long returns and 53.6 percent of short returns. The rest, about 31 basis points a day before costs, is attributed to more complex patterns.

### Robustness

Several k values, Diebold-Mariano and Pesaran-Timmermann tests (Table 2), and subperiod analysis.

### Stated Limits

The authors say a backtest cannot separate true inefficiency from limits to arbitrage. Costs of 5 basis points per half-turn may understate the cost of trading the most volatile S&P 500 stocks daily. Profits faded after 2010.

### Retail Systematic Trader

The edge is mostly one-week reversal in volatile large caps, traded daily with 100 percent turnover on each leg. After 2010 the LSTM only broke even after 5 basis points per side, and a retail trader pays more than that on spread, borrow and slippage, so the strategy as published is not tradeable at retail scale. The paper is a useful template for walk-forward model comparison with Diebold-Mariano tests, and a reminder that deep models can rediscover simple anomalies.
