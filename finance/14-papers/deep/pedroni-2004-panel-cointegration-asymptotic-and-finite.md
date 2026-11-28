## Deep Read

Source: open-access copy on the author's Williams College page of the article in Econometric Theory 20(3), 2004. The PDF encodes minus signs and decimal points as other characters; values below are decoded from context. Read 2026-11-27.

### Research Question

How can one test for cointegration in a panel of time series when slopes, short-run dynamics, fixed effects and trends differ across members, and do such tests support purchasing power parity after Bretton Woods?

### Data and Sample

Monte Carlo simulations with 100,000 draws for the finite-sample moments (Table 1) and for size and power. The application uses IFS nominal dollar exchange rates and CPI deflators for 20 to 25 countries, June 1973 to December 1994, monthly (T = 246) and annual (T = 20) (Table 2).

### Method

Residual-based tests of the null of no cointegration. Each member gets its own cointegrating regression with its own intercept, trend and slope. Seven statistics: four pooled "within-dimension" panel statistics (panel variance ratio, panel rho, panel PP t, panel ADF t) and three "between-dimension" group mean statistics (group rho, group PP t, group ADF t). The author derives sequential limits as T and then N grow, shows each standardized statistic is asymptotically normal and free of nuisance parameters, and tabulates the adjustment moments. Monte Carlo experiments vary N, T and the serial correlation in the errors. The PPP test regresses the log exchange rate on the log price differential, equation (5), allowing country-specific slopes for the weak form of PPP. Cross-sectional dependence is handled by demeaning each series by its cross-country time mean.

### Main Results

The limiting distributions of all seven statistics are standard normal after adjustment by the moments in Table 1.

Monte Carlo: size distortions are small for moderate T, and power is much higher than for single time series tests; the group ADF and panel ADF statistics hold up best in small samples. Power against near unit root alternatives rises with N.

Table 2: individual country tests rarely reject no cointegration; Chile is the only monthly rejection marked. Estimated slopes range from about 0.1 to 2.9. Panel statistics reject the null: with monthly data, all panel statistics reject in the standard case (panel v = 3.27, panel rho = minus 2.05, both significant), and group statistics reject after removing time means. With annual data, panel rho and both ADF statistics reject in the standard case. The author reads this as support for weak PPP in a large share of countries.

### Robustness

Results reported with and without common time effects, for annual and monthly data, with country-specific lag lengths chosen by a step-down procedure.

### Stated Limits

Demeaning by time effects handles only common shocks; persistent cross-country feedback can remain and bias the tests. The author calls the paper an initial study and lists open technical issues.

### Retail Systematic Trader

For a trader, panel cointegration is a tool for testing long-run relations across many related series at once, such as exchange rates and price levels, or groups of stocks and spreads, where single-series tests lack power. The PPP result supports slow mean reversion of real exchange rates over years, a basis for long-horizon currency value tilts. Short samples per series and cross-sectional dependence can overstate the evidence.
