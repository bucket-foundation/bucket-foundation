# Estimating Standard Errors in Finance Panel Data Sets: Comparing Approaches <!-- voice-ignore-line -->

Topic: Asset Pricing  
Also tagged: Asset Pricing  
OpenAlex: https://openalex.org/W3125688476  
Bead: `bkt-q5moa.19`

| Field | Value |
|---|---|
| Authors | Mitchell A. Petersen | <!-- voice-ignore-line -->
| Year | 2006 |
| Venue | Review of Financial Studies | <!-- voice-ignore-line -->
| DOI | https://doi.org/10.2139/ssrn.661481 |
| Cited by | 12150 as of 2026-11-27 |
| Cited by inside this set | 8 |

## Method

Panel regression. Assigned by keyword match on title and abstract.

## Main Result

Sentences from the abstract that state the finding:

<!-- voice-ignore-next 1 -->
> The intent is to provide intuition as to why the different approaches sometimes give different answers and give researchers guidance for their use.

## Replication

No replication on file in 09-strategies or lab/RESULTS.md.

## Abstract

<!-- voice-ignore-next 1 -->
> In corporate finance and asset pricing empirical work, researchers are often confronted with panel data. In these data sets, the residuals may be correlated across firms or across time, and OLS standard errors can be biased. Historically, researchers in the two literatures have used different solutions to this problem. This paper examines the different methods used in the literature and explains when the different methods yield the same (and correct) standard errors and when they diverge. The intent is to provide intuition as to why the different approaches sometimes give different answers and give researchers guidance for their use.

## Full Text

Open-access copy: https://www.nber.org/system/files/working_papers/w11280/w11280.pdf

## Deep Read

Source: open-access NBER Working Paper 11280, April 2005, revised June 2006, the version published in the Review of Financial Studies 2009. Read 2026-11-27.

### Research Question

When residuals in a finance panel are correlated across firms or across time, which standard error methods give correct inference: OLS, White, Newey-West, Fama-MacBeth, or standard errors clustered by firm, by time or by both?

### Data and Sample

A survey of papers published in the Journal of Finance, Journal of Financial Economics and Review of Financial Studies from 2001 to 2004 that run panel regressions. Simulated panels of 500 firms over 10 years, 5,000 replications each. Two applications: the Daniel and Titman (2005) equity return regressions, July 1968 to December 2001, 699,707 firm-months; and capital structure regressions for 1965 to 2003.

### Method

Simulated data where both the regressor and the residual carry a firm effect, a time effect or both, with the share of variance from each effect varied from 0 to 75 percent. True slope 1, regressor standard deviation 1, residual standard deviation 2. Each method's average standard error is compared with the true standard deviation of the estimate, and the rejection rate of a 1 percent test is recorded.

### Main Results

Survey: 42 percent of the papers made no adjustment for within-cluster correlation, 34 percent used Fama-MacBeth, and only a minority clustered.

Table 1, firm effect: with 50 percent of both regressor and residual variance from the firm effect, the true standard deviation of the slope is 0.0508 while OLS reports 0.0283, so OLS understates the error by about 44 percent and rejects a true null 15.3 percent of the time at the 1 percent level. Clustered by firm, the standard error is 0.0508 and the rejection rate is 0.88 percent.

With a firm effect, Fama-MacBeth standard errors are biased downward by about as much as OLS, since the monthly cross-section estimates are correlated over time. Newey-West adapted to panels is biased too, with a small bias.

With a time effect, clustering by time or Fama-MacBeth gives unbiased errors; clustering by firm does not (Tables 3 and 4). With a temporary firm effect that decays, clustered errors stay unbiased while Fama-MacBeth errors remain too small (Table 5).

Table 6, Daniel and Titman returns: the standard error on lagged book to market is 0.026 with White errors, 0.027 clustered by firm, 0.101 clustered by month and 0.082 for Fama-MacBeth. Here the time effect dominates. Table 7, capital structure: clustering by firm raises errors three to four times over White; the firm effect dominates.

### Robustness

Varying the shares of firm and time variance, temporary firm effects, the number of clusters, and both effects together.

### Stated Limits

Clustered errors need enough clusters; with few years, clustering by time is unreliable. Two-way clustering and the choice of effect depend on the data, so the author recommends reporting more than one method to diagnose the structure.

### Retail Systematic Trader

Any backtest that pools many assets and dates and runs a regression has this problem. Returns share time effects, so a signal tested on daily or monthly panels needs errors clustered by date, or Fama-MacBeth, or its t-statistic is too high. Signals built from persistent firm traits also need clustering by firm. Before trusting a t of 2 or 3, rerun with errors clustered by both dimensions.
