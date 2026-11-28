# FraudGNN-RL: A Graph Neural Network With Reinforcement Learning for Adaptive Financial Fraud Detection <!-- voice-ignore-line -->

Topic: Reinforcement Learning Trading  
Also tagged: Reinforcement Learning Trading  
OpenAlex: https://openalex.org/W4407691196  
Bead: `bkt-q5moa.19`

| Field | Value |
|---|---|
| Authors | Yiwen Cui, Xu Han, Jiaying Chen, Xinguang Zhang, Jingyun Yang, Xuguang Zhang | <!-- voice-ignore-line -->
| Year | 2025 |
| Venue | IEEE Open Journal of the Computer Society | <!-- voice-ignore-line -->
| DOI | https://doi.org/10.1109/ojcs.2025.3543450 |
| Cited by | 140 as of 2026-11-27 |
| Cited by inside this set | 0 |

## Method

Reinforcement learning. Assigned by keyword match on title and abstract.

## Main Result

Sentences from the abstract that state the finding:

<!-- voice-ignore-next 1 -->
> Extensive experiments on a large-scale, real-world financial dataset demonstrate that FraudGNN-RL outperforms state-of-the-art baselines, achieving a 97.3% F1-score and reducing false positives by 31% compared to the best-performing baseline.
<!-- voice-ignore-next 1 -->
> These results suggest that FraudGNN-RL offers a robust, adaptive, and privacy-preserving solution for financial fraud detection in the era of Big Data and interconnected financial ecosystems.

## Replication

No replication on file in 09-strategies or lab/RESULTS.md.

## Abstract

<!-- voice-ignore-next 1 -->
> As financial systems become increasingly complex and interconnected, traditional fraud detection methods struggle to keep pace with sophisticated fraudulent activities. This article introduces FraudGNN-RL, an innovative framework that combines Graph Neural Networks (GNNs) with Reinforcement Learning (RL) for adaptive and context-aware financial fraud detection. Our approach models financial transactions as a dynamic graph, where entities (e.g., users, merchants) are nodes and transactions form edges. We propose a novel GNN architecture, Temporal-Spatial-Semantic Graph Convolution (TSSGC), which simultaneously captures temporal patterns, spatial relationships, and semantic information in transaction data. The RL component, implemented as a Deep Q-Network (DQN), dynamically adjusts the fraud detection threshold and feature importance, allowing the model to adapt to evolving fraud patterns and minimize detection costs. We further introduce a Federated Learning scheme to enable collaborative model training across multiple financial institutions while preserving data privacy. Extensive experiments on a large-scale, real-world financial dataset demonstrate that FraudGNN-RL outperforms state-of-the-art baselines, achieving a 97.3% F1-score and reducing false positives by 31% compared to the best-performing baseline. Our framework also shows remarkable resilience to concept drift and adversarial attacks, maintaining high performance over extended periods. These results suggest that FraudGNN-RL offers a robust, adaptive, and privacy-preserving solution for financial fraud detection in the era of Big Data and interconnected financial ecosystems.
