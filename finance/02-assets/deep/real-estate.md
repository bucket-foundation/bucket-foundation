# Real Estate Deep Dive

Card: [Residential and Commercial Real Estate](../real-estate.md), ID `A-realestate`. As of 2026-11-27. Grades: A primary, B secondary, C single source pending check. Every source below was fetched 2026-11-27.

## Cap Rates
- CBRE H1 2026 U.S. Cap Rate Survey: about 3,600 estimates across more than 50 markets; headline cap rates held flat, neighborhood retail compressed most, then hotels and industrial; infill multifamily is the most bearish subtype. Grade B: the CBRE report sits behind a registration form and the direct fetch returned 403, so these lines come from CBRE's landing page summary and trade press. [CBRE](https://www.cbre.com/insights/reports/us-cap-rate-survey-h1-2026), [CRE Daily](https://www.credaily.com/briefs/cbre-h1-2026-cap-rate-survey-finds-sentiment-split/).
- Stabilized New York City multifamily moved from 4.5% to 5% in H2 2025 to 5% to 5.5% in H1 2026; Chicago suburban Class A office 10% to 12.5%. Grade C, single trade-press source. [CRE Daily](https://www.credaily.com/briefs/cbre-h1-2026-cap-rate-survey-finds-sentiment-split/).
- Green Street CPPI was not fetched; its data needs a subscription.

## Financing
- Freddie Mac PMMS 30-year fixed: 7.40% on 8 and 15 Oct 2026, 7.28% on 19 Nov, 7.21% on 25 Nov. Grade A. [empirical: FRED MORTGAGE30US, 2026-11-27, https://fred.stlouisfed.org/data/MORTGAGE30US.txt]
- Monthly payment on a $400,000 30-year loan at 7.21%: \( P = L\,r/(1-(1+r)^{-n}) \) with \( r = 0.0721/12 \), \( n = 360 \), gives $2,717.86. The annual mortgage constant is \( 12P/L = 8.15\% \). [empirical: FRED MORTGAGE30US 7.21%, 2026-11-27, python3 -c "r=0.0721/12;print(400000*r/(1-(1+r)**-360))"]
- Leverage sign: when the cap rate sits below the mortgage constant, debt lowers cash-on-cash yield. A 5.25% cap rate, the midpoint of the NYC multifamily range above, against an 8.15% constant is negative leverage. Grade C for the cap rate input. [empirical: CRE Daily range midpoint and FRED MORTGAGE30US, 2026-11-27, arithmetic above]

## 1031 Exchange
- For 2018 and later, section 1031 applies only to real property held for use in a trade or business or for investment, other than property held primarily for sale. Grade A. [IRS 2026 Instructions for Form 8824](https://www.irs.gov/pub/irs-prior/i8824--2026.pdf).
- Replacement property must be identified within 45 days after the transfer of the property given up, and received within 180 days or by the tax return due date with extensions, whichever is earlier. Grade A. Same source.
- Report on Form 8824; related-party exchanges carry a two-year follow-up filing. Grade B, from older instruction years summarized by search. [IRS i8824 archive](https://www.irs.gov/pub/irs-prior/i8824--2024.pdf).
- The IRS newsroom tax-tip pages for like-kind exchanges returned 404 at both URLs tried.

## House Hacking
- FHA owner occupancy: at least one borrower must occupy the property within 60 days of signing the security instrument and intend to stay at least one year. Grade A. [HUD Handbook 4000.1 Update 18](https://www.hud.gov/sites/default/files/Housing/documents/40001-hsgh-Update-18.pdf), [HUD FAQ](https://answers.hud.gov/FHA/s/article/How-does-FHA-define-owner-occupant).
- Three and four unit purchases face the self-sufficiency test: PITI divided by net self-sufficiency rental income may not exceed 100%, where net rent is appraised market rent for all units less the greater of the appraiser's vacancy estimate or 25%. Grade B, handbook text seen through search excerpts. Same handbook.
- The handbook landing page fetched at 200 but held only navigation; the PDF was read through search.

## REITs and Direct Ownership
- FTSE Nareit All REITs total return index: 100 at 31 Dec 1971, 11,406.06 at 30 Oct 2026, an annualized 9.02% over 54.8 years. Grade A. [empirical: Nareit MonthlyHistoricalReturns.xls, 2026-11-27, https://www.reit.com/sites/default/files/returns/MonthlyHistoricalReturns.xls, sheet Index Data column B]
- Annualized total return to Oct 2026: 1 year 10.88%, 5 years 1.25%, 10 years 5.94%, 20 years 5.37%. Grade A. [empirical: same file, \( (I_T/I_{T-12k})^{1/k}-1 \)]
- Direct property has no daily index; Case-Shiller tracks price only. The October 2026 monthly All REITs return was 4.29% after -6.08% in September, a measure of the daily mark that direct owners never see. Grade A. [empirical: same file, rows for Sept and Oct 2026]

## Data Sources
| Source | Holds | Access |
|---|---|---|
| [FRED MORTGAGE30US](https://fred.stlouisfed.org/series/MORTGAGE30US) | weekly 30-year rate | free |
| [FRED CSUSHPINSA](https://fred.stlouisfed.org/series/CSUSHPINSA) | Case-Shiller national | free |
| [Nareit index history](https://www.reit.com/data-research/reit-indexes/monthly-index-values-returns) | monthly REIT returns since 1971 | free xls |
| [CBRE cap rate survey](https://www.cbre.com/insights/reports/us-cap-rate-survey-h1-2026) | semiannual cap rates | registration |
| Green Street CPPI | commercial price index | paid |
