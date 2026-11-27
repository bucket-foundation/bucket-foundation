# What Explains the Stock Market's Reaction to Federal Reserve Policy? <!-- voice-ignore-line -->

Topic: Monetary Economics  
Also tagged: Monetary Economics  
OpenAlex: https://openalex.org/W2165100677  
Bead: `bkt-q5moa.19`

| Field | Value |
|---|---|
| Authors | Ben Bernanke, Kenneth N. Kuttner | <!-- voice-ignore-line -->
| Year | 2005 |
| Venue | The Journal of Finance | <!-- voice-ignore-line -->
| DOI | https://doi.org/10.1111/j.1540-6261.2005.00760.x |
| Cited by | 3109 as of 2026-11-27 |
| Cited by inside this set | 7 |

## Method

Empirical analysis. Assigned by keyword match on title and abstract.

## Main Result

Sentences from the abstract that state the finding:

<!-- voice-ignore-next 1 -->
> We find that, on average, a hypothetical unanticipated 25‐basis‐point cut in the Federal funds rate target is associated with about a 1% increase in broad stock indexes.
<!-- voice-ignore-next 1 -->
> Adapting a methodology due to Campbell and Ammer, we find that the effects of unanticipated monetary policy actions on expected excess returns account for the largest part of the response of stock prices.

## Replication

No replication on file in 09-strategies or lab/RESULTS.md.

## Abstract

<!-- voice-ignore-next 1 -->
> This paper analyzes the impact of changes in monetary policy on equity prices, with the objectives of both measuring the average reaction of the stock market and understanding the economic sources of that reaction. We find that, on average, a hypothetical unanticipated 25‐basis‐point cut in the Federal funds rate target is associated with about a 1% increase in broad stock indexes. Adapting a methodology due to Campbell and Ammer, we find that the effects of unanticipated monetary policy actions on expected excess returns account for the largest part of the response of stock prices.

## Full Text

Open-access copy: https://www.nber.org/system/files/working_papers/w10402/w10402.pdf

## Deep Read

Source: open-access NBER Working Paper 10402, March 2004, the version published in the Journal of Finance 60(3), 2005. Read 2026-11-27.

### Research Question

How much do stock prices move on unexpected Federal Reserve rate changes, and does the move come from news about dividends, real interest rates or future excess returns?

### Data and Sample

FOMC announcement days and target changes from June 1989 through 2002. The surprise component of each change comes from the one-day move in the current-month federal funds futures rate, following Kuttner (2001). Daily CRSP value-weighted returns and industry portfolios. A monthly VAR from 1973 to 2002 for the variance decomposition.

### Method

Event-day regressions of the stock return on the raw target change, equation (3), and on its expected and surprise parts, equation (4) (Table 2). Six high-influence dates (August 8, 1991; July 2, 1992; October 15, 1998; January 3, March 20 and April 18, 2001) are examined and dropped as a check. Endogeneity is addressed by controlling for employment report days (Table 3) and by tests of reverse causation. Responses of industry portfolios are compared with CAPM betas. A Campbell (1991) and Campbell-Ammer (1993) VAR decomposition splits the excess return response into revisions in expected dividends, real rates and future excess returns (Table 11).

### Main Results

Table 2, column (b): a one percentage point surprise in the funds rate target lowers the CRSP index by 4.68 percent on the day; the expected component has a small effect and the raw change is insignificant. A 25 basis point surprise cut implies roughly a 1 percent rise. Dropping the six outliers cuts the response to minus 2.55, still significant, and the R2 from 0.17 to 0.05.

Industry responses: high tech and telecom respond most, about half again as much as the market; energy and utilities respond about half as much as the market, insignificantly (Table 9). Precision is too low to reject equal responses across the 10 industries; differences line up with CAPM betas.

Table 11, VAR over 1973 to 2002: of an excess return response of about minus 11.6 to a unit funds rate shock, just over half comes from lower expected future excess returns (a higher risk premium), and minus 4.82 from lower expected dividends; real rate news contributes under 1 point. Over 1989 to 2000, future excess returns account for an insignificant 3.29 points of a minus 11.01 response.

### Robustness

Outliers excluded, employment-report controls, alternative surprise measures and the shorter VAR sample.

### Stated Limits

Event-day returns may mix policy news with other news; the surprise measure assumes futures prices reflect expectations with no risk premium; the VAR decomposition depends on the chosen state variables and gives imprecise splits.

### Retail Systematic Trader

Stocks react to the surprise in a Fed decision, measured from fed funds futures, and ignore the expected part. A retail trader can estimate the surprise from the futures price move at the announcement; a 25 basis point surprise moves broad equities by about 1 percent, more for high-beta tech. Most of the price effect works through the equity risk premium, which suggests momentum in the direction of the surprise for days to months. Event trades need fast execution; the lasting lesson is to read FOMC risk through the futures-implied expectation.
