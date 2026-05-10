# Value Bonuses using Ensemble Errors for Exploration in Reinforcement Learning

- **arXiv ID**: `2602.12375`
- **URL**: https://arxiv.org/abs/2602.12375
- **Authors**: Abdul Wahab, Raksha Kumaraswamy, Martha White
- **Published**: 2026-02-12T20:12:17Z
- **Updated**: 2026-02-12T20:12:17Z
- **Primary category**: cs.LG
- **All categories**: cs.LG, cs.AI
- **Captured**: 2026-05-10T19:24:56

## Abstract

Optimistic value estimates provide one mechanism for directed exploration in reinforcement learning (RL). The agent acts greedily with respect to an estimate of the value plus what can be seen as a value bonus. The value bonus can be learned by estimating a value function on reward bonuses, propagating local uncertainties around rewards. However, this approach only increases the value bonus for an action retroactively, after seeing a higher reward bonus from that state and action. Such an approach does not encourage the agent to visit a state and action for the first time. In this work, we introduce an algorithm for exploration called Value Bonuses with Ensemble errors (VBE), that maintains an ensemble of random action-value functions (RQFs). VBE uses the errors in the estimation of these RQFs to design value bonuses that provide first-visit optimism and deep exploration. The key idea is to design the rewards for these RQFs in such a way that the value bonus can decrease to zero. We show that VBE outperforms Bootstrap DQN and two reward bonus approaches (RND and ACB) on several classic environments used to test exploration and provide demonstrative experiments that it can scale easily to more complex environments like Atari.
