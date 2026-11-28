# Long-Run Return Datasets

As of 2026-11-27. Annual real returns, each read from the primary document on 2026-11-27. Grade A unless marked.

| Dataset | Coverage | Headline | Get it |
|---|---|---|---|
| Jordà, Knoll, Kuvshinov, Schularick, Taylor, "The Rate of Return on Everything, 1870-2015", *QJE* 134(3), 2019 | 16 countries, 1870 to 2015, equal weighted | Arithmetic mean real: bills 0.98% (sd 6.01), bonds 2.50% (sd 10.74), equity 6.89% (sd 21.94), housing 7.05% (sd 9.98). Geometric: 0.78%, 1.94%, 4.64%, 6.61%. Post-1950 equity 8.28%, housing 7.44%. [JST, FRBSF WP 2017-25, Table 3](https://www.frbsf.org/wp-content/uploads/wp2017-25.pdf) | macrohistory.net/database |
| Dimson, Marsh, Staunton, *UBS Global Investment Returns Yearbook* 2026 | 35 markets, 1900 to 2025 | US real: equities 6.6%, bonds 1.6%, bills 0.5%, inflation 2.9% a year (Fig. 12). Real DM equity index 4.4%, EM 2.6% a year. Real USD gold 1.3% a year, 5.2-fold since 1900. The PDF returned 403 on a re-fetch 2026-11-27. World index and equity volatility figures are absent from the free summary: not stated here. [UBS GIRY 2026 summary](https://www.ubs.com/content/dam/assets/wm/static/cio/documents/giry2026-summary-public.pdf) | UBS summary PDF |
| Robert Shiller, *Irrational Exuberance* data | US, 1871 to Sept 2023, monthly | Yale file ends Sept 2023. Real total return 6.9% a year Jan 1871 to Sept 2023; CAPE median 16.5, peak 44.2 in Dec 1999, 30.8 in Sept 2023. Parsed from ie_data.xls fetched 2026-11-27 | econ.yale.edu/~shiller/data.htm |
| Kenneth French Data Library | US from 1926, global factors | Market, size, value, momentum, profitability factor returns | mba.tuck.dartmouth.edu/pages/faculty/ken.french |
| FRED | US macro, rates, housing | Case-Shiller, Treasury yields, CPI | fred.stlouisfed.org |
| NCREIF Farmland Index | US farmland from 1991 | No return figure quoted; NCREIF data needs a member login. USDA ERS: farmland $4,500 an acre in 2026 | ncreif.org |

## Reading Notes
- JST housing returns are mean 7.05% with under half the equity standard deviation; the paper computes rents net of estimated costs, so read its methods before comparing with net-of-tax equity returns.
- Equities beat bonds, bills and inflation in all 21 Yearbook countries with continuous histories; bonds beat bills everywhere except Portugal (UBS 2026 summary, section 3). Grade A.
- All three datasets end before or near 2024; 2025 and 2026 returns come from market sources in `02-assets/`.
