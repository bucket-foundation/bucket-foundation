# Better to give than to receive: Predictive directional measurement of volatility spillovers <!-- voice-ignore-line -->

Topic: Banking and Crises  
Also tagged: Banking and Crises  
OpenAlex: https://openalex.org/W2039734130  
Bead: `bkt-q5moa.19`

| Field | Value |
|---|---|
| Authors | Francis X. Diebold, Kamil Yılmaz | <!-- voice-ignore-line -->
| Year | 2011 |
| Venue | International Journal of Forecasting | <!-- voice-ignore-line -->
| DOI | https://doi.org/10.1016/j.ijforecast.2011.02.006 |
| Cited by | 6626 as of 2026-11-27 |
| Cited by inside this set | 6 |

## Method

Vector autoregression. Assigned by keyword match on title and abstract.

## Main Result

Sentences from the abstract that state the finding:

<!-- voice-ignore-next 1 -->
> We show that despite significant volatility fluctuations in all four markets during the sample, cross-market volatility spillovers were quite limited until the global financial crisis that began in 2007.

## Replication

No replication on file in 09-strategies or lab/RESULTS.md.

## Abstract

Taken from the open-access full text; OpenAlex holds none.

<!-- voice-ignore-next 1 -->
> Using a generalized vector autoregressive framework in which forecast-error variance decompositions are invariant to variable ordering, we propose measures of both total and directional volatility spillovers. We use our methods to characterize daily volatility spillovers across U.S. stock, bond, foreign exchange and commodities markets, from January 1999 through January 2010. We show that despite significant volatility fluctuations in all four markets during the sample, cross-market volatility spillovers were quite limited until the global financial crisis that began in 2007. As the crisis intensified so too did the volatility spillovers, with particularly important spillovers from the stock market to other markets taking place after the collapse of Lehman Brothers in September 2008.

## Full Text

Open-access copy: https://www.econstor.eu/bitstream/10419/45422/1/638343968.pdf

## Deep Read

Source: open-access Koc University TUSIAD Economic Research Forum Working Paper 1001, revised March 2010, via EconStor, the version published in the International Journal of Forecasting 28(1), 2012. Read 2026-11-27.

### Research Question

How can volatility spillovers across markets be measured so that results do not depend on variable ordering, and which markets transmitted volatility to which, above all in the 2007 to 2009 crisis?

### Data and Sample

Daily range-based volatility (Parkinson-style, from high, low, open and close prices) for four US markets: the S&P 500, the 10-year Treasury yield, NYBOT dollar index futures and the Dow Jones-UBS commodity index, January 1999 to January 2010. Log volatilities are close to normal (Table 1).

### Method

Fit a VAR to the four log volatilities and compute the H-step generalized forecast error variance decomposition of Koop, Pesaran and Potter and Pesaran-Shin, which does not depend on ordering, equation (2). Normalize rows to sum to one. The total spillover index is the share of forecast error variance coming from other markets. Directional spillovers "from" and "to" others are row and column sums of off-diagonal shares; net spillovers are their difference; net pairwise spillovers compare two markets. Dynamics use 200-day rolling samples.

### Main Results

Table 2, full sample: the total spillover index is 12.6 percent (50.3 of 400). Stocks receive 11.24 percent of their variance from others and send 16.29 percent; bonds receive 18.51 and send 17.95; commodities receive 6.29 and send 4.63; FX receives 14.24 and sends 11.41.

Rolling analysis: total spillovers start a little below 15 percent and mostly sit between 10 and 20 percent, exceed 20 percent in mid-2006, and exceed 30 percent in the 2007 to 2009 crisis, twice in 2008, in the first and fourth quarters.

Net spillovers stayed under 3 percent for every market until 2007, with each market both giving and receiving. From January 2008 the stock market was a persistent net transmitter; net spillovers from stocks reached about 6 to 7 percent after the September 2008 Lehman collapse, much of it to FX, close to 5 percent.

### Robustness

The generalized decomposition removes ordering dependence; Figures A1 and A2 show the total spillover plot is not sensitive to the VAR lag order or the forecast horizon.

### Stated Limits

The measures describe spillovers without identifying their causes. Results rest on the VAR approximation and the rolling window. The application covers four US markets.

### Retail Systematic Trader

A rolling spillover index across stocks, bonds, FX and commodities flags regimes in which diversification across asset classes weakens. A retail multi-asset book can compute it from daily ranges with open-source code and reduce gross exposure or rebalance toward cash when total spillovers break above their normal 10 to 20 percent band. Stocks led the other markets in 2008, so equity volatility is the input to watch first.
