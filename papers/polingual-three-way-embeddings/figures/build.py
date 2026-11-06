import json, os, statistics

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "data")
TAB = os.path.join(HERE, "..", "tables")
BLUE, GRAY = "#14417a", "#9a9a9a"
COLS = ["wiki", "tail", "tatoeba", "phrase", "sentence"]


def load(name):
    return json.load(open(os.path.join(DATA, name)))


def swift(name):
    out = {}
    for line in open(os.path.join(DATA, name), encoding="utf-8"):
        parts = [p.strip() for p in line.split("|")]
        if len(parts) != 6 or parts[0] == "lang":
            continue
        cells = {}
        for c, p in zip(COLS, parts[1:]):
            a, b = [x.strip() for x in p.split("/")]
            cells[c] = None if a == "-" else (float(a), float(b))
        out[parts[0]] = cells
    return out


def pct(x):
    return "--" if x is None else f"{x:.1f}"


def write(name, rows):
    os.makedirs(TAB, exist_ok=True)
    open(os.path.join(TAB, name), "w", encoding="utf-8").write("\n".join(rows) + "\n")


def tatoeba_table(before, after):
    rows = []
    for lang in before:
        if lang.startswith("en") or lang.startswith("all"):
            continue
        b, a = before[lang]["tatoeba"], after[lang]["tatoeba"]
        wb, wa = before[lang]["wiki"], after[lang]["wiki"]
        if b is None:
            continue
        rows.append(f"{lang} & {pct(b[1])} & {pct(a[1])} & {a[1] - b[1]:+.1f} & {pct(wb[1])} & {pct(wa[1])} \\\\")
    b, a = before["all L"], after["all L"]
    rows.append("\\midrule")
    rows.append(f"all & {pct(b['tatoeba'][1])} & {pct(a['tatoeba'][1])} & {a['tatoeba'][1] - b['tatoeba'][1]:+.1f} & {pct(b['wiki'][1])} & {pct(a['wiki'][1])} \\\\")
    write("tatoeba.tex", rows)
    langs = [l for l in before if not l.startswith(("en", "all")) and before[l]["tatoeba"]]
    fig, ax = plt.subplots(figsize=(7.2, 2.8), dpi=200)
    x = range(len(langs))
    ax.bar([i - 0.2 for i in x], [before[l]["tatoeba"][1] for l in langs], 0.4, color=GRAY, label="lexicon of PR 1198")
    ax.bar([i + 0.2 for i in x], [after[l]["tatoeba"][1] for l in langs], 0.4, color=BLUE, label="re-ranked lexicon")
    ax.set_xticks(list(x)); ax.set_xticklabels(langs, fontsize=7)
    ax.set_ylabel("Tatoeba word precision (%)"); ax.set_ylim(0, 100)
    ax.legend(fontsize=7, frameon=False, loc="upper right")
    fig.tight_layout(); fig.savefig(os.path.join(HERE, "fig_tatoeba.png")); plt.close(fig)


def modality_tables():
    j = load("joint_report.json")
    mods = ["script", "char", "phonetic", "meaning", "weighted", "projection"]
    rows = []
    for lang, r in j["bli"].items():
        rows.append(f"{lang} & {r['n']} & " + " & ".join(f"{100 * r[m][1]:.1f}" for m in mods) + " \\\\")
    rows.append("\\midrule")
    rows.append("mean & & " + " & ".join(f"{100 * statistics.mean(v[m][1] for v in j['bli'].values()):.1f}" for m in mods) + " \\\\")
    write("bli.tex", rows)
    rows = []
    for pair, r in j["related"].items():
        rows.append(f"{pair} & {r['n']} & " + " & ".join(f"{100 * r[m][1]:.1f}" for m in mods) + " \\\\")
    write("related.tex", rows)
    p = load("phonetic_report.json")
    rows = []
    for lang, r in p.items():
        hp = r.get("homophone_pairs")
        hom = f"{hp} & {100 * r['homophone_phon_r10']:.1f} & {100 * r['homophone_char_r10']:.1f}" if hp else "-- & -- & --"
        g2p = f"{r['g2p_cos']:.3f} & {100 * r['g2p_r10']:.1f}" if "g2p_cos" in r else "-- & --"
        rows.append(f"{lang} & {r['wikipron']} & {r['vocab_with_ipa']}/{r['vocab']} & {g2p} & {hom} \\\\")
    write("phonetic.tex", rows)
    s = load("script_report.json")
    c = s["confusables"]
    write("confusables.tex", [f"{name} & {100 * c[k]['r1']:.1f} & {100 * c[k]['r10']:.1f} & {c[k]['mrr']:.3f} \\\\" for name, k in (("Script CNN", "cnn"), ("Raw pixels", "pixels"), ("Character n-grams", "char"))])
    rows = []
    for lang, r in s["fuzzy"].items():
        e, cf = r.get("edit"), r.get("confusable")
        cell = lambda x: " & ".join(f"{100 * x[m]['r1']:.1f}" for m in ("cnn", "char", "fused")) if x else "-- & -- & --"
        rows.append(f"{lang} & {cell(e)} & {cell(cf)} \\\\")
    write("fuzzy.tex", rows)
    fig, ax = plt.subplots(figsize=(5.6, 2.6), dpi=200)
    vals = [100 * statistics.mean(v[m][1] for v in j["bli"].values()) for m in mods]
    ax.bar(mods, vals, color=[GRAY] * 4 + [BLUE] * 2)
    ax.set_ylabel("BLI P@10, mean of 28 languages (%)")
    for i, v in enumerate(vals):
        ax.text(i, v + 1, f"{v:.1f}", ha="center", fontsize=7)
    ax.set_ylim(0, 75)
    fig.tight_layout(); fig.savefig(os.path.join(HERE, "fig_modalities.png")); plt.close(fig)


def regression_table():
    r = load("regression_report.json")
    rows = []
    for name in ("polysemous", "common_test"):
        b = r[name]["before"]; a = r[name]["after"]
        nb, rb = sum(x["n"] for x in b.values()), sum(x["right"] for x in b.values())
        na, ra = sum(x["n"] for x in a.values()), sum(x["right"] for x in a.values())
        label = "Polysemous set, 10 words" if name == "polysemous" else "Common English words, held-out half"
        rows.append(f"{label} & {nb} & {100 * rb / nb:.1f} & {100 * ra / na:.1f} \\\\")
    write("regression.tex", rows)
    rr = load("rerank_report.json")
    rows = []
    tot = [0, 0, 0, 0, 0]
    for lang, v in rr["per_language"].items():
        o = v.get("odd")
        if not o:
            continue
        rows.append(f"{lang} & {o['n']} & {100 * o['first_before']:.1f} & {100 * o['first_after']:.1f} & {100 * (o['first_after'] - o['first_before']):+.1f} & {100 * o['any_before']:.1f} & {100 * o['any_after']:.1f} \\\\")
    write("heldout_lang.tex", rows)
    a = load("audit_report.json")
    write("audit.tex", [f"Frequency order & {a['n']} & {a['before_right']} \\\\", f"Re-ranked & {a['n']} & {a['after_right']} \\\\"])
    tb, ta = rr["test_baseline"], rr["test_rerank"]
    write("heldout.tex", [f"First shown sense & {100 * tb[2]:.1f} & {100 * ta[2]:.1f} \\\\", f"Any shown sense, longer answers & {100 * tb[0]:.1f} & {100 * ta[0]:.1f} \\\\"])


def main():
    tatoeba_table(swift("swift_before.txt"), swift("swift_after.txt"))
    modality_tables()
    regression_table()


if __name__ == "__main__":
    main()
