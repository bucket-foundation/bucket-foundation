# FinRL: A Deep Reinforcement Learning Library for Automated Stock Trading in Quantitative Finance <!-- voice-ignore-line -->

Topic: Reinforcement Learning Trading  
Also tagged: Reinforcement Learning Trading  
OpenAlex: https://openalex.org/W3153820462  
Bead: `bkt-q5moa.19`

| Field | Value |
|---|---|
| Authors | Xiao-Yang Liu, Hongyang Yang, Qian Chen, Runjia Zhang, Liuqing Yang, Xiao, Bowen, Christina Dan Wang | <!-- voice-ignore-line -->
| Year | 2020 |
| Venue | arXiv | <!-- voice-ignore-line -->
| DOI | https://doi.org/10.48550/arxiv.2011.09607 |
| Cited by | 201 as of 2026-11-27 |
| Cited by inside this set | 1 |

## Method

Reinforcement learning. Assigned by keyword match on title and abstract.

## Main Result

Sentences from the abstract that state the finding:

<!-- voice-ignore-next 1 -->
> The FinRL library will be available on Github at link https://github.com/AI4Finance-LLC/FinRL-Library.

## Replication

Cited as a source by strategy cards: [ot-rl-trading](../../09-strategies/cards/ot-rl-trading.md). Each card grades decay after publication and retail feasibility.

## Abstract

<!-- voice-ignore-next 1 -->
> As deep reinforcement learning (DRL) has been recognized as an effective approach in quantitative finance, getting hands-on experiences is attractive to beginners. However, to train a practical DRL trading agent that decides where to trade, at what price, and what quantity involves error-prone and arduous development and debugging. In this paper, we introduce a DRL library FinRL that facilitates beginners to expose themselves to quantitative finance and to develop their own stock trading strategies. Along with easily-reproducible tutorials, FinRL library allows users to streamline their own developments and to compare with existing schemes easily. Within FinRL, virtual environments are configured with stock market datasets, trading agents are trained with neural networks, and extensive backtesting is analyzed via trading performance. Moreover, it incorporates important trading constraints such as transaction cost, market liquidity and the investor's degree of risk-aversion. FinRL is featured with completeness, hands-on tutorial and reproducibility that favors beginners: (i) at multiple levels of time granularity, FinRL simulates trading environments across various stock markets, including NASDAQ-100, DJIA, S&P 500, HSI, SSE 50, and CSI 300; (ii) organized in a layered architecture with modular structure, FinRL provides fine-tuned state-of-the-art DRL algorithms (DQN, DDPG, PPO, SAC, A2C, TD3, etc.), commonly-used reward functions and standard evaluation baselines to alleviate the debugging workloads and promote the reproducibility, and (iii) being highly extendable, FinRL reserves a complete set of user-import interfaces. Furthermore, we incorporated three application demonstrations, namely single stock trading, multiple stock trading, and portfolio allocation. The FinRL library will be available on Github at link https://github.com/AI4Finance-LLC/FinRL-Library.

## Full Text

Open-access copy: https://arxiv.org/pdf/2011.09607

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
