<!-- voice-ignore-file -->
# Full Polymarket Bot Build | Claude Code Tutorial | Sharbel A. | -F0dZ2GxSuA | 0.45 h

Teaches: A sponsored walkthrough (Bullpen CLI sponsor) of having Claude Code build a Polymarket copy-trading bot for the top 10 weekly profit traders, with a $5 fixed order size and a local dashboard. Trades live with a small account; results are self-reported.

Claims and warnings. Figures and results are self-reported by the speakers and unverified.

- The Bullpen CLI gives programmatic access to Polymarket data such as the leaderboard; the video is sponsored by Bullpen. "the team at bullpen were kind enough to sponsor this video" [0:01:19]
- The default leaderboard has no win rate, so he ranks by profit and loss for the week. "it looks like the default leaderboard doesn't include win" [0:06:31]
- Several top P and L traders show zero volume this week, meaning their profit came from earlier positions that resolved. "several top p l traders show zero volume this week" [0:07:14]
- He filters to traders active this week and copies the top 10 by weekly P and L. "how many of these top traders should the bot track and copy" [0:08:40]
- Claude is prompted to use its ask-user-question tool until it reaches clarity, so it asks about sizing and language rather than assuming. "use ask user question until you reach clarity" [0:17:48]
- Position sizing chosen: a fixed $5 per trade, not proportional to the trader's size. "i'll go with $5 per trade" [0:10:01]
- The bot polls Bullpen tracker trades every 30 seconds and copies each buy with a $5 order; sells are logged but skipped. "pulls bullpen tracker trades every 30 seconds" [0:11:27]
- On a trader's sell, the options include selling all shares, selling $5, or selling in proportion to their sell. "sell only if majority sell" [0:14:09]
- The dashboard shows P and L, win rate, executed, failed and skipped trades and refreshes every 5 seconds. "auto refreshes every 5 seconds" [0:19:13]
- Self-reported: after about 3 hours the account went from $99 to about $110 with a 37% win rate, because winners outweighed losers; he calls it 13% in 3 hours. "has a 37% win rate which might sound like a losing strategy" [0:21:54]
- Orders fail once all cash is allocated; the bot auto-redeems winnings when markets resolve. "it auto redeems the winnings" [0:24:49]
- Warning: copy trading means the bot loses whenever the copied trader loses, and skill does not transfer automatically. "when they lose i lose too that's how copy trading works" [0:25:29]
- The test ran only about 3 hours on a $99 account, too short to show an edge. "took us what less than 20 minutes all in all" [0:20:44]
