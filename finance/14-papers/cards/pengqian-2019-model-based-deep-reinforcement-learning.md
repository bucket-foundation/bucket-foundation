# Model-based Deep Reinforcement Learning for Dynamic Portfolio Optimization <!-- voice-ignore-line -->

Topic: Reinforcement Learning Trading  
Also tagged: Reinforcement Learning Trading  
OpenAlex: https://openalex.org/W2912823139  
Bead: `bkt-q5moa.19`

| Field | Value |
|---|---|
| Authors | Yu, Pengqian, Lee Joon Sern, Ilya Kulyatin, Zekun Shi, Sakyasingha Dasgupta | <!-- voice-ignore-line -->
| Year | 2019 |
| Venue | arXiv | <!-- voice-ignore-line -->
| DOI | https://doi.org/10.48550/arxiv.1901.08740 |
| Cited by | 136 as of 2026-11-27 |
| Cited by inside this set | 3 |

## Method

Reinforcement learning. Assigned by keyword match on title and abstract.

## Main Result

Sentences from the abstract that state the finding:

<!-- voice-ignore-next 1 -->
> Using historical {\em real} financial market data, we simulate trading with practical constraints, and demonstrate that our proposed model is robust, profitable and risk-sensitive, as compared to baseline trading strategies and model-free RL agents from prior work.

## Replication

No replication on file in 09-strategies or lab/RESULTS.md.

## Abstract

<!-- voice-ignore-next 1 -->
> Dynamic portfolio optimization is the process of sequentially allocating wealth to a collection of assets in some consecutive trading periods, based on investors' return-risk profile. Automating this process with machine learning remains a challenging problem. Here, we design a deep reinforcement learning (RL) architecture with an autonomous trading agent such that, investment decisions and actions are made periodically, based on a global objective, with autonomy. In particular, without relying on a purely model-free RL agent, we train our trading agent using a novel RL architecture consisting of an infused prediction module (IPM), a generative adversarial data augmentation module (DAM) and a behavior cloning module (BCM). Our model-based approach works with both on-policy or off-policy RL algorithms. We further design the back-testing and execution engine which interact with the RL agent in real time. Using historical {\em real} financial market data, we simulate trading with practical constraints, and demonstrate that our proposed model is robust, profitable and risk-sensitive, as compared to baseline trading strategies and model-free RL agents from prior work.
