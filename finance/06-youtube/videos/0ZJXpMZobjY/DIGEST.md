<!-- voice-ignore-file: transcript-derived digest -->
# Building a Polymarket AI Trading Bot From Scratch | All About AI | 0ZJXpMZobjY | 0.4 h

Teaches: How to have an AI coding agent (Claude Code) build a Polymarket bot for the 5-minute Bitcoin up/down market by copying the strategy of a leaderboard trader, plus a live dashboard. Framed by the speaker as a fun experiment, not an income plan.

Claims:
- The 5-minute BTC up/down market is the highest-frequency market on Polymarket. "highest frequency you can do on polymarket" [0:01:04]
- Research agents found the copied trader (Bone Reaper) does late-window conversion scalping with no directional prediction: holds to resolution and buys when price is above 0.9, with 180,000 trades in a week and about $20,000 P&L over 6 days. "180 000 trade over the last week" [0:08:59]
- Latency matters little for this strategy but matters a lot for arbitrage strategies; the speaker's system is too far from the server for those. "i'm my system is just too far" [0:11:38]
- Wallet setup was done by Claude Code with the private key kept in an ENV file and not printed; the exchange also needs a token allowance, which was missed until after the dry run. "our setup and hopefully now cloud code" [0:10:32]
- Refined rules: trade only in the last 35 seconds and skip the final 8 seconds, leaving about a 20 second window. "trade in the last 35 seconds" [0:15:23]
- Speaker says it will not make you rich and warns against putting in real money before extensive testing. "have done a lot of extensive testing" [0:23:04]

Architecture:
- Data: Polymarket docs pasted into a docs file; public on-chain history of the copied trader; live order book and spot price readers. "pasting the address aka bone reader let's" [0:07:32]
- Signal: rule-based late-window entry when ask price is at or above a cap (0.95 to 0.97), no price prediction. "will only enter when it's 0 97" [0:10:20]
- Execution: Polymarket SDK order placement on Polygon with USDC.e plus gas, dry run first, then live with $30. "client next and place a test order" [0:06:03]
- Dashboard: React Vite Bloomberg-style UI with trade flash, equity, decision log. "ui dashboard to keep track of the trade" [0:16:24]

Worked:
- First live test of $5 gave about $2 up, 7%. "running this bot live as a test" [0:13:45]
- After about 1 hour the balance was near $34 from $30, and after about 2 hours almost $4 up with no losing trades (unverified, tiny sample). "started on 30 we are almost $4" [0:22:02]

Failed:
- Token allowance not set before going live, caught after the dry run. "dry bot run has completed before going" [0:12:19]
- One trade resolved unexpectedly fast and the speaker was unsure what happened; no resolution display in the UI. "see i think it actually did resolve" [0:19:47]
- Speaker warns all trades so far were profitable but a single miscalculation could erase gains. "will probably lose by far the gains" [0:22:35]
