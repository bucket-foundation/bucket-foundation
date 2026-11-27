# Policy Gradients with Variance Related Risk Criteria <!-- voice-ignore-line -->

Topic: Reinforcement Learning Trading  
Also tagged: Reinforcement Learning Trading  
OpenAlex: https://openalex.org/W2162849300  
Bead: `bkt-q5moa.19`

| Field | Value |
|---|---|
| Authors | Dotan Di Castro, Aviv Tamar, Shie Mannor | <!-- voice-ignore-line -->
| Year | 2012 |
| Venue | arXiv | <!-- voice-ignore-line -->
| DOI | https://doi.org/10.48550/arxiv.1206.6404 |
| Cited by | 179 as of 2026-11-27 |
| Cited by inside this set | 0 |

## Method

Reinforcement learning. Assigned by keyword match on title and abstract.

## Main Result

Sentences from the abstract that state the finding:

<!-- voice-ignore-next 1 -->
> We prove the convergence of these algorithms to local minima and demonstrate their applicability in a portfolio planning problem.

## Replication

No replication on file in 09-strategies or lab/RESULTS.md.

## Abstract

<!-- voice-ignore-next 1 -->
> Managing risk in dynamic decision problems is of cardinal importance in many fields such as finance and process control. The most common approach to defining risk is through various variance related criteria such as the Sharpe Ratio or the standard deviation adjusted reward. It is known that optimizing many of the variance related risk criteria is NP-hard. In this paper we devise a framework for local policy gradient style algorithms for reinforcement learning for variance related criteria. Our starting point is a new formula for the variance of the cost-to-go in episodic tasks. Using this formula we develop policy gradient algorithms for criteria that involve both the expected cost and the variance of the cost. We prove the convergence of these algorithms to local minima and demonstrate their applicability in a portfolio planning problem.
