# lag-llama

https://github.com/time-series-foundation-models/lag-llama. License Apache-2.0. Stars 1,603. Last push 2025-06-06. Python. Checked 2026-11-27.

## Architecture
Decoder-only transformer in `lag_llama/model/module.py` (`LTSMConfig`, `Block`, `CausalSelfAttention` with Llama rotary embeddings and a KV cache). `lag_llama/gluon/estimator.py` wraps it as a GluonTS `PyTorchLightningEstimator`; `lightning_module.py` holds training and prediction steps. `run.py` is the train and evaluate entry point.

## Data Layer
GluonTS datasets listed in `data/dataset_list.py`, loaders and samplers in `data/data_utils.py`, augmentations (frequency mask and mix) in `data/augmentations/`.

## Event Loop
None. Batch training with Lightning, logged to Weights and Biases.

## Execution
None.

## Risk
Probabilistic output: a Student-t head (`gluon_utils/gluon_ts_distributions`) and a robust scaler give forecast quantiles. Evaluated with GluonTS `Evaluator` (CRPS and related).

## Strategies Shipped
None.

## AI Components
The model itself: a pretrained univariate foundation model that takes lagged values as covariates. `scripts/pretrain.sh` and `scripts/finetune.sh` drive training; a Hugging Face checkpoint is downloaded for zero-shot use.

## Connectors
GluonTS, PyTorch Lightning, Weights and Biases.

## Fit
Probabilistic forecaster to test on return or volatility series. No finance data or backtest harness ships with it.
