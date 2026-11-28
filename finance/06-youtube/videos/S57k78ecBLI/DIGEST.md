<!-- voice-ignore-file: transcript-derived digest -->
# Strategic Python Trading with Michael Harris | Techniques for Market Regime Changes | QuantInsti Quantitative Learning | S57k78ecBLI | 0.87 h

Teaches: Michael Harris (Price Action Lab) in a QuantInsti webinar on complexity, reflexivity and regime changes in financial markets, and how they shape quantitative strategy development, followed by audience Q&A.

Claims:
- A simple S&P 500 strategy on daily data from 1941 to 1999 (long after a positive return or price above the 2-day average, short when reversed) had an "annualized return of 27.6%" and a Sharpe ratio of about 2.5, against about 9% for buy and hold. Harris calls it a way of identifying regime shifts, since retail traders could not trade it before 1993 [0:01:02]-[0:04:09].
- All moving averages from 2 to 20 days beat buy and hold on the long side, with an 11-day average giving a T statistic of 8.5. After 2000 the long-short version "lost nearly 100%", as did all moving average versions [0:05:12]-[0:07:16].
- The cause was a regime shift in daily returns "from momentum to mini reversion" (caption spelling of mean reversion) that began in the mid 80s and finished by the late 90s, driven by reflexivity and a crowded trade [0:06:13]-[0:08:17].
- Autocorrelation of daily S&P 500 returns was high in the 40s and 50s, extreme in the 70s and then fell until "autocorrelation becomes negative" by the mid 90s. Positive autocorrelation means up days follow up days; negative means up days follow down days [0:09:20]-[0:11:23].
- Harris's indicator (spelled mmerion or momeion in the captions) measures the "momentum and mean reversion of the market in daily returns". It stayed high through the 50s to the 70s and shifted from 85 to about 2000, after which the market was mostly mean reverting [0:12:25]-[0:14:31].
- A mean reverting market can rise because the "percentage of down days followed by up days" over a 252-day window reached a record of about 69, as participants buy the dips [0:15:32]-[0:16:35].
- Reflexivity means the "actions of market participants influence prices" and prices in turn influence participants, a positive feedback system that degrades forecasting and causes boom and bust cycles such as Bitcoin in 2018 [0:16:35]-[0:19:38].
- On the curse of dimensionality the unit hypersphere surface "reaches a maximum for about seven dimensions" and then falls toward zero, so with more than 20 variables the volume sits at the edges and forecast accuracy under complexity is low [0:19:38]-[0:21:40].
- A good strategy "must accommodate both momentum and mean reversion", or else combine separate strategies with regime filters, but filters that lag cause whipsaw losses [0:27:47]-[0:29:53].
- Strategies found in data suffer multiple comparison bias: "torture the data long enough" and it confesses. His guidelines are a small set of similar features with economic value, out-of-sample tests only a few times (no more than 5 or 10), and hundreds or thousands of trades [0:30:54]-[0:34:58].

Framework: For daily long-short trading, rank each security by its trade-weighted win fraction difference between long and short rules, then "multiply the significance by the directional bias", with unsupervised machine learning to find rules and supervised machine learning to select among alternatives [0:36:02]-[0:39:06].

Worked:
- A trivial mean reversion rule (long after back-to-back losses, exit after back-to-back gains) was unprofitable until about 1990 and profitable afterwards until the pandemic crash [0:08:17]-[0:09:20].
- Harris says 99.9% of SPY profits since it began trading came from the overnight session, which he gives as an example of a price anomaly [0:49:26]-[0:50:28].

Failed:
- The 1941 to 1999 back test led an investor of the 90s to expect wealth for 20 more years, but the strategy lost nearly 100% after 2000 [0:06:13]-[0:07:16].
- Harris says momentum and mean reversion strategies alone cannot deal with regime changes, and a regime filter must be nearly exact in timing [0:26:47]-[0:29:53].
- Harris has found a good answer for entries but not for exits, and says adaptive stops are tricky since mean reversion systems break down under stops [0:44:13]-[0:45:15].
- Counting parameters risks a type two error, rejecting a good strategy; he proposes removing exits and checking whether the win fraction falls from 75% or 90% to 40% [0:45:15]-[0:47:19].
- The mmerion indicator is descriptive and not a strategy; Harris says no indicator is predictive [0:47:19]-[0:48:24].
