# LAG Length Selection and the Construction of Unit Root Tests with Good Size and Power <!-- voice-ignore-line -->

Topic: Financial Econometrics  
Also tagged: Financial Econometrics  
OpenAlex: https://openalex.org/W2169107902  
Bead: `bkt-q5moa.19`

| Field | Value |
|---|---|
| Authors | Serena Ng, Pierre Perron | <!-- voice-ignore-line -->
| Year | 2001 |
| Venue | Econometrica | <!-- voice-ignore-line -->
| DOI | https://doi.org/10.1111/1468-0262.00256 |
| Cited by | 4661 as of 2026-11-27 |
| Cited by inside this set | 1 |

## Method

Experiment. Assigned by keyword match on title and abstract.

## Main Result

Sentences from the abstract that state the finding:

<!-- voice-ignore-next 1 -->
> The MIC along with GLS detrended data yield a set of tests with desirable size and power properties.

## Replication

No replication on file in 09-strategies or lab/RESULTS.md.

## Abstract

<!-- voice-ignore-next 1 -->
> It is widely known that when there are errors with a moving-average root close to −1, a high order augmented autoregression is necessary for unit root tests to have good size, but that information criteria such as the AIC and the BIC tend to select a truncation lag (k) that is very small. We consider a class of Modified Information Criteria (MIC) with a penalty factor that is sample dependent. It takes into account the fact that the bias in the sum of the autoregressive coefficients is highly dependent on k and adapts to the type of deterministic components present. We use a local asymptotic framework in which the moving-average root is local to −1 to document how the MIC performs better in selecting appropriate values of k. In Monte-Carlo experiments, the MIC is found to yield huge size improvements to the DFGLS and the feasible point optimal PT test developed in Elliott, Rothenberg, and Stock (1996). We also extend the M tests developed in Perron and Ng (1996) to allow for GLS detrending of the data. The MIC along with GLS detrended data yield a set of tests with desirable size and power properties.

## Full Text

Open-access copy: http://fmwww.bc.edu/EC-P/wp369.pdf

## Deep Read

Source: open-access Boston College working paper 369, September 2000, the version published in Econometrica 69(6), 2001. Read 2026-11-27.

### Research Question

How should the lag length of an augmented Dickey-Fuller-type regression be chosen so that unit root tests keep correct size and good power, given that AIC and BIC pick too few lags when errors have a moving-average root near minus 1?

### Data and Sample

Monte Carlo simulations at T = 100, 150 and 250 with MA and AR errors (Tables 2 to 6). An application to quarterly inflation in the G7 countries (Table 7).

### Method

The authors propose Modified Information Criteria (MIC), mainly the modified AIC (MAIC), whose penalty depends on the sample through the estimated sum of autoregressive coefficients, since the bias in that sum depends strongly on the lag k. They analyze the criteria with the MA root local to minus 1, extend the M tests of Perron and Ng (1996) to GLS-detrended data as in Elliott, Rothenberg and Stock (1996), and compare size and size-adjusted power of the DF-GLS, point-optimal PT and M tests with lags chosen by BIC against MAIC. Table 1 gives asymptotic critical values.

### Main Results

Local asymptotics: for a strong negative MA root, BIC picks k = 4 while MAIC picks 8 with a constant and 13 with a trend.

Table 5.a, nominal 5 percent tests, MA root theta = minus 0.8, T = 100: DF-GLS with BIC lags rejects a true unit root 41.1 percent of the time and the PT test 42.9 percent. With MAIC and GLS detrending, the M-GLS tests reject 3.6 percent and the modified PT 3.6 percent. At T = 250 the BIC-based DF-GLS still rejects 32.3 percent; the MAIC-based tests reject about 2 percent. For theta of 0 or positive, all tests are close to 5 percent, and MAIC costs little power (Table 5.b).

Table 7, G7 inflation: with BIC lags, unit roots are rejected for most countries (UK, Japan and Germany at 1 percent, Canada at 5 percent). MAIC picks longer lags, 8 for the UK and 12 for Japan, and the evidence against a unit root weakens: only Germany rejects at 5 percent with the M-ZalphaGLS test, and the US, Japan, Italy and France show no rejection.

### Robustness

AR error designs, constant and trend cases (Tables 2.b, 4.b, 6), several sample sizes, and the MBIC variant.

### Stated Limits

The MIC is built for unit root testing and may not suit lag selection in other settings; its broader use awaits study. Power falls when the MA root is close to minus 1, the price of correct size.

### Retail Systematic Trader

Mean-reversion and pairs strategies rest on unit root or cointegration tests on residual spreads. With default BIC lag selection, those tests reject a true unit root at several times the nominal rate when the series has negative moving-average errors, common in noisy price spreads, which makes non-stationary spreads look tradeable. A trader should use DF-GLS or Ng-Perron tests with MAIC lags, available in standard packages, before trusting a spread to revert.
