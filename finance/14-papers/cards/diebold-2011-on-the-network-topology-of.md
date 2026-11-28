# On the Network Topology of Variance Decompositions: Measuring the Connectedness of Financial Firms <!-- voice-ignore-line -->

Topic: Banking and Crises  
Also tagged: Banking and Crises  
OpenAlex: https://openalex.org/W3020982786  
Bead: `bkt-q5moa.19`

| Field | Value |
|---|---|
| Authors | Francis X. Diebold, Kamil Yılmaz | <!-- voice-ignore-line -->
| Year | 2011 |
| Venue | Journal of Econometrics | <!-- voice-ignore-line -->
| DOI | https://doi.org/10.1016/j.jeconom.2014.04.012 |
| Cited by | 5408 as of 2026-11-27 |
| Cited by inside this set | 4 |

## Method

Proposed method or design. Assigned by keyword match on title and abstract.

## Main Result

Sentences from the abstract that state the finding:

<!-- voice-ignore-next 1 -->
> We also show that variance decompositions define weighted, directed networks, so that our connectedness measures are intimately-related to key measures of connectedness used in the network literature.

## Replication

No replication on file in 09-strategies or lab/RESULTS.md.

## Abstract

Taken from the open-access full text; OpenAlex holds none.

<!-- voice-ignore-next 1 -->
> We propose several connectedness measures built from pieces of variance decompositions, and we argue that they provide natural and insightful measures of connectedness among financial asset returns and volatilities. We also show that variance decompositions define weighted, directed networks, so that our connectedness measures are intimately-related to key measures of connectedness used in the network literature. Building on these insights, we track both average and daily time-varying connectedness of major U.S. financial institutions' stock return volatilities in recent years, including during the financial crisis of 2007-2008.

## Full Text

Open-access copy: https://www.nber.org/system/files/working_papers/w17490/w17490.pdf

## Deep Read

Source: open-access NBER Working Paper 17490, October 2011, the version published in the Journal of Econometrics 182(1), 2014. Read 2026-11-27.

### Research Question

Can forecast error variance decompositions from a VAR define a weighted, directed network of connectedness among financial firms, and how did that network move before and during the 2007 to 2008 crisis?

### Data and Sample

Daily realized volatility from five-minute TAQ returns for 13 large US financial institutions that survived the crisis: seven commercial banks, Goldman Sachs and Morgan Stanley, American Express, Fannie Mae and Freddie Mac, and AIG (Table 2). May 1999 to April 2010. Log volatilities are used, following Andersen et al. (2003).

### Method

Fit a VAR(3) to the 13 log volatility series. The H-step generalized variance decomposition (Pesaran-Shin, normalized by row) gives d(ij), the share of firm i's forecast error variance due to shocks to firm j. Off-diagonal entries are pairwise directional connectedness; row sums excluding the diagonal give connectedness "from" others, column sums give "to" others; the average off-diagonal share is total connectedness. The authors show the matrix is a weighted directed network, so in-degree and out-degree match "from" and "to" connectedness. Dynamics come from a one-sided rolling window of 100 days with a 12-day horizon. Robustness checks vary window, horizon, VAR order and Cholesky orderings.

### Main Results

Table 3, full sample, 12-day horizon: each bank's volatility depends on others for about 78 to 82 percent of its forecast error variance; AIG 72.5 percent and Fannie Mae 70.4 percent. The largest pairwise links run between Fannie Mae and Freddie Mac (22.0 percent of Fannie's variance from Freddie) and between Goldman Sachs and Morgan Stanley (13.3 percent).

Rolling analysis: total connectedness rose 7 points in March 2000 as the dot-com bubble burst, climbed from 60 to 75 percent between September 2000 and January 2001, and stayed high through the 2002 WorldCom scandal. It jumped from about 56 percent in February 2007 to close to 90 percent by August 2007 and stayed above 80 percent until mid-2009. From 1999 to 2007 it always returned to a 55 to 65 percent range after episodes; after the crisis it stayed above that range through April 2010.

Directional measures pick out which firms transmitted volatility shocks during specific crisis events, such as the Fannie and Freddie conservatorship and the Lehman failure.

### Robustness

Results for total connectedness are close across Cholesky orderings, windows and horizons; the authors report ranges.

### Stated Limits

Connectedness is measured, without a claim about its cause. The sample covers only survivors, so failed firms such as Lehman and Bear Stearns are absent. Results depend on the VAR approximation and the window length.

### Retail Systematic Trader

A rolling total-connectedness index on volatilities of large banks gives a daily stress gauge: readings near the top of their range coincided with 2007 to 2009. A retail book can compute it from daily ranges or realized volatility of liquid financial stocks and cut leverage or financial-sector exposure when it breaks above its normal band. The measure signals rising fragility; it has not been shown to time returns.
