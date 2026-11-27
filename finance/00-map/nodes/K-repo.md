# Repo and Money Markets

ID: `K-repo`
As of: 2026-11-27
Bead: `bkt-q5moa.1`

## What It Is

Repo is a secured overnight loan against collateral, mostly Treasuries. SOFR, published by the New York Fed, is the volume-weighted median of overnight Treasury repo and replaced USD LIBOR. The Fed's overnight reverse repo facility (ON RRP) takes cash from money funds at a floor rate.

## Key Numbers and Dates

- SOFR 3.95% on 2026-11-25, volume $3,145B; 1st to 99th percentile 3.89% to 4.03%. **A**
- SOFR ran 3.91% to 3.95% from 2026-11-19 to 2026-11-25, volumes $3.14T to $3.17T a day. **A**
- ON RRP take-up $300M on 2026-11-25, down from $405M on 2026-11-19. The facility is near empty compared with its 2022-2023 peak above $2T (peak figure from memory). **A**
- Effective fed funds 3.88% on 2026-11-24 per H.15; SOFR trades above it, a sign of tight repo funding. **A**

## 2026 State

ON RRP has drained to a few hundred million dollars; repo rates sit 7 basis points over EFFR. Reserve scarcity is the live question in late 2026.

## Sources

1. NY Fed Markets API, SOFR last 5 observations. https://markets.newyorkfed.org/api/rates/secured/sofr/last/5.json (fetched 2026-11-27)
2. NY Fed Markets API, reverse repo operations 2026-11-01 to 2026-11-27. https://markets.newyorkfed.org/api/rp/reverserepo/propositions/search.json?startDate=2026-11-01&endDate=2026-11-27 (fetched 2026-11-27)
3. Federal Reserve H.15 Selected Interest Rates, release 2026-11-25. https://www.federalreserve.gov/releases/h15/ (fetched 2026-11-27)

Grades: A primary data or statute, B reputable secondary, C single source or memory pending check.
