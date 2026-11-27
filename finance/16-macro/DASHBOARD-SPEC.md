# Macro Dashboard Spec

As of 2026-11-27. The macro block of the daily brief, `lab/brief.py`. Each row: series, source, frequency, the reading on 27 Nov 2026, and the alert threshold with where the threshold comes from. Threshold types: **Sourced** is the publisher's or author's own rule; **Lab** is a percentile computed from the lab's FRED files on 2026-11-27; **House** is a working level set here and open to revision after backtest.

## Policy and Plumbing
| Indicator | Series | Freq | 27 Nov 2026 | Alert | Basis |
|---|---|---|---|---|---|
| Fed funds effective | FRED `EFFR` | daily | 3.88 | outside 3.75 to 4.00 range | Sourced: FOMC directive 28 Oct 2026 |
| SOFR minus IORB | `SOFR` less `IORB` | daily | +5 bp | above 0 for 5 straight days, or above +15 bp once | Lab: 2025 max +32, 2026 max +10; House levels |
| Standing repo usage | `RPONTSYD` | daily | 0.0 | above $0 outside quarter end | House; [standing-repo-facility](cards/standing-repo-facility.md) |
| ON RRP | `RRPONTSYD` | daily | $0.3B | jump above $100B | House: cash returning means reserves abundant |
| Reserve balances | `WRESBAL` | weekly | $2,979.7B | fall of $150B in 4 weeks, or below $2,700B | House; Sept 2019 broke at $1.34T, [sept-2019-repo-spike](cards/sept-2019-repo-spike.md) |
| TGA | `WTREGEN`, DTS | daily | $958.4B on 24 Nov | above Treasury's stated target, $850B end Dec, $1,000B end Mar | Sourced: Treasury financing estimates 2 Nov 2026 |
| Swap line usage | `SWPT` | weekly | $0.146B | above $5B | House; March 2020 pattern, [fed-swap-lines](cards/fed-swap-lines.md) |
| Fed total assets | `WALCL` | weekly | $6,741.5B | weekly change above $50B either way | House |

## Rates and Curve
| Indicator | Series | Freq | 27 Nov 2026 | Alert | Basis |
|---|---|---|---|---|---|
| 2-year | `DGS2` | daily | 4.63 | 15 bp move in a day | House |
| 10-year | `DGS10` | daily | 4.91 | above 5.31, the Oct 2026 peak | House, from [2026-STATE](../02-assets/2026-STATE.md) |
| 10y minus 3m | `T10Y3M` | daily | 0.51 | below 0 | Sourced: NY Fed yield curve model; [CRISIS-PATTERNS](../01-money-history/CRISIS-PATTERNS.md) calls it a regime marker |
| NY Fed recession probability | allmonth.xls | monthly | 12.4% for Oct 2027 | above 30% | House |
| Term premium | `THREEFYTP10` | weekly | 0.89 | rise of 30 bp in a month | House |
| 5y5y breakeven | `T5YIFR` | daily | 2.11 | above 2.50 or below 1.75 | House, around the 2% goal |
| 10y TIPS real yield | `DFII10` | daily | 2.79 | above 3.00 | House |
| Auction 10y and 30y | TreasuryDirect | per auction | 10y 5.02%, b/c 2.46 | bid-to-cover below 2.30 | House; [treasury-auctions](cards/treasury-auctions.md) |

## Inflation
| Indicator | Series | Freq | Latest | Alert | Basis |
|---|---|---|---|---|---|
| Core CPI m/m | `CPILFESL` | monthly | 0.30%, Oct | 0.40% or more | House |
| Headline CPI y/y | `CPIAUCSL` | monthly | 4.08% | above 4.5% | House |
| Core PCE y/y | `PCEPILFE` | monthly | 3.26% | above the SEP 2026 median 3.4 | Sourced: SEP 16 Sept 2026 |
| Median CPI | `MEDCPIM158SFRBCLE` | monthly | 3.66 | above 4.0 | House |
| Michigan 1y expectation | `MICH` | monthly | 4.7 | above 5.0 | House |
| WTI | `DCOILWTICO` | daily | $82.24 | 10% move in 5 days | House; [supply-shocks-oil](cards/supply-shocks-oil.md) |

## Activity and Labor
| Indicator | Series | Freq | Latest | Alert | Basis |
|---|---|---|---|---|---|
| Sahm rule | `SAHMREALTIME` | monthly | 0.00 | 0.50 or more; watch at 0.30 | Sourced: Sahm, FRED notes; watch level House |
| CFNAI-MA3 | `CFNAIMA3` | monthly | CFNAI -0.06 | below -0.70; above +0.70 for inflation | Sourced: Chicago Fed |
| Initial claims | `ICSA` | weekly | 189k | 4-week average above 250k | House; 2019 mean 218k from lab |
| Payrolls | `PAYEMS` | monthly | +165k, Oct | negative print, or 3-month average below 50k | House |
| GDPNow | `GDPNOW` | as updated | 2.90 | below 0.5 | House |
| Smoothed recession probability | `RECPROUSM156N` | monthly | 0.40% | above 20% | House |

## Credit and Stress
| Indicator | Series | Freq | Latest | Alert | Basis |
|---|---|---|---|---|---|
| NFCI | `NFCI` | weekly | -0.444 | above 0 | Sourced: Chicago Fed, positive is tighter than average |
| STLFSI4 | `STLFSI4` | weekly | -0.07 | above 0 | Sourced: St. Louis Fed, zero is normal |
| HY OAS | `BAMLH0A0HYM2` | daily | 3.72 | above 4.61, the max of FRED's 3-year window | Lab |
| Baa minus 10y | `BAA` less `GS10` | monthly | 1.46, Oct | above 2.91, the 90th percentile since 1953 | Lab |
| VIX | `VIXCLS` | daily | 26.80 | above 28.5, the 90th percentile since 1990 | Lab |
| SLOOS C&I tightening | `DRTSCILM` | quarterly | 1.7 | above 20 | House |

## Global and Dollar
| Indicator | Series | Freq | Latest | Alert | Basis |
|---|---|---|---|---|---|
| Broad dollar | `DTWEXBGS` | daily | 123.60 | 3% move in a month | House |
| USD/JPY | `DEXJPUS` | daily | lab | 3% move in a week | House; BoJ at 1.25%, [boj](cards/boj.md) |
| Foreign official Treasuries | TIC table 5 | monthly | $3,674.7B, Sept | fall above $100B in a month | House |
| Offshore USD credit | BIS GLI | quarterly | $15.13T, Q2 | y/y growth above 10% | House |
| Stablecoin supply | DefiLlama, lab | daily | $283.7B | 30-day fall above 5% | House; Nov 2026 drop of $14.2B was the steepest since June 2022 per [2026-STATE](../02-assets/2026-STATE.md) |

## Calendar Feed
The brief lists releases due in the next 7 days: FOMC 8 and 9 Dec 2026; Employment Situation 4 Dec 2026, 8 Jan 2027; CPI 10 Dec 2026, 13 Jan 2027; BEA PCE and GDP 23 Dec 2026; trade 8 Dec 2026; Census retail sales 15 Jan 2027; Treasury refunding estimates 1 Feb 2027. Sources in the matching cards.

## Wiring
- Series already in `lab/data/raw/fred/` load from there; add `RPONTSYD`, `SWPT`, `GDPNOW`, `CFNAIMA3`, `MEDCPIM158SFRBCLE`, `PCETRIM12M159SFRBDAL`, `ECIALLCIV` to the FRED list in `lab/fetch.py`.
- Non-FRED feeds: NY Fed Markets API for SOFR percentiles, Fiscal Data DTS for TGA, TreasuryDirect auctions, TIC table 5, BIS GLI, DefiLlama.
- One alert line per breach, House thresholds tagged so the founder can see which rules lack a source. Each House level gets a backtest against NBER dates and the crisis cards before it can move a position.
