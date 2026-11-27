<!-- voice-ignore-file: transcript-derived digest -->
# Intraday Implied Volatility: What Python + Options Data Reveal | QuantInsti Quantitative Learning | ISVFhvECvzc | 0.41 h

Teaches: A QuantInsti Python walkthrough by Mo that organizes minute-level Bank Nifty options data, computes implied volatility with a Black-Scholes helper, and reads the volatility smile on two January 2022 days.

Claims:
- The minute-level dataset holds datetime, underlying (Bank Nifty), expiry, strike, option type, OHLC and the spot price, and covers January to the first quarter of 2022, "close underscore spot". [0:01:03]-[0:02:04]
- Options data must carry call or put, trade time and expiry or downstream steps break, "things are going to break". [0:03:06]-[0:04:06]
- Implied volatility is described as the number that makes the model price match the market price, not an opinion or a forecast, "not an opinion". [0:05:08]-[0:06:10]
- Black-Scholes inputs are spot, strike, option type, time to expiry and a rate that is set to zero for simplicity, "interest rate equals to zero". [0:05:08]-[0:06:10]
- Time to expiry in years is the expiry minus the datetime divided by the seconds in a 365-day year, "number of seconds I actually have in an". [0:06:10]-[0:08:13]
- A sanity check confirms option price, spot, strike and time to expiry are all above zero before computing implied volatility, and the shape did not change after filtering, "my data is quite clean". [0:09:13]-[0:10:15]
- On 3 January 2022 the 35,700 put's price fell from about 320 to 82 as it moved out of the money while its implied volatility rose, consistent with the smile, "320 and towards the end it was just 82". [0:14:19]-[0:15:22]
- On 18 January the midday smile showed put-side implied volatility well above the call side, which the speaker reads as the market pricing downside risk, "heavily pricing downside risk". [0:22:36]-[0:23:36]

Framework: Load and clean the data, compute time to expiry, apply an implied-volatility helper row by row, then select the at-the-money strike at the open and compare price and implied volatility with the underlying, "we need to compute what is the fraction of time". [0:06:10]-[0:08:13]

Worked:
- The at-the-money strike was the 35,700 call and put, chosen because the open was near 35,640. [0:11:16]-[0:12:17]
- The speaker builds a midday smile at 12:22 p.m. showing put implied volatility mildly higher than calls. [0:17:27]-[0:18:29]

Failed:
- On 18 January implied volatility did not peak as the market fell, because the at-the-money put had drifted only slightly in the money, "not like that". [0:20:33]-[0:21:35]
- The speaker says the build is a lens and not a strategy, "was a lens". [0:23:36]
