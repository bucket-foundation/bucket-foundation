<!-- voice-ignore-file: transcript-derived digest -->
# "Hands-On AI Trading with Python, QuantConnect, and AWS" with Jiri Pik, Ernest Chan, and Jared Broad | Quantopian | dHlBxjbzrtU | 0.95 h

Teaches: Authors of a book on AI trading discuss its structure (21 or so applied ML examples on QuantConnect), a Piotroski F-score demo with parameter optimization, LLM-generated trading code, and the limits of reinforcement learning and generative AI in finance. Partly a book and platform promotion.

Claims:
- It has three parts, nine chapters and over 20 examples. "you have 19 examples examples over 20" [0:09:44]
- QuantConnect says it has about 3,500 paying users, about 500 hedge funds, and $60 billion notional live trading a month (unverified, vendor claim). "about 60 billion in notional live trading" [0:14:25]
- In a market data test, Pik says 10 large vendors given the same sample returned data with wrong, missing or artificial values. "wrong data was missing there was artificial" [0:20:38]
- Broad says raw GPT-4 code ran in a backtest only about 25% of the time. "the public models the chat gpt 4" [0:32:52]
- Pik says LLM-designed strategies are flaky and not stable across regimes. "strategies is the results are usually flaky" [0:29:50]
- Chan says reinforcement learning suits finance because trades can be simulated, but outcomes vary widely by path so hundreds of agents must be averaged; his six-month deep RL project was not much better than simpler methods. "not necessarily much better than simpler methods" [0:45:30]

Architecture:
- Platform: event-driven backtest engine, research notebooks, optimizer with heat maps, live deploy to about 25 brokers. "go through to there's about 25 brokers" [0:13:45]

Worked:
- Demo backtest and parameter heat map ran in about 18 seconds. "and then you'll generate a heat map" [0:18:43]

Failed:
- Sharpe ratio dropped from about 0.8 to 0.9 at score threshold 7 to about 0.4 at threshold 8, which the speaker flags as a possible overfit hint. "then 0 4 for score to threshold" [0:19:14]
- Chan says AI tools reduce alpha as everyone uses them: more data and more AI, less profit. "clears throat and everybody get less profit" [0:48:38]
- LLMs hallucinated references about 90% of the time in Chan's experience. "book this person did this almost 90%" [0:55:11]
