import json
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

INK, MUTE, BLUE, RULE, GRID = "#1f2328", "#6b7280", "#2f6db5", "#d0d4da", "#eceef1"


def frame(ax):
    for side in ("top", "right"):
        ax.spines[side].set_visible(False)
    for side in ("left", "bottom"):
        ax.spines[side].set_color(RULE)
    ax.tick_params(colors=MUTE, length=0)
    ax.grid(axis="y", color=GRID, lw=1)
    ax.set_axisbelow(True)


def backtest():
    rows = json.load(open("backtest/backtest.json"))["snapshots"]
    fig, ax = plt.subplots(figsize=(9, 4.6), dpi=160)
    for i, s in enumerate(rows):
        ax.plot([i, i], s["auc_ci95"], color=BLUE, lw=2, solid_capstyle="round")
        ax.plot(i, s["auc"], "o", color=BLUE, ms=9, mec="white", mew=2)
        ax.annotate(f'{s["auc"]:.2f}', (i, s["auc"]), xytext=(12, -4), textcoords="offset points", color=INK, fontsize=11)
    ax.axhline(0.5, color=MUTE, lw=1, ls=(0, (4, 3)))
    ax.annotate("chance, 0.50", (len(rows) - 0.55, 0.5), xytext=(0, 5), textcoords="offset points", color=MUTE, fontsize=10, ha="right")
    ax.set_xticks(range(len(rows)))
    ax.set_xticklabels([f'{s["date"]}\n{s["tracked"]} open, {s["solved_later"]} solved later' for s in rows], color=INK, fontsize=10)
    ax.set_ylim(0.3, 0.8)
    ax.set_xlim(-0.5, len(rows) - 0.5)
    ax.set_ylabel("AUC with 95% bootstrap interval", color=MUTE, fontsize=10)
    ax.set_title("Gap score against later resolution, by snapshot date", color=INK, fontsize=12, loc="left")
    frame(ax)
    fig.tight_layout()
    fig.savefig("backtest/gap-score-backtest.png")


def rates():
    rows = json.load(open("backtest/resolution-rate.json"))["windows"]
    fig, ax = plt.subplots(figsize=(9, 4.6), dpi=160)
    for i, w in enumerate(rows):
        ax.bar(i, w["solved"], width=0.56, color=BLUE)
        ax.annotate(f'{w["solved"]}', (i, w["solved"]), xytext=(0, 5), textcoords="offset points", ha="center", color=INK, fontsize=11)
    ax.set_xticks(range(len(rows)))
    ax.set_xticklabels([f'{w["window"].replace(" to ", "\nto ")}\n{w["tracked"]} open at start' for w in rows], color=INK, fontsize=9)
    ax.set_ylabel("open problems retagged solved in the window", color=MUTE, fontsize=10)
    ax.set_title("formal-conjectures: open problems that moved to solved, by window", color=INK, fontsize=12, loc="left")
    ax.set_ylim(0, max(w["solved"] for w in rows) * 1.15)
    frame(ax)
    fig.tight_layout()
    fig.savefig("backtest/resolution-rate.png")


if __name__ == "__main__":
    backtest()
    rates()
