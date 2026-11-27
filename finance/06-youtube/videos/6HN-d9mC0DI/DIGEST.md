<!-- voice-ignore-file: transcript-derived digest -->
# Mastering Sports Betting: Tutorial to Building Your Own Betting Model | OddsJam Edge | 6HN-d9mC0DI | 0.83 h

Teaches: A tutorial on a rough sports betting model built from other sportsbooks' odds: devig sharp books, take a weighted average as fair value, add exchange liquidity, then size bets with half Kelly and multipliers. The speaker is a former quant trader, the channel belongs to an odds-comparison product, and his screens come from the OddsJam tool, so the framing is promotional. He links the model sheet in the description.

Claims:
- The model leaves out box-score stats, since a $40 billion book already prices public information. "simple public information historical data it's already" [0:01:50]
- Odds map to probability: +300 is about 25 percent; if the model says 40 percent bet it, and always take the best price across books. "implied by the market plus 300 25%" [0:03:49]
- First input is market data from sharp books (Pinnacle, Circa, BetOnline); a model far from all of them is wrong. "sharper sports books such as pinnacle circa" [0:06:54]
- Devig example: Pinnacle +122/-138 gives no-vig +128.72 for the Pacers, Circa gives +133, and FanDuel offers +136. "again we're getting plus 136 on fanduel" [0:10:52]
- Sample weights for the line model are Pinnacle 30%, Circa 25%, BetOnline 15% and FanDuel 10%, assigned by hand. "i just kind of assigned various weightings" [0:14:43]
- Books that copy each other should not be double counted, and weights should vary by sport and market; US books are sharper on player props and Pinnacle on main lines. "some books copy each other's odds so" [0:14:10]
- Exchanges (Novig and Profitex in the transcript) get a 7.5 percent weight or 5 percent per $1,000 of liquidity; deep liquidity on one side points to a betting syndicate. "maybe 5% per $1 000 of liquidity" [0:25:30]
- Half Kelly gives 0.57% of bankroll, or $57 on a $10,000 bankroll, which can be scaled with confidence multipliers. "if my bankroll is $10 000 i should be betting 57 bucks" [0:36:48]
- A crossed market (arbitrage) raises confidence because one side must be profitable. "because again whenever the market is crossed" [0:43:37]
- The real bet was $193, the FanDuel maximum, so the sizing model did not decide it. "plus 136 i played this for $193" [0:33:49]

Architecture: Data: odds from many books and exchanges. Signal: devigged weighted fair value per market. Model: manual weights, ideally backtested by sport, league and bet type. Execution: manual bets at the best price, up to book limits. Risk: half Kelly with multipliers for confidence, activity, softness and width.

Worked:
- Fair-value comparison to sharp books gives a plus-EV flag. "136 so we're getting above fair value" [0:09:30]

Failed:
- No backtest or results are shown, and the weights were assigned by hand; he calls the model rudimentary. "i just kind of assigned various weightings" [0:14:43]
- Exchanges with no liquidity add nothing to the model. "sleep on peer to peer betting exchanges" [0:29:39]
- Take the Kelly optimal bet size and scale it up or down with confidence and other factors. "optimal bet size according to the kelly calculator" [0:49:28]
