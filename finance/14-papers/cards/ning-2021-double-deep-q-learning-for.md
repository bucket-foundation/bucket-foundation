# Double Deep Q-Learning for Optimal Execution <!-- voice-ignore-line -->

Topic: Reinforcement Learning Trading  
Also tagged: Reinforcement Learning Trading  
OpenAlex: https://openalex.org/W3122116365  
Bead: `bkt-q5moa.19`

| Field | Value |
|---|---|
| Authors | Brian Ning, Franco Ho Ting Ling, Sebastian Jaimungal | <!-- voice-ignore-line -->
| Year | 2021 |
| Venue | Applied Mathematical Finance | <!-- voice-ignore-line -->
| DOI | https://doi.org/10.1080/1350486x.2022.2077783 |
| Cited by | 159 as of 2026-11-27 |
| Cited by inside this set | 2 |

## Method

Neural network model. Assigned by keyword match on title and abstract.

## Main Result

Sentences from the abstract that state the finding:

<!-- voice-ignore-next 1 -->
> We apply our model to nine different stocks and find that it outperforms the standard benchmark approach on most stocks using the measures of (i) mean and median out-performance, (ii) probability of out-performance, and (iii) gain-loss ratios.

## Replication

No replication on file in 09-strategies or lab/RESULTS.md.

## Abstract

<!-- voice-ignore-next 1 -->
> Optimal trade execution is an important problem faced by essentially all traders. Much research into optimal execution uses stringent model assumptions and applies continuous time stochastic control to solve them. Here, we instead take a model free approach and develop a variation of Deep Q-Learning to estimate the optimal actions of a trader. The model is a fully connected Neural Network trained using Experience Replay and Double DQN with input features given by the current state of the limit order book, other trading signals, and available execution actions, while the output is the Q-value function estimating the future rewards under an arbitrary action. We apply our model to nine different stocks and find that it outperforms the standard benchmark approach on most stocks using the measures of (i) mean and median out-performance, (ii) probability of out-performance, and (iii) gain-loss ratios.
