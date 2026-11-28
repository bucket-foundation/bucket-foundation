# uni2ts

https://github.com/SalesforceAIResearch/uni2ts. License Apache-2.0. Stars 1,634. Last push 2026-06-02. Jupyter Notebook (Python package). Checked 2026-11-27.

## Architecture
Package `src/uni2ts/` with `model/` (`moirai`, `moirai2`, `moirai_moe`, each with `module.py`, `pretrain.py`, `finetune.py`, `forecast.py`), `module/` (attention, FFN, norm, packed scaler, position encodings, transformer), `distribution/` (mixture of Student-t, normal, log-normal, negative binomial, Pareto) and `loss/`. Hydra configs under `cli/conf`; `cli/train.py` and `cli/eval.py` are the entry points.

## Data Layer
LOTSA pretraining archive described by `cli/conf/pretrain/data/*.yaml`. `data/builder`, `indexer` and `loader.py` build packed any-variate datasets. Eval sets include ETT, Monash and GluonTS suites.

## Event Loop
None. Lightning training loop.

## Execution
None.

## Risk
Mixture-distribution outputs give predictive quantiles. No portfolio or position logic.

## Strategies Shipped
None.

## AI Components
Moirai, Moirai-MoE and Moirai 2 masked-encoder forecasting transformers with any-variate attention, small, base and large configs, pretrain, finetune and zero-shot paths. Example notebooks in `example/`.

## Connectors
GluonTS, Hugging Face Hub, Hydra.

## Fit
Strongest open foundation forecaster here for multivariate series. Finance use requires adding own data builders.
