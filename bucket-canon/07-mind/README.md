# 07-mind — Canon Branch

## Scope

The mind canon holds **foundational statements of laws, principles, models,
and primary derivations** governing perception, cognition, decision, and the
computational organization of mental life. The unit of inclusion is the
primary text in which a mechanism, a model, or a constitutive question is
first stated by its originator (or stated in its now-canonical form).

The seven sub-domains in scope:

1. **Perception** — perception-as-inference, ecological perception, the
   computational theory of vision. Helmholtz's unconscious-inference
   doctrine is the founding text.
2. **Computational theory of mind** — the symbolic-computation hypothesis,
   the imitation game, the language-of-thought hypothesis, and the
   neuron-as-logic-element primary.
3. **Predictive brain / Bayesian brain** — the family of theories in which
   the brain is treated as an inference engine over generative models.
   Predictive coding, free-energy, hierarchical Bayesian cortex.
4. **Decision theory and cognition** — the foundations of human judgment
   under uncertainty, prospect theory, the heuristics-and-biases program,
   subjective expected utility.
5. **Philosophy of mind** — the constitutive questions: the hard problem,
   the access/phenomenal distinction, the Chinese Room, functionalism,
   what-it-is-like.
6. **Neuroscience of cognition** — systems-level neuroscience that bears
   directly on cognitive function: Hebbian assemblies, split-brain,
   episodic-vs-semantic memory, neural selectionism.
7. **Language and thought** — the foundations of analytic philosophy of
   language and generative grammar where they bear on theories of mind:
   sense and reference, denotation, the generative-grammar primary.

It does **NOT** hold:

- Clinical psychiatry, diagnostic manuals, or pharmacology of mental
  illness (those are downstream applications, not foundations)
- Popular self-help, productivity, or motivation writing
- AI policy, alignment manifestos, or commercial-ML benchmark results
- Contemporary deep-learning architecture papers (transformers, diffusion
  models, RLHF) — these are engineering, not foundations of mind
- Histories or biographies of psychologists and philosophers (those are
  candidate material for `08-deep-history/`)
- Therapy-tradition primary texts (Freud, Jung, Beck) at this pass — see
  `TAXONOMY_NOTES.md` open question on whether psychodynamic theory has a
  canon-tier originator entry or sits entirely in landscape

## Promotion rule

Material enters `07-mind/` only when one of the following holds:

1. **c1 — primary statement by the originator.** The text in which the
   model, doctrine, distinction, or constitutive question first appears in
   its canonical form, by the author who introduced it. Examples: Helmholtz
   1867 (vol. 3, unconscious inference), Turing 1950 (imitation game),
   McCulloch–Pitts 1943, Marr 1982, Chalmers 1995, Searle 1980.
2. **c2 — recognized academic edition-of-record of a c1 text.** Translations,
   collected-works editions, and authoritative reprints counted as the
   citable surface. Examples: Southall's English translation of Helmholtz's
   *Treatise on Physiological Optics* (Optical Society of America,
   1924–1925, reprinted Dover 1962); Copeland ed. *The Essential Turing*
   (Oxford 2004) for the 1950 *Mind* paper.
3. **c3 — discipline-standard normative reference or pedagogical-primary
   monograph.** A small, named class. Two examples qualify today:
   - Marr 1982 *Vision* (W.H. Freeman) as the founding monograph of
     computational vision by its originator.
   - The Stanford Encyclopedia of Philosophy as the living reference
     surface for philosophical entries (linked, not mirrored).

Survey papers, textbooks below the discipline-standard tier, popular
science books, and retrospective monographs by non-originators do not
promote. Pinker's syntheses, Damasio's monographs, Hofstadter's *Gödel,
Escher, Bach*, Dehaene's *Consciousness and the Brain*, Kahneman's
*Thinking, Fast and Slow* — landscape-tier, cite freely, do not mirror.

## Boundary calls

### vs `04-information/`

The cleanest carving is by *what the explanandum is*. A result about what
any computation can in principle achieve — a learning bound, an
impossibility theorem, a complexity class — lives in `04-information/`. A
result about how the brain or mind in fact computes, perceives, decides, or
represents — even when the formal apparatus is identical — lives here.

VC theory and PAC learning are `04-information/learning-theory/`. The
Bayesian-brain and free-energy programs are `07-mind/predictive-brain/`.
Reinforcement learning as a formal framework (Sutton–Barto axiomatics) is
`04-information/learning-theory/` candidate landscape; the Schultz–Dayan–
Montague 1997 dopamine-prediction-error result is here, because the
explanandum is the midbrain dopaminergic system.

McCulloch–Pitts 1943 is dual-primary by founder-decision precedent: the
*nervous-system* claim is canon here; the *logical-calculus* claim is
cross-linked from `04-information/computation/`.

Turing 1950 ("Computing Machinery and Intelligence," *Mind* 59) lives here.
Turing 1936 ("On Computable Numbers," *Proc. Lond. Math. Soc.*) lives in
`04-information/computation/`. The papers ask different questions about
different objects; both branches cross-link.

### vs `05-biophysics/`

The boundary is the level of organization. At the membrane, ion-channel,
and single-action-potential level, biophysics. At the systems-and-cognition
level — perception, memory, decision, attention, consciousness — mind.
Hodgkin–Huxley 1952 is biophysics canon with a cross-link from here. Hebb
1949 *The Organization of Behavior* is mind canon (cell assemblies,
phase sequences) with a cross-link to biophysics.

### vs `01-mathematics/foundations/`

Frege 1892 *Über Sinn und Bedeutung* is the hardest call in this pass. The
sense/reference distinction is foundational both for analytic philosophy of
language and for theories of mental content. Pass-1 places Frege 1892 here
in `language-and-thought/` because the philosophical-of-mind use is the
larger downstream cone, and adds a cross-link to `01-mathematics/
foundations/` where Frege's *Begriffsschrift* (1879) and *Grundgesetze*
(1893–1903) properly sit. Russell 1905 *On Denoting* (*Mind* 14) follows
Frege here for the same reason.

### vs `09-art/perception/`

The Helmholtz Handbuch is dual-primary by founder-decision precedent.
Physiological optics and acoustics — the *substrate* of perception of art
objects — live in `09-art/perception/`. The doctrine of unconscious
inference as a *cognitive* theory of perception lives here in
`07-mind/perception/`. The same edition-of-record (Southall trans., OSA
1924–1925) is mirrored from both sides; both `CANON_INDEX.md` files list
it with explicit cross-link.

## Subfolders (proposed)

- `perception/` — Helmholtz 1867, Gibson 1950/1979, Marr 1982
- `computational-theory/` — McCulloch–Pitts 1943, Turing 1950,
  Newell–Simon 1976, Fodor 1975
- `predictive-brain/` — Mumford 1992, Rao–Ballard 1999, Knill–Pouget 2004,
  Friston 2010
- `decision-theory/` — Savage 1954, Tversky–Kahneman 1974, 1979
- `philosophy-of-mind/` — Nagel 1974, Searle 1980, Block 1995, Chalmers 1995
- `neuroscience-of-cognition/` — Hebb 1949, Sperry 1968, Tulving 1972,
  Schultz–Dayan–Montague 1997
- `language-and-thought/` — Frege 1892, Russell 1905, Chomsky 1957/1965
- `reference/` — Stanford Encyclopedia of Philosophy pointer; no mirrors

## Status

Branch opened 2026-05-01 by the mind sweep at
`_intake/mind-canon-pass-1-2026-05-01.md`. No files yet promoted.
`CANON_INDEX.md` is seeded as a manifest skeleton. `_intake/` is the
holding area for sweep memos and pre-promotion artifacts. Sub-folder
scaffolding is deferred to pass-2.
