# Network Capacity

Coverage meter for `00-IDEAL-STATE-MAP.md`. A node counts as filled when it has a card, and as depth-complete when the card cites at least two primary sources fetched with a date. Counted from disk 2026-11-27, bead `bkt-q5moa.1`.

## Meter

```
TOTAL NODES:       66
FILLED:            66
DEPTH-COMPLETE:    66
NETWORK CAPACITY: 100.0%
DEPTH CAPACITY:   100.0%
```

## Per Layer

| Layer | Nodes | Filled | Depth-complete | Cards |
|---|---|---|---|---|
| L0 Money | 14 | 14 | 14 | `01-money-history/eras/` |
| L1 Assets | 18 | 18 | 18 | `02-assets/` |
| L2 Markets and Plumbing | 8 | 8 | 8 | `00-map/nodes/K-*` |
| L3 Quant | 9 | 9 | 9 | `04-quant/` |
| L4 Data | 6 | 6 | 6 | `03-data-sources/cards/` |
| L5 Education | 5 | 5 | 5 | `05-education/` |
| L6 Systems | 6 | 6 | 6 | `00-map/nodes/S-*` |
| **Total** | **66** | **66** | **66** | |

## Trajectory

- 2026-11-27, cycle 1: map drafted, 16 asset cards and the money timeline, sources partly from memory.
- 2026-11-27, cycle 2: every node carded with fetched primary sources. New cards for private credit and insurance. Claims marked unverified were fetched, fixed or deleted. Shiller `ie_data.xls` checked against the stocks and long-run return figures. Q3 2026 capex for MSFT, AMZN and META taken from 10-Q filings. 365 stablecoin book sources added to `sources/SOURCE-REGISTRY.md`.

## Open

- Appellate ruling on event contract preemption: none found yet.
- Sources blocked on 2026-11-27: LBMA, UBS Yearbook PDF, congress.gov, PBoC, IMF, SEC tick-size pages, CBO, IEA. Claims that rest on them stay at grade B or C until a refetch.
- Shiller's Yale file ends September 2023; figures after that date come from other series.
