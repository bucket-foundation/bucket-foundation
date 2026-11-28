# Risks for the Long Run: A Potential Resolution of Asset Pricing Puzzles <!-- voice-ignore-line -->

Topic: Asset Pricing  
Also tagged: Asset Pricing  
OpenAlex: https://openalex.org/W2113704261  
Bead: `bkt-q5moa.19`

| Field | Value |
|---|---|
| Authors | Ravi Bansal, Amir Yaron | <!-- voice-ignore-line -->
| Year | 2000 |
| Venue | The Journal of Finance | <!-- voice-ignore-line -->
| DOI | https://doi.org/10.3386/w8059 |
| Cited by | 4520 as of 2026-11-27 |
| Cited by inside this set | 4 |

## Method

Theoretical model. Assigned by keyword match on title and abstract.

## Main Result

Sentences from the abstract that state the finding:

<!-- voice-ignore-next 1 -->
> As in the data, dividend yields predict returns and the volatility of returns is time‐varying.

## Replication

No replication on file in 09-strategies or lab/RESULTS.md.

## Abstract

<!-- voice-ignore-next 1 -->
> We model consumption and dividend growth rates as containing (1) a small long‐run predictable component, and (2) fluctuating economic uncertainty (consumption volatility). These dynamics, for which we provide empirical support, in conjunction with Epstein and Zin's (1989) preferences, can explain key asset markets phenomena. In our economy, financial markets dislike economic uncertainty and better long‐run growth prospects raise equity prices. The model can justify the equity premium, the risk‐free rate, and the volatility of the market return, risk‐free rate, and the price–dividend ratio. As in the data, dividend yields predict returns and the volatility of returns is time‐varying.

## Full Text

Open-access copy: https://www.nber.org/system/files/working_papers/w8059/w8059.pdf

## Deep Read

Source: open-access NBER working paper version of the article published in the Journal of Finance 59(4), 2004, dated 2000. The front matter uses a broken font and Greek letters drop out of the extracted text; tables and prose extract. Parameter values below are read from the tables. Read 2026-11-27.

### Research Question

Can a small, persistent component in expected consumption and dividend growth, combined with time-varying growth volatility and Epstein-Zin preferences, explain the equity premium, the low risk-free rate, market volatility and return predictability by dividend yields?

### Data and Sample

CRSP value-weighted NYSE returns and dividends, one-month Treasury bills and CPI inflation, monthly, January 1927 to December 1998 (Table 1). Real dividend growth uses a trailing 12-month average to remove seasonality. Newey-West standard errors with 12 lags.

### Method

Dividend growth follows an ARMA(1,1) that is equivalent to a slow-moving expected growth term x(t) with persistence 0.965 plus noise, with the shock to x scaled by 0.851 relative to the moving-average term (Table 2). Volatility of growth follows a GARCH(1,1), persistence 0.983. An HP-filter split puts 11.8 percent of dividend growth variance in the trend. Investors have Epstein-Zin-Weil recursive preferences, separating risk aversion gamma from the elasticity of intertemporal substitution psi. The authors solve for log price-dividend ratios by log-linearization and calibrate over grids of gamma and psi (Tables 3 to 7).

### Main Results

Table 1: the data show a real market return near 7 percent a year with volatility near 19 percent and a real risk-free rate near 0.6 percent with volatility near 1.2 percent.

Table 5, Panel A: with gamma = 5.5 and psi = 2, the model gives an equity premium of 6.34 percent, a risk-free rate of 0.50 percent, market volatility of 19.2 percent and risk-free volatility of 0.50 percent. With psi = 0.5 at the same gamma, the premium falls to 2.11 percent and the risk-free rate rises to 5.75 percent. An IES above 1 is needed.

Table 5, Panel B: removing volatility risk lowers the premium from 6.34 to 5.31 percent at gamma = 5.5, psi = 2.

Table 6: with i.i.d. dividend growth and no persistent component, the premium is 0.10 to 0.26 percent for gamma between 2.5 and 4, and market volatility is 5.55 percent. The long-run component drives both the premium and volatility.

Table 7: under expected utility, matching the premium needs far higher risk aversion.

Table 4: the model produces predictability of returns by dividend yields and GARCH-type volatility in returns.

### Robustness

Alternative persistence and scaling parameters (Table 5, Panel C), removal of volatility risk, i.i.d. growth, and expected utility.

### Stated Limits

The persistent growth component is hard to detect in short samples; the authors rely on its implications for prices. The IES above 1 is disputed in consumption data, which the authors discuss. Cross-sectional implications are left to later work.

### Retail Systematic Trader

No direct signal. The model says most stock price variation comes from news about long-run growth and its uncertainty, and that equity holders earn a premium for exposure to slow-moving growth risk. For a retail allocator this supports holding equities through short-term noise, treating spikes in macro uncertainty as times of higher expected returns, and treating high dividend yields as a sign of higher expected returns over long horizons.
