# Performance functions and reinforcement learning for trading systems and portfolios <!-- voice-ignore-line -->

Topic: Reinforcement Learning Trading  
Also tagged: Reinforcement Learning Trading  
OpenAlex: https://openalex.org/W1977051850  
Bead: `bkt-q5moa.19`

| Field | Value |
|---|---|
| Authors | John E. Moody, Lizhong Wu, Yuansong Liao, Matthew Saffell | <!-- voice-ignore-line -->
| Year | 1998 |
| Venue | Journal of Forecasting | <!-- voice-ignore-line -->
| DOI | https://doi.org/10.1002/(sici)1099-131x(1998090)17:5/6<441::aid-for707>3.0.co;2-# |
| Cited by | 386 as of 2026-11-27 |
| Cited by inside this set | 19 |

## Method

Reinforcement learning. Assigned by keyword match on title and abstract.

## Main Result

Sentences from the abstract that state the finding:

<!-- voice-ignore-next 1 -->
> For a long/short trader, we find that maximizing the differential Sharpe ratio yields more consistent results than maximizing profits, and that both methods outperform a trading system based on forecasts that minimize MSE.
<!-- voice-ignore-next 1 -->
> We find that portfolio traders trained to maximize the differential Sharpe ratio achieve better risk-adjusted returns than those trained to maximize profit.

## Replication

No replication on file in 09-strategies or lab/RESULTS.md.

## Abstract

<!-- voice-ignore-next 1 -->
> We propose to train trading systems and portfolios by optimizing objective functions that directly measure trading and investment performance. Rather than basing a trading system on forecasts or training via a supervised learning algorithm using labelled trading data, we train our systems using recurrent reinforcement learning (RRL) algorithms. The performance functions that we consider for reinforcement learning are profit or wealth, economic utility, the Sharpe ratio and our proposed differential Sharpe ratio. The trading and portfolio management systems require prior decisions as input in order to properly take into account the effects of transactions costs, market impact, and taxes. This temporal dependence on system state requires the use of reinforcement versions of standard recurrent learning algorithms. We present empirical results in controlled experiments that demonstrate the efficacy of some of our methods for optimizing trading systems and portfolios. For a long/short trader, we find that maximizing the differential Sharpe ratio yields more consistent results than maximizing profits, and that both methods outperform a trading system based on forecasts that minimize MSE. We find that portfolio traders trained to maximize the differential Sharpe ratio achieve better risk-adjusted returns than those trained to maximize profit. Finally, we provide simulation results for an S&P 500/TBill asset allocation system that demonstrate the presence of out-of-sample predictability in the monthly S&P 500 stock index for the 25 year period 1970 through 1994. Copyright © 1998 John Wiley & Sons, Ltd.
