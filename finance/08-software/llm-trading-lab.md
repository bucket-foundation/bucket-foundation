# LLM-Trading-Lab

https://github.com/LuckyOne7777/LLM-Trading-Lab. License none declared. Stars 7,563. Last push 2026-06-24. Python. Checked 2026-11-27.

## Architecture
Experiment record. `Experiments/chatgpt_micro-cap/` holds the six-month live run: `scripts/processing/trading_script.py` (portfolio CSV, stop losses, manual trade logging), graphing scripts, an evaluation paper. `Experiments/multi_model_ipo/` runs several LLMs on starting, daily, weekly and deep-research prompts.

## Data Layer
yfinance prices, portfolio and trade log CSVs.

## Event Loop
Manual daily run: the script prints prices and portfolio, the operator pastes it into ChatGPT, then logs the trades the model chose.

## Execution
A human places orders at the broker.

## Risk
Stop loss per position in the CSV; micro-caps only; fixed starting capital.

## Strategies Shipped
None as rules. The LLM picks micro-cap stocks from prompts.

## AI Components
ChatGPT and other models as portfolio decision maker; prompt assembly in `prompts/`.

## Connectors
None.

## Fit
Forward-only public record of LLM stock picking. The workflow is notify-first by construction: the model proposes, a human executes.
