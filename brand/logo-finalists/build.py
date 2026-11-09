import json
import sys
from pathlib import Path

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE.parent / "omega-variants"))
from gen import svg

FINALISTS = [
    ("gold-night", "Gold metal on night blue", "style-metal-winter", ("winter", "classic", "metal", "flame")),
    ("stone-cream", "Stone on cream", "flame-stone", ("stone", "classic", "stone", "flame")),
    ("bone-aubergine", "Bone on aubergine with flame", "autumn-classic", ("autumn", "classic", "flat", "flame")),
    ("gold-aubergine", "Gold on aubergine with flame", "flame-metal", ("autumn", "classic", "metal", "flame")),
    ("night-violet", "Night with violet drop", "night-classic", ("night", "classic", "flat", "flame")),
    ("aegean-canonical", "Aegean, the dial canonical palette", "aegean-classic", ("aegean", "classic", "flat", "flame")),
]

out = HERE.parent.parent / "public/brand/logo-finalists"
out.mkdir(parents=True, exist_ok=True)
rows = []
for fid, label, source, args in FINALISTS:
    (out / f"{fid}.svg").write_text(svg(*args))
    rows.append(dict(id=fid, label=label, source=f"brand/omega-variants/{source}.svg", image=f"/brand/logo-finalists/{fid}.svg"))
(HERE.parent.parent / "src/data/logo-finalists.json").write_text(json.dumps(rows, indent=2) + "\n")
print(len(rows), "finalists")
