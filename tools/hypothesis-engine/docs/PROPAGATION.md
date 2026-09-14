# Retraction propagation and fragility

`hte.propagate` builds the derivation graph over a run's own survivors,
recomputes every dependent hypothesis's opinion when a root address is
retracted, and ranks how much of the population would move if any one
node collapsed.

## The rule

A hypothesis derives from another one of two ways: an explicit
`Hypothesis.depends_on` edge, or an evidence-derived edge, an
`EvidenceItem` naming this hypothesis whose own `Source.stemma_parents`
chain leads to a source that grounds a different hypothesis in the same
population. `build_derivation_graph` returns both as one child-to-
parent-set mapping.

A retraction never deletes a record. It adds one new `EvidenceItem`
refuting the retracted address, carrying the retracting source's own
tier and kind (`apply_retraction`), and stamps `retracted_by` on every
item that supported the retracted claim (`EvidenceItem.retracted_by`,
`Source.retracted_by`). The retracted hypothesis's own opinion moves
the ordinary way, through `hte.belief.score`, once that new refuting
item joins its evidence pool.

Its dependents move a different way. Nothing new refutes them. What
happens is that the evidentiary weight they inherited from the
retracted node stops counting at full strength: `propagate` walks the
derivation graph in topological order from the retracted root outward,
and at each hop scales the dependent's own pooled support and refute
weight `(r, s)` by its parent's CURRENT projected probability before
recomputing its opinion. A collapsed root drags its dependents toward
their own base rate `a`, with rising uncertainty `u`, never toward
disbelief `d`, because disbelief only rises when something NEW refutes
a claim, and nothing new refutes a dependent. The walk stops down any
branch the moment a node's own move sits at or below the convergence
threshold (0.05 by default): a node barely touched has nothing worth
passing further downstream.

Fragility ranks the other side of the same graph: how much a node
would cost the population if it turned out to be the one that
collapsed.

## The equations

Per-hop damping, the product taken along the derivation chain, using
each hop's own CURRENT (already-damped) parent probability rather than
the root's number raised to a power:

```
derived_weight(item) = base_weight(item) * P(parent)
```

The recomputed opinion for a dependent hypothesis `h` with active
parents `p_1 .. p_k`:

```
damp = P(p_1) * P(p_2) * ... * P(p_k)
r' = base_r(h) * damp
s' = base_s(h) * damp
omega'(h) = Opinion.from_evidence(r', s', W, a(h))
```

`Opinion.from_evidence`'s own denominator is `r + s + W`. As `damp`
shrinks toward 0, that denominator shrinks toward `W` alone, so `u`
rises toward 1 and `P(h) = b + a*u` slides toward `a`. `d` never moves
under this recompute, since scaling an existing `s` of 0 by any factor
is still 0; `d` only rises for the node an actual new refuting item was
added to.

Fragility:

```
fragility(address) = fan_out(address) * (1 - independent_support_share(address))
```

`fan_out(address)` is the address's own direct dependent count in the
derivation graph. `independent_support_share(address)` credits at most
one representative item's weight per (evidence kind, stemma component)
pair among the address's own supporting evidence, the same stemma
discount `hte.belief.pooled_weight`'s `D(n_eff)` term already applies to
scoring, read here for how much of a node's own credence rests on a
single witness copied several times rather than on independent lines
of corroboration.

## The founder's question, worked

*A node held at high credence that serves as evidence for others turns
out false. How does that move its nearest and further neighbors?*

Take a root `R` with two `T1` items sharing one stemma archetype
(thin, doubled-up corroboration: one witness, cited twice).
`P(R) = 0.865` before anything happens. `A` and `B` each `depend_on`
`R` directly, one hop away; `C` depends on `A`, two hops away; `D`
carries its own support from two independent evidence kinds and has no
edge to anything. `A`, `B`, and `C` each start at `P = 0.751`, on their
own single, independent item of evidence.

Retract `R`: two independent debunking items land, of two different
evidence kinds, refuting it. `R`'s own opinion moves the ordinary way,
scored fresh with the new refuting evidence on file: `P(R)` falls to
`0.444`, `d(R)` rising from `0` to `0.487`. That fall becomes the damp
factor for `R`'s own direct dependents.

`A` and `B` (one hop, `damp = P(R) = 0.444`): `P` moves from `0.751` to
`0.655`, closer to their shared base rate of `0.5`. `u` rises from
`0.498` to `0.690`. `d` stays exactly `0`, since neither ever carried
refuting evidence of its own; there was nothing to scale on that side.

`C` (two hops, `damp = P(A)_new = 0.655`, ALREADY the post-retraction
number, not `R`'s own raw number): `P` moves from `0.751` to `0.699`,
a move of `0.052` against `A`'s own move of `0.097`. Damping decays
with distance for exactly the reason the per-hop rule states: `C`'s
own discount is built from `A`'s own already-recovering probability,
not from `R`'s own more severe one.

`D`, with no path back to `R` at all, never enters the walk. Its own
opinion is untouched, `P(D) = 0.862` before and after.

Fragility, computed BEFORE any of this happens, already flags `R`:
`fan_out(R) = 2` (A and B both depend on it), `independent_support_
share(R) = 0.5` (one witness, cited twice), `fragility(R) = 1.0`. Every
other node in this graph reads `0.0`: `A` has one dependent (`C`) but
fully independent support of its own; `B`, `C`, and `D` have no
dependents at all. The node about to cost the most, if it turned out
to be the load-bearing false one, is the one flagged before the fall.

## Historical analogs

**Piltdown Man**, the 1912 fossil forgery presented as a missing link
between apes and humans, held wide scientific credence for over four
decades before Weiner, Oakley, and Clark's 1953 fluorine-dating and
microscopic analysis exposed the mandible as an orangutan jaw filed and
stained to match a human skull fragment (Weiner, Oakley & Clark, 1953,
*Bulletin of the British Museum (Natural History), Geology*, "The
Solution of the Piltdown Problem"). Work that depended on Piltdown Man
as attested evidence for a distinct, large-brained-early hominin lineage
in Britain, rather than treating it as one contested find among several,
lost its own evidentiary basis the moment the fossil did; work that had
independent skeletal evidence for early hominin evolution elsewhere (Java
Man, the Taung Child, and later finds) was undisturbed, since its own
support never routed through Piltdown at all. Piltdown is the root-node
case: one high-tier, thinly-corroborated find, cited as settled ground
by everything downstream of it.

**Wakefield et al., 1998**, *The Lancet*, "Ileal-lymphoid-nodular
hyperplasia, non-specific colitis, and pervasive developmental disorder
in children," retracted in full by *The Lancet* in 2010 after a UK
General Medical Council finding of data manipulation (the paper had
already been partially retracted by ten of its co-authors in 2004,
Murch et al., "Retraction of an interpretation," *The Lancet* 363).
Downstream literature that cited Wakefield 1998 as its SOLE support for
a causal MMR-autism link collapsed with it, exactly the "drag to base
rate" case above: nothing NEW refuted those citing claims directly, but
the one paper their own evidentiary weight rested on stopped counting.
Downstream literature with independent replication, the large Danish
and other cohort studies that had already failed to find the same
association on their own data, was untouched: it never depended on
Wakefield 1998 in the first place. Wakefield is the retraction-event
case this module's own `apply_retraction` models directly: a `refutes`
item at the retracting body's own tier, laid over the original record
rather than erasing it.
