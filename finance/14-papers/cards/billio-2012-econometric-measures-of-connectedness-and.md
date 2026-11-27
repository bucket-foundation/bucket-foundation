# Econometric measures of connectedness and systemic risk in the finance and insurance sectors <!-- voice-ignore-line -->

Topic: Banking and Crises  
Also tagged: Banking and Crises  
OpenAlex: https://openalex.org/W3123503831  
Bead: `bkt-q5moa.19`

| Field | Value |
|---|---|
| Authors | Monica Billio, Mila Getmansky, Andrew W. Lo, Loriana Pelizzon | <!-- voice-ignore-line -->
| Year | 2012 |
| Venue | Journal of Financial Economics | <!-- voice-ignore-line -->
| DOI | https://doi.org/10.1016/j.jfineco.2011.12.010 |
| Cited by | 2977 as of 2026-11-27 |
| Cited by inside this set | 5 |

## Method

Empirical analysis. Assigned by keyword match on title and abstract.

## Main Result

Sentences from the abstract that state the finding:

<!-- voice-ignore-next 1 -->
> We find that all four sectors have become highly interrelated over the past decade, likely increasing the level of systemic risk in the finance and insurance industries through a complex and time-varying network of relationships.
<!-- voice-ignore-next 1 -->
> Our results show an asymmetry in the degree of connectedness among the four sectors, with banks playing a much more important role in transmitting shocks than other financial institutions.

## Replication

No replication on file in 09-strategies or lab/RESULTS.md.

## Abstract

Taken from the open-access full text; OpenAlex holds none.

<!-- voice-ignore-next 1 -->
> We propose several econometric measures of connectedness based on principal-components analysis and Granger-causality networks, and apply them to the monthly returns of hedge funds, banks, broker/dealers, and insurance companies. We find that all four sectors have become highly interrelated over the past decade, likely increasing the level of systemic risk in the finance and insurance industries through a complex and time-varying network of relationships. These measures can also identify and quantify financial crisis periods, and seem to contain predictive power in out-of-sample tests. Our results show an asymmetry in the degree of connectedness among the four sectors, with banks playing a much more important role in transmitting shocks than other financial institutions.

## Full Text

Open-access copy: https://iris.unive.it/bitstream/10278/31123/1/WP_DSE_21_11.pdf

## Deep Read

Source: open-access Ca' Foscari University of Venice Working Paper 21/WP/2011, November 2011, the version published in the Journal of Financial Economics 104(3), 2012. Read 2026-11-27.

### Research Question

Can return-based measures of connectedness among hedge funds, banks, broker/dealers and insurers track systemic risk, flag crisis periods and predict which institutions lose the most in a crisis?

### Data and Sample

Monthly returns from January 1994 to December 2008: hedge fund indexes and individual funds from CS/Tremont and TASS, and CRSP returns for banks, broker/dealers and insurers by SIC code. For the network tests, the 25 largest institutions in each sector, by assets under management for funds and market value otherwise, over five 36-month windows: 1994 to 1996, 1996 to 1998, 1999 to 2001, 2002 to 2004 and 2006 to 2008.

### Method

Principal components analysis on rolling 36-month windows: the share of variance explained by the first components measures common exposure, and PCAS scores each institution's contribution to it. Linear Granger-causality tests between every pair of the 100 institutions, after removing autocorrelation and GARCH(1,1) heteroskedasticity, define a directed network at the 5 percent level. Network measures: number of in, out and cross-sector connections, closeness and eigenvector centrality. Nonlinear Granger tests with regime switching (Table 5). Out of sample, institutions are ranked by measures from October 2002 to September 2005 and July 2004 to June 2007 and compared with their maximum percentage loss from July 2007 to December 2008 (Tables 6 to 8).

### Main Results

The first principal component explains 33 percent of return variation on average and rises before and during crises, peaking in October 2008.

Table 4: Granger connections numbered 583, 6 percent of all possible, in 1994 to 1996; 856, 9 percent, in 1996 to 1998 around LTCM; 611 in 2002 to 2004; and 1,244, 13 percent, in 2006 to 2008.

Connections are asymmetric: returns of banks and insurers Granger-cause returns of hedge funds and broker/dealers more than the reverse, and the asymmetry became significant before the 2007 to 2009 crisis.

Table 7, October 2002 to September 2005 measures: the number of Out-to-Other connections predicts the crisis loss rank with coefficient 0.32, t = 3.11, Kendall tau 0.22; Out connections 0.23, t = 2.23. Closeness and eigenvector centrality also predict losses. PCAS rankings predict losses in Table 6.

Table 8: in a multivariate rank regression, network measures and estimated leverage predict maximum losses; size does not.

### Robustness

Two pre-crisis estimation windows, nonlinear Granger tests, asset-weighted and individual returns, and controls for leverage and size. Rank regressions of network measures on firm traits are inconclusive.

### Stated Limits

Granger causality measures statistical prediction; it does not establish economic causation. Monthly returns of hedge funds are smoothed and lagged. Leverage proxies are crude. The out-of-sample test covers one crisis.

### Retail Systematic Trader

Rising cross-sector correlation and a higher first principal component share warn of systemic stress. A retail book can compute the first-component share across bank, insurer and broker stocks on a rolling 36-month window and cut leverage or financial-sector exposure when it climbs. Firms that Granger-cause many others are the ones that fell furthest in 2008; they are candidates to avoid when the network tightens. The signal is slow, built on monthly data.
