# Shelter Inflation

ID `M-shelter-inflation`. As of 2026-11-27. Section: inflation.

## What It Is
CPI shelter: rent of primary residence plus owners' equivalent rent, the imputed rent homeowners pay themselves. It averages rents on existing leases, so it trails market rents.

## Current State
Lab FRED files, computed 2026-11-27. Grade A inputs.
- Shelter CUSR0000SAH1: 431.908 in Sept 2026 against 418.422 in Sept 2025, up 3.22%. Oct 2026 433.224, up 0.30% on the month.
- Owners' equivalent rent CUSR0000SEHC: 445.265 in Sept 2026 against 431.132 in Sept 2025, up 3.28%. Oct 2026 446.687, up 0.32% on the month.
- The lab files carry no Oct 2025 value, so October year-on-year rates are not computed.
- Case-Shiller national index fell from 337.204 in July to 335.754 in Sept 2026 per [2026-STATE](../../02-assets/2026-STATE.md): house prices have stalled while shelter CPI still runs above 3%.

## Market Reaction
Shelter prints drive core CPI surprises. Falling market prices feed into CPI shelter with a lag, which argues for core CPI cooling in 2027.

## Data
FRED `CUSR0000SAH1` ([lab](../../lab/data/raw/fred/CUSR0000SAH1.csv)), `CUSR0000SEHC` ([lab](../../lab/data/raw/fred/CUSR0000SEHC.csv)), `CSUSHPINSA` ([lab](../../lab/data/raw/fred/CSUSHPINSA.csv)).

## Sources
- FRED series above, lab copies read 2026-11-27. Grade A.
