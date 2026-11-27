<!-- voice-ignore-file -->
# How To Build A Self-Improving AI Trading Agent (Insanely Cool) | Lewis Jackson | 6njREUQAFdg | 0.30 h

Teaches: A walkthrough of wiring a Hermes agent to a crypto strategy on Railway so it reviews trades weekly and updates scorer weights. The creator trades real money and promotes the setup.

Claims and warnings. Figures and results are self-reported by the speakers and unverified.

- The aim is a loop where a prompt builds a strategy, the outcome is scored, and the result writes the next prompt. "an agent that's able to learn from its mistakes and make improvements on the strategy" [0:00:03]
- Reliability means the agent keeps running on a server even when the local computer is off. "reliable is it's always operating 24/7" [0:03:26]
- The agent needs an explicit goal with success and failure defined, such as a minimum Sharpe ratio and maximum drawdown. "we need to define what is success and what is failure" [0:04:06]
- The speaker says about 90% of strategy builders lack a defined destination or definition of success. "90% of people right now" [0:03:52]
- He says his strategy has run six to eight weeks and logged over 1.5 million data points. "it's got over a million and a half data points that it's analyzed" [0:10:00]
- Self-reported: Self-reported: his stated target is a 47% return per 30 days, inside a challenge to turn 50,000 pounds into 500,000 in a year. "the maximum return 30 days" [0:10:56]
- The generated strategy file holds a 12-position cap, slippage tolerance, gas reserve and scorer weights. "The maximum amount of positions I'm going to hold is 12" [0:13:51]
- Trade history of 24 winners and 22 losers is converted into a ledger the agent can read. "It's now just seen 24 gain trades and 22 loss trades" [0:13:22]
- The target set is a minimum Sharpe of 1 with a maximum drawdown limit. "minimum sharp of one" [0:15:32]
- The first cycle is read-only; the user flips the strategy mode to live after approving. "The first cycle is read-only and review-only" [0:15:43]
- One agent reviews trades weekly and a second agent tunes filter thresholds, with a three-day offset. "Hermes reviews the trades weekly" [0:16:21]
