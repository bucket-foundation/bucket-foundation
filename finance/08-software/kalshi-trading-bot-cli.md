# kalshi-trading-bot-cli

https://github.com/OctagonAI/kalshi-trading-bot-cli. License MIT. Stars 416. Last push 2026-10-01. TypeScript (Bun). Checked 2026-11-27.

## Architecture
Terminal app in `src/`: `agent/` (LLM agent, tool executor, scratchpad), `commands/` (analyze, scan, edge, backtest, paper, portfolio, watch, alerts, report and others), `scan/` (edge computer, Octagon client, loop, watchdog), `risk/` (`kelly.ts`, `gate.ts`, `mandate.ts`), `backtest/`, `eval/` (Brier, calibration, reflection), `daemon/loop.ts`, `gateway/` (chat channels), `tools/kalshi/`, `db/`.

## Data Layer
Bun SQLite (`db/` schema for edge, positions, alerts, hypotheses, event index, Octagon cache). Kalshi REST for markets and positions; Octagon API for research and probabilities.

## Event Loop
Scan loop plus a maintenance daemon that runs in order: event index refresh, Octagon prefetch, settlement sync, paper settlement, reflection. Each step fails soft.

## Execution
Kalshi V2 order bodies with an approval prompt in the terminal UI. Paper mode keeps a forward-test ledger scored like the backtest.

## Risk
`kelly.ts`: half-Kelly sizing capped at 10 percent of bankroll with a 5 percent minimum edge and a liquidity adjustment. `gate.ts` risk gate, `mandate.ts` daily loss tracking and kill switch.

## Strategies Shipped
Edge strategy: model probability minus market probability. `backtest/variants.ts` ranks variants (NO only, YES only, edge bands, entry price bands, high confidence).

## AI Components
Agent loop over multiple LLM providers; Octagon research reports as the probability source; Brier and calibration eval and lesson reflection.

## Connectors
Kalshi, Octagon, LLM providers, chat gateway channels.

## Fit
Fullest open reference for an agent-driven prediction-market bot with sizing, kill switch, paper ledger and calibration scoring.
