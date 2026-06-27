# Concept node — Chemiosmosis / Proton-Motive Force / Redox Bioenergetics

> **Type:** foundation-principle (canon concept node, not a figure card)
> **Branch:** 05-biophysics · **Cross:** 03-chemistry, 02-physics (thermodynamics)
> **Added:** 2026-06-27 (pass-3 bioenergetics promotion; founder-approved)
> **Source memo:** `_intake/health-longevity-fitness/00-map/CANON-BRIDGE-PROPOSAL.md` §3b, §5
> **Figure cards:** `canon-figures/05-biophysics.md` → `mitchell`, `moyle`, `krebs`, `lane`,
> `martin-william`, `margulis`, `wallace-doug`, `szent-gyorgyi`

This is the first **concept node** in the 05-biophysics canon: a law that the outcome
layer can `canon_link` UP to without routing through any single figure card. Mitchell's
*card* already exists; what did not exist is a figure-independent statement of the law the
health/longevity domains consume. This file is that node.

---

## 1. Statement of the law

**Living cells transduce energy by pumping protons (H⁺) across a thin, ion-impermeable
membrane, storing free energy as an electrochemical proton gradient — the proton-motive
force (pmf) — and then spending that gradient to do work, principally to synthesize ATP.**

Formally, the proton-motive force is

```
Δp  =  Δψ  −  (2.303 RT / F) · ΔpH
```

where `Δψ` is the transmembrane electrical potential and `ΔpH` is the transmembrane pH
difference. Redox energy released by electron transfer down the respiratory (or
photosynthetic) chain is conserved as `Δp`; **ATP synthase** runs that gradient back
downhill as a rotary molecular turbine, phosphorylating ADP → ATP. The coupling is
*chemiosmotic* — energy passes between redox chemistry and phosphorylation **through a
vectorial gradient across a membrane**, not through a soluble high-energy chemical
intermediate.

Equivalently: bioenergetics is **redox + topology**. Electron flow (redox) is made to do
useful work only because it is spatially organized (topology — protons moved from one side
of a membrane to the other). This is why the principle is properly named *redox
bioenergetics* as well as *chemiosmosis*.

---

## 2. Why this is foundation-tier (not outcome-tier)

By the canon's own test (`CANON-BRIDGE-PROPOSAL.md` §4): a contribution is foundation-tier
if it is an **axiom, law, primary derivation, or structural identification that becomes the
substrate of further work**, and outcome-tier if it is an application, association,
biomarker, protocol, or clinical claim that *consumes* such a foundation.

Chemiosmosis is a **law of how life moves energy**. It is mechanism-level, universal across
all three domains of life (bacteria, archaea, eukaryotes) and across both respiration and
photosynthesis, derived from first principles (electrochemistry + membrane topology), and
it is the substrate on which an entire downstream literature stands. It is not an
application of anything more fundamental in biology — it *is* the fundamental. That is the
bar this branch sets.

It is also the **uncontested spine** that connects the contested end of the inherited
biophysics layer (structured water, biophotons, nnEMF, melanin) to textbook mitochondrial
medicine. Anchoring the branch on this law is what lets 05-biophysics be rigorous at its
core and explicit about its frontier.

---

## 3. Key derivations and the proof chain

| Step | Who | What | Year |
|---|---|---|---|
| **Hypothesis** | Peter Mitchell (`mitchell`) | Chemiosmotic coupling: ATP synthesis is driven by a transmembrane electrochemical proton gradient, not a chemical intermediate. *Nature* 191:144. | 1961 |
| **Experimental proof** | Mitchell & **Jennifer Moyle** (`moyle`) | Measured H⁺ translocation stoichiometries (H⁺/O, H⁺/ATP), Δψ and ΔpH across the mitochondrial inner membrane — converting the hypothesis into a quantitatively demonstrated mechanism. | 1965–1969 |
| **Upstream substrate** | Hans Krebs (`krebs`) | The citric-acid cycle delivers the reducing equivalents (NADH, FADH₂) that feed the respiratory chain whose electron flow powers the proton pumping. | 1937 |
| **Precursor acids** | Albert Szent-Györgyi (`szent-gyorgyi`) | The C4 dicarboxylic acids Krebs assembled into the cycle. | 1930s |
| **Molecular turbine** | Boyer (binding-change), Walker (F₁ structure) | ATP synthase confirmed as a rotary motor running on Δp. Nobel 1997. | 1993–1994 |
| **Evolutionary origin** | Nick Lane (`lane`) + **William F. Martin** (`martin-william`) | Natural geochemical proton gradients at alkaline hydrothermal vents as the ancestral pmf; internal-genome energetics (mitochondria) as the license for eukaryotic complexity. | 1998–2010 |
| **Endosymbiotic carrier** | Lynn Margulis (`margulis`) | The mitochondrion — the membrane on which eukaryotic chemiosmosis runs — is an engulfed bacterium. | 1967 |
| **The bioenergetic genome** | Douglas C. Wallace (`wallace-doug`) | mtDNA as a distinct, metabolism-specific inheritance system. | 1980s–1999 |

Mitchell received the 1978 Nobel in Chemistry **alone**; the canon records Moyle's
co-equal experimental role as an attribution-parity correction (cf. the Franklin card).

---

## 4. Downstream outcome domains that consume this law

These live in the **outcome layer** (`_intake/health-longevity-fitness/02-domains/`) and
`canon_link` UP to this node. They are applications, biomarkers, or physiology that *rest
on* the proton-motive force — they are **not** promoted to canon (see `CANON-BRIDGE-PROPOSAL.md`
§3c).

- **B — Aging mechanisms** (`02-domains/B-aging-mechanisms.md`): "mitochondrial
  dysfunction" as a Hallmark of Aging; the free-radical / oxidative-damage theory and its
  mitohormetic correction are redox-signaling stories rooted in electron leak from the
  chain that builds Δp.
- **C — Genetics / omics** (`02-domains/C-genetics-omics.md`): mtDNA heteroplasmy, the
  mutator mouse, haplogroup metabolic adaptation — the genome *of* the chemiosmotic
  organelle (Wallace's bioenergetic genome).
- **D — Metabolic / nutrition** (`02-domains/D-metabolic-nutrition.md`): ketone signaling,
  AMPK, NAD⁺ redox cofactor cycling, metabolic flexibility = substrate load on the same
  chain. (NAD⁺ is the electron carrier that *feeds* Δp; the NAD-precursor supplement claims
  stay outcome-tier and contested.)
- **E — Exercise** (`02-domains/E-exercise.md`): mitochondrial biogenesis, VO₂max as
  integrated mitochondrial / oxidative capacity, the lactate shuttle, myokines.
- **H — Thermal** (`02-domains/H-thermal.md`): UCP1 / mitochondrial **uncoupling** in brown
  adipose tissue — deliberately dissipating Δp as heat is the textbook demonstration that
  the gradient is real and that respiration and phosphorylation are separable.

Each of these reaches up to the **same** place — Δp across the mitochondrial inner
membrane. That convergence is exactly why the bioenergetics lineage is the bridge between
the corpus's inherited biophysics foundations and mainstream geroscience.

---

## 5. Status

- **Foundation principle:** settled / textbook. Not contested.
- **Frontier extensions** (handled elsewhere, status `speculative`/`under-review`, not
  this node): structured/EZ-water coupling to the gradient (Pollack/Ling), deuterium
  fractionation at ATP synthase, nnEMF effects on membrane potential — see the contested
  cards in `canon-figures/05-biophysics.md` and `CANON-BRIDGE-PROPOSAL.md` §3d. Those rest
  *near* this law without being part of it.
