# dawp

https://github.com/yhilpisch/dawp. License none asserted (see LICENSE.txt). Stars 639. Last push 2021-02-26. Python and Jupyter Notebook. Checked 2026-11-27.

## Architecture
Code for "Derivatives Analytics with Python". `python36/` has one folder per chapter: `02_mbv`, `03_stf`, `05_com` (BSM and CRR valuation), `06_fou` (Fourier and FFT pricing), `07_amo` (American options, LSM), `08_m76` (Merton jump diffusion), `09_gmm` (BCC97 and CIR), `10_mcs` (Monte Carlo), `11_cal` (calibration), `12_val`, `13_dyh` (dynamic hedging). `python27/` is unmaintained. Conda env in `dawp_conda.yml`.

## Data Layer
Option quote tables and hard-coded parameters in scripts and notebooks.

## Event Loop
None. Script runs.

## Execution
None.

## Risk
`13_dyh` simulates delta hedging under BSM and BCC97 with least-squares Monte Carlo and plots hedge error histograms.

## Strategies Shipped
None. Calibration scripts fit H93, BCC97, M76 and CIR parameters to implied volatilities.

## AI Components
None.

## Connectors
None.

## Fit
Reference implementations of stochastic volatility and jump models with calibration. Python 3.6 era code; pin old numpy and scipy.
