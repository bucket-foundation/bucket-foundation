# Deep Hedging of Derivatives Using Reinforcement Learning <!-- voice-ignore-line -->

Topic: Reinforcement Learning Trading  
Also tagged: Reinforcement Learning Trading  
OpenAlex: https://openalex.org/W3081043352  
Bead: `bkt-q5moa.19`

| Field | Value |
|---|---|
| Authors | Jay Cao, Jacky Chen, John Hull, Zissis Poulos | <!-- voice-ignore-line -->
| Year | 2020 |
| Venue | The Journal of Financial Data Science | <!-- voice-ignore-line -->
| DOI | https://doi.org/10.3905/jfds.2020.1.052 |
| Cited by | 151 as of 2026-11-27 |
| Cited by inside this set | 1 |

## Method

Reinforcement learning. Assigned by keyword match on title and abstract.

## Main Result

Sentences from the abstract that state the finding:

<!-- voice-ignore-next 1 -->
> The authors find that a hybrid approach involving the use of an accounting P&L approach that incorporates a relatively simple valuation model works well.

## Replication

No replication on file in 09-strategies or lab/RESULTS.md.

## Abstract

<!-- voice-ignore-next 1 -->
> This article shows how reinforcement learning can be used to derive optimal hedging strategies for derivatives when there are transaction costs. The article illustrates the approach by showing the difference between using delta hedging and optimal hedging for a short position in a call option when the objective is to minimize a function equal to the mean hedging cost plus a constant times the standard deviation of the hedging cost. Two situations are considered. In the first, the asset price follows a geometric Brownian motion. In the second, the asset price follows a stochastic volatility process. The article extends the basic reinforcement learning approach in several ways. First, it uses two different Q-functions to track both the expected value of the cost and the expected value of the square of the cost. This approach increases the range of objective functions that can be used. Second, it uses a learning algorithm that allows for continuous state and action space. Third, it compares the accounting profit and loss (P&L) approach and the cash flow approach. The authors find that a hybrid approach involving the use of an accounting P&L approach that incorporates a relatively simple valuation model works well. TOPICS: Big data/machine learning, derivatives, simulations Key Findings ▪ The authors show how reinforcement learning can be used to derive optimal hedging strategies for derivatives in the presence of transaction costs. ▪ They extend the standard reinforcement learning approach by using multiple Q-functions to increase the range of objective functions that can be used and by using algorithms that allow the state space and action space to be continuous. ▪ For valuing the hedging position at each step, the authors compare three approaches: the accounting P&L, cash flow, and a hybrid involving the use of an accounting P&L approach that incorporates a relatively simple valuation model.
