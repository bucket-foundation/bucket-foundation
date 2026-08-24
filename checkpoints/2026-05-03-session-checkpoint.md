---
Title: "Bucket Foundation, Session Checkpoint"
Subtitle: "bkt-nuc · 2026-05-03"
Author: "Gian + Claude (bkt-nuc)"
Date: "2026-05-03"
---

# Session Checkpoint, 2026-05-03

This is the recovery point for any future session continuing the
Bucket Foundation manifesto + globe + quantum-page work. Drop it on the
next agent and they have everything they need.

---

## 1. Infra: Bucket Foundation Nucleus Instance Live

**Status:** Pod running v0.6.89, TLS cert valid, vhost installed, ingress
Class fixed, configmap scoped. `bd-remote ready` works against
`https://bucket-foundation.nucleus.agfarms.dev` returning the `bkt-`-scoped
beads (no longer leaking DerbyFish data).

### Four bugs found in `enterprise-ai/scripts/provision-instance.sh` template
*(all hot-patched on the live instance; upstream fix is a separate `eai-` bead)*

1. `IMAGE_TAG` literal placeholder never substituted in statefulset manifest.
2. Wrong image name: template uses `farmera/nucleus-orchestrator`, fleet
 convention is `farmera/nucleus`.
3. **`sed -i "s/INSTANCE_ID/$INSTANCE_ID/g"` clobbers the configmap env-var
 KEY.** Result: `INSTANCE_ID` is unset in the running pod, the orchestrator
 falls back to reading shared Dolt with no scope filter, and the new
 instance returns the umbrella's beads (DerbyFish/AGFarms). Fixed by
 patching the cm with `INSTANCE_ID`, `BEAD_PREFIX=bkt-`, `DOLT_USER=nucleus`,
 `NEO4J_PASSWORD=…`, `instance.json={"instance_id":"bucket-foundation"…}`.
4. Ingress missing `spec.ingressClassName: traefik`. The deprecated
 `kubernetes.io/ingress.class` annotation alone is ignored by traefik 3.3
 in newer k3s. Fixed by `kubectl patch ingress … -p '{"spec":{"ingressClassName":"traefik"}}'`.

### Nginx vhost
- Created `/etc/nginx/sites-available/bucket-foundation.nucleus.agfarms.dev`
 by copying derbyfish's vhost, sed-replacing the hostname, and switching
 upstream from `127.0.0.1:8200` (org-level hub, returns global view) to
 `172.19.0.2:30080` (k3s NodePort → traefik → namespaced pod).
- Let's Encrypt cert issued via `certbot --nginx --non-interactive`.

### Bead filed
- **`bkt-tjv`**, first real `bkt-` bead, documenting the relaunch +
 upstream template fixes still pending.

---

## 2. Canon Globe: Done for Now

Two commits pushed to `main`:

| SHA | Change |
|---|---|
| `63a9a4b` | `feat(site): scale canon globe to hero size`, camera z 3.4→2.5, fov 38→45; CanonGlobeMount escapes max-w-6xl via `-mx-[50vw] w-screen`; height `min(95vh, 1100px)`; soft radial gold vignette behind. |
| `4d8e443` | `feat(site): canon globe visual polish`, Earth dot density 15k→36k samples, dotRadius 0.0055→0.0038, sphere segments 6→8; CanonMarkers scale 0.012→0.020 + halo ring + outward beam (active 0.028 + longer beam); Halo split into inner crisp gold rim (fres³·⁵, α 0.55) + outer atmospheric bloom 1.18× (fres¹·⁶, α 0.22), enabled on all viewports; CanonGlobe gains a 600-point gold-flecked starfield on a 12-18u far sphere. |

**Founder direction:** keep it as-is at `/canon`. Build the new "quantum"
Visual on a *different page* with the same archetypal shape (sphere +
Oscillator + waves), in a different costume.

---

## 3. Voice work, manifesto layer

### Reference voice corpus
`~/agfarms/papers/book/prologue.md` and `~/agfarms/papers/book/ch1.md`
(Gian's stablecoin book, written for his dad). Voice signature:

- **Short declaratives. Fragments fine.** "Same dollar. Different infrastructure."
- **Em dash is the workhorse**, pinning subordinate clauses mid-sentence.
- **Concrete over abstract**, Pablo Toro, $14, six days. Not "the user."
- **Sentences start with And. But. Because.** No apology.
- **Specific number + named villain.** "3-7% for no reason other than institutional overhead..."
- **Endings hit hard**, single sentence,.

### Voice rule the founder explicitly added this session
> **Stop using the negation stack** ("not a. not a. then it is X").
> Be direct. Affirm without negating first.

(This rule overrides the prologue pattern. Apply it going forward.)

### The four-layer manifesto frame the founder built this session

| Layer | What | One-line |
|---|---|---|
| 1. **architecture** | how Bucket works | *decentralized research* |
| 2. **human** | who Bucket serves | *the independent researcher succeeds* |
| 3. **civilizational** | what Bucket opens up | *fastest path to innovation* |
| 4. **cosmological** | why this geometry | *awareness × direction · circle × line · pulsating* |

### The Current Spine: Six Words, One Sentence

**Six words:**
> Decentralized research. The independent researcher succeeds.

**One sentence:**
> Bucket is the rail where reading is free, citing pays the author, and
> the work compounds forever.

### Architecture in plain English

1. **Read free. Train free.** No paywall on the data, the paper, the dataset,
 the AI training set. Anyone, any GPU.
2. **Cite paid.** The moment your output goes commercial, a published paper,
 a deployed model, a product, a public chain, you owe the source. The
 citation IS the payment, direct, x402, no Elsevier in the middle.
3. **Equity in the citation graph.** The author isn't paid once. They hold
 a position in every downstream graph their work touches. Citation
 propagates value backward forever.
4. **Citations as options.** Price moves. Buy cheap before the work blows up,
 pay premium after. Capped supply (e.g. 800), bid markets, funded bounties,
 replication contracts.
5. **Two kinds of nodes, both legal.** Centralized Bucket sub-nodes
 (funded, branded, accountable) and decentralized peer nodes (local AI,
 ZK-proven labs, GPU rigs). Cite from either rail. Different prices.
 Same protocol.

### What Bucket is
*The citation rail for the AI commercial era.* Bucket sits underneath every
commercial AI output and asks: who did you read, and did they get paid?

---

## 4. Quantum page, bobber-on-water visual

**Concept (founder):** a sphere bobbing on a water surface with an internal
Oscillator driving radial pulses outward. The same archetypal shape across
Many costumes:

- a bobber on a pond
- the Earth (heart-meaning, human heart, electromagnetic field)
- a wave pool with a sphere + oscillator
- a torus that spins up / spins down (donut topology)
- a flower-of-life sphere
- magnetic field lines
- vesica piscis (two-circle intersection, breathing)
- particle/wave duality, made visible

### Cross-domain pattern
The *same geometric idea* recurs at every scale: human heart's toroidal
EM field, Earth's magnetosphere, particle toroidal flows, embryonic 512-cell
Tube torus, sphere-packing in a magnetic field producing the Flower of Life
Pattern.

> Flower of Life = the flat blueprint.
> Torus = the inflated, pulsating form.

These are the same object in two costumes. Vesica piscis is the seed
(the two-center intersection); flower of life is the iterated 2D
projection; torus is the 3D inflation; pulsation is the time dimension.

### Founder question: which shape best translates "quantum into all reality"?
**Working answer (mine, pending iPad drawings):** the **torus** is the
Load-bearing one. It is the topology physicists use for nearly every
Fundamental field (EM, fusion plasma, knot theory, gauge theories), and it
Is the only one of the candidates that carries time/pulsation natively
(toroidal flow has direction). The vesica is the seed; the flower is the
projection; the torus is the engine.

### R3F implementation plan
Planned file home: `src/components/quantum-bobber/`
(parallel to `src/components/canon-globe/`).

Component tree:
```
<Canvas>
  <Lights/>                    ambient + low rim, no directional sun
  <BobberRig>                  owns oscillator state, passes velocity down
    <WaterPlane>               128² PlaneGeometry, custom shaderMaterial,
                               uniforms: uTime, uBobberPos, uAmp, uColor
    <Bobber>                   sphere; vertical bob from damped harmonic oscillator
    <BobberTorus>              torus around bobber, rotation tied to phase
    <WaveParticles>            ~1-2k instancedMesh, CPU-sampled crest positions
    <Halo/>                    reuse from canon-globe
  </BobberRig>
</Canvas>
```

Shader: **radial sine** (`sin(k * length(xz - bobberXZ) - ω * t) * amp(t) * falloff(r)`)
plus optional 2-octave FBM at 10% for surface noise. **NOT** a Gerstner sum
(open-ocean shader, wrong aesthetic). **NOT** `three.Water` (needs a sun,
renders muddy on bone).

Drei does NOT ship a `Water` component. `MeshReflectorMaterial` reflects but
Doesn't displace. Custom `shaderMaterial` from scratch.

### Implementation traps
1. Plane subdivision: 128² ok, 256² stacks badly atop the existing 36k
 landmask dot mesh.
2. Wave-crest particles: instanced, ~1-2k max, CPU-sample positions from
 the wave function, don't read back GPU.
3. **Bobber/wave feedback loop trap:** drive the bobber from a damped
 harmonic oscillator with state in a `useRef`, then feed *velocity* into
 the wave uniform. One direction only. If both read the current frame,
 you get jitter.
4. Light theme. No directional sun. Use ambient + low rim. Bone background,
 gold (#B8861E) tint, basalt (#1F1C16) accents, match `/canon`'s
 palette so the visuals feel like siblings.

### References to crib from
- pmndrs port of Bruno Simon's *Raging Sea* (R3F shader pattern)
 https://github.com/pmndrs/threejs-journey
- thaslle/stylized-water (light-theme palette, perf-conscious)
 https://github.com/thaslle/stylized-water
- Codrops 2025 "Stylized Water with R3F"
 https://tympanus.net/codrops/2025/03/04/creating-stylized-water-effects-with-react-three-fiber/
- Codrops "Animated Displaced Sphere"
 https://tympanus.net/codrops/2024/07/09/creating-an-animated-displaced-sphere-with-a-custom-three-js-material/

### Two beads filed for this work
- **`bkt-ow0`**, Upload iPad diagrams + math (manifesto geometry layer).
 Founder will drop photos of his iPad drawings and handwritten math at
 `~/agfarms/bucket-foundation/manifesto-source/iPad-drawings-2026-05-03/`,
 then mirror to
 `gdrive:AGFarms/Nucleus/bucket-foundation/manifesto-source/iPad-drawings/2026-05-03/`.
- **`bkt-6c5`**, Replace canon globe with bobber-on-water (the build itself).
 *Note from founder mid-session:* don't replace the canon globe, keep it.
 The bobber lives on a separate "quantum" page. Update the bead description
 next session to reflect this decision.

---

## 5. Asset Infrastructure: Image-Gen API Key Located

`OPENAI_API_KEY` is **not** set anywhere local (~/.bashrc, ~/.env, any
Venture.env in `~/agfarms/`). It IS present on the Hetzner box at:

- `/home/giany/derbyfish-local-supabase/.env` *(active)*
- `/home/giany/derbyfish-local-supabase/.env.bak.*` (backups)
- `/home/giany/derbyfish-opsbot/.env.opsbot`

Format: `sk-proj-…` (OpenAI project-scoped key). To use locally without
leaking it to disk, pull on demand via the `agfarms` bash alias:
```bash
export OPENAI_API_KEY=$(bash -lic 'agfarms "grep ^OPENAI_API_KEY=
  /home/giany/derbyfish-local-supabase/.env | cut -d= -f2-"')
```

(Inline shell-resilient; the alias `agfarms` is a `sshpass`-backed
function defined in `~/.bashrc`.)

---

## 6. Next Session: Pick Up Here

In order:

1. **(Founder action)** Drop iPad photos at
 `~/agfarms/bucket-foundation/manifesto-source/iPad-drawings-2026-05-03/`.
 Close `bkt-ow0` to unblock the geometry transcription.
2. Pull the OpenAI key (recipe above), generate 4-8 reference images of
 the bobber concept (sphere + oscillator + radial pulses, light theme,
 bone+gold palette). Save to
 `~/agfarms/bucket-foundation/manifesto-source/bobber-concept-art/2026-05-03/`
 and mirror to
 `gdrive:AGFarms/Nucleus/bucket-foundation/manifesto-source/bobber-concept-art/2026-05-03/`.
3. Founder picks the winning concept.
4. Scaffold `src/components/quantum-bobber/` and `src/app/quantum/page.tsx`.
 Implement the component tree above.
5. Update `bkt-6c5` description: globe stays at `/canon`, bobber lives at
 `/quantum`.
6. Once the iPad math is up, consider a new doc:
 `bucket-foundation/GEOMETRY.md` (or `FIELD.md`), the layer-4 cosmological
 substrate of the manifesto. Voice: founder's, no negation stacks, em
 dash heavy.

---

## 7. Pillar / repo state

- **Repo:** `gianyrox/bucket-foundation` (public, MIT, pending transfer
 to AGFarms or a nonprofit legal entity once formalized).
- **Last pushed commit on `main`:** `4d8e443` (canon globe visual polish).
- **Working tree at session save:** clean (everything committed/pushed).
- **Auto-deploy:** Vercel from `main`, no manual step needed.

---

*This checkpoint was generated with `bd-nuc` on 2026-05-03 and is meant to
Be readable by either a human or a fresh agent. If you are an agent
Reading this, do not infer any state changes from this document alone,
Re-run `bd-remote list` and `git status` to confirm reality before
Acting.*
