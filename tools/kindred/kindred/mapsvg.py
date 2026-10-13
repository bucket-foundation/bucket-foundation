from xml.sax.saxutils import escape

INK = "#1c2b2d"
PAPER = "#f7f3ea"
MUTED = "#3f4a46"
GREY = "#8f8f88"
PALETTE = ["#1f6f78", "#8a5fb0", "#c9833f", "#2f5fa8", "#4d9a6a", "#b0486b", "#a3923a", "#6b6b6b", "#c0504d", "#3b8ea5", "#7a5c3d", "#5d7a2e"]
LABEL_GAP = 15


def spread(ys, gap, lo, hi):
    out = list(ys)
    for i in range(1, len(out)):
        out[i] = max(out[i], out[i - 1] + gap)
    over = out[-1] - hi if out else 0
    if over > 0:
        out = [y - over for y in out]
    for i in range(len(out) - 2, -1, -1):
        out[i] = min(out[i], out[i + 1] - gap)
    if out and out[0] < lo:
        up = lo - out[0]
        out = [y + up for y in out]
    return out


def lay_out(points, size):
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    sx = (size["plot_w"]) / max(x1 - x0, 1e-9)
    sy = (size["plot_h"]) / max(y1 - y0, 1e-9)
    return [(size["x"] + (x - x0) * sx, size["y"] + (y - y0) * sy) for x, y in points]


def legend_rows(claims, per_row):
    return [claims[i:i + per_row] for i in range(0, len(claims), per_row)]


def kindred_svg(claims, claim_xy, sources):
    width, plot_x, plot_w, plot_y, plot_h = 1500, 380, 740, 190, 760
    legend_rows_n = len(claims)
    legend_y = plot_y + plot_h + 60
    height = legend_y + 30 + legend_rows_n * 24 + 40
    size = {"x": plot_x, "y": plot_y, "plot_w": plot_w, "plot_h": plot_h}
    pts = [p for p in claim_xy] + [s["xy"] for s in sources]
    placed = lay_out(pts, size)
    cpos, spos = placed[: len(claims)], placed[len(claims):]
    color = {c["id"]: PALETTE[i % len(PALETTE)] for i, c in enumerate(claims)}
    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}" font-family="Georgia, \'Times New Roman\', serif" role="img" aria-label="Map of the frontier thesis claims and their nearest sources">']
    out.append(f'<rect width="100%" height="100%" fill="{PAPER}"/>')
    out.append(f'<text x="60" y="64" font-size="34" font-weight="700" fill="{INK}">Kindred thinkers</text>')
    out.append(f'<text x="60" y="100" font-size="21" fill="{INK}">{len(claims)} claims (squares) and their five nearest sources each (circles), on the first two principal directions of the embeddings.</text>')
    out.append(f'<text x="60" y="128" font-size="17" fill="{MUTED}">Neighbours on the page are neighbours in meaning. Colour follows the claim.</text>')
    out.append(f'<rect x="{plot_x - 20}" y="{plot_y - 20}" width="{plot_w + 40}" height="{plot_h + 40}" fill="none" stroke="{GREY}" stroke-width="1" stroke-dasharray="2 7"/>')
    for s in sources:
        cx, cy = spos[sources.index(s)]
        ci = next(i for i, c in enumerate(claims) if c["id"] == s["claim"])
        ex, ey = cpos[ci]
        out.append(f'<line x1="{ex:.1f}" y1="{ey:.1f}" x2="{cx:.1f}" y2="{cy:.1f}" stroke="{color[s["claim"]]}" stroke-width="0.8" opacity="0.4"/>')
    for s, (cx, cy) in zip(sources, spos):
        out.append(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="5.5" fill="{color[s["claim"]]}" stroke="{PAPER}" stroke-width="1.5" opacity="0.9"/>')
    for c, (cx, cy) in zip(claims, cpos):
        out.append(f'<rect x="{cx - 8:.1f}" y="{cy - 8:.1f}" width="16" height="16" fill="{color[c["id"]]}" stroke="{INK}" stroke-width="2"/>')

    def column(items, side):
        order = sorted(items, key=lambda it: it["y"])
        ys = spread([it["y"] for it in order], LABEL_GAP + 2, plot_y, plot_y + plot_h)
        for it, y in zip(order, ys):
            x = plot_x - 40 if side < 0 else plot_x + plot_w + 40
            anchor = "end" if side < 0 else "start"
            out.append(f'<line x1="{it["x"]:.1f}" y1="{it["y"]:.1f}" x2="{x - side * 6:.1f}" y2="{y - 4:.1f}" stroke="{MUTED}" stroke-width="0.5" opacity="0.5"/>')
            out.append(f'<text x="{x:.1f}" y="{y:.1f}" font-size="13" fill="{INK}" text-anchor="{anchor}" paint-order="stroke" stroke="{PAPER}" stroke-width="4">{escape(it["text"])}</text>')

    mid = plot_x + plot_w / 2
    labels = [{"x": cx, "y": cy, "text": f'{c["id"]} {c["short"]}'} for c, (cx, cy) in zip(claims, cpos)]
    top = {}
    for s, (cx, cy) in zip(sources, spos):
        if s["claim"] not in top:
            top[s["claim"]] = {"x": cx, "y": cy, "text": f'{s["label"]}'}
    labels += list(top.values())
    column([l for l in labels if l["x"] < mid], -1)
    column([l for l in labels if l["x"] >= mid], 1)
    box_h = 30 + legend_rows_n * 24
    out.append(f'<rect x="60" y="{legend_y}" width="{width - 120}" height="{box_h}" fill="none" stroke="{INK}" stroke-width="1.4"/>')
    out.append(f'<text x="80" y="{legend_y + 22}" font-size="15" font-weight="700" fill="{INK}">Claims</text>')
    for i, c in enumerate(claims):
        y = legend_y + 46 + i * 24
        out.append(f'<rect x="80" y="{y - 11}" width="12" height="12" fill="{color[c["id"]]}" stroke="{INK}" stroke-width="1"/>')
        out.append(f'<text x="104" y="{y}" font-size="14" fill="{INK}">{escape(c["id"])} {escape(c["claim"])}</text>')
    out.append("</svg>")
    return "\n".join(out) + "\n"
