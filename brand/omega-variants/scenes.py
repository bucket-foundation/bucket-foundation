#!/usr/bin/env python3
import argparse
import json
from pathlib import Path

import taxonomy as T
from PIL import Image

from ai_raster import MODEL

ROOT = Path(__file__).parent
OUT = ROOT / "out"
SC = OUT / "scenes"
STRENGTH = .8
STYLE = ("3d tactile {material} tile with thick beveled rounded edges, a raised glossy omega emblem in relief at the center, surrounded by {scene}, "
         "handcrafted museum quality, top-down studio photo on cream linen, soft shadows, rich texture, fine detail")

KNOW = {
    "mathematics": ("chalk constructions on a slate chalkboard", "slate and brass"), "geometry": ("compass arcs and a brass compass", "engraved brass"),
    "calculus": ("curves and area under a curve on graph paper", "paper and ink"), "number-theory": ("rows of prime number beads", "abacus wood and beads"),
    "topology": ("a mobius strip ribbon", "porcelain"), "probability": ("scattered dice and a bell curve", "ivory and felt"),
    "physics": ("standing waves and a pendulum", "brass instrument"), "quantum": ("glowing probability cloud of an atom", "glass"),
    "relativity": ("a warped spacetime grid around a star", "polished steel"), "thermodynamics": ("a steam engine and heat glow", "cast iron"),
    "optics": ("a prism splitting light into a rainbow", "crystal glass"), "electromagnetism": ("iron filings in magnetic field lines", "copper coil"),
    "chemistry": ("flasks and benzene rings", "laboratory glass"), "biochemistry": ("a dna double helix", "enamel"), "materials": ("a crystal lattice", "quartz"),
    "information": ("binary punch cards", "paper tape"), "computation": ("a lambda symbol and logic gates", "circuit board"),
    "cryptography": ("an enigma machine rotor", "bakelite and brass"), "biophysics": ("sunlight through structured water hexagons", "glass"),
    "biology": ("leaves and cells under a microscope", "botanical ceramic"), "medicine": ("a caduceus and herbs", "apothecary porcelain"),
    "neuroscience": ("glowing neurons", "glass"), "ecology": ("a forest food web", "carved wood"), "evolution": ("a nautilus shell spiral and fossils", "fossil stone"),
    "cosmology": ("the expanding universe and galaxies", "lapis lazuli"), "astronomy": ("a brass astrolabe and stars", "brass"),
    "geology": ("rock strata layers", "layered sandstone"), "oceanography": ("ocean waves and currents", "blue glaze ceramic"),
    "meteorology": ("a storm spiral and clouds", "pewter"), "mind": ("a glowing meditating mind", "alabaster"), "philosophy": ("an open ancient codex", "vellum and gold leaf"),
    "logic": ("truth tables and syllogism diagrams", "slate"), "ethics": ("a balance scale", "bronze"), "linguistics": ("letters of many alphabets", "letterpress type"),
    "history": ("scrolls and a quill", "parchment"), "economics": ("coins and supply demand curves", "gold coins"), "music": ("sheet music staff and a lyre", "rosewood"),
    "art": ("paint strokes and a palette", "oil paint on canvas"), "architecture": ("greek columns and blueprints", "marble"),
    "engineering": ("interlocking gears", "brass clockwork"), "agriculture": ("wheat fields and furrows", "terracotta"),
}
CLIM = {
    "polar": "ice crystals and snow", "tundra": "frozen moss and permafrost", "alpine": "snowy mountain peaks", "boreal": "pine forest and snow",
    "oceanic": "rolling waves and cliffs", "continental": "rolling hills and four seasons", "temperate": "oak leaves and meadow", "mediterranean": "olive branches and sea",
    "monsoon": "heavy rain and rice terraces", "rainforest": "dense jungle leaves and vines", "savanna": "acacia trees and golden grass", "steppe": "windswept grassland",
    "desert": "sand dunes and cactus", "volcanic": "lava flows and obsidian", "reef": "coral reef and tropical fish",
}
CLIM_MAT = {"polar": "frosted glass", "desert": "sandstone", "volcanic": "basalt and lava glass", "reef": "coral enamel", "rainforest": "jade", "alpine": "granite"}
AI = {k: v for k, v in [
    ("neural-net", "a glowing neural network"), ("transformer", "an attention heatmap grid"), ("embedding", "a cloud of glowing points in space"),
    ("token", "colorful token blocks in a row"), ("vector", "arrows in a coordinate space"), ("graph", "a knowledge graph of nodes and edges"),
    ("database", "stacked database cylinders"), ("dataset", "a spreadsheet grid"), ("bits", "binary digits"), ("chip", "a silicon microchip"),
    ("agent", "a small friendly robot"), ("prompt", "a command line cursor"), ("search", "a magnifying glass over documents"),
    ("citation", "quotation marks and footnotes"), ("ledger", "a ledger book with columns"), ("signal", "a waveform oscilloscope"),
    ("cluster", "three clusters of points"), ("compression", "a zipper compressing blocks")]}
CULT = {
    "greek": ("black-figure pottery with meander border", "terracotta"), "roman": ("SPQR inscription and laurel", "carved marble"),
    "egyptian": ("hieroglyphs and scarab", "gold and lapis"), "mesopotamian": ("cuneiform wedges", "clay tablet"), "persian": ("star tile pattern", "turquoise zellige tile"),
    "indian": ("paisley block print and om", "carved sandstone"), "chinese": ("ink wash mountains and seal", "silk and jade"), "japanese": ("waves and gold makie", "red lacquer"),
    "korean": ("taegeuk and celadon glaze", "celadon ceramic"), "tibetan": ("mandala and prayer flags", "thangka painting"), "khmer": ("angkor stone carving", "sandstone"),
    "polynesian": ("tapa cloth patterns", "bark cloth"), "maori": ("koru spirals", "carved wood and pounamu"), "aboriginal": ("dot painting", "ochre on bark"),
    "maya": ("glyph carvings", "limestone"), "aztec": ("sun stone step fret", "carved basalt"), "inca": ("terrace stonework and sun", "gold"),
    "andean": ("woven geometric textile", "alpaca wool"), "navajo": ("rug weaving pattern", "wool textile"), "inuit": ("carved soapstone and snow", "soapstone"),
    "norse": ("runes and knotwork", "carved wood and iron"), "celtic": ("knotwork", "engraved silver"), "slavic": ("embroidered folk ornament", "linen embroidery"),
    "hebrew": ("hebrew letters and scroll", "parchment"), "arabic": ("kufic calligraphy and arabesque", "glazed tile"), "ethiopian": ("cross and illuminated manuscript", "parchment and gold"),
    "yoruba": ("adire indigo patterns", "indigo textile"), "zulu": ("beadwork patterns", "glass beads"), "swahili": ("carved doors and dhow", "carved teak"),
    "andalusian": ("alhambra tile geometry", "glazed ceramic"),
}
YEARS = {1900: "art nouveau poster", 1910: "edwardian letterpress", 1920: "art deco sunburst", 1930: "streamline moderne chrome", 1940: "wartime stencil poster",
         1950: "atomic age diner enamel sign", 1960: "pop art psychedelic", 1970: "orange plastic and macrame", 1980: "neon arcade synthwave",
         1990: "grunge sticker and halftone", 2000: "glossy aqua plastic y2k", 2010: "flat paper material design", 2020: "frosted glassmorphism",
         2030: "holographic iridescent", 2050: "bioluminescent future city", 2100: "orbital habitat", 2500: "interstellar ship", 3000: "far future crystal monument"}
ERA = {"deep-time": "fossils in rock layers", "stone-age": "cave painting and flint", "bronze-age": "bronze casting", "ancient-egypt": "pyramid and hieroglyphs",
       "classical-greece": "parthenon columns", "roman": "aqueduct and mosaic", "han-dynasty": "silk road and bronze mirror", "islamic-golden-age": "astrolabe and geometric tiles",
       "medieval": "illuminated manuscript", "renaissance": "da vinci sketch", "scientific-revolution": "telescope and orbits", "enlightenment": "candle and encyclopedia",
       "industrial": "steam engine gears", "atomic": "atom model", "space-age": "rocket and moon", "digital": "pixel computer screen", "ai-age": "glowing neural network"}


def prompt_for(cat, name, extra):
    if cat == "knowledge":
        scene, mat = KNOW[name]
    elif cat == "climates":
        scene, mat = CLIM[name] + " diorama", CLIM_MAT.get(name, "glazed ceramic")
    elif cat == "ai-data":
        scene, mat = AI[name], "printed circuit board and glowing glass"
    elif cat == "cultures":
        scene, mat = CULT[name]
    elif cat == "languages":
        scene, mat = f"native lettering {extra} of the {name} language and its folk ornament", "painted ceramic"
    elif cat == "years":
        y = int(name.rstrip("s"))
        scene, mat = f"{YEARS[y]} style, the year {name}", "period materials"
    elif cat == "eras":
        scene, mat = ERA[name], "museum artifact"
    elif cat == "space":
        scene, mat = f"the {name.replace('-', ' ')} in deep space", "cloisonne enamel"
    elif cat == "places":
        scene, mat = f"a relief map and landmark of {name.replace('-', ' ')}", "painted ceramic map tile"
    else:
        scene, mat = f"{name} theme", "enamel"
    return STYLE.format(scene=scene, material=mat)


def jobs(seeds):
    extra = {n: g for n, g, _ in T.LANGUAGES}
    rows = [json.loads(l) for l in (OUT / "emoji" / "manifest.jsonl").read_text().splitlines()]
    for r in rows:
        if r["seed"] > 1:
            continue
        p = prompt_for(r["cat"], r["name"], extra.get(r["name"], ""))
        for s in seeds:
            yield dict(source=r["file"], cat=r["cat"], name=r["name"], prompt=p, strength=STRENGTH, steps=4, seed=s * 7919 + r["order"] * 2 + r["seed"], model=MODEL, order=r["order"])


def run(job_list):
    import torch
    from diffusers import AutoPipelineForImage2Image

    pipe = AutoPipelineForImage2Image.from_pretrained(MODEL, torch_dtype=torch.float16, variant="fp16")
    pipe.enable_model_cpu_offload()
    SC.mkdir(parents=True, exist_ok=True)
    log_path = SC / "manifest.jsonl"
    have = {json.loads(l)["out"] for l in log_path.read_text().splitlines()} if log_path.exists() else set()
    with open(log_path, "a") as log:
        for j in job_list:
            name = f"{Path(j['source']).stem}-{j['seed']}-s{int(j['strength'] * 100)}.jpg"
            if name in have and (SC / name).exists():
                continue
            g = torch.Generator("cuda").manual_seed(j["seed"])
            img = pipe(j["prompt"], image=Image.open(SC / "src" / (Path(j["source"]).stem + ".png")).convert("RGB"), strength=j["strength"], num_inference_steps=j["steps"], guidance_scale=0.0, generator=g).images[0]
            img.save(SC / name, quality=90)
            log.write(json.dumps(dict(j, out=name), ensure_ascii=False) + "\n")
            log.flush()
            print(name, flush=True)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--seeds", default="1")
    ap.add_argument("--only", default="")
    ap.add_argument("--strength", type=float, default=.8)
    a = ap.parse_args()
    STRENGTH = a.strength
    js = [dict(j, strength=a.strength) for j in jobs([int(s) for s in a.seeds.split(",")]) if not a.only or j["name"] in a.only.split(",")]
    run(js)
