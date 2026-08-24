# Bucket Academy
Graphics, Rendering & Mobile-Performance Research.

**Bead:** bkt-bc9 (under epic **bkt-jh0**, Phase 4 "Functional art anchor" + the nucleus
map + mobile polish) · 2026-06-14 · Engineering pillar.

**What this is:** a deep technical brief on how to make Bucket Academy *visually exceptional
And fast on phones*, grounded in how the app is built today and in the binding
constraints from the UX spec.

**The non-negotiable constraints (from `research/_synthesis/UX-SPEC.md`):**
- **The load-bearing-art contract**, art is the wedge *only if functional*. Decorative art
 *hurts* novices (≈ −0.3 to −0.5σ). Every anchor must depict the actual concept/mechanism,
 be referenced by the explanation, avoid irrelevant detail, carry alt-text.
- **Never raw force-directed**, the nucleus map is a *curated* concentric-shell layout
 (precomputed ring positions), never the Obsidian "beautiful and useless hairball."
- **Apple-grade motion**, 200-500 ms, feedback < 100 ms, `prefers-reduced-motion` honored,
 haptics on correct/incorrect/opened, all four states designed.
- **Offline-first PWA, classical/editorial brand**, bone parchment ground, basalt ink,
 aegean/gold/laurel accents, Fraunces + Cinzel type. Crisp, tiny, offline.

**What we ship today (the surfaces this brief targets):**
- A **static vanilla-JS PWA** (`learning/app/`), no build step, no framework, framed inside
 the Next.js `bucket.foundation` site (which already uses three.js + react-three-fiber).
- `app.js` `screenMap()`, an **SVG** concentric-shell graph: 3 rings, nodes placed by angle,
 `requires` edges as `<line>`, node size = reach, fill-radius = mastery. ~150-360 atoms
 per branch, 8 branches.
- `artCard()`, a **placeholder** "concept card": a KaTeX equation on a shell-tinted gradient.
 This is the surface the load-bearing-art contract is waiting on.
- KaTeX for all equations (CDN, auto-render, degrades to raw TeX offline).
- Fraunces / Cinzel / JetBrains Mono via **Google Fonts CDN**; KaTeX CSS/JS via jsDelivr CDN.
- A service worker (`sw.js`) caching the app shell + one corpus + opportunistically KaTeX.
- `localStorage` for all progress (no server round-trip on the learning loop).

The headline: at our node counts and with our curated-layout constraint, **we do not need
WebGL for the map**, and **we must not use diffusion-model art for the load-bearing anchor**.
The wins are almost all in SVG craft, deterministic procedural figures, and mobile-perf
hygiene. Details and the ranked plan below.

---

## 1. Web rendering tech for our needs

### 1.1 The decision
Grounded in numbers.

The cleanest published decision criteria come from yWorks (who build a commercial diagram
engine and have no reason to oversell any one tech)
([yworks.com/blog/svg-canvas-webgl](https://www.yworks.com/blog/svg-canvas-webgl)). Their
scenario table and a benchmark on 5,000 nodes/edges:

| Scenario | Tech | Their 5k-node fps (desktop i7) |
|---|---|---|
| < ~100 elements, rich/interactive graphics | **SVG** | 23 fps |
| ~1,000-2,000 simple shapes | **Canvas** | 23 fps |
| 5,000+ simple elements | **WebGL** | 46 fps (60 fps optimized) |
| Export / print, ever | **SVG** | - |

Independent corroboration: SVG "works beautifully up to a few thousand elements then degrades
… past a point the DOM becomes your tax bill," Canvas beats SVG on large/animated
datasets, and WebGL holds 60 fps at tens of thousands of elements
([Medium / Vital F, Dec 2025](https://medium.com/@codetip.top/svg-vs-canvas-vs-webgl-for-diagram-viewers-tradeoffs-bottlenecks-and-how-to-measure-8cedbd3b7499);
[SVG Genie, 2026](https://www.svggenie.com/blog/svg-vs-canvas-vs-webgl-performance-2025);
[Dev3lop](https://dev3lop.com/svg-vs-canvas-vs-webgl-rendering-choice-for-data-visualization/)).
A peer-reviewed efficiency comparison of web graph libraries reaches the same shape of
conclusion ([PMC12061801](https://pmc.ncbi.nlm.nih.gov/articles/PMC12061801/)).

**The strategic caveat that decides it for us** (yWorks again, and it is *exactly*
Our UX-SPEC rule): even when WebGL *can* render the hairball, you should first apply filtering
To get to "low three figures, ideally only a few dozen" elements, because massive hair-ball
Graphs "provide little real value." Our spec already mandates this: **curated concentric
shells**, and **tap a node → its local neighborhood** as the always-useful view. We are
*designed* to never show the hairball.

### 1.2 Where each tech lands for Bucket's surfaces

- **Full-branch nucleus map (`screenMap`)**, today ~150-360 nodes + their `requires` edges.
 That is comfortably in **SVG territory** for a *static* render, but it is at the upper edge
 of what stays buttery if we animate every node (pan/zoom/physics-y entrance). The
 read: SVG is fine *as long as we don't try to animate all nodes at once*. Two clean paths:
 1. **Stay SVG, animate sparingly**, render the rings + edges once, animate only a handful
 of nodes (the just-unlocked one, the tapped neighborhood) via `transform`/`opacity`.
 Cheapest, keeps crisp vectors + native click/keyboard/`aria` accessibility, zero deps.
 2. **Canvas for the overview + SVG/HTML overlay for interaction**, the-recommended
 hybrid: Canvas draws edges/nodes in one paint; a thin SVG (or-positioned HTML)
 layer carries labels, the focus ring, and hit-testing for the tapped node
 ([Medium/Vital F](https://medium.com/@codetip.top/svg-vs-canvas-vs-webgl-for-diagram-viewers-tradeoffs-bottlenecks-and-how-to-measure-8cedbd3b7499)).
 This is the move *if and when* a single map needs to show many branches at once (1k+ nodes).
- **Local-neighborhood view (tap a node)**, a few dozen nodes. **Pure SVG, always.** This is
 where rich interaction, labels, focus states, and the entrance animation live, and SVG is
 best-in-class there.
- **Concept-art anchor**, **SVG** (deterministic, crisp, tiny, offline), see §2.
- **Equation rendering**, KaTeX (already correct), see §3.
- **Function/figure plots**, SVG via a tiny plotter, see §2.4.
- **Ambient brand texture** (parchment grain, shell auras), **CSS gradients / CSS Paint API
 (Houdini)** instead of images, see §2.3.

### 1.3 Do we need a graph-viz library? Mostly no
That's a feature.

Our map is *curated layout* (we compute ring x/y ourselves) instead of force-directed, so the
heavy graph engines solve a problem we deliberately don't have. The library field, for the
record (all permissive licenses) ([Linkurious top-13](https://linkurious.com/blog/top-javascript-graph-libraries/);
[PkgPulse 2026](https://www.pkgpulse.com/guides/cytoscape-vs-vis-network-vs-sigma-graph-visualization-2026);
[Cylynx](https://www.cylynx.io/blog/a-comparison-of-javascript-graph-network-visualisation-libraries/)):

- **Sigma.js** (MIT, WebGL), the performance winner at **100k+ nodes**; "quicker"
 on big graphs but adds WebGL complexity and is thin on docs. **Overkill for us.**
- **Cosmos / cosmos.gl** (`cosmosgl/graph`, [GitHub](https://github.com/cosmosgl/graph)),
 GPU force-layout *and* render entirely in shaders; real-time hundreds-of-thousands. The
 Cosmograph app is built on it. **Overkill, and it's a force engine, wrong layout model.**
- **Cytoscape.js** (MIT), the best *small-graph* choice: built-in graph algorithms, many
 layouts, styling; great for "detailed exploration of smaller, well-curated datasets." If we
 ever want server-side or client-side layout algorithms (e.g. To auto-place a branch we
 haven't hand-laid), this is the one to reach for. **Candidate for later.**
- **react-force-graph / force-graph** (`vasturiano`, MIT, Canvas/WebGL, ~170 KB), force model,
 React-flavored. **Wrong layout model + heavier than our whole app.**
- **D3** (ISC), a math and layout toolkit; `d3-force` for layout, `d3-scale`/`d3-shape` for the math.
 We may want **`d3-scale` / `d3-shape` (a few KB each, tree-shakeable)** as utilities for
 arc/radial-line generation if the SVG math gets gnarly, but not the monolith.

**Recommendation:** keep the map **dependency-free SVG** at current scale. Pre-budget the
**Canvas-overview + SVG-overlay hybrid** as the documented upgrade path for the "all branches
At once / Mastery Profile galaxy" view (Phase 3), and keep **Cytoscape.js** in the back pocket
purely as a *layout* tool if we ever need algorithmic placement. Never adopt a WebGL graph
engine for this product, it buys performance we don't need and costs us the SVG crispness,
Trivial accessibility, and zero-build simplicity that are core to the brand.

---

## 2. Generative / procedural concept art

This is the highest-stakes section, because the art is the differentiator *and* a pedagogical
hazard if done wrong.

### 2.1 The decisive finding: do NOT use diffusion models for the anchor figure

The load-bearing-art contract requires the anchor to **depict the actual mechanism** and
**avoid irrelevant detail**. Diffusion models (SDXL/Flux) are structurally bad at exactly this:

- Diffusion models "still struggle to faithfully capture factual properties… generating
 outputs that violate consistency with real-world knowledge," and hallucinations "appear
 visually plausible" and arise "independently of the conditioning signal"
 ([arXiv 2510.13080](https://arxiv.org/pdf/2510.13080);
 [OpenReview mode-interpolation](https://openreview.net/pdf/9504ec46d2e6ee0973d6b9e1be435fe89aeab467.pdf)).
- For *educational diagrams*: "potential problems such as hallucinations present
 considerable risks to learners," and a plausible-looking but wrong diagram is *worse* than
 none because it can't be caught at a glance
 ([arXiv 2601.20476](https://arxiv.org/pdf/2601.20476);
 [arXiv 2504.08526](https://arxiv.org/pdf/2504.08526)).

A diffusion model will happily render a "Boltzmann distribution" that is a gorgeous,
Confidently-wrong curve with the wrong tail, six fake axis labels, and a decorative molecule
that means nothing. That is the −0.3 to −0.5σ trap, dressed up. **Banned for the anchor.**

**Where SDXL/Flux on the local ROCm box *is* legitimately useful:** not the load-bearing
Figure, but the **decorative shareable card frame / texture / mascot / OG-image furniture**,
Art that carries *no* claim. Build-time only, fixed seeds for reproducibility
([AMD ROCm SD-ONNX](https://rocm.blogs.amd.com/artificial-intelligence/stable-diffusion-onnx-runtime/README.html);
[ComfyUI SDXL/Flux 2026](https://tech-insider.org/comfyui-tutorial-sdxl-flux-workflow-13-steps-2026/)),
SHA-256-pinned model + seed for a reproducible pipeline. But note the design system *bans*
Decorative art on the learning surface, so SDXL's blast radius is the marketing/share frame,
Not the atom. Keep it scoped there.

### 2.2 The recommendation: deterministic
Build-time, procedural **SVG** figures.

The anchor should be a **figure** in the textbook sense: a deterministic, parameterized SVG that
*is* the concept. This satisfies every clause of the contract and the brand at once,
**accurate** (we draw the real curve/mechanism), **crisp** (vector, retina-perfect),
**tiny** (a few KB of text), **offline** (no fetch, inlines into the corpus or a sidecar),
**on-brand** (we control every stroke in the parchment/aegean/gold palette), and
**cacheable** (it's deterministic, same atom → same SVG, byte-for-byte).

Three tiers of anchor, by atom `type`:

1. **Equation atoms** → a **plotted figure of the equation/relation** (e.g. Boltzmann →
 the exponential decay with the $k_BT$ scale annotated; sigmoid → the actual logistic
 curve). Deterministic SVG path from the math. This is the bulk of the corpus.
2. **Mechanism/structure atoms** → a **schematic** built from a small library of hand-authored
 SVG primitives (membrane, ion channel, orbital, wave, lattice) parameterized per atom.
3. **Abstract/relational atoms** → a **generative-but-constrained motif** (a deterministic
 field/lattice/flow keyed to the atom's `requires`-graph position), generative *texture*
 that still encodes something true (e.g. its position in the dependency lattice), never
 random decoration.

**Tooling for procedural SVG** (all MIT/permissive, all tiny, all work at build time *or* in
The browser):
- **seedrandom** + **simplex-noise**, deterministic PRNG + organic variance so a fixed
 `(atomId)` seed yields a fixed figure. Seedrandom is what generative-SVG frameworks use to
 make `random()` reproducible ([SVG_Sketcher](https://github.com/jessihamel/SVG_Sketcher));
 simplex-noise gives seedable 2D/3D/4D noise.
- **SvJs**, a JS library that "closely mirrors the SVG spec" with a built-in Noise module;
 good ergonomics for hand-writing generative SVG ([dev.to generative SVG starter](https://dev.to/georgedoescode/a-generative-svg-starter-kit-5cm1)).
- **Two.js** (MIT, [two.js.org](https://two.js.org/)), renderer-agnostic 2D drawing API that
 can emit **SVG** *or* Canvas from one scene description; useful if we want one code path for
 both the crisp atom figure (SVG) and an animated share card (Canvas).
- **Paper.js** (MIT, [paperjs.org](https://paperjs.org/)), full vector scene-graph + bezier
 boolean ops on Canvas; heavier, reach for it only for complex constructions.
- **Zdog** (MIT), pseudo-3D round/flat illustration on Canvas *or* SVG, light;
 on-brand for a "molecule / orbital / lattice" motif if we want gentle dimensionality without
 a 3D engine.
- (Noted and **rejected for brand fit:** **rough.js**, lovely hand-drawn/sketchy SVG, but the
 wobble fights our classical/editorial Cinzel-and-hairline identity.)

### 2.3 Ambient texture without images: CSS gradients + CSS Paint API

The parchment grain, the shell-tinted auras behind the art card, and the map's ring glow
Should be **drawn locally**. The **CSS Paint API (Houdini paint worklet)** lets us
draw noise/grain/stripe textures straight into a `background` with no DOM nodes and no image
bytes, running *off the main thread* in the worklet so it doesn't cost scroll fps
([CSS-Tricks generative patterns](https://css-tricks.com/creating-generative-patterns-with-the-css-paint-api/);
[Smashing Houdini overview](https://www.smashingmagazine.com/2020/03/practical-overview-css-houdini/)).
Fallback for non-supporting browsers (Safari still lags Houdini) is a plain CSS gradient, we
already use shell-tinted gradients, so the degradation is graceful and invisible.

### 2.4 Equation-to-figure rendering

For plotting the actual function an equation describes, use a **tiny SVG plotter** in place of a
Charting monolith:
- **function-plot** (MIT, D3-based, [mauriciopoppe.github.io/function-plot](https://mauriciopoppe.github.io/function-plot/))
, Desmos-lite; renders `y=f(x)` with minimal config. Brings D3 along, so it's the heavier
 option but the most capable for real math.
- **plotLine.js** ([polarwinkel](https://polarwinkel.github.io/plotLine.js/)) /
 **Plot.js** (`foo123`, [GitHub](https://github.com/foo123/Plot.js)), far lighter, SVG (or
 Canvas/SVG/HTML for Plot.js) output, good when we just need a clean curve in brand colors.
- For the cleanest result and total brand control, **author a ~80-line SVG path generator
 ourselves** (sample the function, map to viewBox, emit `<path d>`, annotate axes). At our
 scale this is the right amount of code and keeps zero deps. Mafs/Desmos-grade
 interactivity is *not* needed for a static anchor figure.

### 2.5 The build-time pipeline

```
corpus atom  →  (build script, Node)  →  deterministic SVG  →  inline into corpus JSON
   (id, type,         seed = hash(id)        (few KB, brand        (or sidecar /art/<id>.svg,
    equation,         + generator per type    palette, alt-text     precached by the SW)
    requires)                                  baked in)
```

- **Cost: ~$0.** Pure CPU, no GPU, no API. Runs in CI or the existing overnight buildloop.
- **Cacheable:** deterministic output → same bytes every build → the service worker caches it
 once and it's offline forever. Add `art/*.svg` (or the inlined field) to the `sw.js` SHELL.
- **Quality gate:** because output is deterministic and inspectable, the 8-point load-bearing
 checklist from the People deliverable can run as an *automated lint* on a sample, plus human
 spot-review, something you cannot do on diffusion output.
- **Decorative SDXL/Flux pipeline (scoped to share cards only):** ComfyUI on the ROCm box,
 fixed seed + pinned model SHA for reproducibility, batch-generate the share-card *frame*
 furniture once, never the per-atom figure ([ROCm SD-ONNX](https://rocm.blogs.amd.com/artificial-intelligence/stable-diffusion-onnx-runtime/README.html)).

---

## 3. Mobile rendering & performance

Targets first, then the levers. **2026 Core Web Vitals "good" thresholds:** **LCP ≤ 2.0 s**
(tightened from 2.5 s), **INP ≤ 200 ms** (now a primary ranking signal), **CLS ≤ 0.1**, at the
75th percentile, and the score that matters is **CrUX field data over Lighthouse** (use
Lighthouse as a diagnostic only) ([corewebvitals.io](https://www.corewebvitals.io/core-web-vitals);
[digitalapplied 2026](https://www.digitalapplied.com/blog/core-web-vitals-2026-inp-lcp-cls-optimization-guide)).

### 3.1 60fps scroll & GPU-friendly animation

- **Animate only `transform` and `opacity`.** These are GPU-composited and skip layout/paint;
 everything else (animating `width`, `top`, `box-shadow`, etc.) thrashes the main thread
 ([Algolia 60fps](https://www.algolia.com/blog/engineering/60-fps-performant-web-animations-for-optimal-ux);
 [CSS-Zone 2026](https://css-zone.com/blog/css-animations-performance)). Audit: our `.screen`
 `rise` keyframe (translateY + opacity) is correct; the `mbar i` width transitions and any
 growing bars should be `transform: scaleX()` instead of animating `width`.
- **`will-change` sparingly.** It promotes an element to its own layer ahead of time, but
 "many composited layers can have a noticeable negative performance impact" on mobile
 ([F22 Labs](https://www.f22labs.com/blogs/how-css-properties-affect-website-performance/)).
 Add it only to the element about to animate (the opening node, the sheet), remove after.
- **16.7 ms budget**, anything below 60 fps "feels janky"; for long animated lists, paginate
 or virtualize and lazy-load offscreen animation
 ([gokulkrishh 60fps](https://gokulkrishh.github.io/css-animations-60fps/)).

### 3.2 Lazy rendering of long study chapters

`screenStudy` builds a DOM block for *every* atom in topological order (150-360 blocks) **and
runs KaTeX over the whole tree** on every render, the single biggest latent INP/scroll risk
In the app.

- **`content-visibility: auto`** on each `.study-block`, with a `contain-intrinsic-size`
 estimate, tells the browser to **skip layout/paint/render of off-screen blocks** until they
 approach the viewport, a near-free virtualization for long documents
 ([Algolia 60fps](https://www.algolia.com/blog/engineering/60-fps-performant-web-animations-for-optimal-ux)).
 This alone can turn a 360-block render from janky to instant.
- **Defer KaTeX to visible blocks via `IntersectionObserver`** instead of one `katex(wrap)`
 over the entire screen. Render the first screenful synchronously, then render each block's
 math as it nears the viewport, the documented pattern for many-equation pages
 ([BigGo KaTeX vs MathJax](https://biggo.com/news/202511040733_KaTeX_MathJax_Web_Rendering_Comparison)).
- Keep KaTeX (correct choice): it renders synchronously without reflow and is much faster than
 MathJax; the cost is ~347 KB incl. Fonts, so it must be cached aggressively (it already is,
 opportunistically, make it explicit in the SHELL).

### 3.3 Font loading, self-host, subset, `font-display: optional`

Today: Fraunces + Cinzel + JetBrains Mono via the **Google Fonts CDN**. Two problems:
1. **The shared-CDN-cache benefit is gone**, browsers partition the HTTP cache by top-level
 site since Chrome 86 / Safari, so a CDN font is re-downloaded per site like any other; the
 only thing the third party adds now is **extra DNS + connection overhead**
 ([corewebvitals.io self-host](https://www.corewebvitals.io/pagespeed/self-host-google-fonts)).
2. Self-hosting + preload shows a **median LCP improvement ~180 ms**, and lets us **subset**
 with `fonttools` and use a **variable font in one file**
 ([DebugBear font perf](https://www.debugbear.com/blog/website-font-performance)).

**Do:** self-host into `app/fonts/`, ship **Fraunces as the variable font** (one file covers
All weights + optical sizing, we already use `opsz,wght`), subset Cinzel + JetBrains Mono to
The glyphs we render (display caps + math/mono), `<link rel="preload">` the body
font, and set **`font-display: optional`** (or `swap`) to kill the layout shift from late
fonts (CLS) and the "invisible text" FOIT. Add the woff2s to the SW SHELL → fully offline type.
Net: removes two third-party origins, improves LCP/CLS, and makes the PWA self-contained.

### 3.4 Image / SVG optimization

We're mostly imageless (good, that's the §2 thesis paying off). For the few raster assets
(share-card exports, OG images, any mascot):
- **AVIF (q 60-70) with WebP (q 75-85) fallback**, ≥3 `srcset` widths (400/800/1200),
 explicit `width`/`height` to reserve layout, `loading="lazy"` below the fold,
 `fetchpriority="high"` on the LCP image. Modern formats cut payload 50-80%
 ([Two Row Studio 2026](https://tworowstudio.com/image-optimization-2026/);
 [Cloudinary/dev.to](https://dev.to/cloudinary/your-images-are-probably-slowing-down-your-website-heres-how-to-fix-it-23je)).
- Build the pipeline on **sharp / libvips** (4-5× faster, far less memory than ImageMagick),
 or **Squoosh CLI** for one-off hero art.
- **SVG:** run figures + `icon.svg` through **SVGO** at build to strip metadata/precision,
 procedural figures can carry float cruft; SVGO halves them with no visible change.

### 3.5 KaTeX perf
Covered in §3.2.

Summary: keep KaTeX, render lazily per-visible-block, cache the bundle in the SW, never
re-render the whole tree on a depth-tab toggle (only re-render the changed block).

### 3.6 PWA polish

- **Safe area / notch:** we already ship `viewport-fit=cover` and use `env(safe-area-inset-*)`
 on the tabbar and sheet, good. Add `apple-mobile-web-app-status-bar-style` and confirm the
 tabbar's bottom inset on Dynamic-Island devices ([firt.dev PWA tips](https://firt.dev/pwa-design-tips/);
 [MagicBell iOS PWA 2026](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide)).
- **Native feel:** `-webkit-touch-callout: none` on links, `user-select: none` on chrome
 (tabbar, icons, buttons, *not* on lesson text), `overscroll-behavior-y: contain` on the
 scroller to kill Android pull-to-refresh / bounce mis-fires ([firt.dev](https://firt.dev/pwa-design-tips/)).
 We already zero out `-webkit-tap-highlight-color`, keep it.
- **Haptics, the iOS gotcha.** `navigator.vibrate()` works on **Android Chrome** but **iOS
 Safari exposes no Vibration API**. The current workaround: WebKit's
 `<input type="checkbox" switch>` (Safari 17.4+) fires a **system haptic** when toggled, so
 you create one off-screen, toggle it, remove it, that's how `use-haptic` / `ios-haptics`
 deliver haptics on iOS ([ios-haptics](https://github.com/tijnjh/ios-haptics);
 [Medium/asuma](https://medium.com/@posaune0423/i-open-sourced-an-oss-library-for-arbitrary-haptic-feedback-in-ios-safari-5b8ca74a5f05)).
 Build a ~20-line `haptic(kind)` helper: `navigator.vibrate` on Android, the switch-toggle
 trick on iOS, no-op otherwise. Wire to correct/incorrect/opened per the UX spec.
- **Install:** our manifest is valid (name, icons, display standalone, theme color) → Android
 shows the prompt. **iOS has no auto-prompt**, users Add-to-Home-Screen manually, so ship a
 one-time, dismissible "Add to Home Screen" hint on iOS Safari ([MagicBell](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide);
 [tutorialpedia](https://www.tutorialpedia.org/blog/install-to-home-screen-on-ios-for-pwa-enabled-app/)).
 Provide proper **maskable PNG icons** (our single SVG "any maskable" is risky, iOS ignores
 SVG icons; ship 192/512 PNG + an Apple touch icon).
- **Offline UX:** use `navigator.onLine` + online/offline events to reassure ("you're offline,
 progress is saved") since all progress is already local ([PWA checklist 2026](https://mobileviewer.github.io/pwa-mobile-testing-checklist-2026)).
 Cache strategy already matches best practice (cache-first shell, network-first corpus); make
 the **fonts + KaTeX + art SVGs** explicit SHELL entries so first-load-then-offline is total.

### 3.7 Targets to hold

| Metric | Target (mobile, p75) | Lever |
|---|---|---|
| LCP | ≤ 2.0 s | self-host+preload fonts, inline critical CSS, no render-blocking CDN |
| INP | ≤ 200 ms | lazy KaTeX, `content-visibility`, transform-only animation |
| CLS | ≤ 0.1 | `font-display: optional`, width/height on media, reserve art-card height |
| Scroll | 60 fps | GPU-only animation, `content-visibility` on study blocks |
| Offline | 100% after 1 load | SHELL = app + corpus + fonts + KaTeX + art |

---

## 4. The GitHub / library toolkit

Bias: **vanilla, tiny, build-time-or-zero-dep, permissive license.** Anything that drags a
framework or a multi-hundred-KB runtime onto the learning surface is the wrong tool for a
No-build PWA.

**Graph / map**
- **(none, custom SVG)**, current scale; zero deps, crisp, accessible. *Default.*
- **Cytoscape.js**, MIT, *if* we ever need algorithmic layout for an un-hand-laid branch.
- **Sigma.js**, MIT, WebGL, only if a single view must show 100k+ nodes (we won't).
- **cosmos.gl**, MIT, GPU, force engine; wrong layout model for us. *Avoid.*
- **d3-scale / d3-shape**, ISC, tree-shakeable math helpers for radial/arc geometry. *Optional.*

**Generative / procedural art (the anchor)**
- **seedrandom**, MIT, deterministic PRNG keyed on `atomId`. *Core.*
- **simplex-noise**, MIT, seedable organic variance for motifs/textures. *Core.*
- **SvJs**, MIT, ergonomic spec-faithful SVG authoring + noise. *Use for hand-built motifs.*
- **Two.js**, MIT, one scene → SVG *or* Canvas (atom figure + animated share card). *Use.*
- **Zdog**, MIT, featherweight pseudo-3D for orbital/lattice/molecule motifs. *Optional.*
- **Paper.js**, MIT, heavy vector scene-graph + boolean ops; complex constructions only.
- **rough.js**, MIT, hand-drawn aesthetic; **rejected** (fights the classical brand).

**Equation / figure**
- **KaTeX**, MIT, keep; fastest math, sync, offline-degrading. *Core (already in).*
- **function-plot**, MIT (D3), real `y=f(x)` plotting when we need Desmos-lite power.
- **plotLine.js / Plot.js**, permissive, lighter SVG plotting for simple brand-colored curves.
- **(custom ~80-line SVG path generator)**, *default* for the anchor's plotted figures.

**Texture / ambient**
- **CSS Paint API (Houdini)**, web platform, off-main-thread procedural backgrounds; CSS
 gradient fallback (Safari). *Use for grain/auras/ring glow.*

**Build-time image (decorative only, never the anchor)**
- **sharp / libvips**, Apache/LGPL, AVIF/WebP/resize pipeline, fast + low memory. *Use.*
- **Squoosh CLI**, Apache, one-off hero compression.
- **SVGO**, MIT, minify procedural SVG + icons at build. *Use.*
- **ComfyUI + SDXL/Flux on ROCm**, model licenses vary (SDXL = permissive; **Flux dev =
 non-commercial, check before any revenue use**), *share-card furniture only*, fixed seed +
 pinned SHA. **Banned for per-atom load-bearing figures** (hallucination risk).

**Mobile / PWA**
- **ios-haptics / use-haptic**, MIT, the `<input switch>` iOS haptic trick + Android vibrate.
 (Or inline our own ~20-line helper, no dep needed.)
- **Workbox**, MIT, *optional*; our hand-rolled `sw.js` is already correct and tiny, so only
 adopt Workbox if SW logic grows (precache manifests, expiration).
- **web-vitals** (Google, Apache), measure INP/LCP/CLS as field data in place of Lighthouse guesses.

---

## 5. Prioritized graphics/rendering upgrade plan, top 10

Ranked by **(impact on the wedge user × brand × CWV) ÷ effort**. Each tied to a file/surface.
Effort: **S** ≈ <½ day · **M** ≈ 1-2 days · **L** ≈ 3-5 days.

| # | Upgrade | Surface / file | Why it's high-impact | Effort |
|---|---|---|---|---|
| **1** | **Deterministic procedural SVG art anchor**, build-time generator keyed on `hash(atomId)`, one generator per atom `type` (equation→plotted figure, mechanism→schematic, abstract→constrained motif), inlined into corpus + alt-text. **The contract's core deliverable.** | `artCard()` in `app.js`; new `tools/art/build-art.mjs`; corpus JSON | Turns the placeholder into the actual differentiator; accurate (no hallucination), crisp, tiny, offline, on-brand, $0, passes the 8-point checklist as a lint. This *is* Phase-4 "functional art anchor." | **L** |
| **2** | **Lazy study rendering: `content-visibility: auto` + per-block KaTeX via `IntersectionObserver`** | `screenStudy()` in `app.js`, `.study-block` in `app.css` | Removes the app's biggest INP/scroll risk (360 blocks + full-tree KaTeX). Janky→instant on phones. Directly buys INP ≤ 200 ms + 60 fps scroll. | **M** |
| **3** | **Self-host + subset fonts; variable Fraunces; `font-display: optional`; preload; add to SW** | `index.html`, new `app/fonts/`, `app.css`, `sw.js` | ~180 ms LCP win, removes 2 third-party origins, kills font-driven CLS, makes type fully offline. Pure CWV + offline-completeness. | **M** |
| **4** | **Cross-platform `haptic()` helper** (Android `vibrate` + iOS `<input switch>` trick) wired to correct/incorrect/opened | new `app/js/haptic.js`; `drill()`, open, `next()` in `app.js` | Closes a named UX-SPEC gap; the single biggest "feels native" delta on iOS, where vibration is otherwise impossible. | **S** |
| **5** | **GPU-only animation audit**, convert `width`-animating bars to `transform: scaleX()`, scope `will-change` to the animating element, ensure all motion is transform/opacity | `app.css` (`.mbar i`, `.bar .fill`, `.node`, sheet), `app.js` | Guarantees 60 fps everywhere; cheap, broad. Foundation for any richer map/opening animation. | **S** |
| **6** | **Map polish + entrance/opening animation (still SVG)**, animate only the unlocked node + tapped neighborhood (transform/opacity), add labels-on-focus, focus ring, `aria`, and the **local-neighborhood tap view** the spec mandates | `screenMap()` in `app.js`, `app.css` | Makes the map feel alive and *useful* (local view) without a graph engine; delivers the "post-route opening animation" + "Opens →" payoff from Phase 4. | **M** |
| **7** | **Equation→figure plotting for equation atoms**, custom ~80-line SVG path generator (fallback to function-plot for hard cases), feeding upgrade #1 | `tools/art/build-art.mjs`; corpus | The most pedagogically load-bearing art for the majority (equation) atoms, *shows* the relation, dual-coding done right. | **M** |
| **8** | **PWA install + icon polish**, real 192/512 maskable PNGs + Apple touch icon, iOS "Add to Home Screen" hint, `apple-mobile-web-app-status-bar-style`, `-webkit-touch-callout`/`user-select` native-feel rules | `manifest.webmanifest`, `index.html`, `app.css`, new icon PNGs | iOS ignores SVG icons (our only icon is SVG) → installs look broken today. Plus native-feel hygiene. High polish-per-effort. | **S** |
| **9** | **Ambient texture via CSS gradients / Houdini paint worklet** (parchment grain, shell auras, ring glow) with gradient fallback; **SVGO** all SVG at build | `app.css`, new `art/paint-worklet.js`, build step | On-brand depth with zero image bytes, off-main-thread, no scroll cost. Replaces any temptation to ship raster textures. | **S-M** |
| **10** | **Canvas-overview + SVG-overlay hybrid for the Mastery-Profile "all-branches galaxy"** (Phase 3), documented upgrade path when one view must show 1k+ nodes across branches | future `screenProfile`/`/m/<handle>`; new `map-canvas.js` | Pre-budgets the only place we'll plausibly exceed SVG's comfort zone, *without* a WebGL engine, keeps crispness + accessibility via the SVG/HTML interaction layer. | **L** (deferred to Phase 3) |

**Sequencing note:** #2, #3, #4, #5, #8 are fast CWV/native-feel wins (do first, ~1 sprint).
#1 + #7 are the differentiator (the art contract) and the real work. #6 makes the map sing.
#9 is brand polish. #10 is deliberately deferred until the Mastery Profile galaxy exists.

---

## Recommended rendering stack

- **Map:** **custom dependency-free SVG** at current scale (curated concentric shells, never
 force-directed); **animate only the unlocked node + tapped local neighborhood** via
 transform/opacity; documented **Canvas-overview + SVG/HTML-overlay** hybrid as the Phase-3
 upgrade for the all-branches galaxy. **No WebGL graph engine**, it buys performance we don't
 need and costs crispness, accessibility, and the zero-build simplicity that is the brand.
- **Art (the load-bearing anchor):** **deterministic, build-time, procedural SVG** keyed on
 `hash(atomId)`, equation→plotted figure, mechanism→schematic, abstract→constrained motif,
 inlined + alt-texted + SVGO'd + SW-cached. **Diffusion models (SDXL/Flux) are banned for the
 anchor** (they hallucinate plausible-but-wrong science → the −0.3 to −0.5σ trap) and scoped
 to **decorative share-card furniture only**, build-time, fixed-seed, SHA-pinned, on the ROCm
 box. Ambient texture = **CSS gradients / Houdini paint worklet**, never images.
- **Mobile:** **self-hosted subset variable fonts** + `font-display: optional` + preload;
 **KaTeX kept** but rendered **lazily per visible block** with **`content-visibility: auto`**;
 **transform/opacity-only animation**; **cross-platform `haptic()`** (Android vibrate + iOS
 `<input switch>` trick); **real maskable PNG icons** + iOS install hint; **AVIF/WebP via
 sharp** for the rare raster; full **offline SHELL** (app + corpus + fonts + KaTeX + art).
 Hold **LCP ≤ 2.0 s · INP ≤ 200 ms · CLS ≤ 0.1 · 60 fps · 100% offline**, measured on **CrUX
 field data**, Lighthouse as a diagnostic only.

## Toolkit shortlist

`KaTeX` (math, keep) · `seedrandom` + `simplex-noise` (deterministic art) · `SvJs` / `Two.js`
(SVG authoring; +`Zdog` for motifs) · custom SVG plotter (+`function-plot` for hard math) ·
**CSS Paint API / Houdini** (texture) · `sharp`+`SVGO` (build-time image/SVG) · `web-vitals`
(field measurement) · iOS `<input switch>` haptic trick. Back-pocket: `Cytoscape.js` (layout
algorithms), Canvas+SVG hybrid (galaxy view). **Avoid on this surface:** WebGL graph engines
(Sigma/cosmos), force-graph libs, and diffusion art for any load-bearing figure.

## Top 10 ranked upgrades

1. Deterministic procedural SVG **art anchor** (the contract), `artCard()`, **L**
2. **Lazy study rendering** (`content-visibility` + per-block KaTeX), `screenStudy()`, **M**
3. **Self-host + subset + variable fonts**, `font-display: optional`, preload, `index.html`, **M**
4. Cross-platform **`haptic()`** (Android vibrate + iOS switch trick), new `haptic.js`, **S**
5. **GPU-only animation audit** (transform/opacity, scoped `will-change`), `app.css`, **S**
6. **Map entrance/opening animation + local-neighborhood tap view** (SVG), `screenMap()`, **M**
7. **Equation→figure plotting** for equation atoms (feeds #1), `build-art.mjs`, **M**
8. **PWA install + maskable PNG icons + iOS hint + native-feel rules**, `manifest`/`index.html`, **S**
9. **Ambient texture via CSS gradients / Houdini** + SVGO at build, `app.css`, **S-M**
10. **Canvas-overview + SVG-overlay hybrid** for the Mastery-Profile galaxy (Phase 3), **L (deferred)**
