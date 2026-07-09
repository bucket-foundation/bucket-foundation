# Network Capacity — the coverage meter

"Network capacity" = fraction of `00-IDEAL-STATE-MAP.md` nodes with a filled,
graded research card. Breadth ran to 100%; the loop then flipped to DEPTH, and
depth is now complete across every layer.

## Meter

```
TOTAL NODES:       184
FILLED (stub+):    184
DEPTH-COMPLETE:    184
NETWORK CAPACITY: 100.0%   ← breadth
DEPTH CAPACITY:   100.0%   ← every card deepened with primary sources + graded claims
CONFLICT OBJECTS:  15      (evidence/CONFLICTS.md)
RENDERING:         LaTeX/mhchem math → SVG · WeasyPrint PDF · figures via matplotlib+RDKit
```

## Per-layer breakdown (counted from disk)
| Layer | Nodes | Filled | Depth-complete |
|---|---|---|---|
| L0 Foundations | 26 | 26 | 26 (100%) |
| L1 Hardware | 27 | 27 | 27 (100%) |
| L2 Stack & algorithms | 27 | 27 | 27 (100%) |
| L3 Adjacent tech | 22 | 22 | 22 (100%) |
| L4 Industries | 27 | 27 | 27 (100%) |
| L5 Ecosystem & geopolitics | 22 | 22 | 22 (100%) |
| L6 History | 15 | 15 | 15 (100%) |
| L7 Frontier & open | 18 | 18 | 18 (100%) |
| **Total** | **184** | **184** | **184 (100%)** |

## Trajectory
- **Cycle 1** (2026-07-08): 0→72%. Filled 94 original nodes; random-walk found 36 → map 94→130.
- **Cycle 2** (2026-07-08): 72→100% breadth. Filled the 36 gap nodes (125 cards).
- **Cycle 3 — DEPTH** (2026-07-08): every card deepened (stub → ~450–700 words with
  primary derivations, exact 2025–26 numbers, per-claim tiers). Random-walk during
  depth added **52 more nodes** (map 130→182): L0+8, L1+8, L2+8, L3+7, L4+6, L5+8,
  L6+6, L7+6. Conflict register grew 8→15.
- **Cycle 3b — RENDERING** (2026-07-08): math/chemistry marked up in LaTeX and
  rendered to SVG (`reports/render_math.py` via latex+dvisvgm), figures generated
  (`reports/gen_figures.py`), manual compiled to HTML (`build_manual.py`) and PDF
  (`build_pdf.py`, WeasyPrint).

## Thin-node flags (honest edge)
`I-gov`, `I-retail`, `I-media` remain T5/T6-heavy (forecasts / classical-AI
mislabeled as quantum). Deepened but honestly thin — the manual says so.

## Still-open threads (queued, from depth-agent "what I'd chase" notes)
RESOLVED in the polish pass: QuEra 96-logical confirmed peer-reviewed (Nature
s41586-025-09848-5 → T2); Duke/IonQ networking primary found (arXiv:2606.17173 → T3);
Majorana 2 — no independent replication (kept contested, Legg critique + Microsoft
Nature reply); Kalai↔Aaronson Mar-2026 exchange sourced verbatim both sides; Flatiron
vs D-Wave — no third-party adjudication (kept contested). Node splits landed: +H-wiring,
+H-spinphoton. SKIPPED (no real dated pilot): I-water (desalination/membrane),
I-foodbev — only speculative coverage exists, so not added. Remaining candidate:
QEC-theory-history (§07).

_Last recomputed from disk: polish pass — 184/184 depth, 2026-07-08._
