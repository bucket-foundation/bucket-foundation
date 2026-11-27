<!-- voice-ignore-file: transcript-derived digest -->
# Future Scenario Testing Using GenAI: Overcome Backtesting Problems | QuantInsti Quantitative Learning | ofdGQmxhl1I | 0.31 h

Teaches: Ernest Chan's QuantInsti webinar on generative AI for trading, based on a book co-written with Hamlet Medina: how it differs from LLMs, why modeling P of X matters, and what it adds for risk management and scenario testing.

Claims:
- Chan separates generative AI from LLMs and calls the LLM-only view a notion he wants to dispel, "generative AI and L". [0:00:09]-[0:01:10]
- Discriminative or supervised learning models P of Y given X, and that is what hedge funds used as machine learning until about 2022, "supervised learning". [0:02:11]-[0:03:11]
- A discriminative model gives an answer for any input, even an outlier it was never trained on, so the answer can be completely misleading, "whatever you stick in as a predictor it will give an answer". [0:04:12]-[0:05:14]
- Modeling the distribution of X lets you simulate new samples that are regime appropriate, such as a return series conditional on a bear market down 10% from the high-water mark, "we are in a bare market". [0:06:15]-[0:08:18]
- VaR and copula risk models are unconditioned parametric models and cannot condition on a complicated set of circumstances such as a 75% tariff plus bond yields over 4%, "basically unconditioned models". [0:08:18]-[0:09:20]
- Scenario testing goes beyond backtesting: generated series can test whether a strategy loses money, stops out or triggers a margin call, "a margin call". [0:09:20]-[0:11:25]
- Pre-training on equity, futures and other data eases data scarcity, and the speaker cites a model trained only on financial data that worked, "overcome that problem because you can train on everything under the sun". [0:11:25]-[0:13:26]
- If P of X is near zero the model has not seen this input, so its prediction of Y should not be trusted, which gives outlier detection, "you shouldn't trust your machine learning model". [0:13:26]-[0:15:29]
- Chan calls the attention mechanism a sample-wise feature selection method, unlike tree-based feature selection which depends on the variable itself, "samplewise feature selection". [0:16:31]-[0:17:32]

Framework: Discriminative AI estimates P of Y given X, while generative AI also estimates P of X and the joint distribution, which supports simulation, scenario testing and outlier detection, "the distribution of X and Y". [0:03:11]-[0:04:12]

Worked:
- A generated, conditioned return series is proposed for stress tests instead of the one or two COVID-era samples a backtest offers. [0:10:23]-[0:11:25]

Failed:
- An LLM asked "who is the best algorithmic trading author" named Chan, which he uses to show hallucination, "how easy it is for the LM to hallucinate". [0:01:10]-[0:02:11]
