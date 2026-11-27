# RD-Agent

https://github.com/microsoft/RD-Agent. License MIT. Stars 15,521. Last push 2026-10-21. Python. Checked 2026-11-27.

## Architecture
LLM research-and-development loop: propose hypothesis, write code, run experiment, give feedback, repeat. `rdagent/scenarios/qlib/` runs the quant loop on Microsoft Qlib (factor and model proposal, developer, Docker runner, experiment loaders); other scenarios cover Kaggle, data science, fine-tuning and RL.

## Data Layer
Qlib data bundles for the quant scenario.

## Event Loop
Agent loop rounds; each round runs a Qlib backtest in Docker.

## Execution
None live.

## Risk
Qlib backtest metrics as feedback.

## Strategies Shipped
None fixed; the agent writes factors and models. Factor experiment loader can start from papers or reports.

## AI Components
OpenAI-compatible and Azure LLMs propose and code factors; LiteLLM backends.

## Connectors
None.

## Fit
Automated factor mining with Qlib. High overfitting risk; route every factor it finds through the locked out-of-sample test.
