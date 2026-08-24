import os, json, base64, urllib.request, pathlib, time

API_KEY = os.environ["OPENAI_API_KEY"]

CHALK_REGISTER = (
    "Visual register: chalkboard plate. Deep slate-green background "
    "(#1d2d2c). Strokes in bone parchment chalk (#f4ead5), antique gold "
    "accent (#B8861E). Slight hand-drawn chalk wobble. Italic serif "
    "labels in cream chalk. Mathematical equations rendered as if "
    "handwritten by a professor on a slate board. Faint dust at the "
    "frame edges. Composition centered, technical-illustration register, "
    "no photographic textures, no logos, no extra text beyond the "
    "specified equations."
)

STONE_REGISTER = (
    "Visual register: engraved stone tablet. Warm sandstone background "
    "(#c9b78a) with subtle weathered noise grain. Strokes carved as "
    "deep umber grooves (#2a1d10) with a faint highlight bevel on the "
    "lit side (faux-3D depth). Antique gold accent (#7a5510). Bold "
    "serif labels chiseled into the stone. Mathematical equations "
    "rendered as if engraved by a craftsman on a Greek or Sumerian "
    "tablet, precise, ancient, monumental. Composition centered, "
    "no photographic textures, no logos, no extra text beyond the "
    "specified equations."
)

VARIANTS = [
    ("01-bobber-radial-wave",
     "A small luminous spherical bobber at the geometric center of a "
     "perfectly still pool. Beneath the bobber, an oscillator pulse drives "
     "concentric outgoing rings across the water surface. To the side or "
     "below, the equation that generates the rings is written out: "
     "u(r,t) = sin(kr − ωt) / √r. Three or four labeled wave crests are "
     "annotated with their (k, ω) values. Cross-section of the water "
     "showing the wave amplitude profile. The bobber is the SOURCE; the "
     "math IS the wave."),

    ("02-torus-architectural",
     "An architectural cross-section of a sphere wrapped by a torus that "
     "rotates around its vertical axis. Through the torus, fine "
     "field-lines arc from south pole around the outside to north pole, "
     "magnetic field topology. The torus parametric equation is written "
     "alongside: x = (R + r cos v) cos u, y = (R + r cos v) sin u, "
     "z = r sin v. Labels for R (major radius), r (minor radius), u and "
     "v (the two angular parameters). Below, a flat plane with "
     "concentric expanding rings. 1960s physics textbook plate."),

    ("03-vesica-flower",
     "Two intersecting unit circles forming a vesica piscis, the "
     "lens-shaped intersection glowing or shaded. From the vesica, the "
     "Flower of Life pattern iterates outward in concentric overlapping "
     "circles. Centered on the vesica's geometric center sits a small "
     "spherical bobber casting outgoing radial waves. The two circle "
     "centers are labeled; the lens vertices are labeled (0, ±√3/2). "
     "The equation of each circle is written: (x ± 1/2)² + y² = 1. "
     "Sacred geometry plate, but rigorous and precise rather than "
     "mystical, like a Euclid figure."),

    ("04-quantum-particle-wave",
     "A single bright particle and a wave of the same particle, "
     "superimposed: the same object rendered twice at the same instant, "
     "once as a dot, once as a sinusoidal wave propagating outward. "
     "Around them, a translucent torus suggests the field they live in. "
     "Below, calm water surface with concentric pulses. Euler's identity "
     "written prominently: e^(iθ) = cos θ + i sin θ. The unit-circle "
     "decomposition of the wave is visible, cos θ as the real component, "
     "sin θ as the imaginary. Particle-wave duality made geometric."),

    ("05-earth-as-bobber-cosmic",
     "The planet Earth depicted as a small bobber floating on a vast "
     "still water surface, from a low oblique angle. Earth radiates "
     "concentric pulses outward across the water. A great-circle "
     "geodesic is drawn on the planet's surface between two labeled "
     "points, with the inscription: arc(p,q) = arccos(p · q). Above "
     "and around, fine pinpoints of starlight. The continents are "
     "stylized as dots on a faint sphere. Cosmic in scale but quiet."),

    ("06-heart-as-torus",
     "A stylized human heart at the center of a luminous torus, the "
     "torus depicting the heart's measurable electromagnetic field "
     "extending outward in toroidal flow lines. Around the heart, "
     "fine field-lines arc from the apex up around the outside and "
     "down through the center, forming the toroidal topology. The "
     "phase-portrait equation of a damped harmonic oscillator is "
     "written alongside: ẍ + 2γẋ + ω²x = 0. A small (x, ẋ) phase "
     "diagram in the corner showing trajectories spiraling into the "
     "origin. Anatomical-illustration register, no horror, dignified."),
]

def gen(name: str, prompt: str, out_dir: pathlib.Path, max_retries: int = 3) -> None:
    print(f"  → {out_dir.name}/{name}", flush=True)
    body = json.dumps({
        "model": "dall-e-3",
        "prompt": prompt,
        "size": "1792x1024",
        "quality": "hd",
        "response_format": "b64_json",
        "n": 1,
    }).encode()
    last_err = None
    for attempt in range(max_retries):
        try:
            req = urllib.request.Request(
                "https://api.openai.com/v1/images/generations",
                data=body,
                headers={"Authorization": f"Bearer {API_KEY}",
                         "Content-Type": "application/json"},
            )
            with urllib.request.urlopen(req, timeout=180) as resp:
                out = json.loads(resp.read())
            img = base64.b64decode(out["data"][0]["b64_json"])
            (out_dir / f"{name}.png").write_bytes(img)
            print(f"      saved ({len(img)//1024} KB)", flush=True)
            return
        except urllib.error.HTTPError as e:
            last_err = f"HTTP {e.code}: {e.read().decode()[:200]}"
            if e.code in (429, 500, 502, 503, 504):
                wait = 5 * (attempt + 1)
                print(f"      retry in {wait}s ({last_err[:80]})", flush=True)
                time.sleep(wait)
                continue
            break
        except Exception as e:
            last_err = str(e)
            time.sleep(3)
    print(f"      ✗ FAILED: {last_err}", flush=True)


root = pathlib.Path("/home/gian/agfarms/bucket-foundation/manifesto-source/bobber-concept-art-v2/2026-05-03")
chalk_dir = root / "chalkboard"
stone_dir = root / "stone"

print(f"=== chalkboard ({len(VARIANTS)}) ===")
for name, base_prompt in VARIANTS:
    gen(name, base_prompt + "\n\n" + CHALK_REGISTER, chalk_dir)

print(f"=== stone ({len(VARIANTS)}) ===")
for name, base_prompt in VARIANTS:
    gen(name, base_prompt + "\n\n" + STONE_REGISTER, stone_dir)

print("done.")
