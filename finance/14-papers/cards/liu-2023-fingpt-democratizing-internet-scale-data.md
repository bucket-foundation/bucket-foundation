# FinGPT: Democratizing Internet-scale Data for Financial Large Language Models <!-- voice-ignore-line -->

Topic: Reinforcement Learning Trading  
Also tagged: Reinforcement Learning Trading  
OpenAlex: https://openalex.org/W4385019067  
Bead: `bkt-q5moa.19`

| Field | Value |
|---|---|
| Authors | Xiaoyang Liu, Guoxuan Wang, Yang, Hongyang, Zha, Daochen | <!-- voice-ignore-line -->
| Year | 2023 |
| Venue | RePEc: Research Papers in Economics | <!-- voice-ignore-line -->
| DOI | https://doi.org/10.48550/arxiv.2307.10485 |
| Cited by | 316 as of 2026-11-27 |
| Cited by inside this set | 0 |

## Method

Reinforcement learning. Assigned by keyword match on title and abstract.

## Main Result

Sentences from the abstract that state the finding:

<!-- voice-ignore-next 1 -->
> Large language models (LLMs) have demonstrated remarkable proficiency in understanding and generating human-like texts, which may potentially revolutionize the finance industry.
<!-- voice-ignore-next 1 -->
> Finally, we showcase several FinGPT applications, including robo-advisor, sentiment analysis for algorithmic trading, and low-code development.

## Replication

No replication on file in 09-strategies or lab/RESULTS.md.

## Abstract

<!-- voice-ignore-next 1 -->
> Large language models (LLMs) have demonstrated remarkable proficiency in understanding and generating human-like texts, which may potentially revolutionize the finance industry. However, existing LLMs often fall short in the financial field, which is mainly attributed to the disparities between general text data and financial text data. Unfortunately, there is only a limited number of financial text datasets available, and BloombergGPT, the first financial LLM (FinLLM), is close-sourced (only the training logs were released). In light of this, we aim to democratize Internet-scale financial data for LLMs, which is an open challenge due to diverse data sources, low signal-to-noise ratio, and high time-validity. To address the challenges, we introduce an open-sourced and data-centric framework, Financial Generative Pre-trained Transformer (FinGPT), that automates the collection and curation of real-time financial data from 34 diverse sources on the Internet, providing researchers and practitioners with accessible and transparent resources to develop their FinLLMs. Additionally, we propose a simple yet effective strategy for fine-tuning FinLLM using the inherent feedback from the market, dubbed Reinforcement Learning with Stock Prices (RLSP). We also adopt the Low-rank Adaptation (LoRA, QLoRA) method that enables users to customize their own FinLLMs from general-purpose LLMs at a low cost. Finally, we showcase several FinGPT applications, including robo-advisor, sentiment analysis for algorithmic trading, and low-code development. FinGPT aims to democratize FinLLMs, stimulate innovation, and unlock new opportunities in open finance. The codes have been open-sourced.
