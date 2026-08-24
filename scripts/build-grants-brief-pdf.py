#!/usr/bin/env python3
"""Build a printable PDF executive brief for the AGFarms grants portfolio.

Outputs:
 grants-targets/BRIEF.pdf (public, print-ready)

Toolchain: matplotlib (charts) + weasyprint (HTML → PDF).
Run: python3 scripts/build-grants-brief-pdf.py
"""
from __future__ import annotations
import base64, io, pathlib, datetime as dt

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyBboxPatch
import numpy as np

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT_PDF = ROOT / "grants-targets" / "BRIEF.pdf"
TODAY = dt.date(2026, 5, 5)

# Bucket palette, chalkboard / stone register
PALETTE = {
    "ink":     "#0E1116",
    "paper":   "#FAFAF7",
    "rule":    "#1F2937",
    "accent":  "#D97706",   # amber
    "warm":    "#B45309",
    "ok":      "#15803D",   # green
    "warn":    "#B91C1C",   # red
    "neutral": "#475569",
    "lane1":   "#1D4ED8",   # blue, fed
    "lane2":   "#7C3AED",   # purple, foundation
    "lane3":   "#0891B2",   # cyan, crypto
    "lane4":   "#BE185D",   # pink, direct services
}

plt.rcParams.update({
    "font.family": "DejaVu Sans",
    "axes.edgecolor": PALETTE["rule"],
    "axes.labelcolor": PALETTE["ink"],
    "xtick.color": PALETTE["ink"],
    "ytick.color": PALETTE["ink"],
    "axes.titleweight": "bold",
    "axes.titlesize": 13,
    "figure.facecolor": PALETTE["paper"],
    "axes.facecolor": PALETTE["paper"],
})


def fig_to_data_uri(fig) -> str:
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=180, bbox_inches="tight",
                facecolor=fig.get_facecolor())
    plt.close(fig)
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


# ------------------------------- CHART 1 ------------------------------------
def chart_timeline() -> str:
    """Submission gantt, top 5 grants on a calendar."""
    items = [
        # name, start, end, lane, ask_label
        ("Gitcoin OSS GG-round",        TODAY,                 dt.date(2026,5,12),  "lane3", "$5–50K"),
        ("HCB sponsorship",             dt.date(2026,5,6),     dt.date(2026,5,13),  "ok",    "—"),
        ("SAM.gov ×3 (AGF, MTT, Bkt)",  dt.date(2026,5,5),     dt.date(2026,7,1),   "warm",  "gate"),
        ("MamaTeeTees · GlobalGiving",  dt.date(2026,5,12),    dt.date(2026,6,9),   "lane4", "vet"),
        ("EF ESP",                      dt.date(2026,5,15),    dt.date(2026,6,15),  "lane3", "$30–300K"),
        ("NSF SBIR Pitch (DerbyFish)",  dt.date(2026,5,20),    dt.date(2026,6,15),  "lane1", "≤$305K"),
        ("Sloan LOI",                   dt.date(2026,6,1),     dt.date(2026,6,30),  "lane2", "$50–250K"),
        ("Form 1023 (501c3)",           dt.date(2026,5,15),    dt.date(2027,1,31),  "warm",  "9mo IRS"),
        ("NOAA S-K pre-proposal",       dt.date(2026,8,1),     dt.date(2026,9,15),  "lane1", "$25–500K"),
        ("NSF POSE Phase I (post-c3)",  dt.date(2027,1,15),    dt.date(2027,3,1),   "lane1", "≤$300K"),
    ]
    items = list(reversed(items))
    fig, ax = plt.subplots(figsize=(10, 5.2))
    for i, (name, s, e, lane, ask) in enumerate(items):
        color = PALETTE[lane]
        ax.barh(i, (e - s).days, left=(s - TODAY).days, color=color,
                edgecolor=PALETTE["ink"], linewidth=0.8, height=0.65, alpha=0.85)
        ax.text((e - TODAY).days + 4, i, ask, va="center", fontsize=8.5, color=PALETTE["neutral"])
    ax.set_yticks(range(len(items)))
    ax.set_yticklabels([x[0] for x in items], fontsize=9)
    # month gridlines
    for m in range(0, 12):
        d = dt.date(2026, 5, 1) + dt.timedelta(days=m * 30)
        ax.axvline((d - TODAY).days, color=PALETTE["rule"], alpha=0.08, linewidth=0.6)
    ax.axvline(0, color=PALETTE["warn"], linewidth=1.4, alpha=0.6)
    ax.text(0, len(items) + 0.2, "TODAY", color=PALETTE["warn"], fontsize=8, fontweight="bold")
    ax.set_xlabel("days from 2026-05-05", color=PALETTE["ink"])
    ax.set_title("Submission timeline — top 10 grant actions",
                 color=PALETTE["ink"], pad=14)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    legend = [
        mpatches.Patch(color=PALETTE["lane1"], label="Federal (LLC/c3)"),
        mpatches.Patch(color=PALETTE["lane2"], label="Foundation"),
        mpatches.Patch(color=PALETTE["lane3"], label="Crypto-native"),
        mpatches.Patch(color=PALETTE["lane4"], label="Direct services"),
        mpatches.Patch(color=PALETTE["warm"],  label="Gate / infra"),
        mpatches.Patch(color=PALETTE["ok"],    label="Sponsor onboard"),
    ]
    ax.legend(handles=legend, loc="lower right", fontsize=8, framealpha=0.9)
    plt.tight_layout()
    return fig_to_data_uri(fig)


# ------------------------------- CHART 2 ------------------------------------
def chart_ask_vs_gate() -> str:
    """Bubble chart: $ ask vs gating risk. Bubble size = readiness."""
    pts = [
        # name, ask_max_k, gate (0=none .. 4=long), readiness (0..1), entity, lane
        ("Gitcoin",          50,   0, 0.95, "Bucket",       "lane3"),
        ("EF ESP",           300,  1, 0.80, "Bucket",       "lane3"),
        ("Sloan LOI",        250,  2, 0.75, "Bucket(HCB)",  "lane2"),
        ("GlobalGiving",     50,   1, 0.70, "MTT",          "lane4"),
        ("NSF SBIR I",       305,  2, 0.65, "AGFarms LLC",  "lane1"),
        ("NOAA S-K",         500,  3, 0.55, "AGFarms LLC",  "lane1"),
        ("NSF POSE",         300,  4, 0.30, "Bucket(c3)",   "lane1"),
        ("Templeton",        500,  4, 0.25, "Bucket(c3)",   "lane2"),
        ("Mellon PK",        2000, 4, 0.15, "Bucket(c3)",   "lane2"),
    ]
    fig, ax = plt.subplots(figsize=(10, 5.4))
    for name, ask, gate, ready, ent, lane in pts:
        size = 200 + ready * 1800
        ax.scatter(gate, ask, s=size, color=PALETTE[lane],
                   edgecolor=PALETTE["ink"], linewidth=0.8, alpha=0.78)
        ax.annotate(f"{name}\n{ent}", (gate, ask),
                    xytext=(8, 8), textcoords="offset points",
                    fontsize=8.5, color=PALETTE["ink"])
    ax.set_xlim(-0.5, 4.5)
    ax.set_xticks(range(5))
    ax.set_xticklabels(["none", "1wk", "1mo", "3mo", "6mo+"])
    ax.set_xlabel("gate latency (until submission possible)")
    ax.set_ylabel("max ask ($K)")
    ax.set_title("Ask vs gate — bubble size = drafting readiness", pad=14)
    ax.set_yscale("log")
    ax.grid(True, axis="y", alpha=0.15)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    plt.tight_layout()
    return fig_to_data_uri(fig)


# ------------------------------- CHART 3 ------------------------------------
def chart_pillar_radar() -> str:
    """Cross-pillar readiness radar."""
    pillars = ["Product", "Engineering", "Revenue/GTM", "Data", "Operations", "People"]
    bucket =    [0.85, 0.95, 0.55, 0.80, 0.40, 0.50]
    derbyfish = [0.80, 0.75, 0.70, 0.65, 0.45, 0.60]
    mtt =       [0.70, 0.30, 0.40, 0.30, 0.85, 0.55]
    angles = np.linspace(0, 2*np.pi, len(pillars), endpoint=False).tolist() + [0]
    fig, ax = plt.subplots(figsize=(7.6, 5.6), subplot_kw=dict(polar=True))
    fig.patch.set_facecolor(PALETTE["paper"])
    ax.set_facecolor(PALETTE["paper"])
    for vals, label, color in [
        (bucket, "Bucket Foundation", PALETTE["accent"]),
        (derbyfish, "DerbyFish/Kala", PALETTE["lane1"]),
        (mtt, "MamaTeeTees",     PALETTE["lane4"]),
    ]:
        v = vals + [vals[0]]
        ax.fill(angles, v, color=color, alpha=0.18)
        ax.plot(angles, v, color=color, linewidth=2, label=label, marker="o", markersize=4)
    ax.set_xticks(angles[:-1])
    ax.set_xticklabels(pillars, fontsize=9)
    ax.set_ylim(0, 1)
    ax.set_yticks([0.25, 0.5, 0.75, 1.0])
    ax.set_yticklabels(["¼", "½", "¾", "1"], fontsize=7, color=PALETTE["neutral"])
    ax.set_title("Cross-pillar readiness per venture", pad=20)
    ax.legend(loc="lower center", bbox_to_anchor=(0.5, -0.15),
              ncol=3, fontsize=8.5, frameon=False)
    plt.tight_layout()
    return fig_to_data_uri(fig)


# ------------------------------- CHART 4 ------------------------------------
def chart_funnel() -> str:
    """52 surveyed → 10 prioritized → 5 submit-now → expected wins."""
    stages = ["Surveyed", "Prioritized", "Submit ≤90d", "Expected wins (12mo)"]
    counts = [52, 10, 5, 2]
    colors = [PALETTE["neutral"], PALETTE["lane1"], PALETTE["accent"], PALETTE["ok"]]
    fig, ax = plt.subplots(figsize=(10, 3.4))
    max_c = max(counts)
    for i, (s, c, col) in enumerate(zip(stages, counts, colors)):
        width = c / max_c
        left = (1 - width) / 2
        rect = FancyBboxPatch((left, len(stages)-1-i), width, 0.78,
                              boxstyle="round,pad=0.012,rounding_size=0.04",
                              facecolor=col, edgecolor=PALETTE["ink"], linewidth=0.9, alpha=0.88)
        ax.add_patch(rect)
        ax.text(0.5, len(stages)-1-i+0.39, f"{s} · {c}",
                ha="center", va="center", color=PALETTE["paper"],
                fontsize=11, fontweight="bold")
    ax.set_xlim(0, 1)
    ax.set_ylim(-0.1, len(stages))
    ax.axis("off")
    ax.set_title("Pipeline funnel — 52 opps → expected wins", pad=10, color=PALETTE["ink"])
    plt.tight_layout()
    return fig_to_data_uri(fig)


# --------------------------------- HTML -------------------------------------
def html(c1, c2, c3, c4) -> str:
    css = f"""
 @page {{ size: Letter; margin: 0.55in 0.55in 0.6in 0.55in; }}
 body {{ font-family: 'DejaVu Sans', sans-serif; color: {PALETTE['ink']};
 background: {PALETTE['paper']}; font-size: 9.6pt; line-height: 1.32; }}
 h1 {{ font-size: 22pt; margin: 0 0 2pt 0; letter-spacing: -0.5px; }}
 h2 {{ font-size: 12pt; margin: 16pt 0 4pt 0;
 border-bottom: 1.2pt solid {PALETTE['ink']}; padding-bottom: 2pt;
 text-transform: uppercase; letter-spacing: 0.6px; }}
 h3 {{ font-size: 10pt; margin: 8pt 0 2pt 0; color: {PALETTE['warm']}; }}
 .sub {{ color: {PALETTE['neutral']}; font-size: 9pt; margin-bottom: 6pt; }}
 .slogan {{ color: {PALETTE['warm']}; font-style: italic; font-size: 9.5pt; }}
 table {{ width: 100%; border-collapse: collapse; margin: 4pt 0; font-size: 8.6pt; }}
 th {{ text-align: left; background: {PALETTE['ink']}; color: {PALETTE['paper']};
 padding: 4pt 6pt; }}
 td {{ padding: 3pt 6pt; border-bottom: 0.4pt solid #cbd5e1; vertical-align: top; }}
 tr:nth-child(even) td {{ background: #f1f5f9; }}
 .ok {{ color: {PALETTE['ok']}; font-weight: bold; }}
 .warn {{ color: {PALETTE['warn']}; font-weight: bold; }}
 .gate {{ color: {PALETTE['warm']}; font-weight: bold; }}
 .grid2 {{ display: grid; grid-template-columns: 1fr 1fr; gap: 12pt; }}
 .grid3 {{ display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8pt; }}
 .pill {{ display: inline-block; padding: 1.2pt 6pt; border-radius: 8pt;
 font-size: 7.6pt; font-weight: bold; color: {PALETTE['paper']};
 margin-right: 3pt; letter-spacing: 0.3px; }}
 .pill-fed {{ background: {PALETTE['lane1']}; }}
 .pill-fnd {{ background: {PALETTE['lane2']}; }}
 .pill-cry {{ background: {PALETTE['lane3']}; }}
 .pill-dir {{ background: {PALETTE['lane4']}; }}
 .box {{ border: 0.6pt solid {PALETTE['ink']}; padding: 6pt 9pt;
 border-radius: 4pt; margin: 6pt 0; background: #fff8eb; }}
 ul {{ margin: 3pt 0 3pt 14pt; padding: 0; }}
 li {{ margin-bottom: 2.4pt; }}
 .check li {{ list-style: none; position: relative; padding-left: 14pt; }}
 .check li::before {{ content: "☐"; position: absolute; left: 0;
 color: {PALETTE['warm']}; font-weight: bold; }}
 img {{ width: 100%; max-width: 100%; }}
 .figcap {{ font-size: 7.6pt; color: {PALETTE['neutral']};
 text-align: center; margin-top: -2pt; margin-bottom: 6pt; }}
 .footer {{ position: running(footer); font-size: 7pt; color: {PALETTE['neutral']};
 border-top: 0.3pt solid {PALETTE['neutral']}; padding-top: 2pt; }}
 @page {{ @bottom-center {{ content: element(footer); }} }}
 .nono li {{ list-style: "✗ "; color: {PALETTE['warn']}; }}
 .yesyes li {{ list-style: "✓ "; color: {PALETTE['ok']}; }}
 code {{ font-family: 'DejaVu Sans Mono', monospace;
 background: #1f2937; color: #fef3c7; padding: 0.5pt 3pt;
 border-radius: 2pt; font-size: 8.4pt; }}
    """

    return f"""<!doctype html>
<html><head><meta charset="utf-8"><style>{css}</style></head>
<body>

<div class="footer">Bucket Foundation · AGFarms Grants Brief · 2026-05-05 · Confidential to assigned grant writer</div>

<h1>AGFarms Grants, Executive Brief</h1>
<div class="sub">For: external grant writer + their drafting agent · Date: 2026-05-05 · Repo:
github.com/bucket-foundation/bucket-foundation (public, MIT)</div>
<div class="slogan">build the past. build history. bucket is the new renaissance.</div>

<h2>1 · Entity matrix</h2>
<table>
<tr><th>Entity</th><th>Status</th><th>EIN</th><th>SAM</th><th>Use for</th></tr>
<tr><td><b>AGFarms LLC</b></td><td>DE for-profit, active</td><td class="ok">✓ ops vault</td><td class="gate">⏳ filing</td><td>NSF SBIR · NOAA · USDA</td></tr>
<tr><td><b>MamaTeeTees</b></td><td>501(c)(3), active</td><td class="ok">✓ on file</td><td class="gate">⏳ filing</td><td>GlobalGiving · Mastercard · Segal</td></tr>
<tr><td><b>Bucket Foundation</b></td><td>personal capacity, c3 pending</td><td class="warn">✗ none</td><td class="warn">✗ blocked</td><td>Sloan · EF ESP · Gitcoin · NSF POSE (post-c3)</td></tr>
<tr><td><b>HCB</b> (interim Bucket sponsor)</td><td>501(c)(3)</td><td class="ok">✓ 81-2908499</td><td class="ok">✓ active</td><td>federal apps until Bucket c3 lands</td></tr>
</table>

<h2>2 · Pipeline at a glance</h2>
<img src="{c4}"/>
<div class="figcap">Funnel · 52 surveyed → 5 priority submissions in 90 days → 2 expected wins (12mo)</div>

<h2>3 · Top 10 actions on a calendar</h2>
<img src="{c1}"/>
<div class="figcap">Submission timeline · color = lane · text right of bar = ask</div>

<h2>4 · Ask vs gate (where to spend writing time)</h2>
<img src="{c2}"/>
<div class="figcap">Bubble size = drafting readiness · top-left = highest payoff today</div>

<h2>5 · Cross-pillar readiness</h2>
<img src="{c3}"/>
<div class="figcap">Per-venture self-rating · gaps = where pillar work is needed before submit</div>

<h2>6 · Submit-order, top 5</h2>
<table>
<tr><th>#</th><th>Grant</th><th>Entity</th><th>Ask</th><th>Lane</th><th>Gate</th><th>Submit by</th></tr>
<tr><td>1</td><td>Gitcoin OSS GG-round</td><td>Bucket</td><td>$5-50K match</td><td><span class="pill pill-cry">crypto</span></td><td class="ok">none</td><td><b>NOW</b></td></tr>
<tr><td>2</td><td>GlobalGiving Accelerator</td><td>MamaTeeTees</td><td>vetted</td><td><span class="pill pill-dir">direct</span></td><td class="gate">video + Candid</td><td>2026-06-09</td></tr>
<tr><td>3</td><td>EF ESP</td><td>Bucket</td><td>$200K (band $30-300K)</td><td><span class="pill pill-cry">crypto</span></td><td class="gate">wallet + audit</td><td>mid-Jun 2026</td></tr>
<tr><td>4</td><td>NSF SBIR Phase I (Project Pitch)</td><td>AGFarms (DerbyFish)</td><td>≤$305K</td><td><span class="pill pill-fed">federal</span></td><td class="gate">SAM</td><td>mid-Jun 2026</td></tr>
<tr><td>5</td><td>Sloan Exploratory LOI</td><td>Bucket</td><td>$50-250K</td><td><span class="pill pill-fnd">foundation</span></td><td class="gate">HCB letter</td><td>Jun 2026</td></tr>
</table>
<p class="sub">Runners: NOAA Saltonstall-Kennedy (DerbyFish, Aug NOFO) · NSF POSE Phase I (Bucket, FY27 post-c3) · Templeton OFI (Bucket, Q4 2026)</p>

<h2>7 · Cross-pillar analysis</h2>
<div class="grid2">
<div>
<h3>Product</h3>
<ul>
<li>Bucket = <b>infrastructure for research</b>. Don't pitch it as a research project or as content.</li>
<li>DerbyFish = citizen-science fisheries data with cryptographic provenance. Federal hook.</li>
<li>MTT = direct-services nonprofit. Hook = local leadership + measurable retention.</li>
</ul>
<h3>Engineering</h3>
<ul>
<li>grants-gateway shipped. Real Anthropic synth + real x402 facilitator wired. Live x402 merchant on Base = differentiated proof.</li>
<li>Bucket TLS + Nucleus instance live as of 2026-05-04.</li>
<li>17,211-row corpus from grants.gov / NIH / NSF / USAspending / 990-PF.</li>
</ul>
<h3>Data</h3>
<ul>
<li>bucket-canon master taxonomy (gdrive), 7 branches, ~76 contributor index.</li>
<li>Kruse Index (460 articles, FTS5+MiniLM+RRF) is biophysics seed corpus.</li>
<li>Lean on this for any open-science / primary-research pitch.</li>
</ul>
</div><div>
<h3>Revenue / GTM</h3>
<ul>
<li>LLC eligibility opens <b>NOAA + NSF SBIR today</b>, no c3 wait.</li>
<li>Crypto-native lane (EF, Gitcoin, Protocol Labs) = open regardless of c3.</li>
<li>Foundation lane (Mellon, Templeton, Pew, Walton) = 6-12mo cultivation horizon.</li>
</ul>
<h3>Operations</h3>
<ul>
<li><b>SAM.gov 4-8wk</b> is single biggest gating risk. File in week of 2026-05-05.</li>
<li>Bucket has no EIN. Path A (HCB sponsor) or Path B (NY/NJ → SS-4 → SAM, 8-14wk).</li>
<li>Form 1023 May 2026 → determination Q4 2026 / Q1 2027 → opens FY27 NSF POSE.</li>
</ul>
<h3>People</h3>
<ul>
<li>Founder: Gianangelo Dichio · gianyrox@gmail.com · sole canonical author.</li>
<li>CTO: Anthony Tedesco, cite for SBIR engineering credibility.</li>
<li><b>0 NOAA scientists in Rolodex.</b> Highest-payoff cultivation = warm one regional NOAA Fisheries scientist before Aug 2026 NOFO.</li>
</ul>
</div></div>

<h2>8 · Drafting checklist (give to your Claude)</h2>
<div class="grid2">
<div><h3>Reading order</h3>
<ul class="check">
<li><code>MANIFESTO.md</code>, voice + thesis</li>
<li><code>PROTOCOL.md</code>, what Bucket builds</li>
<li><code>GOVERNANCE.md</code>, COI disclosure (founder personal capacity)</li>
<li><code>grants-targets/INDEX.md</code>, portfolio strategy</li>
<li><code>grants-targets/{{venture}}.md</code>, per-venture rationale</li>
<li><code>grants-targets/drafts/*.md</code>, current drafts (Sloan/EF/Gitcoin)</li>
<li><code>private/grants/*</code>, request access (SAM checklist + MTT GG draft)</li>
</ul></div>
<div><h3>Per-application checks</h3>
<ul class="check">
<li>Confirm correct legal entity (LLC vs c3 vs HCB-sponsored)</li>
<li>Confirm SAM/EIN status before any federal app</li>
<li>Use slogan ladder in voice, never literal</li>
<li>Include COI disclosure where Bucket is applicant</li>
<li>Cite live numbers: 17,211 corpus rows · 7 canon branches · ~76 contributors · feed402 v0.2 · 7 live x402 endpoints</li>
<li>No hyperbole. Funders index for specificity.</li>
<li>All drafts pushed to <code>grants-targets/drafts/</code> for review before submit</li>
</ul></div>
</div>

<h2>9 · Non-negotiables</h2>
<div class="box">
<ul class="nono">
<li>Don't pitch Bucket as a research project. It's <b>infrastructure for research</b>.</li>
<li>Don't pitch AGFarms LLC to c3-only funders (Mellon/Templeton/Pew/Walton).</li>
<li>Don't submit unverified MamaTeeTees stats, TODOs in <code>private/grants/mamateetees-globalgiving.md</code> must be resolved with country coordinator first.</li>
<li>Don't bury feed402 / x402 / Base in jargon. Translate: "users pay tiny amounts to query primary research; authors get paid each time their work is cited."</li>
<li>Don't submit without grants-gateway citation, it's operating proof.</li>
</ul>
<ul class="yesyes">
<li>Cite the live system every time. grants-gateway + x402-research-gateway are working merchants on Base.</li>
<li>Lead with specificity. Numbers > adjectives.</li>
<li>Honor the slogan ladder.</li>
</ul>
</div>

<h2>10 · Founder-blocking action items</h2>
<div class="box"><ul class="check">
<li>Pull AGFarms LLC EIN from ops vault</li>
<li>Pull MamaTeeTees EIN + state articles</li>
<li>Decide Bucket NY vs NJ incorporation</li>
<li>File SAM ×3 (AGFarms, MTT, Bucket post-EIN)</li>
<li>Submit HCB application</li>
<li>Designate Base mainnet wallet for EF ESP disbursement</li>
<li>Identify smart-contract audit vendor for EF ESP M2 (OpenZeppelin / Trail of Bits / Spearbit)</li>
<li>Produce 60s MTT video (country coordinator + scholar B-roll)</li>
<li>Verify Candid vetting docs (IRS det. letter + 3yr 990s + 2yr financials)</li>
<li>Send first NOAA scientist outreach email (NJ or FL regional)</li>
<li>Export creds + run <code>./grants-gateway/deploy.sh --seed-secret</code> for live merchant</li>
</ul></div>

<div class="sub" style="margin-top: 14pt;">
<b>Contact:</b> Gianangelo Dichio · gianyrox@gmail.com · github.com/gianyrox<br/>
<b>Portfolio:</b> github.com/AGFarms (org) · nucleus.agfarms.dev (dashboard)<br/>
<b>This brief synthesized from</b> <code>~/agfarms/bucket-foundation/grants-targets/</code> as of 2026-05-05.
</div>

</body></html>
"""


def main():
    print("[1/3] generating charts…")
    c1 = chart_timeline()
    c2 = chart_ask_vs_gate()
    c3 = chart_pillar_radar()
    c4 = chart_funnel()
    print("[2/3] rendering HTML…")
    doc = html(c1, c2, c3, c4)
    print("[3/3] writing PDF →", OUT_PDF.relative_to(ROOT))
    OUT_PDF.parent.mkdir(parents=True, exist_ok=True)
    from weasyprint import HTML
    HTML(string=doc, base_url=str(ROOT)).write_pdf(str(OUT_PDF))
    print(f"OK · {OUT_PDF.stat().st_size//1024} KiB")


if __name__ == "__main__":
    main()
