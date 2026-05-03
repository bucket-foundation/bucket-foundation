# Stone Plates — 2026-05-03

Same 13 mathematical objects as `quantum-plates/2026-05-03/`, re-rendered
in a stone-tablet register: warm sandstone background, deep umber engraved
strokes, faint highlight bevel (faux-3D carve depth), bold serif labels.

The math is identical. Only the visual costume changes. Use the chalkboard
plates for the working/teaching register; use these for the monument
register — covers, hero crops, anywhere the manifesto needs to feel
ancient and load-bearing.

**gdrive folder** (source of truth):
*(populated below after first mirror; see push command in INDEX_quantum)*

**Local mirror** (gitignored):
`~/agfarms/bucket-foundation/manifesto-source/stone-plates/2026-05-03/*.png`

**Generator** (committed):
`generate_stone_plates.py` in this folder. Same plate functions as the
chalkboard generator; only the style helpers (`stone_style`, `stone_noise`,
`engraved`, `tight_3d`) differ.

## Palette

| Token | Hex | Use |
|---|---|---|
| `STONE_BG` | `#c9b78a` | sandstone / aged limestone |
| `STONE_BG_2` | `#b8a574` | darker sandstone for procedural noise |
| `STONE_FG` | `#2a1d10` | deep umber — the color of an engraved groove |
| `STONE_GOLD` | `#7a5510` | antique gold (darker than chalk version) |
| `STONE_DIM` | `#5a4a30` | secondary stroke |
| `STONE_HIGHLIGHT` | `#e8d9b0` | faux-bevel highlight, drawn 1-2px down-right of main stroke |
| `STONE_FAINT` | `#7a6840` | ghost stroke for axes / grids |

## Style differences vs. chalkboard

| | chalkboard | stone |
|---|---|---|
| Background | flat slate green `#1d2d2c` | sandstone with procedural 2-octave noise |
| Stroke | bone chalk, soft sketch jitter `(1.5, 80, 1.5)` | umber engraved, hairline jitter `(0.6, 100, 0.6)` |
| Bevel | none | highlight stroke offset down-right at 55% alpha |
| Labels | italic serif | bold serif |
| Register | working / teaching | monument / cover |

## Plate index

(Same numbering and same math as `quantum-plates/2026-05-03/INDEX.md`.
See that file for the full description per plate.)

## Iterating

```bash
cd ~/agfarms/bucket-foundation/manifesto-source/stone-plates/2026-05-03
python3 generate_stone_plates.py

rclone copy . "gdrive:AGFarms/Nucleus/bucket-foundation/manifesto-source/stone-plates/2026-05-03/" \
  --include "*.png" -v
```
