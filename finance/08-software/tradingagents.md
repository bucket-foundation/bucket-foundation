# TradingAgents

https://github.com/TauricResearch/TradingAgents · Apache-2.0 · 123,901 stars · last push 2026-11-25 · TypeScript (rewritten from Python) · checked 2026-11-27

## Architecture
The repo now ships an npm CLI (`@tauric/tradingagents`) for agentic finance research. The paper-era Python LangGraph trading firm (analysts, bull and bear researchers, trader, risk team) is gone from the tree. `src/agents` (agent loop, budget, recovery, skills), `src/engine` (session, delegation, memory, compaction, settlement), `src/models` (provider catalog), `src/data` (router to Tauric, Yahoo and Polymarket providers), `src/compute` (indicators, risk, optimize, valuation, screen, correlation), `specs/agents` and `specs/skills` (Markdown agent and skill definitions).

## Data Layer
`src/data/router.ts` routes tool calls to `tauric/` (hosted API for filings, statements, estimates, news, needs a Tauric key), `yahoo/provider.ts`, `polymarket/provider.ts`. Bounded responses in `bounded.ts`.

## Event Loop
Chat session loop: main agent plans, calls data and compute tools, briefs specialist agents each in its own context, compacts memory, cites every figure.

## Execution
None. No broker code in `src/`.

## Risk
`specs/agents/risk.md`: Risk Analysis agent computes drawdown, VaR, expected shortfall, beta, portfolio concentration through `src/compute/risk.ts` and `optimize.ts` (minimum variance, risk parity). Advisory only.

## Strategies Shipped
None as code. Skills in `specs/skills/`: company-snapshot, dcf-valuation, earnings-preview, earnings-review, filing-review, full-analysis, macro-outlook, market-brief, performance-comparison, portfolio-review, relative-valuation, risk-assessment, scenario-analysis, sector-review, technical-analysis, thesis-review.

## AI Components
Main agent plus four specialists (`specs/agents/equity.md`, `macro.md`, `quant.md`, `risk.md`). Providers: Tauric AI, OpenAI, Anthropic, Google, DeepSeek, OpenRouter, vLLM, Ollama, ChatGPT login.

## Connectors
Tauric API, Yahoo, Polymarket (read).

## Fit
Research and brief writer for the notify layer: turn an alert into a cited memo. Keep it out of the order path.
