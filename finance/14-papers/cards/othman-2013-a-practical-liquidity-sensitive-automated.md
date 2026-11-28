# A Practical Liquidity-Sensitive Automated Market Maker <!-- voice-ignore-line -->

Topic: Prediction Markets  
Also tagged: Prediction Markets  
OpenAlex: https://openalex.org/W4229946690  
Bead: `bkt-q5moa.19`

| Field | Value |
|---|---|
| Authors | Abraham Othman, David M. Pennock, Daniel M. Reeves, Tüomas Sandholm | <!-- voice-ignore-line -->
| Year | 2013 |
| Venue | ACM Transactions on Economics and Computation | <!-- voice-ignore-line -->
| DOI | https://doi.org/10.1145/2509413.2509414 |
| Cited by | 73 as of 2026-11-27 |
| Cited by inside this set | 0 |

## Method

Not stated in the title or abstract. Assigned by keyword match on title and abstract.

## Main Result

Sentences from the abstract that state the finding:

<!-- voice-ignore-next 1 -->
> For any level of initial liquidity we can establish a boundary in market state space such that, if the market terminates within that boundary, the market maker books a profit regardless of the realized outcome.

## Replication

No replication on file in 09-strategies or lab/RESULTS.md.

## Abstract

<!-- voice-ignore-next 1 -->
> Automated market makers are algorithmic agents that enable participation and information elicitation in electronic markets. They have been widely and successfully applied in artificial-money settings, like some Internet prediction markets. Automated market makers from the literature suffer from two problems that contribute to their impracticality and impair their use beyond artificial-money settings: first, they are unable to adapt to liquidity, so that trades cause prices to move the same amount in both heavily and lightly traded markets, and second, in typical circumstances, they run at a deficit. In this article, we construct a market maker that is both sensitive to liquidity and can run at a profit. Our market maker has bounded loss for any initial level of liquidity and, as the initial level of liquidity approaches zero, worst-case loss approaches zero. For any level of initial liquidity we can establish a boundary in market state space such that, if the market terminates within that boundary, the market maker books a profit regardless of the realized outcome.
