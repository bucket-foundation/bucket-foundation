<!-- voice-ignore-file: transcript-derived digest -->
# Meet the Market Makers on the Other Side of Your Trade · Erik Swanson | Chat With Traders | PRdd_LW2fpQ | 0.94 h

Teaches: How Simplex Trading, a Chicago US equity options market maker, quotes every listed option, calibrates prices automatically, hedges delta and gamma, and thinks about GameStop, payment for order flow and hiring. The CEO is describing his own firm.

Claims:
- Simplex has been a registered market maker since 2015, quotes on 14 of 16 US options exchanges, trades every listed symbol and about a high single digit share of volume, over 2 million contracts a day. "14 of the 16 listed us options" [0:05:28]
- The edge is buying below and selling above fair value as often as possible; the firm has no view on direction or volatility and hedges and manages the resulting book. "buying below fair value and selling above" [0:08:04]
- Options market makers never go home flat: hedging with nearby strikes and the stock piles up open interest, and profit is judged as if each trade were held to expiry. "of being a successful options market maker" [0:09:59]
- Fair value comes from market data plus a proprietary volatility model, often near the bid-ask midpoint; edge is the gap to fair value net of fees, e.g. 1.5 cents on a 98-cent offer with a half-cent remove fee. "well there's 1 5 cents of edge" [0:18:20]
- Systems self-calibrate to market conditions. "our systems will automatically calibrate" [0:14:09]
- Market makers tend to earn more when volatility and volume are high because spreads widen; 2021 volume above 30 million contracts a day came with low realized volatility, tied to retail participation. "was over 30 million contracts a day" [0:32:30]
- In GameStop, selling calls left market makers short while the stock rallied, and gamma meant exposure grew as the price rose. "buying calls why while the stock rallies" [0:37:07]
- Hiring: more developers than traders; traders need quantitative and data skills, and finance background is optional. "for people with very quantitative backgrounds" [0:53:31]

Architecture: Fair-value model per strike, electronic eye scanning all options for orders crossing fair value minus required edge, bias on all quotes from the existing book, delta hedging in stock, Greek-based risk limits.

Worked:
- Self-calibrating pricing keeps human parameter changes to weekly or monthly. "months before between making actual parameter changes" [0:14:44]

Failed:
- Fast one-sided moves are hard to hedge; gamma and a rallying stock can leave market makers overexposed with economic losses. "overexposed and that can cause economic losses" [0:38:19]
- Low-to-high volatility transitions can hurt depending on positioning. "to high volatility can be bad depending" [0:31:39]
- GameStop raised clearing firm margin requirements on market makers. "sort of prime brokers that market makers" [0:36:02]
