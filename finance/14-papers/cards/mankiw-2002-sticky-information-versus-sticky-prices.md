# Sticky Information versus Sticky Prices: A Proposal to Replace the New Keynesian Phillips Curve <!-- voice-ignore-line -->

Topic: Monetary Economics  
Also tagged: Monetary Economics  
OpenAlex: https://openalex.org/W3125450854  
Bead: `bkt-q5moa.19`

| Field | Value |
|---|---|
| Authors | N. Gregory Mankiw, Ricardo A.M.R. Reis | <!-- voice-ignore-line -->
| Year | 2002 |
| Venue | The Quarterly Journal of Economics | <!-- voice-ignore-line -->
| DOI | https://doi.org/10.1162/003355302320935034 |
| Cited by | 3050 as of 2026-11-27 |
| Cited by inside this set | 2 |

## Method

Model-based analysis. Assigned by keyword match on title and abstract.

## Main Result

Sentences from the abstract that state the finding:

<!-- voice-ignore-next 1 -->
> Third, the change in inflation is positively correlated with the level of economic activity.

## Replication

No replication on file in 09-strategies or lab/RESULTS.md.

## Abstract

<!-- voice-ignore-next 1 -->
> This paper examines a model of dynamic price adjustment based on the assumption that information disseminates slowly throughout the population. Compared with the commonly used sticky-price model, this sticky-information model displays three related properties that are more consistent with accepted views about the effects of monetary policy. First, disinflations are always contractionary (although annoimced disinflations are less contractionary than surprise ones). Second, monetary policy shocks have their maximum impact on inflation with a substantial delay. Third, the change in inflation is positively correlated with the level of economic activity.

## Full Text

Open-access copy: https://www.nber.org/system/files/working_papers/w8290/w8290.pdf

## Deep Read

Source: open-access NBER Working Paper 8290, the version published in the Quarterly Journal of Economics 117(4), 2002. The PDF's front matter uses a broken font and does not extract; the body and tables extract cleanly. Read 2026-11-27.

### Research Question

Does a model where firms update their pricing plans slowly as information arrives, "sticky information," fit inflation dynamics better than the standard new Keynesian sticky-price Phillips curve?

### Data and Sample

US quarterly data, 1960 to 1999: inflation from the GDP deflator, CPI and core CPI, and log real GDP detrended with the Hodrick-Prescott filter. Money growth is calibrated as an AR(1) with coefficient 0.5.

### Method

Each period a fraction lambda of firms, drawn at random, gets new information and recomputes its optimal price path; the rest keep setting prices from plans made with old information. Prices change every period, but plans update slowly. This yields the sticky-information Phillips curve, which depends on past expectations of current conditions. The authors compare it with the Calvo sticky-price model, where a fraction of firms reset prices each period, and with a backward-looking accelerationist model. Calibration: lambda = 0.25 (firms update about once a year) and alpha = 0.1 for real rigidity. They simulate responses to disinflation, to monetary shocks, and the correlation of output with inflation changes.

### Main Results

Disinflation: in the sticky-price model a credible announced disinflation can cause a boom; in the sticky-information model disinflations are always contractionary, though announced ones cost less than surprises.

Monetary shocks: in the sticky-information model inflation peaks with a delay of several quarters after a shock, matching the conventional view; in the sticky-price model it responds at once.

Table 1: predicted inflation autocorrelations at lags 1 to 8 run from 0.99 to 0.48 for sticky information and 0.92 to 0.50 for sticky prices, against actual GDP deflator values of 0.89 to 0.58.

Table 2, the acceleration phenomenon: in the data, the correlation of detrended output with the change in inflation from t minus 2 to t plus 2 is 0.48 for the GDP deflator, 0.38 for CPI and 0.46 for core CPI. Sticky information predicts 0.43; sticky prices predict minus 0.13; the backward-looking model predicts 0.99.

### Robustness

Table 3 varies alpha from 0.05 to 1.0 and lambda from 0.1 upward; the sticky-price model gives a negative correlation across the grid, while sticky information stays positive. Adding supply shocks would push the sticky-price correlation further down.

### Stated Limits

The choice between models is an empirical matter; the comparison rests on calibrated simulations without formal estimation. The model treats information updating as exogenous and random.

### Retail Systematic Trader

No trading signal. The model predicts that inflation responds to monetary tightening with a lag of quarters and that strong activity precedes rising inflation. A macro-aware allocator can expect inflation to keep rising for a while after policy turns and to lag output, which matters for timing duration and inflation-linked exposure around policy shifts.
