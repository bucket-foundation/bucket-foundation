# Digesting Anomalies: An Investment Approach <!-- voice-ignore-line -->

Topic: Asset Pricing  
Also tagged: Asset Pricing  
OpenAlex: https://openalex.org/W2889831213  
Bead: `bkt-q5moa.19`

| Field | Value |
|---|---|
| Authors | Kewei Hou, Chen Xue, Lu Zhang | <!-- voice-ignore-line -->
| Year | 2012 |
| Venue | Review of Financial Studies | <!-- voice-ignore-line -->
| DOI | https://doi.org/10.1093/rfs/hhu068 |
| Cited by | 2855 as of 2026-11-27 |
| Cited by inside this set | 5 |

## Method

Model-based analysis. Assigned by keyword match on title and abstract.

## Main Result

Sentences from the abstract that state the finding:

<!-- voice-ignore-next 1 -->
> A comprehensive examination of nearly 80 anomalies reveals that about one-half of the anomalies are insignificant in the broad cross section.
<!-- voice-ignore-next 1 -->
> More importantly, with a few exceptions, the q-factor model's performance is at least comparable to, and in many cases better than that of the Fama-French (1993) 3-factor model and the Carhart (1997) 4-factor model in capturing the remaining significant anomalies.

## Replication

No replication on file in 09-strategies or lab/RESULTS.md.

## Abstract

<!-- voice-ignore-next 1 -->
> An empirical q-factor model consisting of the market factor, a size factor, an investment factor, and a profitability factor largely summarizes the cross section of average stock returns. A comprehensive examination of nearly 80 anomalies reveals that about one-half of the anomalies are insignificant in the broad cross section. More importantly, with a few exceptions, the q-factor model's performance is at least comparable to, and in many cases better than that of the Fama-French (1993) 3-factor model and the Carhart (1997) 4-factor model in capturing the remaining significant anomalies.

## Full Text

Open-access copy: https://www.nber.org/system/files/working_papers/w18435/w18435.pdf

## Deep Read

Source: open-access NBER Working Paper 18435, October 2012, revised November 2012, the version published in the Review of Financial Studies 28(3), 2015. Read 2026-11-27.

### Research Question

Can a four-factor model motivated by investment-based asset pricing, with market, size, investment and profitability factors, price the anomalies that the Fama-French and Carhart models miss?

### Data and Sample

CRSP and Compustat annual and quarterly data, January 1972 to December 2011, starting when quarterly earnings dates become available. Financial firms and firms with negative book equity are excluded.

### Method

Investment-to-assets (I/A) is the annual change in total assets over lagged total assets. ROE is quarterly income before extraordinary items over one-quarter-lagged book equity, updated monthly from the latest announcement. Factors come from a triple 2 by 3 by 3 sort on size (NYSE median), I/A and ROE (NYSE 30th and 70th percentiles), value-weighted: the size factor, the low-minus-high investment factor, and the high-minus-low ROE factor. Test portfolios are deciles on standardized unexpected earnings, idiosyncratic volatility, Campbell-Hilscher-Szilagyi distress, net stock issues, composite issuance, abnormal corporate investment, total accruals and industry, plus 25 size-momentum and 25 size-book-to-market portfolios. Each is regressed on the CAPM, Fama-French, Carhart and q-factor models; the average absolute alpha and the high-minus-low alpha are compared.

### Main Results

Table 1: the size factor earns 0.31 percent a month (t = 2.09), the investment factor 0.44 percent (t = 4.73) and the ROE factor 0.60 percent (more than 4.5 standard errors). The investment factor has a CAPM alpha of 0.51 percent and a 0.69 correlation with HML.

Earnings surprise deciles (Table 2): high-minus-low alpha 0.54 percent a month (t = 4.26) in Fama-French, 0.32 percent in Carhart, 0.14 percent (t = 0.92) in the q-factor model. Idiosyncratic volatility (Table 3): minus 0.91, minus 0.58 and minus 0.04 percent. Distress (Table 4): minus 1.43 (t = minus 5.21), minus 0.55 and 0.02 percent.

25 size-momentum portfolios (Table 11): average absolute alpha 0.11 percent for both q-factor and Carhart, one half of the Fama-French figure; 2 of 25 significant alphas against 6 for Carhart and 15 for Fama-French; winner-minus-loser alphas average 0.19 percent against 0.25 and 0.90.

25 size-book-to-market portfolios (Table 12): average absolute alpha 0.12 percent against 0.10 for Fama-French and 0.11 for Carhart.

Table 8, total accruals: the q-factor model does worse, with average absolute alpha 0.14 percent against 0.11 for Carhart, and the high-minus-low accrual spread of minus 0.30 percent a month is not explained.

### Robustness

Several anomaly families, the 25-portfolio sets, industry portfolios (Table 9), and alternative breakpoints. The paper notes that an earlier version of the work contained a timing error that Novy-Marx identified and that this version corrects.

### Stated Limits

The model fails on total accruals. The authors leave open whether the factors capture risk or mispricing; the economic motivation is the investment Euler equation.

### Retail Systematic Trader

The investment and profitability factors subsume much of momentum, earnings-surprise, volatility and distress anomalies. A retail book that already tilts toward profitable, low-asset-growth firms has most of what those anomalies offer, with lower turnover than earnings-momentum or volatility sorts. Use the q-factors, which Hou, Xue and Zhang publish, to check whether a new signal adds alpha before trading it.
