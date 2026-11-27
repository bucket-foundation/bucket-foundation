# Financial portfolio optimization with online deep reinforcement learning and restricted stacked autoencoder—DeepBreath <!-- voice-ignore-line -->

Topic: Reinforcement Learning Trading  
Also tagged: Reinforcement Learning Trading  
OpenAlex: https://openalex.org/W3016693931  
Bead: `bkt-q5moa.19`

| Field | Value |
|---|---|
| Authors | Farzan Soleymani, Eric Paquet | <!-- voice-ignore-line -->
| Year | 2020 |
| Venue | Expert Systems with Applications | <!-- voice-ignore-line -->
| DOI | https://doi.org/10.1016/j.eswa.2020.113456 |
| Cited by | 209 as of 2026-11-27 |
| Cited by inside this set | 4 |

## Method

Reinforcement learning. Assigned by keyword match on title and abstract.

## Main Result

Sentences from the abstract that state the finding:

<!-- voice-ignore-next 1 -->
> The results show that the return of investment achieved by our approach outperforms current expert investment strategies while minimizing the market risk.

## Replication

No replication on file in 09-strategies or lab/RESULTS.md.

## Abstract

<!-- voice-ignore-next 1 -->
> The process of continuously reallocating funds into financial assets, aiming to increase the expected return of investment and minimizing the risk, is known as portfolio management. In this paper, a portfolio management framework is developed based on a deep reinforcement learning framework called DeepBreath. The DeepBreath methodology combines a restricted stacked autoencoder and a convolutional neural network (CNN) into an integrated framework. The restricted stacked autoencoder is employed in order to conduct dimensionality reduction and features selection, thus ensuring that only the most informative abstract features are retained. The CNN is used to learn and enforce the investment policy which consists of reallocating the various assets in order to increase the expected return on investment. The framework consists of both offline and online learning strategies: the former is required to train the CNN while the latter handles concept drifts i.e. a change in the data distribution resulting from unforeseen circumstances. These are based on passive concept drift detection and online stochastic batching. Settlement risk may occur as a result of a delay in between the acquisition of an asset and its payment failing to deliver the terms of a contract. In order to tackle this challenging issue, a blockchain is employed. Finally, the performance of the DeepBreath framework is tested with four test sets over three distinct investment periods. The results show that the return of investment achieved by our approach outperforms current expert investment strategies while minimizing the market risk.
