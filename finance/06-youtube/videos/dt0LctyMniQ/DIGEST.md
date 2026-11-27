<!-- voice-ignore-file -->
# Reinforcement Learning in Finance: Unlocking AI-Driven Trading Strategies with Dr. Paul Bilokon | QuantInsti Quantitative Learning | dt0LctyMniQ | 0.92 h

Teaches: A webinar lecture on reinforcement learning for finance: how RL differs from supervised learning, the agent, state and policy setup, its history from checkers to Go, and audience Q and A on strategies and crowding.

Claims and warnings. Figures and results are self-reported by the speakers and unverified.

- Programming machines needs very specific instructions, which motivates systems that learn from goals instead. "when you program these machines you have to be very specific" [0:06:30]
- Black-Scholes hedging was solved analytically only with a closed-form PDE solution that rests on market assumptions. "most pds don't have closed form solutions" [0:11:11]
- Reinforcement learning needs no exact model, only an environment that gives feedback, and in finance profit and loss is that feedback. "you don't necessarily need to have an exact model" [0:11:43]
- RL works from evaluative feedback and maximizes a reward signal, not examples of correct behavior and not a search for hidden structure. "reinforcement learning is concerned with maximizing a reward signal" [0:12:35]
- Discounting makes later rewards count less and makes infinite reward sums converge, which the speaker calls a useful mathematical trick. "it's also a useful mathematical trick because it enables the convergence" [0:16:01]
- The reward hypothesis, that goals reduce to one number, is described as dubious because real objectives are not all financial. "not everything can be reduced to a single number" [0:16:41]
- A policy maps a state to an action, either deterministic or a stochastic choice among actions. "whenever i'm in state s i'll always take action a" [0:18:41]
- Retail traders who read a beginner book and trade their own money often lose it all. "they get burnt they lose all their money" [0:23:18]
- An options hedging use case wants a strategy that replicates the contract, not speculation, with continual rebalancing as the market moves. "perfectly replicates the options contract" [0:25:22]
- RL history to read: checkers studies in the 1960s, then TD-Gammon in the 1990s which produced temporal difference learning. "where some of the algorithms such as the temporal difference learning" [0:29:06]
- Deep RL reached human-level control in 2015 on Atari with deep Q networks despite an enormous state space. "human level control through deep reinforcement learning" [0:34:39]
- Q and A on a model with 100 signals: the classical view is feature selection. "the classical way of looking at it is as a problem of feature selection" [0:45:35]
- Warning on selling options: the volatility risk premium can be collected but it needs great care, like picking up pennies in front of a steamroller. "you need to be very careful because you remember the classical comparison of picking pennies" [0:49:21]
- Crowding depends on capacity: a high-capacity strategy traded small by two parties does not interfere, while a low-capacity one cannot feed both. "if the capacity of the strategy is quite low then there may not be enough for the two of you" [0:50:43]
- Once a strategy is publicized and a critical mass uses it, it usually stops working, though some persist. "the moment the strategy is publicized and there is a critical mass of people" [0:51:14]
