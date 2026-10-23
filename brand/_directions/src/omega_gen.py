import io
import json
import sys
from pathlib import Path

import cairosvg
import torch
from diffusers import AutoPipelineForImage2Image
from PIL import Image

OUT = Path(__file__).resolve().parent.parent / "mood" / "omega-v2"
D = "M16 15H30C35 15 38 19 38.5 27A32 32 0 1 0 61.5 27C62 19 65 15 70 15H84"

SHAPES = {
    "ring": D,
    "glyph": None,
}

BASES = [
    ("parchment", "#F6EEDC", "#5B1A4A"),
    ("purple", "#5B1A4A", "#E9A23B"),
    ("ink", "#231F20", "#D9381E"),
    ("lapis", "#26428B", "#F6EEDC"),
]

SUBJECTS = [
    ("ceramic", "a glazed ceramic tile emblem shaped like the inverted omega symbol, iznik pottery glaze, centered"),
    ("brass", "a hammered brass bucket shaped like an inverted omega, studio product shot, centered"),
    ("calligraphy", "the inverted omega letter painted in bold sumi ink brush calligraphy on rice paper, centered"),
    ("mosaic", "a roman floor mosaic of an inverted omega symbol, small stone tesserae, centered"),
    ("kente", "an inverted omega emblem woven from kente cloth, ghanaian textile, centered"),
    ("azulejo", "a portuguese azulejo tile with a blue inverted omega motif, centered"),
    ("stainedglass", "a gothic stained glass window shaped like an inverted omega, glowing, centered"),
    ("woodcut", "a medieval woodcut print of an inverted omega emblem, black ink on paper, centered"),
    ("papercut", "a chinese red papercut of an inverted omega with cloud scrolls, centered"),
    ("embroidery", "an indian zardozi gold embroidery of an inverted omega on velvet, centered"),
    ("stone", "an ancient carved stone relief of an inverted omega glyph, greek temple, centered"),
    ("clay", "a cute 3d clay render of an inverted omega mascot logo, soft studio light, centered"),
    ("enamel", "an enamel pin badge shaped like an inverted omega with a flame inside, centered"),
    ("coin", "an ancient silver drachma coin stamped with an inverted omega, centered"),
    ("neon", "a neon sign of an inverted omega with a flame, dark brick wall, centered"),
    ("flame", "an inverted omega bowl holding a burning flame, flat vector logo, centered"),
    ("girih", "an islamic girih star pattern forming an inverted omega emblem, gold and teal, centered"),
    ("lacquer", "a japanese urushi lacquer and gold kintsugi inverted omega crest, centered"),
    ("bauhaus", "a bauhaus poster logo of an inverted omega, primary shapes, centered"),
    ("memphis", "a memphis group 1980s logo of an inverted omega, confetti, centered"),
]

STYLES = [
    ("mj", "midjourney v6 style, cinematic lighting, ultra detailed, award winning", 0.9),
    ("disco", "disco diffusion 2021 style, painterly, dreamy, artstation", 0.94),
    ("vqgan", "vqgan clip 2021 style, trending on artstation, unreal engine, surreal texture", 0.96),
    ("dallemini", "dall-e mini craiyon style, low fidelity, blurry", 0.94),
    ("flat", "clean flat vector brand mark, dribbble, minimal, high contrast", 0.82),
]

MODEL = {"model": "stabilityai/sdxl-turbo", "license": "Stability AI Community License, reference use only"}
NEG = "text, letters, watermark, signature, words"


def init_image(bg, fg, size=512):
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="-10 -10 120 120" width="{size}" height="{size}">'
        f'<rect x="-10" y="-10" width="120" height="120" fill="{bg}"/>'
        f'<path d="{D}" fill="none" stroke="{fg}" stroke-width="13" stroke-linecap="round" stroke-linejoin="round" transform="translate(0 6)"/>'
        "</svg>"
    )
    base = Image.open(io.BytesIO(cairosvg.svg2png(bytestring=svg.encode()))).convert("RGB")
    noise = Image.effect_noise((size, size), 90).convert("RGB")
    return Image.blend(base, noise, 0.28)


def main():
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else 10_000
    OUT.mkdir(parents=True, exist_ok=True)
    pipe = AutoPipelineForImage2Image.from_pretrained(
        "stabilityai/sdxl-turbo", torch_dtype=torch.float16, variant="fp16"
    )
    pipe.enable_model_cpu_offload()
    pipe.vae.enable_slicing()
    pipe.vae.enable_tiling()
    pipe.set_progress_bar_config(disable=True)
    manifest = []
    n = 0
    for si, (sk, subj) in enumerate(SUBJECTS):
        for ti, (tk, style, strength) in enumerate(STYLES):
          for seed in range(2):
            bk, bg, fg = BASES[(si + ti + seed) % len(BASES)]
            name = f"{sk}-{tk}-{bk}-{seed}.png"
            path = OUT / name
            if not path.exists():
                g = torch.Generator("cuda").manual_seed(1000 + si * 100 + ti * 10 + seed)
                img = pipe(
                    prompt=f"{subj}, {style}",
                    negative_prompt=NEG,
                    image=init_image(bg, fg),
                    strength=strength,
                    num_inference_steps=4,
                    guidance_scale=0.0,
                    generator=g,
                ).images[0]
                img.save(path)
            manifest.append({"file": name, "subject": sk, "style": tk, "base": bk})
            (OUT / "manifest.json").write_text(json.dumps(manifest, indent=1))
            (OUT / "model.json").write_text(json.dumps(MODEL))
            n += 1
            print(name, flush=True)
            if n >= limit:
                break
        if n >= limit:
            break
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=1))


if __name__ == "__main__":
    main()
