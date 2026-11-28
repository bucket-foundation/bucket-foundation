# A Comprehensive Look at The Empirical Performance of Equity Premium Prediction <!-- voice-ignore-line -->

Topic: Asset Pricing  
Also tagged: Asset Pricing  
OpenAlex: https://openalex.org/W2144570112  
Bead: `bkt-q5moa.19`

| Field | Value |
|---|---|
| Authors | Ivo Welch, Amit Goyal | <!-- voice-ignore-line -->
| Year | 2007 |
| Venue | Review of Financial Studies | <!-- voice-ignore-line -->
| DOI | https://doi.org/10.1093/rfs/hhm014 |
| Cited by | 4376 as of 2026-11-27 |
| Cited by inside this set | 7 |

## Method

Empirical analysis. Assigned by keyword match on title and abstract.

## Main Result

Sentences from the abstract that state the finding:

<!-- voice-ignore-next 1 -->
> We find that by and large, these models have predicted poorly both in-sample (IS) and out-of-sample (OOS) for 30 years now; these models seem unstable, as diagnosed by their out-of-sample predictions and other statistics; and these models would not have helped an investor with access only to available information to profitably time the market.

## Replication

Cited as a source by strategy cards: [etf-cape-timing](../../09-strategies/cards/etf-cape-timing.md), [etf-oil-predicts-equity](../../09-strategies/cards/etf-oil-predicts-equity.md), [rt-cochrane-piazzesi](../../09-strategies/cards/rt-cochrane-piazzesi.md). Each card grades decay after publication and retail feasibility.

## Abstract

<!-- voice-ignore-next 1 -->
> Our article comprehensively reexamines the performance of variables that have been suggested by the academic literature to be good predictors of the equity premium. We find that by and large, these models have predicted poorly both in-sample (IS) and out-of-sample (OOS) for 30 years now; these models seem unstable, as diagnosed by their out-of-sample predictions and other statistics; and these models would not have helped an investor with access only to available information to profitably time the market.

## Full Text

Open-access copy: https://repec.som.yale.edu/icfpub/publications/2412.pdf

## Deep Read

Source: open-access copy from the Yale ICF working paper archive, dated January 11, 2006, the version published in the Review of Financial Studies 21(4), 2008. Read 2026-11-27.

### Research Question

Do the variables that academics say predict the equity premium hold up in sample and out of sample, using data through 2004 and the same methods for each?

### Data and Sample

S&P 500 total returns over the risk-free rate, annual from 1872 and monthly from 1927, through December 2004. Predictors: dividend-price ratio, dividend yield, earnings-price ratio, payout ratio, stock variance, book to market, net equity expansion, percent equity issuing, T-bill rate, long-term yield and return, term spread, default yield and return spreads, inflation, investment to capital, and the consumption-wealth-income ratio cay in ex-post and real-time forms. Each variable uses its longest available history.

### Method

Equation (1): regress the equity premium on one lagged predictor. In-sample fit is the R2 with a bootstrapped F test. Out of sample, the model is re-estimated each period with data available at the time, starting 20 years into the data or in 1965, and its root mean squared error is compared with the historical-mean forecast (Delta RMSE; positive means the predictor wins). McCracken's MSE-F test and bootstrapped critical values judge significance. Also tested: a kitchen-sink regression with all variables, a model-selection rule, five-year horizons (Table 2), monthly forecasts (Table 3), Campbell and Thompson's restrictions on sign and slope with certainty-equivalent utility gains (Table 4), alternative ratio definitions (Table 5) and encompassing tests (Table 7). Plots of cumulative squared-error differences show when each model gained or lost.

### Main Results

Table 1, Panel A: dividend-price ratio, dividend yield, earnings-price ratio, payout ratio, stock variance, net equity expansion, T-bill rate, long yield, long return, term spread, default spreads and inflation are insignificant in sample at the annual horizon, and most have negative out-of-sample Delta RMSE; the long-term return loses 0.77 to 1.20 percent a year.

Table 1, Panel B: only a few predictors are significant in sample. Percent equity issuing has R2 = 9.62 percent and an out-of-sample Delta RMSE of 0.38 percent a year (MSE-F 2.83). Investment to capital is significant in sample with small out-of-sample gains. The kitchen-sink model has in-sample R2 of 15.61 percent and out-of-sample Delta RMSE of minus 6.81 percent a year. The model-selection rule loses 1.13 percent a year. Ex-post cay has in-sample R2 of 24.89 percent, but the real-time version, caya, loses out of sample (minus 0.50).

The plots show most predictive power comes from the 1973 to 1974 oil shock years; excluding them, most models do worse. No model performed well over the last three decades.

Table 4: Campbell-Thompson restrictions help some models, but utility gains are small and depend on the chosen risk aversion.

### Robustness

Annual, five-year and monthly horizons; full and 1927 to 2004 samples; different out-of-sample start dates; Campbell-Thompson restrictions; alternative ratio constructions; encompassing tests.

### Stated Limits

The authors call their out-of-sample test lenient, since the data include the samples used to discover the predictors, and they ignore how an investor would have picked among the many models in real time.

### Retail Systematic Trader

Market timing on valuation ratios, yields and spreads failed out of sample through 2004. A retail book should default to a constant equity allocation and treat any timing rule as unproven unless it beats the historical mean in a strict out-of-sample test. The lab's CAPE timing test checks this directly. Percent equity issuing is the strongest survivor and still small.
