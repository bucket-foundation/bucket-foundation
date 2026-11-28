# CEO Overconfidence and Corporate Investment <!-- voice-ignore-line -->

Topic: Behavioral Finance  
Also tagged: Behavioral Finance  
OpenAlex: https://openalex.org/W3123502919  
Bead: `bkt-q5moa.19`

| Field | Value |
|---|---|
| Authors | Ulrike M. Malmendier, Geoffrey A. Tate | <!-- voice-ignore-line -->
| Year | 2005 |
| Venue | The Journal of Finance | <!-- voice-ignore-line -->
| DOI | https://doi.org/10.1111/j.1540-6261.2005.00813.x |
| Cited by | 4559 as of 2026-11-27 |
| Cited by inside this set | 6 |

## Method

Panel regression. Assigned by keyword match on title and abstract.

## Main Result

Sentences from the abstract that state the finding:

<!-- voice-ignore-next 1 -->
> We find that investment of overconfident CEOs is significantly more responsive to cash flow, particularly in equity‐dependent firms.

## Replication

No replication on file in 09-strategies or lab/RESULTS.md.

## Abstract

<!-- voice-ignore-next 1 -->
> We argue that managerial overconfidence can account for corporate investment distortions. Overconfident managers overestimate the returns to their investment projects and view external funds as unduly costly. Thus, they overinvest when they have abundant internal funds, but curtail investment when they require external financing. We test the overconfidence hypothesis, using panel data on personal portfolio and corporate investment decisions of Forbes 500 CEOs. We classify CEOs as overconfident if they persistently fail to reduce their personal exposure to company‐specific risk. We find that investment of overconfident CEOs is significantly more responsive to cash flow, particularly in equity‐dependent firms.

## Full Text

Open-access copy: https://www.nber.org/system/files/working_papers/w10807/w10807.pdf

## Deep Read

Source: open-access NBER Working Paper 10807, September 2004, the version published in the Journal of Finance 60(6), 2005. Read 2026-11-27.

### Research Question

Does CEO overconfidence explain why corporate investment rises with internal cash flow, with overconfident CEOs investing more when cash is plentiful and less when they must raise outside equity they see as underpriced?

### Data and Sample

CEO stock and option holdings for 477 large US firms that appear on Forbes 500 lists between 1980 and 1994, from Hall and Liebman (1998) and Yermack (1995), merged with Compustat investment, cash flow and Q.

### Method

A model in which an overconfident CEO overestimates project returns by a percentage Delta, so investment rises with cash flow when external finance is needed. Three overconfidence measures from the CEO's own portfolio: Holder 67 (the CEO holds a five-year-old option more than 67 percent in the money, a threshold from a Hall-Murphy calibration with CRRA risk aversion of 3 and 66 percent of wealth in company equity); Longholder (the CEO held an option to its final year); and Net Buyer (the CEO habitually bought company stock in his first five years). Panel regressions of investment over capital on cash flow, Q, ownership, vested options, size and governance, and their interactions with cash flow, plus an overconfidence dummy and its interaction with cash flow, with firm and year effects and standard errors clustered by firm (Table V). Separate regressions by Kaplan-Zingales financing-constraint quintile (Table VIII). Table IV tests whether late exercisers had inside information.

### Main Results

Table IV: CEOs who held past the 67 percent threshold beat the S&P 500 only 45.86 percent of the time, and the return gain from holding is not positive, so inside information does not explain late exercise.

Table V: the interaction of Holder 67 with cash flow is 0.2339 in OLS with controls, significant at 1 percent and robust to firm clustering and industry-by-cash-flow effects. Stock ownership and vested options lower cash flow sensitivity (minus 0.57 and minus 0.46 on the interactions), and larger firms have lower sensitivity. Figure 1: results hold for thresholds from 50 to 150 percent in the money; options 0 to 50 percent in the money have an insignificant effect.

Table VIII: the Longholder interaction with cash flow is significant only in the top Kaplan-Zingales quintile, the most equity-dependent firms, with coefficient 0.4990 (t = 3.52).

Results hold for Longholder and Net Buyer.

### Robustness

Alternative thresholds, three overconfidence measures, firm-clustered errors, industry effects on cash flow sensitivity, and controls for past stock returns, ownership and governance. The Longholder measure varies within firms across CEOs, which the authors use to identify its effect with firm fixed effects.

### Stated Limits

Late exercise and stock buying could reflect risk tolerance, tax motives, signaling or board pressure; the authors test several, but no measure is a direct reading of beliefs. The sample is large firms in 1980 to 1994.

### Retail Systematic Trader

Overconfident CEOs, flagged by holding deep in-the-money options or habitually buying their own stock, push investment up when cash flows are strong and cut it when they need outside equity. For a stock picker this flags capital allocation risk in cash-rich firms run by such CEOs, a link to the low returns other work finds for high-investment firms. Insider filings make the screen buildable; this paper tests investment behavior and leaves the return effect to other work.
