<!-- voice-ignore-file: transcript-derived digest -->
# How to combine Alpha Strategies to create a good Portfolio? | Explained | QuantInsti Quantitative Learning | _eO48tVDjv0 | 0.11 h

Teaches: A QuantInsti explainer on combining several alpha strategies into one portfolio, from equal weights to regime switching and no-regret online learning.

Claims:
- An equal-vote average portfolio is an in-sample strategy whose voting weights do not change over time, "all the strategies has equal vote". [0:00:01]-[0:01:02]
- Regime switching portfolios use hidden Markov models or change point analysis to detect when strategy parameters shift and capital should be reallocated, "change point analysis". [0:00:01]-[0:01:02]
- Online learning methods such as no regret adapt weights to the most recent performance, measured by Sharpe ratio or risk measures, "adaptive about your weighing based on the most recent performance". [0:01:02]-[0:02:02]
- No regret treats alpha strategies as slot machines in a multi-armed bandit, an exploration versus exploitation problem solved with exponential weighting, "exploration versus exploitation problem". [0:02:02]-[0:03:03]
- The weights are updated multiplicatively at a learning rate theta, balancing exploration and exploitation, "we are doing the multiplicative updates". [0:02:02]-[0:03:03]

Framework: Alpha-strategy allocation runs from static equal weights, to regime switching, to adaptive online learning, "no regret is one of them". [0:00:01]-[0:03:03]

Worked:
- The slot-machine analogy: with four machines you explore each, then go heavily on the one with an edge. [0:01:02]-[0:02:02]

Failed:
- The speaker says the no-regret approach will not work in a sideways market, "in a sideways market it will not work". [0:03:03]
