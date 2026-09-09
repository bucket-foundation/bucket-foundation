# Figure Captions

## fig_architecture

The hypothesis engine's generation loop. Retrieval envelopes ground evidence
spans, which populate the claims graph; the combinatorial generator draws
placement and sequence hypotheses through four generator kinds, cluster,
gap, contradiction, and cross-period, plus the unknown-unknown generator,
which proposes slot values outside the current vocabulary. Surviving
hypotheses pass through the critic and preservation critic, a belief
scorer feeds the ranking tournament, and the evolver recombines, splits,
and generalizes the frontier before meta-review and self-report close the
run. The gap-node value-of-information queue reads the self-report and
routes back into retrieval. Sources: HISTORY-HYPOTHESIS-ENGINE-SPEC.md §5
and IDEAL-STATE-AND-UNKNOWNS-SPEC.md §5, §7.

## fig_hypothesis_space

Placement-space and sequence-space size, |H| and |H_seq|, at three
vocabulary scales on a log axis. The realistic scale uses the vocabulary
sizes TIMELINE-AND-COMBINATORICS-SPEC.md §3 names for a working corpus,
ACTOR=40, ACTION=50, OBJECT=300, PLACE=120, TIME_BIN=200, MECHANISM=25,
which give |H| ~ 3.6e11 and |H_seq| = 13|H|^2 ~ 1.7e24, annotated on the
chart. The small and large scales hold vocabulary sizes an order of
magnitude below and above the realistic scale on each axis, to show how
fast the address space grows as the corpus names more actors, actions,
objects, places, time bins, and mechanisms. Source: TIMELINE-AND-
COMBINATORICS-SPEC.md §3.

## fig_opinion_triangle

The subjective-logic opinion triangle, vertices belief, disbelief, and
uncertainty, with the Catalhoyuk farmers-versus-extraterrestrials worked
example. Each opinion (b, d, u) plots at its barycentric position; the
projected probability P = b + a*u for a base rate a reads off the base
edge along the line through the opinion point that runs parallel to the
segment from the uncertainty vertex to the base-rate point (a, 0) on that
edge. After pooling three evidence items, the farmers reading lands at
b=0.756, u=0.244, a=0.924, P=0.982; the extraterrestrial reading lands at
d=0.756, u=0.244, a=0.0015, P=0.00037. Source: IDEAL-STATE-AND-UNKNOWNS-
SPEC.md §2.

## fig_evidence_accumulation

Belief b, disbelief d, uncertainty u, and projected probability P against
the number of independent evidence items n, for one hypothesis at a fixed
tier weight and an uninformative base rate a=0.5. Panel (a) accumulates
supporting evidence only; panel (b) mixes support and refutation at a 2:1
ratio. Both panels use r/(r+s+W) with W=2 and the diminishing-returns
discount D(n) = 1 + 0.5*ln(1+n) applied to each side's evidence weight
before it enters r and s. Source: IDEAL-STATE-AND-UNKNOWNS-SPEC.md §2.

## fig_timeline_view

A schematic per-bin timeline export across three time bins on the
astronomical-year axis. Each bin holds its ranked placement hypotheses as
horizontal bars, bar length is the hypothesis's own interval and bar shade
is its projected probability P; the numbered key below each bin gives the
short label and P value a bar's rank badge points to. The Younger Dryas
and Early Holocene bins reuse the exact intervals and P values from the
cataclysm-diffusion worked example (HISTORY-HYPOTHESIS-ENGINE-SPEC.md §3)
and the Catalhoyuk farmers/extraterrestrials opinion (IDEAL-STATE-AND-
UNKNOWNS-SPEC.md §2); the Mid Holocene bin is a schematic illustration of
the same view. The arrow spanning the first two bins is a sequence
hypothesis, drawn with its Allen relation, reusing TIMELINE-AND-
COMBINATORICS-SPEC.md §1's own example edge, rel-yd-precedes-holocene,
before, confidence 0.95. Source: TIMELINE-AND-COMBINATORICS-SPEC.md §1, §5.

## fig_detectability

A toy detectability table delta(period, evidence kind), one slice of the
per-period, per-medium, per-region table IDEAL-STATE-AND-UNKNOWNS-SPEC.md
§4 defines to scale absence evidence, e_absence = delta * e_raw_absence,
in place of a flat tier. Rows run from the Upper Paleolithic to the Iron
Age and Classical period; columns are the nine evidence kinds of TIMELINE-
AND-COMBINATORICS-SPEC.md §4. Values are illustrative: textual
detectability sits near zero before writing and rises once a period has a
literate record, while genetic detectability rises toward the present.
Source: IDEAL-STATE-AND-UNKNOWNS-SPEC.md §4.

## fig_missing_mass

Good-Turing missing mass f1/N against the number of generation runs, with
the Chao1 richness estimate S_est = S_obs + f1^2/(2*f2) on a second axis,
for a simulated generator drawing from a Zipf-distributed pool of 5,000
addressable hypotheses. The dashed reference line marks the pool's true
size, known here because the pool is simulated; the Chao1 curve's gap
below that line after 60 runs of 40 draws each shows how far an early
coverage estimate sits from the address space's real size, the caution
IDEAL-STATE-AND-UNKNOWNS-SPEC.md §8 raises against reporting "the full
set" without an interval. Source: IDEAL-STATE-AND-UNKNOWNS-SPEC.md §6b, §8.
