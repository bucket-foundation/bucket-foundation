#!/usr/bin/env python3
import argparse
import io
import json
from pathlib import Path

import cairosvg
from PIL import Image

ROOT = Path(__file__).parent
OUT = ROOT / "out"
AI = OUT / "ai"
MODEL = "stabilityai/sdxl-turbo"
SUFFIX = ", centered symbol, app icon, rounded square, high detail"


def raster(svg_path, size=512):
    png = cairosvg.svg2png(url=str(svg_path), output_width=size, output_height=size)
    return Image.open(io.BytesIO(png)).convert("RGB")


def jobs(per_theme, strengths):
    rows = [json.loads(l) for l in (OUT / "manifest.jsonl").read_text().splitlines()]
    seen = {}
    for m in rows:
        k = seen.get(m["theme"], 0)
        if k >= per_theme:
            continue
        seen[m["theme"]] = k + 1
        for s in strengths:
            yield dict(source=m["id"], file=m["file"], theme=m["theme"], prompt=m["prompt"] + SUFFIX, strength=s, steps=4, seed=m["seed"] * 1000 + int(s * 100), model=MODEL)


def run(job_list):
    import torch
    from diffusers import AutoPipelineForImage2Image

    pipe = AutoPipelineForImage2Image.from_pretrained(MODEL, torch_dtype=torch.float16, variant="fp16")
    pipe.enable_model_cpu_offload()
    pipe.vae.enable_tiling()
    AI.mkdir(parents=True, exist_ok=True)
    done = {l for l in (AI / "manifest.jsonl").read_text().splitlines()} if (AI / "manifest.jsonl").exists() else set()
    with open(AI / "manifest.jsonl", "a") as log:
        for j in job_list:
            name = f"{j['source']}-s{int(j['strength'] * 100)}.png"
            line = json.dumps(dict(j, out=name), sort_keys=True)
            if line in done and (AI / name).exists():
                continue
            g = torch.Generator("cuda").manual_seed(j["seed"])
            img = pipe(j["prompt"], image=raster(OUT / j["file"]), strength=j["strength"], num_inference_steps=j["steps"], guidance_scale=0.0, generator=g).images[0]
            img.save(AI / name)
            log.write(line + "\n")
            log.flush()
            print(name, flush=True)


def sheet():
    rows = [json.loads(l) for l in (AI / "manifest.jsonl").read_text().splitlines()]
    cells = "".join(f'<figure><img src="../{r["file"]}"><img src="{r["out"]}"><figcaption>{r["theme"]} s{r["strength"]}</figcaption></figure>' for r in rows)
    (AI / "index.html").write_text(
        '<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;background:#ddd;font:11px monospace;padding:12px}'
        "div{display:grid;grid-template-columns:repeat(5,230px);gap:10px}figure{margin:0}img{width:110px;border-radius:22px;margin-right:4px}</style></head><body><div>"
        + cells + "</div></body></html>"
    )


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--per-theme", type=int, default=2)
    ap.add_argument("--strengths", default="0.5,0.7")
    a = ap.parse_args()
    run(list(jobs(a.per_theme, [float(x) for x in a.strengths.split(",")])))
    sheet()
