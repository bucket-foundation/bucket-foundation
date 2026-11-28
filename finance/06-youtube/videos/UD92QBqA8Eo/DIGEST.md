<!-- voice-ignore-file: transcript-derived digest -->
"Optimizing Trading Strategies without Overfitting" by Dr. Ernest Chan - QuantCon 2018 | Quantopian | UD92QBqA8Eo | 0.77 h

Teaches: Why optimizing strategy parameters on one historical path overfits, and an alternative: fit a simple time series model to prices, simulate many long price paths, and optimize the strategy on the simulations.

Claims:
- Signals are far fewer than price bars, so parameter optimization cherry-picks and overfits; more history is only partly a fix because market structure changes (pair trading profits collapsed after decimalization, around 2002). "very profitable prior to let's say 2002" [0:03:59]
- Bootstrapping works poorly for time series because it destroys autocorrelation. "implement that for time series data because" [0:05:39]
- Analytical optimization needs a simple price model, a linear strategy and a linear objective; for an Ornstein-Uhlenbeck price the optimal entry and exit levels are symmetric around the mean, entry nearer the mean than exit, and the strategy is never flat. "so by optimal entry and exit levels" [0:14:22]
- Simulation workflow: fit an AR(1) model by maximum likelihood to history, simulate for example 10,000 paths of 3.7 years (about 10 times the half life), run any strategy on each, and pick parameters maximizing average Sharpe ratio. "like each one might be 3 7" [0:31:42]
- Fitting the price model is acceptable because there are many more prices than trading signals; fitting the trading model is not. "prices many more prizes than trading signals" [0:27:15]
- Apply the method across many instruments for the law of averages. "typical path you know or the average" [0:41:30]

Architecture:
- Data: hourly AUD/CAD FX series, chosen because the ADF test gave p below 1%. "basis if you run an adf test" [0:29:47]
- Signal: buy if expected log return exceeds k times conditional volatility, sell if below negative k, else flat. "condition of volatility otherwise neither by ourselves" [0:32:38]
- Model: AR(1) with Gaussian noise (3 parameters); could extend to GARCH or recurrent networks. "can run you know recurrent neural network" [0:43:53]

Worked:
- Optimal k about 0.08 by averaging Sharpe over paths, with error bars from different random seeds; the second method (mode of best paths) gave a similar k with larger error. "point on one is that 0 08" [0:36:14]
- Adding GARCH moved the optimal k to zero with a better Sharpe ratio. "you a very good better sharpe ratio" [0:43:37]
- A similar paper by Carr and Lopez de Prado (2014) validates the method. "peter carr and marcos lopez de prado" [0:42:25]

Failed:
- Out of sample the result was "not too impressive"; a randomly chosen k of 0 had a better out of sample Sharpe than the optimized 0.08. "instead of k evil is 0 08" [0:37:44]
- Analytical models break with small changes such as GARCH or an annualized return objective. "model so oh you know the smallest" [0:22:58]
