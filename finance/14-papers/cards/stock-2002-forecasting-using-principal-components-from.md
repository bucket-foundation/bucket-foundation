# Forecasting Using Principal Components From a Large Number of Predictors <!-- voice-ignore-line -->

Topic: Asset Pricing  
Also tagged: Asset Pricing  
OpenAlex: https://openalex.org/W2079563517  
Bead: `bkt-q5moa.19`

| Field | Value |
|---|---|
| Authors | James H. Stock, Mark W. Watson | <!-- voice-ignore-line -->
| Year | 2002 |
| Venue | Journal of the American Statistical Association | <!-- voice-ignore-line -->
| DOI | https://doi.org/10.1198/016214502388618960 |
| Cited by | 3707 as of 2026-11-27 |
| Cited by inside this set | 2 |

## Method

Econometric estimation. Assigned by keyword match on title and abstract.

## Main Result

Sentences from the abstract that state the finding:

<!-- voice-ignore-next 1 -->
> The estimated factors are shown to be consistent, even in the presence of time variation in the factor model.

## Replication

No replication on file in 09-strategies or lab/RESULTS.md.

## Abstract

<!-- voice-ignore-next 1 -->
> This article considers forecasting a single time series when there are many predictors (N) and time series observations (T). When the data follow an approximate factor model, the predictors can be summarized by a small number of indexes, which we estimate using principal components. Feasible forecasts are shown to be asymptotically efficient in the sense that the difference between the feasible forecasts and the infeasible forecasts constructed using the actual values of the factors converges in probability to 0 as both N and T grow large. The estimated factors are shown to be consistent, even in the presence of time variation in the factor model.

## Full Text

Open-access copy: http://www.princeton.edu/~mwatson/papers/Stock_Watson_JASA_2002.pdf

## Deep Read

Source: open-access copy of the Journal of the American Statistical Association 97(460), 2002 article on Mark Watson's Princeton page. The two-column scan extracts with the numeric cells of Table 2 missing; results below come from the text. Read 2026-11-27.

### Research Question

When a forecaster has many more candidate predictors than a regression can use, can principal components of those predictors summarize them into a few factors that give efficient forecasts of one target series?

### Data and Sample

Theory plus Monte Carlo (Table 1) and an application: 149 monthly US macroeconomic series from January 1959 to December 1998, forecasting 12-month growth in the Federal Reserve's industrial production index.

### Method

An approximate factor model: each predictor X(it) loads on r latent factors plus an idiosyncratic error that may be serially correlated and weakly correlated across series, equation (1). The target y(t+h) depends on the factors and on observed lags w(t), equation (2). Step one estimates the factors as principal components of X; step two regresses y(t+h) on the estimated factors and lags. The number of factors is chosen by information criteria. The authors prove consistency of the estimated factors as N and T grow with no restriction on their relative rates, including under small time variation in the factor loadings, and prove the feasible forecast converges to the forecast using the true factors. The simulated out-of-sample exercise starts in January 1970 and rolls forward to December 1997, using only data available at each date for factor estimation, model selection and coefficients. Benchmarks: a univariate autoregression with BIC lags, a VAR adding inflation and short rates, and a leading-indicator model with 11 Stock-Watson indicators.

### Main Results

Theorems 1 and 2: principal components are consistent estimators of the space spanned by the true factors, and forecasts built on them are first-order asymptotically efficient.

Table 1, Monte Carlo: with two true factors and N and T of a few hundred, the fit of estimated to true factors is near 0.9, and the method holds up under moderate serial and cross-sectional correlation in the errors.

Table 2, industrial production: the VAR and leading-indicator models do slightly better than the autoregression. The principal components forecasts do much better, and nearly all of the gain comes from the first two factors. Adding autoregressive lags to the factor model changes little. The authors report similar results for other real macro series in their earlier work.

### Robustness

Several information criteria for the number of factors give similar results; simulations vary N, T, the number of irrelevant series, and the strength of serial and cross-sectional error correlation.

### Stated Limits

The theory is first-order asymptotic; small-sample behavior depends on the strength of the factors. Large structural shifts in loadings would break consistency; the proofs allow only small time variation.

### Retail Systematic Trader

Diffusion-index forecasting gives a retail macro trader a cheap way to use hundreds of public series, such as the FRED-MD database, without overfitting: standardize, extract a few principal components, and regress the target on them with an expanding window. One or two factors capture most of the signal for real activity. Applied to asset returns, expect much smaller gains, since return predictability is weaker than predictability in industrial production.
