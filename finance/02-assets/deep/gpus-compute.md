# GPUs and Compute Deep Dive

Card: [GPUs and Compute](../gpus-compute.md), ID `A-compute`. As of 2026-11-27. Grades: A primary, B secondary, C single source pending check. Every source below was fetched 2026-11-27.

## Rental Prices
- Silicon Data H100 rental index SDH100RT: $3.07 per GPU-hour on 26 Nov 2026; the table lists $2.90 on 28 Oct 2026. Grade B: the same page's FAQ quotes $2.53, so the page disagrees with itself. [empirical: Silicon Data, 2026-11-27, https://www.silicondata.com/products/silicon-index/h100]
- vast.ai on-demand marketplace: 8 H100 SXM offers, median $2.03 per GPU-hour, range $1.74 to $4.24; 12 B200 offers, median $10.00, range $7.50 to $11.89. Grade A for the marketplace snapshot. [empirical: vast.ai bundles API, 2026-11-27, curl 'https://console.vast.ai/api/v0/bundles/?q={"gpu_name":{"eq":"H100 SXM"},"rentable":{"eq":true},"type":"on-demand","limit":500}', median of dph_total/num_gpus]

## Unit Economics
Revenue per GPU per year at rental price \( p \) and utilization \( u \): \( R = 8760\,p\,u \).
- H100 at $3.07: $26,893 at full use, $18,825 at 70%. B200 at the Silicon Data index $7.02: $43,047 at 70%. [empirical: Silicon Data SDH100RT and SDB200RT, 2026-11-27, python3 -c "print(3.07*8760*.7, 7.02*8760*.7)"]
- Straight-line depreciation per year is \( C/L \) for purchase cost \( C \) and life \( L \). The GPU earns its cost back when \( \sum_t 8760\,p_t u_t - \text{opex}_t \ge C \) inside \( L \) years. A two-year fall in \( p \) breaks a six-year schedule before it breaks the asset. No GPU purchase price was fetched from a primary source in this pass, so payback years are left as the formula.

## Depreciation Schedules
- CoreWeave FY2025 10-K: technology equipment depreciates over 6 years. Effective 1 Jan 2023 the company moved computing equipment from five to six years, cutting 2023 expenses by $20 million. Grade A. [CoreWeave 10-K, accession 0001769628-26-000104](https://www.sec.gov/Archives/edgar/data/1769628/000176962826000104/crwv-20251231.htm).
- Nebius FY2025 20-F: "Our main assets, GPUs, are currently depreciated over four years." In January 2026 it concluded servers and network equipment should move from four to five years, which it expects to cut 2026 depreciation by about $167.6 million. Grade A. [Nebius 20-F, accession 0001104659-26-052948](https://www.sec.gov/Archives/edgar/data/1513845/000110465926052948/nbis-20251231x20f.htm).
- The gap between four and six years changes reported earnings on the same hardware by a factor of \( 6/4 = 1.5 \) in annual depreciation.

## GPU-Backed Debt
- CoreWeave Q3 2026 10-Q: DDTL 4.0, March 2026, $8.5B capacity at SOFR + 2.25% or Treasury + 2.00%. Older facilities carry 9% to 15% effective rates: DDTL 1.0 at 15%, DDTL 2.0 at 11%, DDTL 3.0 at 9%. Grade A. [CoreWeave 10-Q, accession 0001769628-26-000465](https://www.sec.gov/Archives/edgar/data/1769628/000176962826000465/crwv-20260930.htm).
- Future principal at 30 Sept 2026: $2.433B rest of 2026, $10.974B in 2027, $5.479B in 2028, $4.727B in 2029, $4.247B in 2030, $19.645B after; total $47.505B. Grade A. Same filing.
- DDTL 4.0 is non-recourse and secured by the equity and "substantially all of the assets" of the subsidiary CoreWeave Compute Acquisition Co. VIII: at 30 Sept 2026, $5.2B of non-current assets, mostly property and equipment, and $233M of current assets, mostly receivables. Grade A. Same filing. <!-- voice-ignore-line -->

## Compute Futures and Indexes
- CME Group and Silicon Data announced H100 and B200 Rental Index Futures for 5 Oct 2026, pending regulatory review: 730 GPU-hours per contract, quoted in dollars per GPU-hour, $0.01 tick, cash settled against the Silicon Data indexes. Grade B: the CME release timed out on fetch and these terms come through search summaries of CME SER 9785. [CME release](https://www.cmegroup.com/media-room/press-releases/2026/8/11/cme_group_and_silicondatatolaunchcomputefuturesonoctober5tounloc.html), [CME SER 9785](https://www.cmegroup.com/content/dam/cmegroup/notices/ser/2026/08/ser-9785.pdf).
- A CFTC record for the H100 contract showed approval pending on 21 Sept 2026; no source fetched today confirms first trade. Grade C. [CFTC product 62544](https://www.cftc.gov/IndustryOversight/IndustryFilings/TradingOrganizationProducts/62544).
- One contract at $3.07 has notional \( 730 \times 3.07 = \$2{,}241 \). [empirical: Silicon Data SDH100RT, 2026-11-27, arithmetic]

## Data Sources
| Source | Holds |
|---|---|
| [Silicon Data indexes](https://www.silicondata.com/products/silicon-index/h100) | daily H100 and B200 rent |
| [vast.ai API](https://console.vast.ai/api/v0/bundles/) | live marketplace offers |
| [SEC EDGAR](https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001769628) | CoreWeave and Nebius filings |
| [CME compute futures](https://www.cmegroup.com/markets/energy/files/compute-futures-fact-card.pdf) | contract specs |
