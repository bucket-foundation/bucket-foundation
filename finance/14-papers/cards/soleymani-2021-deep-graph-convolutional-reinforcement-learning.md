# Deep graph convolutional reinforcement learning for financial portfolio management – DeepPocket <!-- voice-ignore-line -->

Topic: Reinforcement Learning Trading  
Also tagged: Reinforcement Learning Trading  
OpenAlex: https://openalex.org/W3158701715  
Bead: `bkt-q5moa.19`

| Field | Value |
|---|---|
| Authors | Farzan Soleymani, Eric Paquet | <!-- voice-ignore-line -->
| Year | 2021 |
| Venue | Expert Systems with Applications | <!-- voice-ignore-line -->
| DOI | https://doi.org/10.1016/j.eswa.2021.115127 |
| Cited by | 114 as of 2026-11-27 |
| Cited by inside this set | 0 |

## Method

Reinforcement learning. Assigned by keyword match on title and abstract.

## Main Result

Sentences from the abstract that state the finding:

<!-- voice-ignore-next 1 -->
> DeepPocket is evaluated against five real-life datasets over three distinct investment periods, including during the Covid-19 crisis, and clearly outperformed market indexes.

## Replication

No replication on file in 09-strategies or lab/RESULTS.md.

## Abstract

Taken from the open-access full text; OpenAlex holds none.

<!-- voice-ignore-next 1 -->
> Portfolio management aims at maximizing the return on investment while minimizing risk by continuously reallocating the assets forming the portfolio. These assets are not independent but correlated during a short time period. A graph convolutional reinforcement learning framework called DeepPocket is proposed whose objective is to exploit the time-varying interrelations between financial instruments. These interrelations are represented by a graph whose nodes correspond to the financial instruments while the edges correspond to a pair-wise correlation function in between assets. DeepPocket consists of a restricted, stacked autoencoder for feature extraction, a convolutional network to collect underlying local information shared among financial instruments and an actor–critic reinforcement learning agent. The actor–critic structure contains two convolutional networks in which the actor learns and enforces an investment policy which is, in turn, evaluated by the critic in order to determine the best course of action by constantly reallocating the various portfolio assets to optimize the expected return on investment. The agent is initially trained offline with online stochastic batching on historical data. As new data become available, it is trained online with a passive concept drift approach to handle unexpected changes in their distributions. DeepPocket is evaluated against five real-life datasets over three distinct investment periods, including during the Covid-19 crisis, and clearly outperformed market indexes.

## Full Text

Open-access copy: https://arxiv.org/pdf/2105.08664
