# Deep Robust Reinforcement Learning for Practical Algorithmic Trading <!-- voice-ignore-line -->

Topic: Reinforcement Learning Trading  
Also tagged: Reinforcement Learning Trading  
OpenAlex: https://openalex.org/W2966021938  
Bead: `bkt-q5moa.19`

| Field | Value |
|---|---|
| Authors | Yang Li, Wanshan Zheng, Zibin Zheng | <!-- voice-ignore-line -->
| Year | 2019 |
| Venue | IEEE Access | <!-- voice-ignore-line -->
| DOI | https://doi.org/10.1109/access.2019.2932789 |
| Cited by | 198 as of 2026-11-27 |
| Cited by inside this set | 5 |

## Method

Reinforcement learning. Assigned by keyword match on title and abstract.

## Main Result

Sentences from the abstract that state the finding:

<!-- voice-ignore-next 1 -->
> The experimental results show that our trading agent outperforms the baselines and achieves stable risk-adjusted returns in both the stock and the futures markets.

## Replication

No replication on file in 09-strategies or lab/RESULTS.md.

## Abstract

<!-- voice-ignore-next 1 -->
> In algorithmic trading, feature extraction and trading strategy design are two prominent challenges to acquire long-term profits. However, the previously proposed methods rely heavily on domain knowledge to extract handcrafted features and lack an effective way to dynamically adjust the trading strategy. With the recent breakthroughs of deep reinforcement learning (DRL), sequential real-world problems can be modeled and solved with a more human-like approach. In this paper, we propose a novel trading agent, based on deep reinforcement learning, to autonomously make trading decisions and gain profits in the dynamic financial markets. We extend the value-based deep Q-network (DQN) and the asynchronous advantage actor-critic (A3C) for better adapting to the trading market. Specifically, in order to automatically extract robust market representations and resolve the financial time series dependence, we utilize the stacked denoising autoencoders (SDAEs) and the long short-term memory (LSTM) as parts of the function approximator, respectively. Furthermore, we design several elaborate mechanisms to make the trading agent more practical to the real trading environment, such as position-controlled action and n-step reward. The experimental results show that our trading agent outperforms the baselines and achieves stable risk-adjusted returns in both the stock and the futures markets.
