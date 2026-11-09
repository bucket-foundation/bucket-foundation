#!/usr/bin/env python3
import json
import random
from pathlib import Path

import engine

OUT = Path(__file__).parent / "out"

LATIN = [
    "Press Start 2P", "Silkscreen", "VT323", "Pixelify Sans", "Bungee", "Bungee Shade", "Monoton", "Rubik Glitch",
    "Black Ops One", "Orbitron", "Audiowide", "Russo One", "Righteous", "Bangers", "Luckiest Guy", "Lilita One",
    "Fredoka", "Baloo 2", "Cinzel", "Cinzel Decorative", "UnifrakturMaguntia", "Pirata One", "MedievalSharp", "Uncial Antiqua",
    "Major Mono Display", "Space Mono", "Fraunces", "Abril Fatface", "Lobster", "Pacifico", "Creepster", "Nabla",
    "Rubik Mono One", "Syne", "Unbounded", "Zen Dots",
]

SCRIPTS = [
    ("Greek", "μπάκετ", "Noto Sans"), ("Greek uncial", "ΒΟΥΚΕΤ", "Cinzel"), ("Cyrillic", "бакет", "Rubik Mono One"),
    ("Japanese", "バケット", "Dela Gothic One"), ("Japanese brush", "バケツ", "Yuji Syuku"), ("Korean", "버킷", "Black Han Sans"),
    ("Chinese", "桶", "ZCOOL KuaiLe"), ("Arabic", "باكت", "Reem Kufi"), ("Hebrew", "בָּקֶט", "Noto Sans Hebrew"),
    ("Devanagari", "बकेट", "Noto Sans Devanagari"), ("Thai", "บัคเก็ต", "Noto Sans Thai"), ("Georgian", "ბაკეტი", "Noto Sans Georgian"),
    ("Armenian", "բաքեթ", "Noto Sans Armenian"), ("Runic", "ᛒᚢᚲᛖᛏ", "Noto Sans Runic"), ("Ogham", "᚛ᚁᚒᚉᚓᚈ᚜", "Noto Sans Ogham"),
    ("Linear B", "𐀡𐀐𐀳", "Noto Sans Linear B"), ("Cherokee", "ᏆᎨᏗ", "Noto Sans Cherokee"), ("Braille", "⠃⠥⠉⠅⠑⠞", "Noto Sans Symbols 2"),
]

STYLES = {
    "pixel": "color:{ink};text-shadow:4px 0 0 {sh},-4px 0 0 {sh},0 4px 0 {sh},0 -4px 0 {sh},6px 6px 0 {a1}",
    "arcade": "background:linear-gradient(180deg,{a2} 0 45%,{a1} 55% 100%);-webkit-background-clip:text;color:transparent;filter:drop-shadow(3px 3px 0 {sh})",
    "extrude": "color:{ink};text-shadow:1px 1px 0 {sh},2px 2px 0 {sh},3px 3px 0 {sh},4px 4px 0 {sh},5px 5px 0 {sh},6px 6px 0 {sh},8px 10px 8px #0006",
    "cel": "color:{ink};-webkit-text-stroke:7px #111;paint-order:stroke fill;text-shadow:5px 5px 0 #111",
    "neon": "color:#fff;text-shadow:0 0 4px #fff,0 0 12px {a1},0 0 28px {a1},0 0 48px {a1}",
    "rpg-gold": "background:linear-gradient(180deg,#FFF3B0,#E8C25A 45%,#8A641A 55%,#F2D47A);-webkit-background-clip:text;color:transparent;filter:drop-shadow(0 3px 0 #3A2A1A) drop-shadow(0 0 6px {a1})",
    "sticker": "color:{ink};-webkit-text-stroke:12px #fff;paint-order:stroke fill;filter:drop-shadow(3px 4px 0 #111)",
    "flat": "color:{ink}",
}


def tile(word, font, style, c, size, mark):
    css = STYLES[style].format(**c)
    return (
        f'<figure style="background:radial-gradient(circle at 50% 35%,{c["b1"]},{c["b2"]})">'
        f'<img src="{mark}"><span style="font-family:\'{font}\';font-size:{size}px;{css}">{word}</span>'
        f'<figcaption>{font} · {style}</figcaption></figure>'
    )


def main():
    rnd = random.Random("bucket-wordmarks")
    manifest = [json.loads(l) for l in (OUT / "manifest.jsonl").read_text().splitlines()]
    games = [m for m in manifest if m["trend"] in ("game", "retro", "house", "current")]
    cells, specs = [], []
    for i, font in enumerate(LATIN):
        m = games[i * 7 % len(games)]
        style = list(STYLES)[i % len(STYLES)]
        specs.append(dict(word="bucket", font=font, style=style, mark=m["id"]))
        cells.append(tile("bucket", font, style, m["palette"], 46, m["file"]))
    script_cells = []
    for i, (name, word, font) in enumerate(SCRIPTS):
        m = rnd.choice(games)
        style = rnd.choice(list(STYLES))
        specs.append(dict(word=word, script=name, font=font, style=style, mark=m["id"]))
        script_cells.append(tile(word, font, style, m["palette"], 44, m["file"]).replace("<figcaption>", f"<figcaption>{name} · "))
    fonts = sorted({f for f in LATIN} | {f for _, _, f in SCRIPTS})
    href = "https://fonts.googleapis.com/css2?" + "&".join("family=" + f.replace(" ", "+") for f in fonts) + "&display=block"
    (OUT / "wordmarks.json").write_text(json.dumps(specs, ensure_ascii=False, indent=1))
    (OUT / "wordmarks.html").write_text(
        f'<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="{href}"><style>'
        "body{margin:0;background:#ddd;font:600 15px sans-serif;padding:14px}.g{display:grid;grid-template-columns:repeat(4,300px);gap:12px}"
        "figure{margin:0;height:150px;border-radius:20px;display:flex;align-items:center;justify-content:center;gap:10px;position:relative;overflow:hidden}"
        "figure img{width:64px;border-radius:14px}figcaption{position:absolute;bottom:6px;left:10px;font:11px monospace;color:#fff;opacity:.75}"
        "span{white-space:nowrap}</style></head><body><h2>bucket in game and display type</h2><div class='g'>"
        + "".join(cells) + "</div><h2>bucket in other scripts</h2><div class='g'>" + "".join(script_cells) + "</div></body></html>"
    )


if __name__ == "__main__":
    main()
