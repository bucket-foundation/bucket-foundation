<!-- voice-ignore-file: transcript-derived digest -->
# 13. Commodity Models | MIT OpenCourseWare | nmehlS-8b3Y | 1.35 h

Teaches: A guest quant (unnamed in the transcript) explains commodity modeling: contango storage trades, valuing physical storage as a portfolio of spread options sold against it and hedged dynamically, a merchant power plant as an option on the spark spread, and a supply-and-demand model of power prices with spikes.

Claims:
- Contango means futures prices rise with maturity, backwardation means they fall; the "spot" price on TV is the nearest futures contract. "the price of the first future contract" [0:04:38]
- Bidding for storage from August to December with futures at $55 and $58: a trader bids just under the $3 spread. "then when you have to pay $55" [0:11:57]
- The option is hedged by the storage: if December is $80 and August $55, buy August and sell December and use the tank to deliver the $25; if the spread is negative, nothing is owed. "is $55 and the december is $80" [0:19:21]
- Approaches are linear or quadratic programming, Monte Carlo and stochastic control (he cites Carmona and Ludkovski). "let's start from the end this contract" [0:26:15]
- The speaker's firm picks stable methods with few parameters that can be verified and traded in the market, and avoids calibration, which is a least-squares problem with flat, unstable solutions. "data least squares is notoriously bad problem" [0:37:39]
- No market exists for these spread options. "the market for this option non existent" [0:38:32]
- A merchant power plant runs when power price exceeds heat rate times fuel price plus variable cost. Example: heat rate 8, gas $4, variable cost $3 gives $35 cost against a $50 price and a $15 profit; heat rates range from 7 (efficient gas) to 20. "so $4 8 3 so it's $35" [0:48:10]
- Power returns are far from normal: kurtosis is 26 for Nord Pool and 76 for the one-hour price versus about 3 for the S&P. "prices in scandinavian countries kurtosis is 26" [0:52:11]
- Model: a generator bid stack sorted by cost, clearing price set by demand; correlation between power and gas emerges as an output. "function of the bid stack and demand" [1:10:43]


Worked:
- Simulated and actual price paths and kurtosis match closely; the simulated correlation matches the actual one without being an input. "this is the actual one very close" [1:18:44]
- The 1997 Indiana tornado example (price from $40 to $7,000 after a nuclear plant loss) shows why outages are modeled. "from $40 to $7 000 because tornado" [1:07:22]

Failed:
- Geometric Brownian motion has no spikes or correlation structure; mean reversion plus jumps needs extreme reversion strength and then regime switching with 10 to 12 parameters, which the speaker calls unmanageable. "with the model with 10 parameters 12" [0:58:32]
- A wrong parameter ruins even a precise method. "most precise methodology but if your parameters" [0:34:31]
- The supply-stack model is hard to maintain: it needs data on every plant built, retired or planned, years ahead, and each region is a separate market. "power plant and was built was retired" [1:19:34]
