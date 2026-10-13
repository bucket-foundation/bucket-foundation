from __future__ import annotations

import matplotlib

matplotlib.use("Agg")

INK = "#1f1c16"
BLUE = "#14417a"
GOLD = "#b8862b"
GREEN = "#3d7a5a"
GREY = "#7a766c"
BONE = "#f6f1e4"
RULE = "#c9c2b0"


def deterministic(fig, out: str) -> None:
    fig.savefig(out, metadata={"CreationDate": None, "Producer": None, "Creator": None})
