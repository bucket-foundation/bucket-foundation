#!/usr/bin/env python3
import argparse
import json
import re
import urllib.request
from pathlib import Path

import engine

ROOT = Path(__file__).parent
RENDERERS = sorted(engine.GEN_FINISHES | engine.GEN_MODES | set(engine.WILD) | {"pottery", "deco", "bauhaus", "chrome", "holo", "memphis", "stitch", "sticker"})
CENTERS = ["flame", "dot", "seed", "spark", "none"]
HEX = re.compile(r"^#[0-9A-Fa-f]{6}$")


def ask(model, n, avoid, seed):
    prompt = (
        f"Invent {n} new visual themes for an app icon of an omega glyph with a small flame. Mix video game genres, art movements, "
        f"cultures, eras, materials and current design trends. Avoid these ids: {', '.join(avoid)}. "
        "Return a JSON object {\"themes\": [...]}. Example item: {\"id\": \"lava-dungeon\", \"trend\": \"game\", \"palettes\": [[\"#3A0E0E\", \"#120404\", \"#FFD27A\", \"#000000\", \"#FF4F2E\", \"#FFF1B8\"]], \"renderers\": [\"neon\", \"extrude\"], \"centers\": [\"flame\"], \"prompt\": \"molten lava dungeon rune omega\"}. Each item: {\"id\": kebab-case, \"trend\": one word, \"palettes\": [[bg_light, bg_dark, glyph, shadow, accent1, accent2]] with 1 or 2 palettes of #RRGGBB, "
        f"\"renderers\": 2 or 3 of {RENDERERS}, \"centers\": 1 or 2 of {CENTERS}, \"prompt\": an image prompt under 25 words}}."
    )
    body = json.dumps(dict(model=model, prompt=prompt, stream=False, format="json", think=False, options=dict(seed=seed, temperature=0.9))).encode()
    req = urllib.request.Request("http://127.0.0.1:11434/api/generate", body, {"Content-Type": "application/json"})
    text = json.loads(urllib.request.urlopen(req, timeout=600).read())["response"]
    data = json.loads(text)
    if isinstance(data, dict):
        data = next((v for v in data.values() if isinstance(v, list)), [data])
    return data


def valid(t):
    try:
        return (
            re.fullmatch(r"[a-z0-9-]+", t["id"]) and isinstance(t["trend"], str)
            and all(len(p) == 6 and all(HEX.match(x) for x in p) for p in t["palettes"]) and t["palettes"]
            and t["renderers"] and set(t["renderers"]) <= set(RENDERERS)
            and t["centers"] and set(t["centers"]) <= set(CENTERS) and isinstance(t["prompt"], str)
        )
    except (KeyError, TypeError):
        return False


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="qwen3:8b")
    ap.add_argument("--rounds", type=int, default=6)
    ap.add_argument("--per-round", type=int, default=5)
    a = ap.parse_args()
    out = ROOT / "themes" / f"ai-{a.model.replace(':', '-')}.json"
    themes = json.loads(out.read_text()) if out.exists() else []
    for r in range(a.rounds):
        ids = [t["id"] for t in engine.load_themes()] + [t["id"] for t in themes]
        try:
            got = ask(a.model, a.per_round, ids, seed=1000 + r)
        except (ValueError, OSError) as e:
            print("round", r, "failed:", e)
            continue
        for t in got:
            if valid(t) and t["id"] not in ids:
                t["trend"] = "ai-" + t["trend"].lower().replace(" ", "-")
                t["source"] = dict(model=a.model, seed=1000 + r)
                themes.append(t)
                ids.append(t["id"])
        out.write_text(json.dumps(themes, indent=1))
        print("round", r, "total", len(themes))
