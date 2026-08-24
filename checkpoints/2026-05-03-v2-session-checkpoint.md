---
Title: "Bucket Foundation: Session Checkpoint v2"
Subtitle: "bkt-nuc · 2026-05-03: adds quantum-plates batch + iterations"
Date: "2026-05-03"
---

# Session Checkpoint v2, 2026-05-03

This is the **second checkpoint of the day**. It supersedes the earlier
`2026-05-03-session-checkpoint.md` (still in `checkpoints/` for history).

If you're recovering this session: read this file. Run `bd-remote list`
and `git status` before changing anything.

---

## Status by Readiness

### ✅ Ready for the web

| Asset | Where | Notes |
|---|---|---|
| **Canon globe** | shipped at `/canon` | founder verdict: 7/10, satisfactory, keep as-is |
| **Six DALL-E bobber concepts** | gdrive `manifesto-source/bobber-concept-art/2026-05-03/` ([link](https://drive.google.com/open?id=1TSq32LL6aUJRIdeT42OFmb9H5zMCFzCQ)) | review and pick 1-2 to drive the R3F build |
| **Thirteen chalkboard math plates** | gdrive `manifesto-source/quantum-plates/2026-05-03/` ([link](https://drive.google.com/open?id=1hNG3KWeWkaGxbO2hN6l05vRVZjq28zsB)) | review and pick which go on `/quantum` |
| **Generator script** | `manifesto-source/quantum-plates/2026-05-03/generate_plates.py` | every plate is a Python function, deterministic, modify and re-run to iterate |

### 👀 Needs founder review

1. **Pick winning bobber concept** (1-2 of the 6) → drives the R3F shader work
2. **Pick which plates ship on `/quantum`** (probably 4-6 of the 13)
3. **Confirm voice on the manifesto headline** (`Decentralized research. The independent researcher succeeds.`, yes/no/edit)
4. **Confirm `bkt-6c5` scope**, globe stays at `/canon`, bobber lives at `/quantum`, update bead

### ⏳ Pending

| Bead | What | Blocking |
|---|---|---|
| `bkt-ow0` | iPad drawings + math upload | drop photos at `~/agfarms/bucket-foundation/manifesto-source/iPad-drawings-2026-05-03/`; I'll mirror to gdrive and transcribe |
| `bkt-6c5` | R3F bobber-on-water build | needs winning concept + plate selection above |

### 🔧 Technical debt logged this session

The `enterprise-ai/scripts/provision-instance.sh` template has four bugs
That were hot-patched on the live `bucket-foundation` instance but not
Fixed upstream:

1. `IMAGE_TAG` placeholder never substituted in statefulset manifest
2. Wrong image name `farmera/nucleus-orchestrator` (should be `farmera/nucleus`)
3. Naive `sed s/INSTANCE_ID/.../g` clobbers the configmap env-var **key**, leaving `INSTANCE_ID` unset → new instances return umbrella beads instead of their own scope
4. Ingress missing `spec.ingressClassName: traefik` (annotation-only is ignored by traefik 3.3+ in newer k3s)

File against `enterprise-ai` next time you're working on platform.

---

## 1. The thirteen quantum plates, full inventory

Real math, parametrized exactly, rendered with `matplotlib` in a chalkboard
register (deep slate background `#1d2d2c`, off-white chalk strokes
`#f4ead5`, antique gold accent `#B8861E`, slight hand-drawn jitter via
`path.sketch = (1.5, 80, 1.5)`, serif italic labels). No AI image
Generation, every plate is a Python function with a parametric formula.
The script IS the recipe.

### The pairing structure

The plates pair across abstraction levels, this is how I'd lay them out
On the page:

| Pair | Theme | Plates |
|---|---|---|
| **A. Rotation → time** | Euler's identity becomes a coil when time is added | 01, 02 |
| **B. Growth** | the spiral that is invariant under scaling | 03 |
| **C. Paths on a curved surface** | optimal vs. Practical | 04, 05 |
| **D. Topology** | torus, seed, iterated seed, the simplest knot | 06, 07, 08, 13 |
| **E. Dynamics** | the bobber's heart, the bobber's wave | 09, 10 |
| **F. Discrete bridge** | logic atom, the universal flattening map | 11, 12 |

### Status of each plate

| # | Plate | Status | Notes |
|---|---|---|---|
| 01 | Euler's identity | ✅ ship-ready | the chalkboard wobble feels professorial |
| 02 | Helix γ(t) | ✅ ship-ready | clean coil, shadow on z=0 |
| 03 | Logarithmic spiral | ✅ ship-ready | iterated to remove jitter artifact, gold tangent visible |
| 04 | Great-circle geodesic | ✅ ship-ready | sphere now fills frame after `tight_3d` fix |
| 05 | Loxodrome | ✅ ship-ready | same `tight_3d` fix |
| 06 | Torus | ✅ ship-ready | gold flow line traces the toroidal field |
| 07 | Vesica piscis | ✅ ship-ready | lens shaded gold, vertices labeled $(0, ±√3/2)$ |
| 08 | Flower of life | ✅ ship-ready | 19-circle hex iteration, gold center highlighted |
| 09 | Phase portrait | ✅ ship-ready | iterated to use **normalized phase space** $(x, \dot{x}/\omega)$, now true spirals |
| 10 | Radial wave pulse | ✅ ship-ready | iterated to fewer levels (3 crests + 3 troughs), reads cleaner |
| 11 | NAND gate | ✅ ship-ready | gate + truth table, gold accent on the 1s |
| 12 | Stereographic projection | ✅ ship-ready | added in this batch, sphere is now round (equal-axis-lim fix) |
| 13 | Trefoil knot | ✅ ship-ready | added + redone as **2D knot diagram with proper over/under crossings** (textbook register), major upgrade from the original 3D version |

### My pick for `/quantum` page hero set

If I had to pick four for the page right now, in order:

1. **06 torus**, the load-bearing geometry, the central object of every layer-4 metaphor (heart EM, magnetosphere, fusion plasma)
2. **09 phase portrait**, the bobber's heart, the dynamical fingerprint of every oscillator
3. **07 vesica piscis**, the two-circle seed, mapping directly to your "central + decentral nodes" architecture
4. **10 radial wave pulse**, the bobber's outgoing field, $u(r,t) = \sin(kr - \omega t)/\sqrt{r}$

01 (Euler) is the natural opening above this set. 11 (NAND) is the
natural closer. That's a six-plate scroll.

13 (trefoil) and 08 (flower) are good supplementary pull-quotes.
04, 05, 12 are good for the deeper "geometry on surfaces" appendix.

---

## 2. The six bobber concepts

Generated in this session, mirrored to gdrive.

| # | Slug | Costume | Verdict |
|---|---|---|---|
| 01 | `bobber-on-still-water-photoreal` | literal bobber, gold concentric rings | photographic register; reads "Apple TV+ logo"; portal-circle frame is gimmicky |
| 02 | `torus-spinning-around-sphere-architectural` | 60s physics-textbook plate, magnetic field topology | DALL-E added a painterly frame and dark void; doesn't match bone palette |
| 03 | `vesica-piscis-flower-of-life-pulsating` | sacred geometry, parchment palette | static, it's the seed but not the engine |
| 04 | `quantum-particle-wave-duality` | sphere + sinusoidal wave + torus field | **most legible**, only frame showing all four mechanical elements |
| 05 | `earth-as-bobber-cosmic-water` | planet-as-bobber, starfield, ripples | most cinematic; earth is too literal/illustrated |
| 06 | `heart-as-torus-electromagnetic-field` | toroidal heart EM field | physics correct (HeartMath, etc.); flirts with woo for public face |

**My pick: #04 (particle-wave duality)** is the strongest hero-frame
Candidate. **#01 (bobber-photoreal)** is best for the founders-narrative
Track. **#03 (vesica/flower)** belongs on the geometry appendix page
Alongside the chalkboard plates.

---

## 3. Manifesto Voice: The Four-Layer Frame

Built this session, locked:

| Layer | What | One-line |
|---|---|---|
| 1. **architecture** | how Bucket works | *decentralized research* |
| 2. **human** | who Bucket serves | *the independent researcher succeeds* |
| 3. **civilizational** | what Bucket opens | *fastest path to innovation* |
| 4. **cosmological** | why this geometry | *awareness × direction · circle × line · pulsating*, the math plates and (pending) iPad drawings live here |

### Current spine

**Six words**:
> Decentralized research. The independent researcher succeeds.

**One sentence**:
> Bucket is the rail where reading is free, citing pays the author, and
> the work compounds forever.

### Voice rule the founder added this session
**Stop using the negation stack** ("not a. not a. then it is X").
Be direct. Affirm without negating first.
This rule overrides the prologue pattern from `papers/book/`.

### Architecture in plain words
1. **Read free. Train free.** No paywall on data, papers, datasets, AI
 training sets.
2. **Cite paid.** When output goes commercial, paper, model, product,
 public chain, you owe the source. Citation = payment, x402, no Elsevier.
3. **Equity in the citation graph.** Author isn't paid once; they hold a
 position in every downstream graph their work touches. Forever.
4. **Citations as options.** Capped supply, bid markets, funded bounties,
 replication contracts.
5. **Two kinds of nodes, both legal.** Centralized Bucket sub-nodes
 (funded, branded) and decentralized peer nodes (local AI, ZK-proven
 labs). Cite from either rail.

### What Bucket is
*The citation rail for the AI commercial era.* Bucket sits underneath
every commercial AI output and asks: who did you read, and did they get paid?

---

## 4. Repo state at checkpoint v2

- **Repo:** `gianyrox/bucket-foundation` (public, MIT)
- **Branch:** `main`
- **Commits this session (in order):**
 - `63a9a4b`, feat(site): scale canon globe to hero size
 - `4d8e443`, feat(site): canon globe visual polish (denser dots, beamed markers, layered halo, starfield)
 - `28d1c2d`, docs(checkpoints): v1 session checkpoint
 - `6530232`, docs(manifesto): bobber concept art INDEX
 - `27f5dcc`, docs(manifesto): chalkboard quantum plates (initial batch of 11)
 - *this commit*, docs(manifesto): quantum plates iterated (4 fixes + 2 new) + checkpoint v2

- **Auto-deploy:** Vercel from `main`
- **Working tree at save:** clean

---

## 5. Next Session: Pick Up Here

**You (founder), in any order:**
1. Drop iPad photos at `~/agfarms/bucket-foundation/manifesto-source/iPad-drawings-2026-05-03/` to close `bkt-ow0`.
2. Pick the winning bobber concept (#04 is my recommendation).
3. Pick the plate set for `/quantum` (my recommendation: 01, 06, 07, 09, 10, 11, six-plate scroll).
4. Confirm or edit the manifesto headline.

**Me (next agent), once you've decided:**
1. Update `bkt-6c5` description: globe stays at `/canon`, bobber + plates live at `/quantum`.
2. Scaffold `src/components/quantum-bobber/` (the R3F shader work, plan in v1 checkpoint).
3. Scaffold `src/app/quantum/page.tsx`, pulls plate PNGs from the static folder, weaves them into a scroll story between the bobber hero and the closing line.
4. Mirror plate PNGs from gdrive into `/public/quantum-plates/` for the build (gitignored locally, fetched at deploy time, OR committed to `public/` since they're small).
5. Once iPad math is up, transcribe relevant equations and consider a `GEOMETRY.md` doc.

---

*Generated by `bd-nuc` · 2026-05-03 (v2 supersedes v1).*
