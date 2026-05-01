# bios — long-form contributor biographies

Long-form exhaustive biographies extending the contact cards in `SCHEMA.md` — one figure per file, target 800–2000 lines, fully cited from primary works, archive holdings, and the canonical secondary literature. Each biography expands the corresponding short card in the branch file (`01-mathematics.md`, `02-physics.md`, etc.) and is anchored to the canon entries the figure underwrites in `bucket-canon/`.

The `figures.json` entry remains the machine-readable canonical record for every figure; a `bios/<slug>.md` file is the human-readable depth pass for figures whose contribution warrants exhaustive treatment. Not every figure needs a bio. Bios are produced selectively, in passes, beginning with the polymaths and the originator-tier anchors of each branch.

Editorial conventions inherited from `SCHEMA.md`: no marketing voice, no anachronisms, every claim auditable to a primary source or a peer-reviewed secondary, disputed attribution flagged inside the file rather than excluded. Honest sections on what the figure got wrong are required; hagiography is a defect.

Filename convention: `<slug>.md` where `<slug>` matches the `id` field in `figures.json`.
