# chronos-forecasting

https://github.com/amazon-science/chronos-forecasting. License Apache-2.0. Stars 6,369. Last push 2026-11-27. Python. Checked 2026-11-27.

## Architecture
Model package `src/chronos/`: `chronos.py` (token-based T5 pipeline), `chronos_bolt.py` (patch-based direct quantile model, `ChronosBoltModelForForecasting`), `chronos2/` (model, layers, pipeline, trainer, dataset, preprocess, config) and `base.py` with a shared pipeline interface.

## Data Layer
Input is tensors, lists or DataFrames; `df_utils.py` and `chronos2/dataset.py` convert long-format frames with covariates. Weights load from Hugging Face or S3 (`boto_utils.py`).

## Event Loop
None. Batch inference through `predict` and `predict_quantiles`.

## Execution
None.

## Risk
None.

## Strategies Shipped
None. Forecasting only.

## AI Components
Pretrained time-series foundation models. Chronos tokenizes scaled values into bins, Bolt uses patch input and a quantile head, Chronos-2 adds covariates and fine-tuning through `trainer.py`.

## Connectors
Hugging Face, AWS S3, AutoGluon.

## Fit
Zero-shot forecaster for prices, volumes and rates. Output is a quantile forecast to feed a separate signal and sizing layer.
