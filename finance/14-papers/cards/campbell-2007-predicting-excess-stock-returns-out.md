# Predicting Excess Stock Returns Out of Sample: Can Anything Beat the Historical Average? <!-- voice-ignore-line -->

Topic: Portfolio Theory  
Also tagged: Portfolio Theory  
OpenAlex: https://openalex.org/W1789808336  
Bead: `bkt-q5moa.19`

| Field | Value |
|---|---|
| Authors | John Y. Campbell, Samuel Brodsky Thompson | <!-- voice-ignore-line -->
| Year | 2007 |
| Venue | Review of Financial Studies | <!-- voice-ignore-line -->
| DOI | https://doi.org/10.1093/rfs/hhm055 |
| Cited by | 3288 as of 2026-11-27 |
| Cited by inside this set | 3 |

## Method

Regression analysis. Assigned by keyword match on title and abstract.

## Main Result

Sentences from the abstract that state the finding:

<!-- voice-ignore-next 1 -->
> In this article, we show that many predictive regressions beat the historical average return, once weak restrictions are imposed on the signs of coefficients and return forecasts.

## Replication

No replication on file in 09-strategies or lab/RESULTS.md.

## Abstract

<!-- voice-ignore-next 1 -->
> Goyal and Welch (2007) argue that the historical average excess stock return forecasts future excess stock returns better than regressions of excess returns on predictor variables. In this article, we show that many predictive regressions beat the historical average return, once weak restrictions are imposed on the signs of coefficients and return forecasts. The out-of-sample explanatory power is small, but nonetheless is economically meaningful for mean-variance investors. Even better results can be obtained by imposing the restrictions of steady-state valuation models, thereby removing the need to estimate the average from a short sample of volatile stock returns.

## Full Text

Open-access copy: https://dash.harvard.edu/bitstreams/7312037c-4c39-6bd4-e053-0100007fdf3b/download

## Deep Read

Source: open-access copy in Harvard's DASH repository of the article in the Review of Financial Studies 21(4), 2008. Read 2026-11-27.

### Research Question

Goyal and Welch argue that the historical mean beats predictive regressions for the equity premium out of sample. Do simple restrictions from finance theory turn those regressions into forecasts that beat the mean?

### Data and Sample

US stock returns, dividends, earnings, long bond yields and inflation from Robert Shiller's data back to the early 1870s; CRSP total returns from 1927; other series from after World War I; book equity from 1926 and ten-year smoothed ROE from 1936. All through 2005. Out-of-sample evaluation starts in 1927 or 20 years after a series begins, whichever is later.

### Method

Predictors (Table 1): dividend-price, earnings-price, smoothed earnings-price (ten-year real earnings over price) and book-to-market ratios; smoothed ROE; short rate, long yield, term spread, default spread and inflation; equity share of new issues; and the consumption-wealth inputs. Out-of-sample R2 compares expanding-window forecasts with the historical mean, monthly and annual. Restrictions: set the slope to zero when it has the wrong theoretical sign, and set the forecast to zero when it is negative. Table 2 goes further using steady-state valuation models: expected return equals the valuation ratio plus growth, with growth from smoothed ROE times the retention rate, and imposes a zero intercept and unit slope so no regression coefficients need estimating. Table 3 repeats for 1927 to 1956, 1956 to 1980 and 1980 to 2005. Section 3 maps out-of-sample R2 into gains for a mean-variance investor.

### Main Results

Table 1: many predictors are insignificant over the full samples, and unrestricted out-of-sample R2 is negative for most of them. The sign restrictions never hurt and almost always help; they turn the dividend yield and the long yield positive and bring book-to-market near zero. With both restrictions, the valuation ratios and several rate variables beat the mean.

Table 2, monthly out-of-sample R2: minus 0.66 to 0.32 percent with no restrictions, minus 0.45 to 0.43 percent with sign restrictions, and 0.24 to 0.97 percent with zero-intercept, unit-slope restrictions, which improve every regression. Annual R2 under those restrictions ranges from 1.85 to 7.99 percent.

Table 3: predictability is strongest in 1927 to 1956 and weakest in 1980 to 2005, but earnings-based ratios still beat the mean monthly in the last subsample.

Section 3: a monthly R2 of 0.43 percent for the smoothed earnings-price ratio, against a squared monthly Sharpe ratio of 1.2 percent, raises a mean-variance investor's average return by 36 percent: about 5.2 percent a year at unit risk aversion and 1.7 percent at risk aversion of 3. Annually, R2 of 7.9 percent against 11.8 percent gives 9.6 and 3.2 percent a year.

### Robustness

Monthly and annual horizons, three subsamples, several growth adjustments, and the comparison of coefficient and forecast restrictions (Figure 1).

### Stated Limits

Out-of-sample R2 is small; part of the higher return comes from taking more risk when expected returns are high, so it is not pure welfare gain. Choosing which restrictions to impose uses knowledge of theory available today.

### Retail Systematic Trader

Valuation-based timing can add value when it is restrained: cap forecasts at zero, never short the market on a valuation signal, and use a steady-state formula such as earnings yield plus growth in place of a fitted regression. Gains are a modest tilt in equity weight, worth about 1 to 3 percent a year for a typical investor before costs, over long horizons. This complements the Goyal-Welch card, and the lab's CAPE timing test checks the same idea.
