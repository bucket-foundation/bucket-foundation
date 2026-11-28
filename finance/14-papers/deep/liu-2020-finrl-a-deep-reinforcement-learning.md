## Deep Read

Source: open-access arXiv 2011.09607 version 2, March 2022, of the paper first presented at the NeurIPS 2020 Deep RL Workshop. Read 2026-11-27.

### Research Question

Can an open-source library give beginners a reproducible pipeline to build, train and backtest deep reinforcement learning agents for stock trading?

### Data and Sample

Daily stock data pulled through the library's data processors from Yahoo Finance and other sources for NASDAQ-100, DJIA, S&P 500, HSI, SSE 50 and CSI 300 constituents. The demonstrations train on earlier data and test on January 1, 2019 to September 23, 2020.

### Method

A three-layer design: market environments built on OpenAI Gym with state (prices, holdings, cash, technical indicators), actions (buy, sell, hold quantities) and reward (change in portfolio value); agents from Stable Baselines and other libraries (DQN, DDPG, PPO, SAC, A2C, TD3); and applications. A train-validate-test flow with rolling windows. Trading constraints: flat or per-share transaction costs such as 0.1 or 0.2 percent, a bid-ask spread parameter, and a turbulence index, equation (1), the Mahalanobis distance of current returns from their history, which stops buying and starts selling when it crosses a threshold. Backtests use pyfolio.

### Main Results

Table 1, single-asset PPO agents, 2019 to September 2020: Sharpe ratios of 1.49 on SPY, 1.16 on QQQ, 1.12 on GOOGL, 1.40 on AMZN, 1.35 on AAPL and 1.10 on MSFT against 0.74 for the S&P 500; the SPY agent returns 14.89 percent a year with a 20.93 percent maximum drawdown against 17.81 percent and 33.92 percent for the index.

Table 2, DJIA constituents: TD3 agents return 21.40 or 17.61 percent a year with Sharpe ratios of 1.38 and 1.03, DDPG 20.34 or 15.81 percent with 1.28 and 0.98, against 8.38 percent and 0.44 for minimum variance and 10.61 percent and 0.48 for the DJIA. Maximum drawdowns are 11.5 to 13.7 percent against 37.01 percent for the DJIA.

### Robustness

None beyond two cost settings shown side by side in Table 2. The test window is under two years and includes the March 2020 crash, where the turbulence rule moves the agent to cash.

### Stated Limits

The authors present FinRL as educational and demonstrative. They do not report repeated runs with different random seeds, statistical tests, or results across several out-of-sample periods.

### Retail Systematic Trader

FinRL is a usable starting kit for a retail trader who wants to try reinforcement learning, with environments, cost parameters and backtesting already wired. The reported results are not evidence of an edge: one short test window, a crash that the turbulence filter sidesteps, no seed variation, and no deflation for the number of agents and settings tried. Any agent built with it should go through the lab's deflated Sharpe ratio and walk-forward tests before capital is committed.
