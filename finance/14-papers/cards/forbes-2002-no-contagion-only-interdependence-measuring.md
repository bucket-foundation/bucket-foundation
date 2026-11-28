# No Contagion, Only Interdependence: Measuring Stock Market Comovements <!-- voice-ignore-line -->

Topic: Banking and Crises  
Also tagged: Banking and Crises  
OpenAlex: https://openalex.org/W3021709961  
Bead: `bkt-q5moa.19`

| Field | Value |
|---|---|
| Authors | Kristin J. Forbes, Roberto Rigobon B C | <!-- voice-ignore-line -->
| Year | 2002 |
| Venue | The Journal of Finance | <!-- voice-ignore-line -->
| DOI | https://doi.org/10.1111/0022-1082.00494 |
| Cited by | 5357 as of 2026-11-27 |
| Cited by inside this set | 2 |

## Method

Not stated in the title or abstract. Assigned by keyword match on title and abstract.

## Main Result

Sentences from the abstract that state the finding:

<!-- voice-ignore-next 1 -->
> When contagion is defined as a significant increase in market comovement after a shock to one country, previous work suggests contagion occurred during recent crises.
<!-- voice-ignore-next 1 -->
> This paper shows that correlation coefficients are conditional on market volatility.

## Replication

No replication on file in 09-strategies or lab/RESULTS.md.

## Abstract

<!-- voice-ignore-next 1 -->
> Heteroskedasticity biases tests for contagion based on correlation coefficients. When contagion is defined as a significant increase in market comovement after a shock to one country, previous work suggests contagion occurred during recent crises. This paper shows that correlation coefficients are conditional on market volatility. Under certain assumptions, it is possible to adjust for this bias. Using this adjustment, there was virtually no increase in unconditional correlation coefficients (i.e., no contagion) during the 1997 Asian crisis, 1994 Mexican devaluation, and 1987 U.S. market crash. There is a high level of market comovement in all periods, however, which we call interdependence.

## Full Text

Open-access copy: https://www.nber.org/system/files/working_papers/w7267/w7267.pdf

## Deep Read

Source: open-access NBER Working Paper 7267, July 1999, the version published in the Journal of Finance 57(5), 2002. Read 2026-11-27.

### Research Question

Do cross-market stock correlations rise during crises, the usual test for contagion, once the correlation is corrected for the rise in volatility that comes with a crisis?

### Data and Sample

Daily stock index returns in US dollars for 28 markets across East Asia, Latin America, OECD countries and other emerging markets (Table 1), with short-term interest rates. Three episodes: the 1997 East Asian crisis, with turmoil defined as the month from the October 17, 1997 Hong Kong crash and stability as January 1, 1996 to that date; the 1994 Mexican peso collapse; and the October 1987 US crash.

### Method

Section II shows that if market y responds to market x through a stable linear relation, the measured correlation rises with the variance of x. Let delta be the relative rise in the variance of x from the calm period to the turmoil period. Equation (8) recovers the unconditional correlation: rho = rho* / sqrt(1 + delta(1 minus rho*^2)), where rho* is the measured conditional correlation. The authors estimate a VAR of two-day rolling-average returns for the crisis market and each other market, with lags and interest rate controls, equation (9), to purge common shocks. They compare correlations in calm and turmoil periods with t-tests, first unadjusted and then adjusted.

### Main Results

Table 2, East Asia unadjusted: the average correlation with Hong Kong rises from 0.22 in the calm period to 0.68 in turmoil; Hong Kong and Belgium go from 0.14 to 0.71. The t-tests flag contagion to 15 markets, including Australia, Germany, Korea and South Africa.

Table 3, adjusted: the average turmoil correlation falls to 0.32 from the unadjusted 0.53, and the calm-period average rises from 0.20 to 0.22. Tests on adjusted coefficients find virtually no contagion.

Tables 9 and 10, Mexico 1994: unadjusted tests find contagion in some markets; adjusted tests find not one case. Tables 11 and 12, US 1987: adjusted tests never find more than one case. The authors call the high co-movement interdependence: strong linkages present in all states.

### Robustness

Tables 4 to 8 for East Asia: different return frequencies and lag lengths, alternative crisis and calm windows, other source markets and regional indices, different interest rate controls, and local currency returns. Unadjusted tests keep finding contagion; adjusted tests find almost none, with one exception in the local currency test.

### Stated Limits

The adjustment assumes no endogeneity between markets and no omitted aggregate shocks; footnote 7 says the results depend on those assumptions. With feedback or common shocks, the correction is itself biased. Crisis windows are short.

### Retail Systematic Trader

Correlations measured in a high-volatility window overstate the underlying link and those measured in calm windows understate the correlation a book will see in a crash. A diversified retail book should stress-test with crisis-period correlations, since the measured number is what drives drawdowns, while treating a spike in correlation during a sell-off as volatility at work rather than a lasting regime change. Equation (8) gives a quick way to compare correlations across periods with different volatility.
