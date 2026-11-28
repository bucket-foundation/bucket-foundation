# Deep hedging <!-- voice-ignore-line -->

Topic: Reinforcement Learning Trading  
Also tagged: Machine Learning in Finance, Reinforcement Learning Trading  
OpenAlex: https://openalex.org/W4247451115  
Bead: `bkt-q5moa.19`

| Field | Value |
|---|---|
| Authors | Hans Buehler, Lukas Gonon, Josef Teichmann, Ben Wood | <!-- voice-ignore-line -->
| Year | 2019 |
| Venue | Quantitative Finance | <!-- voice-ignore-line -->
| DOI | https://doi.org/10.1080/14697688.2019.1571683 |
| Cited by | 720 as of 2026-11-27 |
| Cited by inside this set | 3 |

## Method

Reinforcement learning. Assigned by keyword match on title and abstract.

## Main Result

Sentences from the abstract that state the finding:

<!-- voice-ignore-next 1 -->
> We illustrate our approach by an experiment on the S&P500 index and by showing the effect on hedging under transaction costs in a synthetic market driven by the Heston model, where we outperform the standard ‘complete-market’ solution.

## Replication

No replication on file in 09-strategies or lab/RESULTS.md.

## Abstract

<!-- voice-ignore-next 1 -->
> We present a framework for hedging a portfolio of derivatives in the presence of market frictions such as transaction costs, liquidity constraints or risk limits using modern deep reinforcement machine learning methods. We discuss how standard reinforcement learning methods can be applied to non-linear reward structures, i.e. in our case convex risk measures. As a general contribution to the use of deep learning for stochastic processes, we also show in Section 4 that the set of constrained trading strategies used by our algorithm is large enough to ε-approximate any optimal solution. Our algorithm can be implemented efficiently even in high-dimensional situations using modern machine learning tools. Its structure does not depend on specific market dynamics, and generalizes across hedging instruments including the use of liquid derivatives. Its computational performance is largely invariant in the size of the portfolio as it depends mainly on the number of hedging instruments available. We illustrate our approach by an experiment on the S&P500 index and by showing the effect on hedging under transaction costs in a synthetic market driven by the Heston model, where we outperform the standard ‘complete-market’ solution.
