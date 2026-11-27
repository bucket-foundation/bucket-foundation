# frequi

https://github.com/freqtrade/frequi. License GPL-3.0. Stars 1,130. Last push 2026-11-27. Vue 3 (TypeScript). Checked 2026-11-27.

## Architecture
Single-page web client for the freqtrade bot REST API. Vue 3, Pinia stores (`ftbot.ts`, `ftbotwrapper.ts`, `btStore.ts`, `settings.ts`), ECharts via vue-echarts, Playwright e2e tests. Components in `src/components/ftbot` cover trades, balance, profit, pairlists, backtest results and FreqAI model inputs.

## Data Layer
Pinia state persisted with `pinia-plugin-persistedstate`. All data comes from the bot API; `composables/api.ts` sets the base URL per bot and refreshes tokens on 401.

## Event Loop
Browser. Timed refresh through `ReloadControl.vue`; one store per connected bot lets the UI watch several bots.

## Execution
Sends forced entry and exit, reload config, start and stop to the bot (`ForceEntryForm.vue`, `ForceExitForm.vue`, `BotControls.vue`). The UI places no orders itself.

## Risk
Shows pair locks, blacklists and drawdown in the profit and performance views. No risk logic of its own.

## Strategies Shipped
None. It edits strategy parameters, plot templates and pairlist chains, and runs backtest, lookahead and recursive analysis jobs on the bot.

## AI Components
`FreqAIModelInput.vue` and `FreqaiModelSelect.vue` pick FreqAI models for backtests.

## Connectors
Freqtrade REST API with JWT login.

## Fit
Reference for a dashboard over a trading bot API: multi-bot switch, backtest comparison and chart configuration.
