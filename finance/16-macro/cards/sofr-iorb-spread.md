# SOFR minus IORB

ID `M-sofr-iorb-spread`. As of 2026-11-27. Section: money market plumbing.

## What It Is
Repo cost relative to what banks earn on reserves. When reserves are abundant, SOFR trades below IORB; as reserves tighten, banks need a premium to move cash from the Fed into repo and SOFR rises above IORB.

## Evidence
Computed 2026-11-27 from FRED SOFR and IORB, lab files, house calculation. Grade A inputs.
| Year | Mean, bp | Max, bp | Days above zero |
|---|---|---|---|
| 2022 | -11.5 | -8 | 0% |
| 2023 | -9.1 | 0 | 0% |
| 2024 | -6.9 | +15 | 2.4% |
| 2025 | -2.9 | +32 | 27.7% |
| 2026 to 25 Nov | -1.1 | +10 | 26.2% |
25 Nov 2026: SOFR 3.95% less IORB 3.90% = +5 bp.

## Threshold
Persistent readings above zero mark reserves at the ample edge; the Sept 2019 spike came with reserves near $1.34 trillion; see [sept-2019-repo-spike](sept-2019-repo-spike.md). Dashboard levels in [DASHBOARD-SPEC](../DASHBOARD-SPEC.md).

## Data
FRED `SOFR` ([lab](../../lab/data/raw/fred/SOFR.csv)), `IORB` ([lab](../../lab/data/raw/fred/IORB.csv)).

## Sources
- FRED SOFR and IORB, fetched 2026-11-27. Grade A.
