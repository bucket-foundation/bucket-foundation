# LLM and AI Agents in Trading

Published evidence splits in two. News-sentiment scoring by LLMs predicts short-horizon returns out of the training window. Multi-agent trading frameworks report strong backtests on short windows that fade on long, broad tests.

## Papers

- Lopez-Lira and Tang 2023, Can ChatGPT Forecast Stock Price Movements?, arXiv:2304.07619. GPT-4 scores on post-cutoff headlines predict next-day drift; returns decline as adoption rises.
- Glasserman and Lin 2023, arXiv:2309.17322. In-sample LLM sentiment backtests carry look-ahead and distraction bias; anonymizing firms helps.
- Wu et al. 2023, BloombergGPT, arXiv:2303.17564.
- Yu et al. 2023, FinMem, arXiv:2311.13743. Layered-memory LLM trading agent.
- Zhang et al. 2024, A Multimodal Foundation Agent for Financial Trading, arXiv:2402.18485 (FinAgent).
- Xiao, Sun, Luo et al. 2024, TradingAgents: Multi-Agents LLM Financial Trading Framework, arXiv:2412.20138. Analyst, bull/bear researcher, trader and risk roles; short backtest window.
- Li, Kim, Cucuringu et al. 2025, Can LLM-based Financial Investing Strategies Outperform the Market in Long Run?, arXiv:2505.07078 (FINSABER). Advantages deteriorate over two decades and 100+ symbols.

## In The Video Corpus

- dHlBxjbzrtU @ 0:32:00 raw GPT-4 strategy code ran 25% of the time
- gJLKVsIqiTE @ 1:49:00 LLM layer kept away from order path
- VzF-tvz3DAk @ 0:03:00 use AI for risk
- JgGOtCskLRg @ 0:21:00 numeric errors from ChatGPT

## Open Question

No peer-reviewed study shows an LLM agent with audited live returns above a passive benchmark after costs.
