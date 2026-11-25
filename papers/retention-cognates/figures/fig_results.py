import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

ROOT = Path(__file__).resolve().parent.parent
RESULTS = json.loads((ROOT / "results" / "hlr_results.json").read_text())
FEATURES = (("orth_sim", "spelling similarity", "#14417a"), ("phon_sim", "IPA similarity", "#2a9d8f"), ("etym_cognate", "shared etymon", "#b5651d"))


def coefficient_figure():
    pairs = sorted(RESULTS["pairs"])
    labels = ["pooled"] + pairs
    blocks = [RESULTS["pooled"]] + [RESULTS["pairs"][p] for p in pairs]
    fig, ax = plt.subplots(figsize=(6.4, 3.6), dpi=200)
    for k, (feat, name, color) in enumerate(FEATURES):
        xs, ys, lo, hi = [], [], [], []
        for i, block in enumerate(blocks):
            c = block["cognate"]["coef"][feat]
            xs.append(i + (k - 1) * 0.22)
            ys.append(c["est"])
            lo.append(c["est"] - c["lo"])
            hi.append(c["hi"] - c["est"])
        ax.errorbar(xs, ys, yerr=[lo, hi], fmt="o", ms=3.5, color=color, capsize=2, linewidth=1, label=name)
    ax.axhline(0, color="#5f5f5f", linewidth=0.8, linestyle="--")
    ax.set_xticks(range(len(labels)))
    ax.set_xticklabels(labels, rotation=35, ha="right", fontsize=8)
    ax.set_ylabel(r"coefficient, $\log_2$ half-life")
    ax.legend(fontsize=7, frameon=False)
    fig.tight_layout()
    fig.savefig(ROOT / "figures" / "fig_coef.png")
    plt.close(fig)


def mae_figure():
    pairs = sorted(RESULTS["pairs"])
    labels = ["pooled"] + pairs
    blocks = [RESULTS["pooled"]] + [RESULTS["pairs"][p] for p in pairs]
    est = [b["mae_diff"]["est"] * 1000 for b in blocks]
    lo = [(b["mae_diff"]["est"] - b["mae_diff"]["lo"]) * 1000 for b in blocks]
    hi = [(b["mae_diff"]["hi"] - b["mae_diff"]["est"]) * 1000 for b in blocks]
    fig, ax = plt.subplots(figsize=(6.4, 3.0), dpi=200)
    ax.errorbar(range(len(labels)), est, yerr=[lo, hi], fmt="o", ms=4, color="#14417a", capsize=2)
    ax.axhline(0, color="#5f5f5f", linewidth=0.8, linestyle="--")
    ax.set_xticks(range(len(labels)))
    ax.set_xticklabels(labels, rotation=35, ha="right", fontsize=8)
    ax.set_ylabel(r"$\Delta$ MAE $\times 10^{3}$, cognate minus base")
    fig.tight_layout()
    fig.savefig(ROOT / "figures" / "fig_mae.png")
    plt.close(fig)


def tex_number(x, digits=3):
    return f"{x:.{digits}f}".replace("-", "$-$")


def tables():
    rows = []
    for label in ["pooled"] + sorted(RESULTS["pairs"]):
        b = RESULTS["pooled"] if label == "pooled" else RESULTS["pairs"][label]
        d = b["mae_diff"]
        rows.append(
            f"{label.replace('->', r'$\to$')} & {b['n_train'] + b['n_test']:,} & {b['users']:,} & {b['lexemes']:,} & "
            f"{tex_number(b['base']['mae'])} & {tex_number(b['cognate']['mae'])} & "
            f"{tex_number(b['base']['auc'])} & {tex_number(b['cognate']['auc'])} & "
            f"{tex_number(d['est'] * 1000, 2)} [{tex_number(d['lo'] * 1000, 2)}, {tex_number(d['hi'] * 1000, 2)}] \\\\"
        )
    (ROOT / "results" / "table_fit.tex").write_text("\n".join(rows) + "\n")
    rows = []
    p = RESULTS["pooled"]
    for feat in ("right", "wrong", "log_len", "orth_sim", "phon_sim", "phon_missing", "etym_cognate", "trans_missing"):
        c = p["cognate"]["coef"][feat]
        b = p["base"]["coef"].get(feat)
        base = f"{tex_number(b['est'])} [{tex_number(b['lo'])}, {tex_number(b['hi'])}]" if b else "--"
        rows.append(f"\\texttt{{{feat.replace('_', chr(92) + '_')}}} & {base} & {tex_number(c['est'])} [{tex_number(c['lo'])}, {tex_number(c['hi'])}] \\\\")
    (ROOT / "results" / "table_coef.tex").write_text("\n".join(rows) + "\n")


if __name__ == "__main__":
    coefficient_figure()
    mae_figure()
    tables()
