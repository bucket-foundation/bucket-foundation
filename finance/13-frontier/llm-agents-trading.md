# LLM Agents in Trading

## Question
Can an LLM-driven agent trade at a profit after costs, out of sample and in live markets?

## Case For
- Lopez-Lira and Tang find GPT-4 headline scores predict next-day returns on post-cutoff news. arXiv:2304.07619. [empirical: arXiv API, 2026-11-27, http://export.arxiv.org/api/query?id_list=2304.07619]
- In Nof1 Alpha Arena season 1, a live crypto perpetuals contest on Hyperliquid with $10,000 per model, Qwen3-Max returned 22.32% over two weeks. [empirical: Stocktwits, Nov 2025, fetched 2026-11-27, https://stocktwits.com/news-articles/markets/equity/alibabas-qwen3-max-tops-crypto-trading-challenge-against-five-ai-models-including-gpt5-musks-grok/cL28d9pR3CN]
- FinGPT provides open data and model pipelines for financial LLMs. arXiv:2306.06031. [empirical: arXiv API, 2026-11-27, http://export.arxiv.org/api/query?search_query=ti:FinGPT]

## Case Against
- StockBench, Chen et al. 2025, finds most LLM agents fail to beat buy-and-hold in a contamination-free live-window test, and static QA skill does not carry into trading. arXiv:2510.02209. [empirical: arXiv, 2026-11-27, https://arxiv.org/abs/2510.02209]
- FINSABER, Li et al. 2025, finds LLM strategy advantages deteriorate over two decades and 100+ symbols. arXiv:2505.07078. [empirical: arXiv API, 2026-11-27, http://export.arxiv.org/api/query?id_list=2505.07078]
- In Alpha Arena season 1, four of six models lost money; GPT-5 lost about 63%. Nof1 said early results may reflect luck and that trading costs dominated PnL. [empirical: Protos, Nov 2025, fetched 2026-11-27, https://protos.com/llm-crypto-trading-contest-finds-llms-cant-trade-crypto]

## Evidence Table
| Study | arXiv | Setting | Result |
|-------|-------|---------|--------|
| Lopez-Lira, Tang 2023 | 2304.07619 | news sentiment, next day | predictive |
| FinGPT, 2023 | 2306.06031 | open financial LLM | infrastructure |
| TradingAgents, 2024 | 2412.20138 | multi-agent backtest | short-window gains |
| FINSABER, 2025 | 2505.07078 | 20 years, 100+ symbols | edge decays |
| StockBench, 2025 | 2510.02209 | live window | most lose to buy-and-hold |
| Alpha Arena S1, 2025 | none | live, $10k each, 2 weeks | 2 of 6 positive |

arXiv IDs and titles verified via the arXiv API on 2026-11-27.

## What Would Settle It
- An audited live track record of at least a year, net of fees, against a passive benchmark, with the full prompt and model log published.
- Pre-registered benchmarks run after the model's training cutoff.

## Sources
| Source | URL | Fetched |
|--------|-----|---------|
| arXiv API | http://export.arxiv.org/api/query?id_list=2505.07078,2412.20138,2304.07619 | 2026-11-27 |
| StockBench abstract | https://arxiv.org/abs/2510.02209 | 2026-11-27 |
| Protos, Alpha Arena | https://protos.com/llm-crypto-trading-contest-finds-llms-cant-trade-crypto | 2026-11-27, via search result |
| Stocktwits, Alpha Arena | https://stocktwits.com/news-articles/markets/equity/alibabas-qwen3-max-tops-crypto-trading-challenge-against-five-ai-models-including-gpt5-musks-grok/cL28d9pR3CN | 2026-11-27, via search result |
