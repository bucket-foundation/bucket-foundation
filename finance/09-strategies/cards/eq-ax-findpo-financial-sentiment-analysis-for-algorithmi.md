# FinDPO: Financial Sentiment Analysis for Algorithmic Trading through Preference Optimization of LLMs

ID: `eq-ax-findpo-financial-sentiment-analysis-for-algorithmi`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: arXiv q-fin.TR or q-fin.PM 2015 to 2026

## Logic

From the abstract: Uniquely, the FinDPO framework enables the integration of a fine-tuned causal LLM into realistic portfolio strategies through a new 'logit-to-score' conversion, which transforms discrete sentiment predictions into continuous, rankable sentiment scores (probabilities).

## Source

1. FinDPO: Financial Sentiment Analysis for Algorithmic Trading through Preference Optimization of LLMs. Giorgos Iacovides and co-authors, 2025, arXiv 2507.18417. https://arxiv.org/abs/2507.18417 (arXiv API, fetched 2026-11-27)

## Claimed Edge

The abstract reports: The proposed FinDPO achieves state-of-the-art performance on standard sentiment classification benchmarks, outperforming existing supervised fine-tuned models by 11% on the average. In this way, simulations demonstrate that FinDPO is the first sentiment-based approach to maintain large positive returns of 67% annually and strong risk-adjusted performance, as indicated by a Sharpe ratio of 2.0, even under realistic transaction costs of 5 basis points (bps).

## Post-Publication Decay

Single arXiv study with no out-of-sample follow-up fetched. Grade C.

## Capacity

Unknown; the abstract gives no capacity figure. Treat as Small until tested.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
