import csv
import json
import os
import sys
from datetime import date
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from sentence_transformers import SentenceTransformer

HERE = Path(__file__).parent
DATA = Path(os.environ.get("PI_FIT_DATA", Path.home() / ".local/share/bucket-pi-fit"))
MODEL = "BAAI/bge-small-en-v1.5"
MODEL_REVISION = "5c38ec7c405ec4b44b94cc5a9bb96e735b38267a"
PHASE_COLOR = {"past": "#8a8f98", "present": "#2c6fbb", "future": "#c8891e"}
INK = "#1f1c16"


def unit(v):
    return v / np.linalg.norm(v, axis=-1, keepdims=True)


def load():
    pis = [p for p in json.loads((DATA / "pis.json").read_text()) if p["topics"]]
    me = list(csv.DictReader(open(DATA / "self.tsv"), delimiter="\t"))
    return pis, me


def embed(pis, me):
    model = SentenceTransformer(MODEL, revision=MODEL_REVISION)
    topics = sorted({t for p in pis for t in p["topics"]})
    tv = dict(zip(topics, unit(model.encode(topics, normalize_embeddings=True, batch_size=256))))
    w = lambda n: 1 / np.sqrt(np.arange(1, n + 1))
    P = unit(np.stack([np.average([tv[t] for t in p["topics"]], axis=0, weights=w(len(p["topics"]))) for p in pis]))
    S = unit(model.encode([f"{m['label']}: {m['text']}" for m in me], normalize_embeddings=True))
    return P, S, tv


def ranked_angle(P, extra):
    c = P.mean(0)
    _, _, vt = np.linalg.svd(P - c, full_matrices=False)
    raw = lambda X: np.arctan2((X - c) @ vt[1], (X - c) @ vt[0])
    rp = raw(P)
    order = np.sort(rp)
    to_rank = lambda r: 2 * np.pi * np.searchsorted(order, r) / len(order)
    return to_rank(rp), to_rank(raw(extra))


def star_axes(P, pis, k=8):
    c = P.mean(0)
    _, _, vt = np.linalg.svd(P - c, full_matrices=False)
    V = vt[:k]
    proj = (P - c) @ V.T
    labels = []
    for j in range(k):
        top = np.argsort(-proj[:, j])[: max(20, len(P) // 20)]
        counts = {}
        for i in top:
            for t in pis[i]["topics"][:5]:
                counts[t] = counts.get(t, 0) + 1
        labels.append(max(counts, key=counts.get))
    base = np.sort((P - c) @ V.T, axis=0)
    score = lambda X: np.stack([np.searchsorted(base[:, j], ((X - c) @ V.T)[:, j]) / len(base) for j in range(k)], axis=1)
    return labels, score


def radar(ax, vals, color, label=None, fill=0.15, lw=1.6, ls="-"):
    k = len(vals)
    a = np.linspace(0, 2 * np.pi, k, endpoint=False)
    a = np.append(a, a[0])
    v = np.append(vals, vals[0])
    ax.plot(a, v, color=color, lw=lw, ls=ls, label=label)
    if fill:
        ax.fill(a, v, color=color, alpha=fill)


def radar_frame(ax, labels, size=7):
    k = len(labels)
    ax.set_xticks(np.linspace(0, 2 * np.pi, k, endpoint=False), [short(x) for x in labels], fontsize=size)
    ax.set_ylim(0, 1)
    ax.set_yticks([0.25, 0.5, 0.75], [], fontsize=6)


def short(t, n=22):
    words, out = t.split(), ""
    for w in words:
        if len(out) + len(w) > n and out:
            out += "\n"
            n += 22
        out += (" " if out and not out.endswith("\n") else "") + w
    return out


def assert_outside_repo(path):
    repo = HERE.parent.parent.resolve()
    if repo in Path(path).resolve().parents:
        raise SystemExit(f"refusing to write inside the repo: {path}")


def main():
    assert_outside_repo(DATA)
    out = DATA / (sys.argv[1] if len(sys.argv) > 1 else date.today().isoformat())
    out.mkdir(parents=True, exist_ok=True)
    pis, me = load()
    P, S, tv = embed(pis, me)
    phase = np.array([m["phase"] for m in me])
    us = unit(S[phase != "past"].mean(0))
    fit = P @ us
    pct = (np.argsort(np.argsort(fit)) + 1) / len(fit)
    centroids = unit(np.stack([S[phase == ph].mean(0) for ph in PHASE_COLOR]))
    th_p, th_c = ranked_angle(P, centroids)
    _, th_s = ranked_angle(P, S)
    rad = 1 - (fit - fit.min()) / (fit.max() - fit.min())
    rad_c = 1 - (centroids @ us - fit.min()) / (fit.max() - fit.min())
    rad_c = np.clip(rad_c, 0, None)
    fields = [p["field"] or "unknown" for p in pis]
    field_rank = sorted(set(fields), key=lambda f: -np.mean([fit[i] for i in range(len(pis)) if fields[i] == f]))
    cmap = plt.get_cmap("tab20")
    fcol = {f: cmap(i % 20) for i, f in enumerate(field_rank)}

    labels, score = star_axes(P, pis)
    SP, SS, SC = score(P), score(S), score(centroids)
    semantic_circle(out, pis, th_p, rad, fields, fcol, th_c, rad_c, fit)
    star_plot(out, pis, labels, SP, SC, fit)
    helix(out, pis, th_p, fit, pct, fields, fcol, me, th_s, S @ us)
    keep = [j for j, m in enumerate(me) if m["phase"] != "past"]
    tlabels = [pretty(me[j]["label"]) for j in keep]
    raw = P @ S[keep].T
    ref = raw[np.argsort(-fit)[:200]]
    lo, hi = np.percentile(ref, 5, axis=0), ref.max(0)
    TP = np.clip((raw - lo) / (hi - lo), 0, 1)
    slices(out, tlabels, TP, fields, fcol, field_rank)

    rows = []
    for i, p in enumerate(pis):
        pv = [tv[t] for t in p["topics"]]
        pairs = sorted(((float(tv_ @ s), t, me[j]["label"]) for t, tv_ in zip(p["topics"], pv) for j, s in enumerate(S)), reverse=True)
        seen, overlaps = set(), []
        for sc, t, lab in pairs:
            if t in seen or lab in {o[1] for o in overlaps}:
                continue
            seen.add(t)
            overlaps.append((t, lab, round(sc, 3)))
            if len(overlaps) == 4:
                break
        rows.append({**{k: p[k] for k in ("id", "name", "institution", "field", "source", "tier")}, "fit": round(float(fit[i]), 4), "percentile": round(float(pct[i]), 4), "theta": round(float(th_p[i]), 4), "overlaps": overlaps})
    rows.sort(key=lambda r: -r["fit"])
    (out / "fit.json").write_text(json.dumps(rows, indent=1))
    with open(out / "fit.csv", "w", newline="") as f:
        wr = csv.writer(f)
        wr.writerow(["name", "institution", "field", "source", "tier", "fit", "percentile", "overlap_1", "overlap_2"])
        for r in rows:
            wr.writerow([r["name"], r["institution"], r["field"], r["source"], r["tier"], r["fit"], r["percentile"]] + [f"{a} ~ {b}" for a, b, _ in r["overlaps"][:2]])

    targets = [i for i, p in enumerate(pis) if p["source"] == "network"] + [int(i) for i in np.argsort(-fit)[:40] if pis[i]["source"] != "network"]
    cards = out / "cards"
    cards.mkdir(exist_ok=True)
    byid = {r["id"]: r for r in rows}
    for i in targets:
        card(cards, pis[i], byid[pis[i]["id"]], tlabels, TP[i], np.median(TP[np.argsort(-fit)[:200]], axis=0))
    print(json.dumps({"pis": len(pis), "out": str(out), "cards": len(targets), "top": [(r["name"], r["fit"]) for r in rows[:10]]}, indent=1))


def us_marks(ax, th_c, rad_c):
    for (ph, col), t, r in zip(PHASE_COLOR.items(), th_c, rad_c):
        ax.scatter(t, r, s=420, marker="*", c=col, edgecolor=INK, lw=0.8, zorder=5)
        ax.text(t, r + 0.07, f"us: {ph}", fontsize=8, ha="center", color=INK, zorder=6)
    ax.plot(th_c, rad_c, color=INK, lw=1, ls="--", zorder=4)


def semantic_circle(out, pis, th, rad, fields, fcol, th_c, rad_c, fit):
    fig, ax = plt.subplots(figsize=(14, 14), subplot_kw={"projection": "polar"})
    ax.scatter(th, rad, s=6 + 30 * (1 - rad) ** 3, c=[fcol[f] for f in fields], alpha=0.6, lw=0)
    for i in [i for i in np.argsort(-fit) if pis[i]["source"] != "network"][:20]:
        ax.text(th[i], rad[i], pis[i]["name"], fontsize=5.5)
    for i, p in enumerate(pis):
        if p["source"] == "network":
            ax.scatter(th[i], rad[i], s=60, facecolor="none", edgecolor=INK, lw=1)
            ax.text(th[i], rad[i] - 0.03, p["name"], fontsize=6.5, weight="bold")
    us_marks(ax, th_c, rad_c)
    ax.set_ylim(0, 1.02)
    ax.set_yticks([0.25, 0.5, 0.75, 1.0], ["closest", "", "", "farthest"], fontsize=7)
    ax.set_title("Semantic circle: angle = topic position, radius = distance from our work", pad=24)
    legend(ax, fcol, list(fcol)[:14])
    fig.savefig(out / "00-semantic-circle.png", dpi=150, bbox_inches="tight")
    plt.close(fig)


def legend(ax, fcol, names):
    for f in names:
        ax.scatter([], [], color=fcol[f], label=f)
    ax.legend(loc="upper left", bbox_to_anchor=(1.02, 1), fontsize=7, frameon=False)


def helix(out, pis, th, fit, pct, fields, fcol, me, th_s, self_fit):
    fig = plt.figure(figsize=(14, 14))
    ax = fig.add_subplot(projection="3d")
    turns = 10
    z = np.floor(pct * turns) + th / (2 * np.pi)
    r = 0.35 + 0.65 * pct
    s = np.linspace(0, turns, 3000)
    ax.plot(np.cos(2 * np.pi * s), np.sin(2 * np.pi * s), s, color="#ccc", lw=0.5)
    ax.scatter(r * np.cos(th), r * np.sin(th), z, s=3 + 40 * pct ** 6, c=[fcol[f] for f in fields], alpha=0.55, lw=0)
    for i in np.argsort(-fit)[:15]:
        ax.text(r[i] * np.cos(th[i]), r[i] * np.sin(th[i]), z[i], pis[i]["name"], fontsize=5.5)
    years = np.array([int(m["year"]) for m in me])
    zs = turns * (years - years.min()) / max(1, years.max() - years.min())
    ax.plot(0.15 * np.cos(th_s), 0.15 * np.sin(th_s), zs, color=INK, lw=1.2)
    for m, t, zz in zip(me, th_s, zs):
        ax.scatter(0.15 * np.cos(t), 0.15 * np.sin(t), zz, s=90, marker="*", c=PHASE_COLOR[m["phase"]], edgecolor=INK, lw=0.5)
        ax.text(0.15 * np.cos(t), 0.15 * np.sin(t), zz + 0.15, f"{m['label']} {m['year']}", fontsize=6)
    ax.set_zlabel("fit decile, top = closest")
    ax.set_title("Fit helix: one turn per fit decile. The inner line is our work through time, 2022 to 2029")
    ax.view_init(elev=16, azim=-55)
    fig.savefig(out / "02-helix.png", dpi=150, bbox_inches="tight")
    plt.close(fig)


def star_plot(out, pis, labels, SP, SC, fit):
    fig = plt.figure(figsize=(20, 11))
    ax = fig.add_subplot(1, 2, 1, projection="polar")
    for (ph, col), v in zip(PHASE_COLOR.items(), SC):
        radar(ax, v, col, f"our {ph}", fill=0.12 if ph != "past" else 0.04)
    radar_frame(ax, labels, 8)
    ax.set_title("Star plot of our work through time", pad=26)
    ax.legend(loc="lower left", bbox_to_anchor=(-0.15, -0.12), frameon=False)
    top = [i for i in np.argsort(-fit)[:6]]
    for n, i in enumerate(top):
        a = fig.add_subplot(2, 6, 4 + n + (3 if n >= 3 else 0), projection="polar")
        radar(a, SC[1:].mean(0), PHASE_COLOR["future"], fill=0.1, lw=1)
        radar(a, SP[i], "#2e6b6b", fill=0.25, lw=1.4)
        radar_frame(a, [""] * len(labels))
        a.set_title(pis[i]["name"], fontsize=9)
    fig.suptitle("Spokes are the top 8 principal directions of PI topic space, each named by the commonest topic among the top 5% of PIs along it. Radius is the percentile along that direction among 3,886 PIs.", fontsize=11)
    fig.savefig(out / "01-star-plot.png", dpi=150, bbox_inches="tight")
    plt.close(fig)


def slices(out, labels, TP, fields, fcol, field_rank):
    show = [f for f in field_rank if sum(x == f for x in fields) >= 15][:12]
    fig, axs = plt.subplots(3, 4, figsize=(22, 18), subplot_kw={"projection": "polar"})
    for ax, f in zip(axs.flat, show):
        idx = [i for i in range(len(fields)) if fields[i] == f]
        for i in idx[:200]:
            radar(ax, TP[i], fcol[f], fill=0, lw=0.2)
        radar(ax, TP[idx].mean(0), fcol[f], fill=0.3, lw=2)
        radar(ax, np.median(TP[np.argsort(-TP.mean(1))[:200]], axis=0), "#888", fill=0, lw=1.2, ls="--")
        radar_frame(ax, labels, 6)
        ax.set_title(f"{f}, n = {len(idx)}", fontsize=10, pad=18)
    for ax in list(axs.flat)[len(show):]:
        ax.axis("off")
    fig.suptitle("Star slices by field. Spokes are our research directions; radius is topic similarity scaled against the 200 closest PIs. Filled star: field mean. Dashed: median of the 200 closest.", fontsize=13)
    fig.savefig(out / "03-star-slices.png", dpi=130, bbox_inches="tight")
    plt.close(fig)


def card(cards, p, r, labels, tp, median):
    fig = make_card(p, r, labels, tp, median)
    slug = "".join(c if c.isalnum() else "-" for c in p["name"].lower()).strip("-")
    fig.savefig(cards / f"{slug}.png", dpi=160)
    plt.close(fig)


def make_card(p, r, labels, tp, median):
    fig = plt.figure(figsize=(11, 6))
    ax = fig.add_axes([0.07, 0.1, 0.4, 0.75], projection="polar")
    radar(ax, median, "#999", "median of the 200 closest PIs", fill=0, lw=1.2, ls="--")
    radar(ax, tp, "#2e6b6b", p["name"], fill=0.3)
    radar_frame(ax, labels, 7)
    ax.legend(loc="lower left", bbox_to_anchor=(-0.2, -0.16), fontsize=8, frameon=False)
    fig.text(0.56, 0.86, p["name"], fontsize=16, weight="bold", color=INK)
    fig.text(0.56, 0.80, p["institution"] or "", fontsize=10, color="#555")
    fig.text(0.56, 0.71, "Where your topics meet our research", fontsize=10, weight="bold", color=INK)
    y = 0.65
    for topic, lab, _ in r["overlaps"]:
        fig.text(0.56, y, topic, fontsize=9.5, color="#2e6b6b")
        fig.text(0.56, y - 0.04, f"  meets our {pretty(lab)}", fontsize=9, color="#555")
        y -= 0.1
    fig.text(0.56, 0.20, "Each spoke is one of our research directions. Further out means your", fontsize=7.5, color="#777")
    fig.text(0.56, 0.17, "published topics sit closer to it, scaled against the 200 closest PIs.", fontsize=7.5, color="#777")
    fig.text(0.56, 0.13, "Topic similarity from OpenAlex topics, unvalidated as a measure of fit.", fontsize=7.5, color="#777")
    fig.text(0.56, 0.07, "Built with Research OS · bucket.foundation", fontsize=8.5, color="#777")
    return fig


def pretty(lab):
    return lab.replace("specter", "SPECTER").replace("qec", "QEC").replace("bucketmath", "BucketMath")


if __name__ == "__main__":
    main()
