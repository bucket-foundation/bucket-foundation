<!-- voice-ignore-file: transcript-derived digest -->
Algorithmic Trading Using Python - Full Course | freeCodeCamp.org | xfzGZB4HhEE | 4.55 h

Teaches: A beginner Python and pandas course building three Jupyter projects from the IEX Cloud sandbox API: an equal weight S&P 500 index fund, a high quality momentum screener, and a robust value screener. Each outputs an Excel order sheet of share counts for a trader.

Claims:
- Algorithmic trading is using computers to make investment decisions; Python is popular but slow, so it acts as glue to faster C libraries such as NumPy. "popular python library for performing numerical computing" [0:06:10]
- Project 1 equal weights about 505 stocks: position size is portfolio value divided by stock count, and shares are rounded down with math.floor so the allocation never exceeds the portfolio. "in each stock now center's 505 stocks" [1:16:45]
- Batch API calls (100 tickers per call) cut runtime from a few minutes to a few seconds versus one call per stock. "100 to get data for 100 stocks" [1:03:06]
- The 50 lowest scores are the portfolio. "am i looking for here is so" [3:42:15]

Architecture:

Worked:
- The value screen top names were oil and gas, airline and printer companies, and bottom names software and tech. "gas company and al is an airline" [4:13:36]

Failed:
- The author notes the calculated P/E (31 from estimates) differed from the API value (39.6), which the author attributes to IEX using different earnings estimates. "is working properly the ratio 39 6" [3:04:15]
