<!-- voice-ignore-file: transcript-derived digest -->
# How to Build an AI Trading Bot in Python | Roman Paolucci | _87QHZXOOKA | 1.49 h

Teaches: A live coding walkthrough of a Python Tkinter app that places Martingale-style DCA limit buys through the Alpaca paper API and adds an OpenAI chat box acting as a portfolio manager. The AI does position and risk commentary, not trade signals.

Claims:
- The speaker says blowing out is hard with this strategy because the broker will not give unlimited leverage, so it is reasonable to follow blindly (unverified opinion). "this strategy as an example because blowing" [0:20:34]
- Initial entry price is taken as the max filled average price from Alpaca orders for that symbol, and open levels are tracked with negative keys to avoid duplicate orders. "all the entry prices take the max" [0:47:04]
- The LLM is pre-prompted with the live portfolio and open orders and asked for risk exposure, order impact, diversification and market outlook. "open limit orders and their potential impact" [1:14:25]
- Speaker says paper trading must be used while developing. "sure you are on the paper trading" [0:43:43]

Architecture:
- Data: Alpaca latest trade price; account positions and open orders. "is equal to api getet latest trade" [0:45:04]
- Model: OpenAI GPT-4 chat completion with a system prompt and portfolio context, used for analysis only. "going to be open ai chat completion" [1:16:25]
- No exit conditions built. "wanted to we could add exit conditions" [1:09:58]

Worked:
- Paper test with Apple: initial order filled and five limit orders were placed at the drawdown levels, with no duplicates on toggling off and on; Johnson and Johnson also added. "create a new apple trade five levels" [1:08:53]
- AI portfolio response returned risk commentary on a two-stock position. "system we got our our ai portfolio" [1:25:20]

Failed:
- A key error for "level" vs "levels" and a duplicate initial order had to be cancelled and rerun. "we have a key error for level" [1:08:10]
- The OpenAI package needed to be pinned to 0.28 for the old API call. "i should pep install uh version 28" [1:20:43]
