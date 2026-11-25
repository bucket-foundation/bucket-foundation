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
    fig, ax = plt.subplots(figsize=(6.4, 3.0), dpi=200)
    series = (("mae_diff", "cognate features", "#14417a", -0.12), ("control_lexeme", "lexeme indicators", "#b5651d", 0.12))
    for key, name, color, shift in series:
        est = [b[key]["est"] * 1000 for b in blocks]
        lo = [(b[key]["est"] - b[key]["lo"]) * 1000 for b in blocks]
        hi = [(b[key]["hi"] - b[key]["est"]) * 1000 for b in blocks]
        ax.errorbar([i + shift for i in range(len(labels))], est, yerr=[lo, hi], fmt="o", ms=4, color=color, capsize=2, label=name)
    ax.legend(fontsize=7, frameon=False)
    ax.axhline(0, color="#5f5f5f", linewidth=0.8, linestyle="--")
    ax.set_xticks(range(len(labels)))
    ax.set_xticklabels(labels, rotation=35, ha="right", fontsize=8)
    ax.set_ylabel(r"$\Delta$ MAE $\times 10^{3}$ against base")
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
            f"{tex_number(b['base']['mae'], 4)} & {tex_number(b['cognate']['mae'], 4)} & "
            f"{tex_number(b['base']['auc'])} & {tex_number(b['cognate']['auc'])} & {tex_number(b['lexeme']['mae'], 4)} & "
            f"{tex_number(d['est'] * 1000, 3)} [{tex_number(d['lo'] * 1000, 3)}, {tex_number(d['hi'] * 1000, 3)}] & "
            f"{tex_number(b['control_lexeme']['est'] * 1000, 3)} [{tex_number(b['control_lexeme']['lo'] * 1000, 3)}, {tex_number(b['control_lexeme']['hi'] * 1000, 3)}] \\\\"
        )
    (ROOT / "results" / "table_fit.tex").write_text("\n".join(rows) + "\n")
    rows = []
    p = RESULTS["pooled"]
    for feat in ("right", "wrong", "log_len", "log_ntrans", "orth_sim", "phon_sim", "phon_missing", "etym_cognate", "trans_missing"):
        c = p["cognate"]["coef"][feat]
        b = p["base"]["coef"].get(feat)
        base = f"{tex_number(b['est'])} [{tex_number(b['lo'])}, {tex_number(b['hi'])}]" if b else "--"
        rows.append(f"\\texttt{{{feat.replace('_', chr(92) + '_')}}} & {base} & {tex_number(c['est'])} [{tex_number(c['lo'])}, {tex_number(c['hi'])}] \\\\")
    (ROOT / "results" / "table_coef.tex").write_text("\n".join(rows) + "\n")


def sci(x):
    if x < 1e-4:
        m, e = f"{x:.1e}".split("e")
        return f"${m}\\times10^{{{int(e)}}}$"
    return f"{x:.4f}"


def test_table():
    tests = json.loads((ROOT / "results" / "tests.json").read_text())
    names = {"mae_diff": r"$\Delta$MAE", "orth_sim": "spelling", "phon_sim": "IPA", "etym_cognate": "etymon"}
    rows = []
    for label, block in [("pooled", tests["pooled"])] + sorted(tests["pairs"].items()):
        for q, t in block.items():
            scale = 1000 if q == "mae_diff" else 1
            rows.append(
                f"{label.replace('->', r'$\to$')} & {names[q]} & {tex_number(t['est'] * scale)} & "
                f"[{tex_number(t['ci'][0] * scale)}, {tex_number(t['ci'][1] * scale)}] & {t['z']:.2f} & "
                f"{sci(t['p_holm'])} & {tex_number(t['mde'] * scale)} & {sci(t['tost_p'])} & {t['verdict']} \\\\"
            )
        rows.append("\\midrule")
    (ROOT / "results" / "table_tests.tex").write_text("\n".join(rows[:-1]) + "\n")


if __name__ == "__main__":
    coefficient_figure()
    mae_figure()
    tables()
    test_table()
