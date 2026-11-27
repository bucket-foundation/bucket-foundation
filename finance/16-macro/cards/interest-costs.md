# Federal Interest Costs

ID `M-interest-costs`. As of 2026-11-27. Section: fiscal.

## What It Is
What the Treasury pays on its debt. It rises with debt stock and with the average rate as old low coupons roll into new higher ones.

## Current State
- Average rate on total interest-bearing debt 3.580% on 31 Oct 2026; marketable 3.570%; bills 4.014%; notes 3.399%; bonds 3.483%; TIPS 1.227%. Grade A.
- Total public debt $40,793.3B on 24 Nov 2026: $32,953.1B held by the public, $7,840.2B intragovernmental. Grade A.
- Federal interest payments $1,328.8B annualized in 2026 Q3, FRED A091RC1Q027SBEA. Grade A.

## Mechanism
With bills near 4% and notes averaging 3.4%, each coupon rollover at current yields (10-year 4.91%) raises the average rate. Interest compounds into the deficit; see [debt-dynamics-r-minus-g](debt-dynamics-r-minus-g.md).

## Data
FRED `A091RC1Q027SBEA` ([lab](../../lab/data/raw/fred/A091RC1Q027SBEA.csv)), `FYOINT` ([lab](../../lab/data/raw/fred/FYOINT.csv)), `GFDEBTN` ([lab](../../lab/data/raw/fred/GFDEBTN.csv)).

## Sources
- [Fiscal Data average interest rates](https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/avg_interest_rates), fetched 2026-11-27. Grade A.
- [Debt to the Penny API](https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/debt_to_penny), fetched 2026-11-27. Grade A.
- [FRED A091RC1Q027SBEA](https://fred.stlouisfed.org/series/A091RC1Q027SBEA), fetched 2026-11-27. Grade A.
