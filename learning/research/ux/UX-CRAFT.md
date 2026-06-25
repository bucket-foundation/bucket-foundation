# Bucket Academy — UX Craft & Design-Engineering Toolkit

**Pillar:** Product · **Epic:** bkt-jh0 · **Author:** Product (Nucleus) · 2026-06-14
**Mandate:** Make Bucket Academy's UX *world-class*, and assemble a reusable toolkit so an
AI builder (Claude Code) produces premium UX *consistently*, not by luck.

**Read first / sits beside:**
- `research/product/UX-CASE-STUDIES.md` — the UX bible (Apple/Duolingo/Whop, IA, flows).
- `research/_synthesis/UX-SPEC.md` — the reconciled, buildable spec with non-Product constraints.
- `learning/app/css/app.css` — the *live* design system (bone/basalt/aegean/gold, Cinzel/Fraunces).

This document is the **craft layer**: it does not re-derive the IA or the pedagogy — it specifies
the *motion, component quality, library toolkit, and AI-agent playbook* that make the spec feel
like something Apple/Linear shipped. All sources cited inline. Original analysis only — I summarize
and link; I do not reproduce any article, doc, or copyrighted text.

> **Aesthetic guardrail (non-negotiable):** Bucket is *classical/editorial*, not Silicon-Valley
> neon. Bone parchment ground, basalt ink, aegean + gold + laurel accents, hairline rules, Fraunces
> serif body, Cinzel display caps. Every recommendation below is filtered through this: motion is
> *restrained and inevitable*, not bouncy and playful; the parchment must stay legible; the art and
> the equation are always the hero (Apple deference). When a leader's pattern conflicts with the
> aesthetic, the aesthetic wins.

---

## PART 1 — MOTION & MICRO-INTERACTION CRAFT

### 1.1 The four schools of motion, and what to take from each

| Source | Core idea | What Bucket takes | What Bucket leaves |
|---|---|---|---|
| **Apple HIG — Motion** | Motion *communicates*: it shows what changed, what will happen, what you can do next; continuity (fade + scale in one layer) keeps users oriented; spring damping 0.7–1.0 for subtle elasticity; transitions < 500ms; honor Reduce Motion. ([developer HIG motion](https://developers.apple.com/design/human-interface-guidelines/foundations/motion), [iOS 26 motion guide](https://medium.com/@foks.wang/ios-26-motion-design-guide-key-principles-and-practical-tips-for-transition-animations-74def2edbf7c)) | Shared-element continuity for map↔atom; spring damping ~0.8 (low bounce); Reduce-Motion is already wired in `app.css`. | Showy "Liquid Glass" everywhere — use translucency only on transient chrome. |
| **Material 3 (Expressive)** | Migrating from duration-based to a **spring physics** motion system; spring tokens come in *spatial* (movement) and *effects* (color/opacity) families, each with fast/default/slow; **emphasized** easing for begin-and-end-at-rest moves, **standard** easing for most UI. ([M3 easing & duration](https://m3.material.io/styles/motion/easing-and-duration), [M3 motion overview](https://m3.material.io/styles/motion/overview/how-it-works)) | The *token* discipline: separate **spatial** vs **effects** motion tokens; emphasized easing for the unlock/celebration moves, standard easing for routine transitions. | Material's bouncy "expressive" personality — too playful for parchment. |
| **Emil Kowalski (Linear/Vercel design-eng)** — *the single most actionable source* | 43 codified rules across 7 categories. Key: **`ease-out` for entrances**, `ease-in-out` for on-screen movement, **never `ease-in` on UI**; **UI animations < 300ms**; **animate only `transform`+`opacity`**; springs for drag/interruptible only; `scale(0.97)` on `:active`; enter from `scale(0.95)` never `scale(0)`; stagger 30–80ms; gate hover behind `@media (hover:hover)`. ([great-animations](https://emilkowal.ski/ui/great-animations), [design-eng SKILL](https://github.com/emilkowalski/skill/blob/main/skills/emil-design-eng/SKILL.md)) | **Adopt wholesale as the engineering rulebook** (it *is* the Linear/Vercel craft, codified). | Nothing — this is the floor. |
| **Premium app craft (Stripe / Linear / Vercel / Family / Things / Arc)** | Interruptibility (CSS transitions retarget mid-flight), `transform-origin` from the trigger (popovers scale *out of* the button), asymmetric timing (slow deliberate action, fast system response), momentum dismissal on velocity > 0.11, blur-mask problematic crossfades. ([SKILL](https://github.com/emilkowalski/skill/blob/main/skills/emil-design-eng/SKILL.md)) | All of it for sheets/drawers/popovers (branch picker, tutor sheet, share composer). | — |

**Synthesis — the Bucket motion stance:** *spring-physics where the user touches it (drag, gesture,
interrupt), tuned easing curves everywhere else, < 300ms for routine UI and the full 400–500ms only
for the two "earned" moments (unlock, celebration).* This reconciles UX-SPEC's 200–500ms band with
Emil's stricter < 300ms rule: **< 300ms is the default; 400–500ms is reserved for celebration/unlock
choreography only**, because those are rare and deserve weight.

### 1.2 The Bucket easing & duration token set (copy-paste into `:root`)

```css
:root {
  /* === MOTION TOKENS (add to app.css) === */
  /* easing — Emil's curves, renamed to Bucket semantics */
  --ease-out:     cubic-bezier(0.23, 1, 0.32, 1);    /* entrances, reveals (default) */
  --ease-in-out:  cubic-bezier(0.77, 0, 0.175, 1);   /* on-screen movement, morph */
  --ease-emph:    cubic-bezier(0.2, 0, 0, 1);        /* emphasized — unlock/celebration */
  --ease-press:   cubic-bezier(0.2, 0, 0.2, 1);      /* tactile button press */
  /* durations — < 300ms default; 400-500 only for earned moments */
  --dur-press:    120ms;   /* button :active feedback        (Emil 100–160) */
  --dur-tooltip:  160ms;   /* tooltips, small popovers        (Emil 125–200) */
  --dur-sheet:    240ms;   /* dropdowns, branch sheet, depth  (Emil 150–250) */
  --dur-screen:   300ms;   /* screen rise / shared-element    (cap for routine UI) */
  --dur-unlock:   460ms;   /* node lights + edge draws  (EARNED — emphasized only) */
  --dur-celebrate:520ms;   /* end-of-route reward       (EARNED — emphasized only) */
  /* spring (for JS / Motion lib — drag & interrupt only) */
  --spring-soft:  /* {type:"spring", duration:0.5, bounce:0.15} — low bounce, parchment-calm */;
  --stagger:      48ms;    /* between staggered list items   (Emil 30–80) */
}
```

The existing `--shadow`, `.screen` `rise` keyframe, and `prefers-reduced-motion` block in `app.css`
already align with this — these tokens *formalize* what's ad-hoc today (e.g. `.screen` uses
`cubic-bezier(.2,.7,.2,1)` for 340ms; retoken it to `var(--ease-out) var(--dur-screen)`).

### 1.3 Motion mapped to each Bucket surface (the choreography spec)

| Surface (file/component) | Interaction | Motion recipe | Haptic / sound | Why |
|---|---|---|---|---|
| **Study scroll / read mode** (`.study-block`, `.sb-text`) | Entering blocks as you scroll | **Stagger fade-up**: each block `opacity 0→1` + `translateY(8px→0)`, `var(--ease-out) var(--dur-screen)`, **48ms stagger**, only on first reveal (IntersectionObserver, `once`). | — | Editorial calm; the eye lands block by block. Never re-animate on re-scroll. |
| **Depth tabs** (`.depth-tabs`, Feynman→Formal→Derivation) | Switch depth | Cross-fade content + a 240ms slide of the active-pill background (`transform`, `--ease-in-out`); content height auto-animates (auto-animate lib, §3). | light impact | Progressive disclosure should feel like *unfolding*, not a jump-cut. |
| **Unlock animation** (the Bucket-unique moment) | Atom mastered → downstream nodes light up | **The earned moment.** On the MAP: target node `node-fill` fills (scaleY mask 0→1), then edge `stroke-dashoffset` draws trigger→target, then target `node-base` stroke-width pulses once. Choreograph in sequence, `var(--ease-emph) var(--dur-unlock)`, ~120ms between steps. | medium impact + warm "unlock" tone | This is the leverage no competitor has (UX-SPEC #7). Give it weight (460ms) and sequence — it must read as *cause → effect*. |
| **Mastery map** (`.graph`, `.node`, L1↔L2 zoom) | Tap node → neighborhood | **Shared-element transition**: the tapped node grows into the L2 center (`transform: scale` + position, `--ease-in-out` 280ms); other nodes fade. Reverse on back. | — | Apple continuity — the user never loses "where am I" (UX-CASE-STUDIES §7.3). |
| **Atom reveal / art anchor** (`.art`, `.art-eq`) | Atom screen loads | Art: **skeleton → blur-up fade** (`filter: blur(8px→0)` + `opacity`, `--ease-out` 300ms) — never a bare spinner. Equation settles 60ms after art (asymmetric timing). | — | Art is the wedge; a blur-up reveal feels crafted, a spinner feels broken (Emil: blur-mask crossfades). |
| **Share card composer** (the growth loop) | Offered at success peak | Card **scales in from `scale(0.95)`** + opacity (never `scale(0)`), `transform-origin: center`, `--ease-out` 300ms; a one-time gold sheen sweeps the card (`clip-path` or masked gradient, `--ease-emph`). | light impact | Offered at peak emotion (UX-SPEC §5); the sheen says "this is precious / collectible." |
| **Drill feedback** (`.answer`, `.rate`, `.rbtn`) | Correct / incorrect | Correct: laurel wash + checkmark `stroke-dashoffset` draw, 240ms. Incorrect: **amber** underline + 2px gentle shake (`translateX`, 3 cycles, 200ms) — **never red, never harsh**. | success / *soft* error haptic | The single most important emotional decision (UX-SPEC §6.3): failure feels like help. `app.css` already enforces amber (`.rbtn.again`). |
| **XP award** (`.celebrate .big`, XP counter) | Inline before leaving | Counter **rolls up** digit-by-digit (number-flow lib, §3); XP ring fills (`stroke-dashoffset`); existing `pop` keyframe for the glyph. | light tick per digit | Duolingo's dopamine coupling — reward bound to behavior, *before* you can leave (UX-CASE-STUDIES §2.3). |
| **End-of-route celebration** (`.celebrate`) | Route complete | The **second earned moment**: `pop` glyph (already in `app.css`) + a *restrained* particle burst in gold/laurel (tsParticles confetti, §3) — sparse, classical, not a Vegas explosion. | success | Peak moment; but parchment restraint means *a few gold motes*, not a confetti cannon. |
| **Buttons** (`.btn`, `.rbtn`, `.route-row`) | Press | `transform: scale(0.97)` on `:active`, `--dur-press --ease-press`. Already present (`scale(.98)`/`.96`) — standardize to `.97`. | light impact | Tactile feedback < 100ms is the Apple floor (UX-CASE-STUDIES §1.2). |
| **Branch picker sheet** (`.sheet`, `.sheet-back`) | Open / dismiss | Slide up `translateY(100%→0)` `--ease-out` 240ms; backdrop fades; **drag-to-dismiss** with spring + momentum (velocity > 0.11 dismisses) via Vaul (§3). | — | The premium drawer feel (Vaul *is* this pattern, by the same author as the rulebook). |

### 1.4 Celebration restraint — the Bucket rule

Duolingo celebrates *constantly*; that erodes meaning and conflicts with "honest, not flattering"
(UX-SPEC principle 5). **Bucket has exactly two earned motion moments** — the **unlock** (a node lit,
an edge drawn) and the **end-of-route celebration**. Everything else is sub-300ms, deferential, and
informational. The graph lighting up *is* the reward; we don't bolt fireworks onto a recall tap.

---

## PART 2 — DESIGN SYSTEM & COMPONENT QUALITY (audit of `app.css`)

### 2.1 What "Apple/Linear-grade" actually means (the checklist)

A system reads as premium when it has: **(a)** a token layer that is the single source of truth
(color, type, space, radius, shadow, **motion**); **(b)** a strict spatial rhythm (4/8-pt grid); **(c)**
a typographic scale built on a ratio, not arbitrary px; **(d)** contrast that meets WCAG AA (4.5:1
text, 3:1 large/UI); **(e)** controlled density; and **(f)** *all four states designed* for every
surface (empty / loading / error / success), not just the happy path. ([design tokens 2025](https://www.designsystemscollective.com/the-evolution-of-design-system-tokens-a-2025-deep-dive-into-next-generation-figma-structures-969be68adfbe), [typography systems](https://designsystems.surf/articles/typography-system-101-a-step-by-step-guide), [proportional scale tokens](https://penpot.app/blog/using-design-tokens-for-a-proportional-typographic-scale/), [WCAG AA contrast](https://www.uxpin.com/studio/blog/color-consistency-design-systems/))

### 2.2 Audit of the live `app.css` — what's already excellent

`app.css` is genuinely strong and on-aesthetic. Credit where due:
- **Color tokens are semantic and complete** — ground/ink/rules/accents/shells all named, not hex-in-place.
- **Shell colors are consistent** (`--prereq/--nucleus/--frontier` = aegean/gold/laurel) and reused across dots, bars, node fills, study-block edges.
- **Amber-not-red** is enforced (`.rbtn.again` uses `--gold-deep`) — the key emotional decision is in CSS.
- **Reduced-motion is honored** globally.
- **Tap targets**: most controls hit `min-height: 48px` / `44px+` (`.btn`, `.rbtn`, `.lang-chip` 38px is the one miss).
- **Radius/shadow tokens** exist (`--radius`, `--shadow`) and the inset-highlight shadow is tasteful.
- **Display vs serif vs mono** split is disciplined (Cinzel caps / Fraunces body / JetBrains mono for numerals & IPA).

### 2.3 Concrete upgrades (ranked, each a real diff)

1. **Add the motion token block** (§1.2) and retoken ad-hoc curves/durations. *Today motion values are
   scattered as literals* (`.34s cubic-bezier(.2,.7,.2,1)`, `.12s`, `.2s`, `.5s`). Centralize.
2. **Add a spacing scale token set.** `app.css` uses good 8-pt-ish values but as literals (20px, 14px,
   12px, 8px). Add `--s1:4px; --s2:8px; --s3:12px; --s4:16px; --s5:20px; --s6:24px; --s8:32px; --s12:48px;`
   and migrate. This is what makes spacing *provably* on-grid (Apple's "it just works" calm). ([modular scale / 8-pt](https://designsystems.surf/articles/typography-system-101-a-step-by-step-guide))
3. **Formalize the type scale as a ratio.** Headings today: 36 / 30 / 28 / 27 / 22 / 19 / 17 / 16 — close to
   a Major-Third (1.25) but not exact. Lock a scale token set (`--t-xs:11; --t-sm:13; --t-base:16.5;
   --t-lg:19; --t-xl:22; --t-2xl:27; --t-3xl:30; --t-4xl:36`) so every screen pulls from the same ladder.
   ([proportional typographic scale](https://penpot.app/blog/using-design-tokens-for-a-proportional-typographic-scale/))
4. **Contrast audit the faint inks.** `--ink-faint #6F6A5E` on `--card #F5F0E1` is ~3.6:1 — **fails AA for
   body text** (passes only for ≥18px/large). It's used on small labels (`.slabel` 11px, `.bar-pct` 13px,
   `.cite` 12px). Darken `--ink-faint` toward `#5C574B` (≈4.6:1) or reserve it strictly for large text.
   This is the one substantive accessibility bug in the file. ([WCAG AA 4.5:1](https://www.uxpin.com/studio/blog/color-consistency-design-systems/))
5. **Raise `.lang-chip` to 44px** min-height (it's 38px) for the comfort tap target (UX-SPEC §components).
6. **Add explicit `:focus-visible` rings.** The file has `:hover`/`:active` but no visible keyboard focus
   style — required for "full keyboard nav + visible focus" (UX-SPEC §components). Add a 2px aegean ring
   token `--focus: 0 0 0 2px var(--bg), 0 0 0 4px var(--aegean);` applied to all interactive elements.
7. **Skeleton tokens for loading states.** There is no skeleton/shimmer style yet, but UX-SPEC mandates
   "content-shaped skeletons, never a bare spinner." Add a `.skeleton` shimmer (parchment-tinted, respects
   reduced-motion → static) and a `.art .skeleton` blur-up for the art anchor.
8. **Empty-state component.** No `.empty` style exists; UX-SPEC mandates a designed empty state for every
   surface ("You're caught up. Learn something new?"). Add a centered `.empty` block with kicker + line +
   primary action so empties are never blank.
9. **Density: a `--density` line-height pair.** Body `line-height:1.55`/`1.62` is right for reading; lists
   (`.route-row`, `.mrow`) could tighten to 1.4 for scan-density. Two tokens, not one global value.
10. **Documented state matrix.** Add a comment block enumerating, per component, its empty/loading/error/
    success treatment — so the *next* component inherits the discipline (this is also the audit artifact
    Operations needs for WCAG).

### 2.4 The "four states" gap (the highest-leverage quality fix)

The biggest quality delta between `app.css` today and Apple/Linear-grade is **state coverage**. Success
and (some) error states exist; **empty and loading are largely undesigned in CSS.** Items 7 & 8 above
close this. Rule going forward: *no component is "done" until all four states are in the stylesheet.*

---

## PART 3 — THE GITHUB / LIBRARY TOOLKIT

The actual open-source repos a builder should reach for, each with **what / why / license / when**.
Bucket's stack is **Next.js 14 + React** (per CLAUDE.md), so React-first choices.

### 3.1 Animation

| Library | Repo | What / Why | License | When to use |
|---|---|---|---|---|
| **Motion (ex-Framer Motion)** | `motion/motion` ([motion.dev](https://motion.dev/docs/react)) | Declarative React animation; **hybrid engine** runs on WAAPI/ScrollTimeline for 120fps and falls back to JS for real springs, interruptible keyframes, gestures, layout transitions. ([motion.dev](https://motion.dev/), [npm motion](https://www.npmjs.com/package/motion)) | MIT | **Primary** for app-UI motion: layout/shared-element (map↔atom), exit transitions, springs on drag, `AnimatePresence` for sheets. Import from `motion/react`. |
| **GSAP** | `greensock/GSAP` | Imperative, framework-agnostic, precise timelines; **now 100% free incl. all plugins** (SplitText, MorphSVG, DrawSVG, ScrollTrigger) since Webflow acquisition, April 2025. ([CSS-Tricks](https://css-tricks.com/gsap-is-now-completely-free-even-for-commercial-use/), [Webflow blog](https://webflow.com/blog/gsap-becomes-free)) | "No-charge" standard license (free, incl. commercial) | The **unlock choreography** (sequenced node-fill → edge `DrawSVG` → pulse) and any SVG-morph on the graph. GSAP timelines beat hand-rolled sequencing here. |
| **AutoAnimate** | `formkit/auto-animate` ([repo](https://github.com/formkit/auto-animate)) | One-line, zero-config smooth add/remove/reorder transitions for lists. ([auto-animate.formkit.com](https://auto-animate.formkit.com/)) | MIT | Cheapest possible polish: route list reordering, depth-tab content height, drill answer reveal. Reach for this *before* hand-writing transitions. |
| **number-flow** | `barvian/number-flow` (`@number-flow/react`) | Animated, accessible rolling-number component. | MIT | XP counter roll-up, mastery %, streak count, earnings in Studio. |

> **Don't add React Spring** — Motion already covers spring physics; two animation engines is a smell.

### 3.2 Component primitives (headless / accessible)

| Library | Repo | What / Why | License | When to use |
|---|---|---|---|---|
| **Radix UI** | `radix-ui/primitives` | Unstyled, accessible React primitives (dialog, popover, tooltip, dropdown, tabs, accordion) — handles focus, keyboard, ARIA internally. ([comparison](https://makersden.io/blog/react-ui-libs-2025-comparing-shadcn-radix-mantine-mui-chakra)) | MIT | **Primary** for behavior of the tutor sheet, branch picker, depth tabs, tooltips, "go deeper" accordion. Style with our parchment CSS. |
| **shadcn/ui** | `shadcn-ui/ui` | Copy-in component source built on Radix (or Base UI as of 2025) + Tailwind — you *own* the code, no lock-in. ([shadcn vs radix](https://www.subframe.com/tips/shadcn-vs-radix-d26d1)) | MIT | When you want a styled starting point to *then re-skin* to bone/basalt. Not a runtime dep — it's a generator. |
| **Base UI** | `mui/base-ui` | The actively-maintained Radix-alternative primitive layer, full-time MUI engineers. ([shadcn vs Base UI](https://dev.to/edriso/shadcn-vs-radix-vs-base-ui-which-one-should-a-junior-pick-in-2026-1jml)) | MIT | Fallback/alternative to Radix if a needed primitive is missing or better there. Pick *one* primitive layer; don't mix. |
| **Vaul** | `emilkowalski/vaul` | Drawer/bottom-sheet for React with drag-to-dismiss + momentum, by the author of our motion rulebook. ([repo](https://github.com/emilkowalski/vaul)) | MIT | The branch picker sheet, tutor sheet, share composer — gives the premium drag feel for free. |
| **Sonner** | `emilkowalski/sonner` | Opinionated, accessible toast component. ([repo](https://github.com/emilkowalski/sonner)) | MIT | System feedback ("progress saved", "atom minted"), *not* learning feedback (that stays inline per UX-SPEC). |

### 3.3 Icons

| Library | Repo | What / Why | License | When to use |
|---|---|---|---|---|
| **Lucide** | `lucide-icons/lucide` | 1,500+ refined outline icons, tiny per-icon bundle, the de-facto React standard (shadcn default). ([phosphor vs lucide](https://allsvgicons.com/compare/phosphor-vs-lucide/)) | ISC (MIT-equiv) | **Primary** icon set. The geometric outline aesthetic suits the editorial/classical look. |
| **Phosphor** | `phosphor-icons/react` | 1,200+ icons in **6 weights incl. duotone + fill**; friendlier, larger canvas. ([comparison](https://allsvgicons.com/compare/phosphor-vs-lucide/)) | MIT | When you need an *active/filled* state vs outline (e.g. mastered-node icon filled, unmastered outline) — the multi-weight trick mirrors SF Symbols. |

> **SF Symbols approach, cross-platform:** SF Symbols is Apple-only/native. The web-native way to get
> "one icon family, multiple weights, tracks the font" is **Phosphor's weight system** (regular →
> fill for active states) or Lucide + a stroke-width convention. Use weight/fill to encode state,
> never color alone (UX-SPEC accessibility).

### 3.4 Graph / network visualization (the mastery map — the hardest surface)

| Library | Repo | What / Why | License | When to use |
|---|---|---|---|---|
| **Cytoscape.js** | `cytoscape/cytoscape.js` | Graph rendering **with built-in graph algorithms** (PageRank, betweenness — i.e. our *centrality* computation), rich layouts, gestures. ([graph viz comparison](https://www.pkgpulse.com/blog/cytoscape-vs-vis-network-vs-sigma-graph-visualization-javascript-2026)) | MIT | **Recommended for the MAP** when we need analytics + interaction at biophysics scale. Use a *curated/preset* layout, NOT force-directed (avoid the Obsidian hairball, UX-CASE-STUDIES §7.1). |
| **Sigma.js** (+ `@react-sigma`) | `jacomyal/sigma.js` | WebGL renderer for **tens of thousands of nodes** at 60fps; official React bindings. ([comparison](https://www.pkgpulse.com/blog/cytoscape-vs-vis-network-vs-sigma-graph-visualization-javascript-2026)) | MIT | If the full canon graph grows huge and Cytoscape stutters. Performance ceiling. |
| **D3-force / d3** | `d3/d3` | Maximum control; compute a layout *once*, then render statically. | ISC | To **precompute** the curated concentric-shell x/y positions offline (Data pillar deliverable), then hand static coords to the renderer. *Never* run live force-directed in the UI. |
| **React Flow** | `xyflow/xyflow` | Node-based UI builder, great DX, but tuned for editable diagrams not analytics. ([comparison](https://www.pkgpulse.com/blog/cytoscape-vs-vis-network-vs-sigma-graph-visualization-javascript-2026)) | MIT | The **Studio** atom-authoring/edge-editing surface (Scholar tier) — where the graph *is* editable. Not the learner MAP. |

> **Decision:** learner MAP = **Cytoscape.js with a preset shell layout** (coords precomputed via
> d3-force offline by Data). Studio authoring = **React Flow**. This is the explicit fix for the
> hairball: the curated layout is computed once, never emergent (UX-CASE-STUDIES §7.2–7.4).

### 3.5 Gesture, particles, skeletons, the small stuff

| Library | Repo | What / Why | License | When to use |
|---|---|---|---|---|
| **@use-gesture/react** | `pmndrs/use-gesture` | Robust pointer/drag/pinch/wheel hooks; pairs with Motion for spring-back. | MIT | Pinch-zoom L1↔L2 on the map; drag on the share card; any custom gesture Vaul doesn't cover. |
| **tsParticles** (`@tsparticles/react`) | `tsparticles/tsparticles` | Highly configurable confetti/particles/fireworks. ([repo](https://github.com/tsparticles/tsparticles)) | MIT | The **restrained** end-of-route gold/laurel motes (§1.3). Configure *sparse* — classical, not Vegas. |
| **canvas-confetti** | `catdad/canvas-confetti` | Tiny "on-demand confetti gun." ([repo via search](https://github.com/catdad/canvas-confetti)) | ISC | Lighter alternative if tsParticles is overkill — single celebratory burst on first-atom unlock. |
| **react-loading-skeleton** | `dvtng/react-loading-skeleton` | Auto-adapting animated skeletons. | MIT | Loading state for route list, atom body, art anchor — closes the §2.4 four-states gap fast. |

### 3.6 Design-engineering reference repos (learn from, not just install)

- **`emilkowalski/skill`** — the codified 43-rule design-engineering skill ([SKILL.md](https://github.com/emilkowalski/skill/blob/main/skills/emil-design-eng/SKILL.md)). *This is the canonical
  reference for the whole craft layer.* An AI agent can load it as ground truth.
- **`animations.dev`** (Emil Kowalski) — the "Animations on the Web" course teaching the *judgment*
  (when motion helps vs hurts), via Family Drawer / Dynamic Island / feedback-popover builds. ([emilkowal.ski](https://emilkowal.ski/))
- **Apple HIG — Motion** ([foundations/motion](https://developers.apple.com/design/human-interface-guidelines/foundations/motion)) and **Material 3 motion** ([m3 motion](https://m3.material.io/styles/motion/easing-and-duration)) — the two
  authoritative platform sources; read for principles, not copy.
- **`shadcn-ui/ui`** — best-in-class example of *owned, tokenized, accessible* component code to study.

---

## PART 4 — EQUIP CLAUDE WITH UX SKILLS (the meta-deliverable)

A reusable system an AI agent follows to hit premium UX *every time*. Three artifacts: a **rubric**,
a **cheat-sheet**, and a **playbook**. All copy-pasteable.

### 4.1 The UX-Quality Rubric (score every screen 0–2 on each; ship at ≥ 26/30)

```
SCREEN: __________________________   DATE: __________   SCORE: ___ / 30

DEFERENCE & CLARITY                                            0  1  2
1. Content (concept/art/equation) is the visual hero; chrome recedes.  [ ]
2. Exactly ONE primary action; labeled by consequence, not "Submit".   [ ]
3. Layout on the 4/8-pt grid; spacing pulls from tokens, no literals.  [ ]

TYPE & COLOR                                                  0  1  2
4. Type sizes come from the scale ladder; serif/display/mono correct.  [ ]
5. All text ≥ 4.5:1 contrast (3:1 for ≥18px / UI); faint ink not on body. [ ]
6. Mastery/shell never encoded by color ALONE (also shape/fill/label). [ ]

MOTION                                                        0  1  2
7. Routine motion < 300ms; only unlock+celebration use 400–500ms.      [ ]
8. Animates only transform/opacity; ease-out for entrances.            [ ]
9. prefers-reduced-motion path exists (transforms → cross-fade).       [ ]

STATES (the four)                                             0  1  2
10. Empty state designed (never blank; turns into the next action).    [ ]
11. Loading = content-shaped skeleton/blur-up, never a bare spinner.   [ ]
12. Error is recoverable, human copy, progress never lost; answer-error
    is AMBER, names the misconception, reschedules — never red/punishing.[ ]

FEEDBACK & A11Y                                               0  1  2
13. Tactile/visual feedback < 100ms; system haptic on key events.      [ ]
14. Tap targets ≥ 44px; visible :focus-visible ring; full keyboard nav.[ ]
15. Every interactive/art element has a meaningful label / alt-text.   [ ]
```

### 4.2 The Motion / Spacing / State Cheat-Sheet (pin this above the keyboard)

```
EASING            ease-out (0.23,1,0.32,1) → entrances/reveals      [DEFAULT]
                  ease-in-out (0.77,0,0.175,1) → on-screen movement
                  emphasized (0.2,0,0,1) → unlock + celebration ONLY
                  NEVER ease-in on UI. spring → drag/interrupt ONLY.

DURATION          press 120 · tooltip 160 · sheet 240 · screen 300 (CAP)
                  unlock 460 · celebrate 520   ← the only two >300ms

PROPERTIES        animate ONLY transform + opacity.  Never width/height/
                  margin/padding/top/left. Use clip-path for reveals.
                  enter from scale(0.95) — NEVER scale(0).

STAGGER           30–80ms between list items (Bucket default 48ms).

SPACING (px)      4 · 8 · 12 · 16 · 20 · 24 · 32 · 48 · 64   (8-pt grid)

TYPE LADder       11 · 13 · 16.5 · 19 · 22 · 27 · 30 · 36   (Fraunces body,
                  Cinzel display caps, JetBrains mono numerals/IPA)

CONTRAST          body ≥ 4.5:1 · large(≥18px)/UI ≥ 3:1 · focus ring visible

TAP TARGET        ≥ 44px every control (24px is the WCAG floor, 44 = comfort)

FOUR STATES       empty (→ next action) · loading (skeleton/blur-up) ·
                  error (recoverable, AMBER for answers) · success (reward)

COLOR SEMANTICS   laurel = correct/primary · amber/gold = warn/again
                  aegean = active/select · RED = destructive-delete ONLY
                  parchment ground stays readable; art+equation are hero.
```

### 4.3 The Design-Engineering Playbook (the AI-agent procedure)

```
BUILD-A-PREMIUM-SURFACE — run this every time you create or edit UI:

0. AESTHETIC CHECK. Re-read the palette/type contract in app.css. Bucket is
   classical/editorial (bone/basalt/aegean/gold, Cinzel/Fraunces). When any
   pattern conflicts with the aesthetic, the aesthetic wins.

1. TOKENS FIRST. Pull every color, space, type-size, radius, duration, and
   easing from :root tokens. If a value isn't a token yet, ADD the token —
   never inline a literal.

2. ONE HERO, ONE ACTION. Identify the single piece of content that is the hero
   (concept/art/equation) and the single primary action. Everything else recedes.

3. PRIMITIVE, DON'T REINVENT. For any dialog/popover/tooltip/tabs/drawer reach
   for Radix (behavior) or Vaul (drawer); for list motion reach for AutoAnimate;
   for numbers reach for number-flow. Hand-roll only what no primitive covers.

4. DESIGN ALL FOUR STATES before calling it done: empty (→ next action),
   loading (skeleton/blur-up, never a spinner), error (recoverable, amber for
   answers), success (the reward). A surface with one state is unfinished.

5. MOTION BY THE CHEAT-SHEET. transform+opacity only; ease-out for entrances;
   < 300ms routine, 400–500ms ONLY for unlock/celebration; stagger 48ms; spring
   only where the user drags. Add the prefers-reduced-motion fallback in the
   same commit.

6. FEEDBACK < 100ms. Every interaction gets visual confirmation immediately;
   key events (correct/incorrect/unlock) also fire a system haptic. Wrong answers
   are AMBER and name the misconception — never red, never punishing.

7. ACCESSIBILITY IN THE SAME PASS. ≥44px targets, visible :focus-visible ring,
   keyboard nav, alt-text/labels, ≥4.5:1 contrast, never color-only encoding.

8. SCORE IT. Run the §4.1 rubric. Ship at ≥26/30. Below that, fix the lowest
   line items before merging.

9. WATCH IT SLOW. Play the interaction at 0.25× (DevTools) to catch timing/jank
   the eye misses at full speed. Test the drag on a real touch device.
```

---

## PART 5 — PRIORITIZED UX-UPGRADE PLAN FOR BUCKET ACADEMY (top 10)

Ranked by **impact ÷ effort**, each tied to a file/surface. (L/M/H = effort.)

| # | Upgrade | Surface / file | Effort | Why it's high-leverage |
|---|---|---|---|---|
| 1 | **The unlock animation** — node fills, edge draws trigger→target, pulse — as a real GSAP/Motion sequence | `.graph`/`.node` in `app.css` + map component | M | The one thing *no competitor has* (UX-SPEC #7). Makes leverage visible; the core "why am I learning this" payoff. |
| 2 | **Add the motion token block + retoken** ad-hoc curves/durations | `:root` in `app.css` (§1.2) | L | Unlocks consistency for *every* subsequent animation; one small diff, system-wide payoff. |
| 3 | **Design the four states** (skeleton + blur-up art + empty-state component) | `app.css` `.skeleton`/`.empty` (§2.3 items 7–8) | M | Closes the biggest Apple-grade gap (§2.4). "Never a blank, never a spinner." |
| 4 | **Contrast fix** — darken `--ink-faint` to ~4.6:1; raise `.lang-chip` to 44px | `app.css` lines 12, 223 | L | A real accessibility bug today (small faint text fails AA). Trivial fix, legal/quality win. |
| 5 | **Share-card composer** with scale-in + gold sheen, deep-link back | new share component + `.art` styles | M | The growth engine (UX-SPEC #10); offered at the success peak; closes the acquisition loop. |
| 6 | **Shared-element map↔atom transition** + Cytoscape preset shell layout | map component + Cytoscape.js | H | Continuity = "where am I" never lost; the curated layout is the hairball fix (UX-CASE-STUDIES §7). |
| 7 | **Visible focus rings + keyboard nav pass** | `--focus` token applied across `app.css` | L | Required for Apple-grade + WCAG; currently missing entirely. |
| 8 | **Drill feedback choreography** — laurel checkmark draw / amber shake + soft haptic | `.answer`/`.rate` in `app.css` | L | The single most important emotional moment (UX-SPEC §6.3); amber is in CSS but the motion isn't. |
| 9 | **XP roll-up + restrained gold-mote celebration** (number-flow + sparse tsParticles) | `.celebrate` + XP component | M | Duolingo's dopamine coupling, on-aesthetic (classical motes, not confetti cannon). |
| 10 | **Stagger fade-up on study-block scroll reveal** (IntersectionObserver, once) | `.study-block` in study/read mode | L | Cheapest "this feels crafted" win; editorial calm; pure polish. |

**Sequencing note:** ship **#2 and #4 first** (token block + contrast — both `L`, both enabling),
then the earned moments (**#1, #8, #9**), then the structural map work (**#6**, the one `H`).

---

## Sources

Motion & craft:
- Apple HIG · Motion — https://developers.apple.com/design/human-interface-guidelines/foundations/motion
- iOS 26 motion design guide (Medium) — https://medium.com/@foks.wang/ios-26-motion-design-guide-key-principles-and-practical-tips-for-transition-animations-74def2edbf7c
- Material Design 3 · Easing & duration — https://m3.material.io/styles/motion/easing-and-duration
- Material Design 3 · Motion overview — https://m3.material.io/styles/motion/overview/how-it-works
- Emil Kowalski · Great animations — https://emilkowal.ski/ui/great-animations
- Emil Kowalski · Design-engineering SKILL — https://github.com/emilkowalski/skill/blob/main/skills/emil-design-eng/SKILL.md
- Emil Kowalski · animations.dev / portfolio — https://emilkowal.ski/
- Micro-interactions & motion 2025/2026 (Primotech) — https://primotech.com/ui-ux-evolution-2026-why-micro-interactions-and-motion-matter-more-than-ever/

Design systems & tokens:
- Design system tokens 2025 deep dive (Design Systems Collective) — https://www.designsystemscollective.com/the-evolution-of-design-system-tokens-a-2025-deep-dive-into-next-generation-figma-structures-969be68adfbe
- Typography systems step-by-step (designsystems.surf) — https://designsystems.surf/articles/typography-system-101-a-step-by-step-guide
- Proportional typographic scale via tokens (Penpot) — https://penpot.app/blog/using-design-tokens-for-a-proportional-typographic-scale/
- Color consistency / WCAG AA (UXPin) — https://www.uxpin.com/studio/blog/color-consistency-design-systems/

Libraries:
- Motion (motion.dev) docs — https://motion.dev/docs/react · npm — https://www.npmjs.com/package/motion
- GSAP now free (CSS-Tricks) — https://css-tricks.com/gsap-is-now-completely-free-even-for-commercial-use/ · Webflow blog — https://webflow.com/blog/gsap-becomes-free
- AutoAnimate — https://github.com/formkit/auto-animate · https://auto-animate.formkit.com/
- Radix vs shadcn vs Base UI — https://www.subframe.com/tips/shadcn-vs-radix-d26d1 · https://dev.to/edriso/shadcn-vs-radix-vs-base-ui-which-one-should-a-junior-pick-in-2026-1jml
- React UI libs 2025 (Makers' Den) — https://makersden.io/blog/react-ui-libs-2025-comparing-shadcn-radix-mantine-mui-chakra
- Vaul — https://github.com/emilkowalski/vaul · Sonner — https://github.com/emilkowalski/sonner
- Lucide vs Phosphor — https://allsvgicons.com/compare/phosphor-vs-lucide/
- Graph viz: Cytoscape vs Sigma vs vis-network — https://www.pkgpulse.com/blog/cytoscape-vs-vis-network-vs-sigma-graph-visualization-javascript-2026
- React graph viz comparison (Skywork/Focal) — https://skywork.ai/skypage/en/Focal-AI-A-Deep-Dive-into-the-Best-Graph-Libraries-Network-Visualization/1976807925743284224
- tsParticles — https://github.com/tsparticles/tsparticles

Foundational (from UX-CASE-STUDIES.md, carried forward):
- Apple Human Interface Guidelines — https://developer.apple.com/design/human-interface-guidelines/
- Obsidian graph view critique (Code Culture) — https://codeculture.store/blogs/developer-culture/obsidian-graph-view-useful
</content>
</invoke>
