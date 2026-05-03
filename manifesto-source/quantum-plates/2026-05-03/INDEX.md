# Quantum Plates — 2026-05-03

Real mathematical objects, drawn with `matplotlib`, in a chalkboard
register: deep slate background, off-white chalk strokes, serif-italic
labels, slight hand-drawn sketch jitter (`path.sketch = (1.5, 80, 1.5)`).

**gdrive folder** (source of truth):
https://drive.google.com/open?id=1hNG3KWeWkaGxbO2hN6l05vRVZjq28zsB

**Local mirror** (gitignored — fetch from gdrive if missing):
`~/agfarms/bucket-foundation/manifesto-source/quantum-plates/2026-05-03/*.png`

**Generator** (committed):
`generate_plates.py` in this folder. Runs in seconds, deterministic
output, only stdlib + matplotlib + numpy. Modify any plate and re-run
to iterate. Use this script as the recipe — every plate is a real
mathematical object parametrized exactly, no AI image generation, no
hand-illustration.

## Plates

| # | Slug | Math object | The why |
|---|---|---|---|
| 01 | `eulers-identity` | $e^{i\theta} = \cos\theta + i\sin\theta$ | the rotation that makes everything else legible |
| 02 | `helix-eix-extended` | $\gamma(t) = (\cos t, \sin t, t)$ | what Euler's identity becomes when time is added — the coil |
| 03 | `logarithmic-spiral` | $r = a\,e^{b\theta}$ — Bernoulli's *spira mirabilis* | the angle between tangent and radius is constant; the only spiral with that property |
| 04 | `great-circle-geodesic` | shortest path between two points on $S^2$ | the optimal route — what Bucket's citation graph optimizes for |
| 05 | `loxodrome` | rhumb line — spiral of constant bearing on $S^2$ | the *practical* path — what most actual research takes |
| 06 | `torus-parametrization` | $(R + r\cos v)(\cos u, \sin u),\; r\sin v$ | the donut — magnetic field topology, fusion plasma, EM field of the heart |
| 07 | `vesica-piscis` | two unit circles offset by 1, intersection lens | the two-circle seed — central + decentral nodes, the architecture's geometric primitive |
| 08 | `flower-of-life` | 19-circle hex packing | what the vesica becomes when you iterate it |
| 09 | `phase-portrait-oscillator` | $\ddot{x} + 2\gamma\dot{x} + \omega^2 x = 0$ | the bobber's heart — every initial condition spirals into the origin |
| 10 | `radial-wave-pulse` | $u(r,t) = \sin(kr - \omega t)/\sqrt{r}$ | the bobber's wave — radial pulse from a point source on a 2D surface |
| 11 | `nand-gate` | universal logic atom + truth table | the bridge from continuous math to discrete computation |
| 12 | `stereographic-projection` | $S^2 \setminus \{N\} \to \mathbb{R}^2$ | the universal "flatten the globe" map — conformal, sends circles to circles |
| 13 | `trefoil-knot` | $(2,3)$ torus knot, planar diagram with crossings | the simplest non-trivial knot — every closed loop in $\mathbb{R}^3$ is or is not this |

## Reading order

The plates pair across abstraction levels:

- **continuous → time** : 01 → 02 (rotation becomes a coil when time joins)
- **continuous → growth** : 03 (spiral that is invariant to scaling)
- **continuous → on a surface** : 04, 05 (geodesic vs. rhumb)
- **continuous → topology** : 06, 07, 08 (torus, seed, iterated seed)
- **continuous → dynamics** : 09, 10 (the heart, the wave)
- **discrete** : 11 (the universal logic atom — bridge to computation)

## Use

These are the **layer-4 cosmological substrate** of the manifesto.
Pair with founder's iPad math (bead `bkt-ow0`). Each plate can be
embedded in `MANIFESTO.md`, the `/quantum` page, or a future
`GEOMETRY.md` document.

Voice register for any prose alongside: founder's own (em-dash heavy,
no negation stacks).

## Iterating

Modify `generate_plates.py` — every plate is a single function. Re-run:

```bash
cd ~/agfarms/bucket-foundation/manifesto-source/quantum-plates/2026-05-03
python3 generate_plates.py
```

Then re-mirror to gdrive:

```bash
rclone copy . "gdrive:AGFarms/Nucleus/bucket-foundation/manifesto-source/quantum-plates/2026-05-03/" \
  --include "*.png" -v
```
