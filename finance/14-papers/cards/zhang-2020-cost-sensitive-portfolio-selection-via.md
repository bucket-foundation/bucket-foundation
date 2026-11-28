# Cost-Sensitive Portfolio Selection via Deep Reinforcement Learning <!-- voice-ignore-line -->

Topic: Reinforcement Learning Trading  
Also tagged: Reinforcement Learning Trading  
OpenAlex: https://openalex.org/W3011631586  
Bead: `bkt-q5moa.19`

| Field | Value |
|---|---|
| Authors | Yifan Zhang, Peilin Zhao, Bin Li, Qingyao Wu, Junzhou Huang, Mingkui Tan | <!-- voice-ignore-line -->
| Year | 2020 |
| Venue | IEEE Transactions on Knowledge and Data Engineering | <!-- voice-ignore-line -->
| DOI | https://doi.org/10.1109/tkde.2020.2979700 |
| Cited by | 155 as of 2026-11-27 |
| Cited by inside this set | 1 |

## Method

Reinforcement learning. Assigned by keyword match on title and abstract.

## Main Result

Sentences from the abstract that state the finding:

<!-- voice-ignore-next 1 -->
> We theoretically analyze the near-optimality of the proposed reward, which shows that the growth rate of the policy regarding this reward function can approach the theoretical optimum.
<!-- voice-ignore-next 1 -->
> Promising results demonstrate the effectiveness and superiority of the proposed method in terms of profitability, cost-sensitivity and representation abilities.

## Replication

No replication on file in 09-strategies or lab/RESULTS.md.

## Abstract

<!-- voice-ignore-next 1 -->
> Portfolio Selection is an important real-world financial task and has attracted extensive attention in artificial intelligence communities. This task, however, has two main difficulties: (i) the non-stationary price series and complex asset correlations make the learning of feature representation very hard; (ii) the practicality principle in financial markets requires controlling both transaction and risk costs. Most existing methods adopt handcraft features and/or consider no constraints for the costs, which may make them perform unsatisfactorily and fail to control both costs in practice. In this paper, we propose a cost-sensitive portfolio selection method with deep reinforcement learning. Specifically, a novel two-stream portfolio policy network is devised to extract both price series patterns and asset correlations, while a new cost-sensitive reward function is developed to maximize the accumulated return and constrain both costs via reinforcement learning. We theoretically analyze the near-optimality of the proposed reward, which shows that the growth rate of the policy regarding this reward function can approach the theoretical optimum. We also empirically evaluate the proposed method on real-world datasets. Promising results demonstrate the effectiveness and superiority of the proposed method in terms of profitability, cost-sensitivity and representation abilities.
