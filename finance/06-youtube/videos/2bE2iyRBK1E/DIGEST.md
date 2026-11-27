<!-- voice-ignore-file: transcript-derived digest -->
# Two Sigma Presents: Machine Learning Models of Financial Data | Two Sigma | 2bE2iyRBK1E | 1.01 h

Teaches: An academic lecture on two deep learning applications to high-frequency limit order book data: an LSTM that predicts the direction of the next price change, and reinforcement learning for order execution timing. Followed by a recruiting Q&A.

Claims:
- Predicting price direction above 50% accuracy does not guarantee profit, because the bid-ask spread acts as a transaction cost; a correct mid-price call can still lose money. "profitable and could in fact lose money" [0:10:56]
- An LSTM beat a linear vector autoregression benchmark on next-price-move direction across about 500 NASDAQ stocks over a three-month out-of-sample test. "roughly 500 stocks over a three month" [0:21:43]
- A single universal model trained on pooled stocks beat stock-specific models, and generalized to stocks it was never trained on. "recurrent network model trained on the pooled" [0:25:17]
- The universal model stayed accurate (well above 50%) more than a year after the end of training data, with test period January to March 2017. Speaker says it is unknown whether stability holds for longer periods. "train the reinforcement learning models at longer" [0:34:44]
- Reinforcement learning for market-order timing gave positive average cost savings versus immediate execution across 100 stocks at 10 and 60 second horizons, with large variability by stock; a limit-order strategy slightly outperformed market-only. "10 or 60 seconds we will immediately" [0:35:16]
- Training used 25 GPUs with asynchronous SGD and a parameter server. "this presentation was distributed across 25 gpus" [0:27:49]

Architecture:
- Data: three years of event-by-event order book data for about 1,000 stocks (hundreds of billions of samples), down-sampled to times of price changes; RL used NASDAQ book data down-sampled to 1 second, trained on one year, tested on six months. "trained on the pooled data of hundreds" [0:25:18]
- Signal/model: LSTM recurrent network mapping order flow to probability of next price move up or down, trained with truncated backpropagation through time; linear recurrent VAR baseline. "can be considered a linear recurrent network" [0:12:48]
- Execution: RL agent decides each second whether to submit a market order or wait, or when to cancel a resting limit order and cross the spread; simulation of fills from historical book data event by event. "each event in the order book data" [0:34:56]
- Risk: spread cost noted; only one-share orders tested, larger sizes listed as an open challenge. "others have a larger cost" [0:36:24]

Worked:
- LSTM over linear model, universal over stock-specific, generalization to unseen stocks and >1 year out of sample. "universal model consistently outperforms the stock specific" [0:25:56]
- RL execution cost savings in basis points, positive across stocks, larger at 60 s horizon. "positive cost savings across these 50 stocks" [0:36:16]

Failed:
- Cost savings varied widely, small for some stocks. "cost savings varies being small for some" [0:39:41]
- Overfitting risk when data is insufficient; vanishing gradients slow training. "try to use this data to train" [0:09:09]
- Speaker had no answer on RL for momentum crashes. "trading strategies fail such as momentum crashes" [0:54:55]
