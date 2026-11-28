# Deep Reinforcement Learning for Trading <!-- voice-ignore-line -->

Topic: Reinforcement Learning Trading  
Also tagged: Reinforcement Learning Trading  
OpenAlex: https://openalex.org/W3012223895  
Bead: `bkt-q5moa.19`

| Field | Value |
|---|---|
| Authors | Zihao Zhang, Stefan Zohren, Stephen Roberts | <!-- voice-ignore-line -->
| Year | 2020 |
| Venue | The Journal of Financial Data Science | <!-- voice-ignore-line -->
| DOI | https://doi.org/10.3905/jfds.2020.1.030 |
| Cited by | 408 as of 2026-11-27 |
| Cited by inside this set | 7 |

## Method

Reinforcement learning. Assigned by keyword match on title and abstract.

## Main Result

Sentences from the abstract that state the finding:

<!-- voice-ignore-next 1 -->
> They compare their algorithms against classical time-series momentum strategies and show that their method outperforms such baseline models, delivering positive profits despite heavy transaction costs.
<!-- voice-ignore-next 1 -->
> The experiments show that the proposed algorithms can follow large market trends without changing positions and can also scale down, or hold, through consolidation periods.

## Replication

Cited as a source by strategy cards: [fu-ax-deep-reinforcement-learning-for-trading](../../09-strategies/cards/fu-ax-deep-reinforcement-learning-for-trading.md). Each card grades decay after publication and retail feasibility.

## Abstract

<!-- voice-ignore-next 1 -->
> In this article, the authors adopt deep reinforcement learning algorithms to design trading strategies for continuous futures contracts. Both discrete and continuous action spaces are considered, and volatility scaling is incorporated to create reward functions that scale trade positions based on market volatility. They test their algorithms on 50 very liquid futures contracts from 2011 to 2019 and investigate how performance varies across different asset classes, including commodities, equity indexes, fixed income, and foreign exchange markets. They compare their algorithms against classical time-series momentum strategies and show that their method outperforms such baseline models, delivering positive profits despite heavy transaction costs. The experiments show that the proposed algorithms can follow large market trends without changing positions and can also scale down, or hold, through consolidation periods. TOPICS:Futures and forward contracts, exchanges/markets/clearinghouses, statistical methods, simulations Key Findings • In this article, the authors introduce reinforcement learning algorithms to design trading strategies for futures contracts. They investigate both discrete and continuous action spaces and improve reward functions by using volatility scaling to scale trade positions based on market volatility. • The authors discuss the connection between modern portfolio theory and the reinforcement learning reward hypothesis and show that they are equivalent if a linear utility function is used. • The authors back test their methods on 50 very liquid futures contracts from 2011 to 2019, and their algorithms deliver positive profits despite heavy transaction costs.
