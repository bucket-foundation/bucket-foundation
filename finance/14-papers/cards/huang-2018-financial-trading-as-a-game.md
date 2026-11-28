# Financial Trading as a Game: A Deep Reinforcement Learning Approach <!-- voice-ignore-line -->

Topic: Reinforcement Learning Trading  
Also tagged: Reinforcement Learning Trading  
OpenAlex: https://openalex.org/W2824141369  
Bead: `bkt-q5moa.19`

| Field | Value |
|---|---|
| Authors | Chien Yi Huang | <!-- voice-ignore-line -->
| Year | 2018 |
| Venue | RePEc: Research Papers in Economics | <!-- voice-ignore-line -->
| DOI | https://doi.org/10.48550/arxiv.1807.02787 |
| Cited by | 124 as of 2026-11-27 |
| Cited by inside this set | 7 |

## Method

Reinforcement learning. Assigned by keyword match on title and abstract.

## Main Result

Sentences from the abstract that state the finding:

<!-- voice-ignore-next 1 -->
> We combine all of the above into a complete online learning algorithm and validate our approach on the spot foreign exchange market.

## Replication

No replication on file in 09-strategies or lab/RESULTS.md.

## Abstract

<!-- voice-ignore-next 1 -->
> An automatic program that generates constant profit from the financial market is lucrative for every market practitioner. Recent advance in deep reinforcement learning provides a framework toward end-to-end training of such trading agent. In this paper, we propose an Markov Decision Process (MDP) model suitable for the financial trading task and solve it with the state-of-the-art deep recurrent Q-network (DRQN) algorithm. We propose several modifications to the existing learning algorithm to make it more suitable under the financial trading setting, namely 1. We employ a substantially small replay memory (only a few hundreds in size) compared to ones used in modern deep reinforcement learning algorithms (often millions in size.) 2. We develop an action augmentation technique to mitigate the need for random exploration by providing extra feedback signals for all actions to the agent. This enables us to use greedy policy over the course of learning and shows strong empirical performance compared to more commonly used epsilon-greedy exploration. However, this technique is specific to financial trading under a few market assumptions. 3. We sample a longer sequence for recurrent neural network training. A side product of this mechanism is that we can now train the agent for every T steps. This greatly reduces training time since the overall computation is down by a factor of T. We combine all of the above into a complete online learning algorithm and validate our approach on the spot foreign exchange market.
