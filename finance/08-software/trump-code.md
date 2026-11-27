# trump-code

https://github.com/sstklen/trump-code. License MIT. Stars 811. Last push 2026-11-26. Python. Checked 2026-11-27.

## Architecture
Flat directory of scripts. `analysis_01` to `analysis_12` mine post text against market moves. `daily_pipeline.py` and `realtime_loop.py` run the loop. `rule_evolver.py`, `learning_engine.py` and `circuit_breaker.py` manage the rule set. `mcp_server.py`, `chatbot_server.py` and `x_poster.py` expose output.

## Data Layer
JSON files under `data/` for posts, surviving rules and a predictions log. Posts come from Truth Social, X and an RSS watcher. Prices from Polymarket and Kalshi read APIs.

## Event Loop
Cron-style scripts plus a polling realtime loop and RSS watcher. GitHub Actions `daily.yml` runs the daily pass.

## Execution
None. `polymarket_client.py` and `kalshi_client.py` read markets and order books. `arbitrage_engine.py` scores opportunities and has a demo mode with fake data.

## Risk
`circuit_breaker.py` compares hit rate against a coin flip, checks degradation and counts consecutive errors, then flags the system as broken.

## Strategies Shipped
Surviving keyword and timing rules found by brute force, `dual_platform_signal.py` (Truth Social to X delay), `signal_market_mapper.py` (signal type to prediction market), `rule_evolver.py` (crossover and mutation of rules).

## AI Components
`ai_signal_agent.py` writes a briefing file for Claude Code to analyze and read back. `washin_llm.py` and the chatbot call hosted models.

## Connectors
Polymarket, Kalshi, Truth Social, X.

## Fit
Idea source for news-to-prediction-market signals. The 61.3% hit rate comes from 566 self-logged predictions with a rule search over 31.5M combinations, so treat it as unvalidated.
