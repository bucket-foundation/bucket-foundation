<!-- voice-ignore-file: transcript-derived digest -->
# Algorithmic Trading | Full Tutorial | Ideation to Live Markets | Dr Hui Liu & Aditya Gupta | QuantInsti Quantitative Learning | VFhSKz4hyTA | 1.21 h

Teaches: QuantInsti master class with Aditya Gupta (caption "abdul") and Dr Hui Liu, author of IBridgePy (caption "ibridge pi", "average pi"), on moving from strategy ideation through back testing and paper trading to live automated trading with Interactive Brokers, TD Ameritrade and Robinhood.

Claims:
- Gupta says research and back testing "takes 90 percent of your time", within three stages: research and back testing, paper trading and live trading. Analysis comes in quantitative, technical and fundamental forms [0:04:03]-[0:06:05].
- Quantitative analysis is "using mathematical models and statistical analysis to analyze the data" without preconceived notion, and it helps with risk management such as take profit and stop loss levels [0:05:03]-[0:07:06].
- For paper trading Gupta cites Dr E B Chan (caption spelling), who says to "run it for at least three months" before going live, and the paper phase needs a broker API for real-time prices and orders [0:07:06]-[0:09:09].
- The demo moving average crossover on Tesla data from 2015 gives a buy when the "shorter moving average is going above the long term moving average" and a sell when it falls below, with strategy return equal to stock return times the signal. Windows were 126 and 242 days [0:12:13]-[0:15:17].
- Liu says algo trading cuts pressure and human error, with his own slip of a minus sign: "put a minus sign in front of the share" count and he sold short by accident. A program does exactly what it is told [0:22:29]-[0:23:30].
- IBridgePy's first advantage is to "protect traders intellect intellectual properties" because the code runs on the user's own computer. It also backtests and trades live with few code changes, supports several brokers and multiple accounts, and can run Quantopian-style algorithms [0:28:37]-[0:30:40].
- The code needs "only one required function is called initialize", which runs once. handle_data runs every second or at another interval, and schedule_function runs a task at a set time such as 10 a.m. Eastern [0:35:46]-[0:37:49].
- Liu says "using these three cornerstones you can build pretty complicated strategies": show real-time price, get historical data and place orders. The strategy steps are choose contracts, decide the decision frequency, compute indicators from historical data, and pick order types [0:20:27]-[0:21:28].
- The portfolio rebalance example uses a dictionary of target weights such as 30% and 40%, schedules the run at "rebalance at 3 59 eastern time", one minute before the close, and uses order_target_percentage to convert weights into shares [0:51:06]-[0:54:10].
- The mean reversion example buys SPY with all cash if "today's close price is lower than yesterday's close price" and sells otherwise. The crossover example buys with 100% of the portfolio when the 30-day average is above the 90-day average [0:55:15]-[1:00:22].

Framework: The workflow has "research and back testing paper trading and live trading" as three stages, with the strategy as an algorithm that takes data and returns orders, and the broker API connecting analysis to execution [0:04:03]-[0:09:09].

Worked:
- The SPY market order demo bought 100 shares and the account log showed the fill with its cost basis and order status filled [0:47:02]-[0:49:05].
- The rebalance demo placed orders for SPY, XLE and XLK in the live account and the positions printout confirmed them [0:53:08]-[0:55:15].
- The close-price reversion back test over 30 days ended up 966 dollars, saved to the output folder [1:04:27]-[1:05:30].
- In Q&A Liu says a predefined function places an order with stop loss and take profit (bracket orders), and the package works in India through Interactive Brokers [1:07:32]-[1:09:38].

Failed:
- The Tesla crossover back test gave about 7% CAGR and a Sharpe ratio of 0.04, which Gupta calls probably a bad strategy and warns that back tests carry biases [0:15:17]-[0:16:22].
- Liu says the limit order example would not have an immediate effect, so he did not run it live [0:46:00]-[0:47:02].
- The Sharpe ratio of 2.68 in the analysis demo comes from a fake balance log, since the real simulation was too short [1:04:27]-[1:05:30].
