# Scalable and Efficient Bayes-Adaptive Reinforcement Learning Based on Monte-Carlo Tree Search <!-- voice-ignore-line -->

Topic: Reinforcement Learning Trading  
Also tagged: Reinforcement Learning Trading  
OpenAlex: https://openalex.org/W2149586740  
Bead: `bkt-q5moa.19`

| Field | Value |
|---|---|
| Authors | Arthur Guez, David Silver, Peter Dayan | <!-- voice-ignore-line -->
| Year | 2013 |
| Venue | Journal of Artificial Intelligence Research | <!-- voice-ignore-line -->
| DOI | https://doi.org/10.1613/jair.4117 |
| Cited by | 120 as of 2026-11-27 |
| Cited by inside this set | 0 |

## Method

Reinforcement learning. Assigned by keyword match on title and abstract.

## Main Result

Sentences from the abstract that state the finding:

<!-- voice-ignore-next 1 -->
> This enables it to outperform previous Bayesian model-based reinforcement learning algorithms by a significant margin on several well-known benchmark problems.
<!-- voice-ignore-next 1 -->
> As we show, our approach can even work in problems with an infinite state space that lie qualitatively out of reach of almost all previous work in Bayesian exploration.

## Replication

No replication on file in 09-strategies or lab/RESULTS.md.

## Abstract

<!-- voice-ignore-next 1 -->
> Bayesian planning is a formally elegant approach to learning optimal behaviour under model uncertainty, trading off exploration and exploitation in an ideal way. Unfortunately, planning optimally in the face of uncertainty is notoriously taxing, since the search space is enormous. In this paper we introduce a tractable, sample-based method for approximate Bayes-optimal planning which exploits Monte-Carlo tree search. Our approach avoids expensive applications of Bayes rule within the search tree by sampling models from current beliefs, and furthermore performs this sampling in a lazy manner. This enables it to outperform previous Bayesian model-based reinforcement learning algorithms by a significant margin on several well-known benchmark problems. As we show, our approach can even work in problems with an infinite state space that lie qualitatively out of reach of almost all previous work in Bayesian exploration.
