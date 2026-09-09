# Timeline and Combinatorics Spec

Status: DRAFT. Date: 2026-09-09. Companion to `HISTORY-HYPOTHESIS-ENGINE-SPEC.md`.

A hypothesis in this engine lives on a timeline. Every hypothesis takes one of two base forms: a placement, "event E happened in time interval T," or a sequence, "E1 then E2." Causal and co-occurrence hypotheses are derived forms of these two, read off the same interval algebra. This spec defines the timeline substrate the hypotheses sit on, the concept vocabulary that fills their slots, the combinatorial function that addresses every possible hypothesis, and the truth-score extension that sums evidence by kind. Generation is complete and independent of what the literature supports. Pruning happens only when a hypothesis is scored or displayed.

## 1. Timeline Data Structure

The engine's time axis is a signed integer line in astronomical years: year 0 exists, and there is no gap between 1 BCE and 1 CE the way the historical BC/AD count has one. A historical year n BCE maps to astronomical year -(n-1); n CE maps to astronomical year n. Every interval carries an ISO 8601 expanded-format string (`+007000`, `-012900`) alongside the integer, so downstream tools round-trip without re-deriving the sign convention.

Calendar systems (Julian, Gregorian, Hebrew, Hijri, and the rest of `TIMELINE-MODEL.md §2`'s `date.calendar` enum) map onto this axis through a converter per calendar. A contested conversion becomes a `dating_claim`, per the existing rule, surfaced alongside the event.

A resolution ladder buckets any point on the axis at five widths: year, decade, century, millennium, era. `period.level` (engine spec §4) already names four of these; era sits above period as the fifth.

Uncertainty on an interval carries a full distribution, always, instead of one number:

```jsonc
"interval": {
  "start": {"year": -12900, "calendar": "proleptic-gregorian", "precision": "century"},
  "end":   {"year": -9700,  "calendar": "proleptic-gregorian", "precision": "century"},
  "uncertainty": {
    "distribution": "point|uniform|normal|oxcal-posterior",
    "params": {},              // {} for point, {min,max} for uniform, {mean,sigma} for normal, {model_id} for oxcal-posterior
    "pdf_samples": []          // oxcal-posterior only: [{year, density}, ...], the curve behind hpd_68/hpd_95
  }
}
```

`distribution: "point"` is the default and needs no params. `oxcal-posterior` carries `pdf_samples`, the sampled curve behind the `date_posterior.hpd_68`/`hpd_95` summary the engine spec already writes onto period nodes.

**Event and period nodes** keep the shapes already on file (`TIMELINE-MODEL.md §2`, engine spec §4) and grow the `uncertainty` sub-object above as an optional field:

```jsonc
// event
{ "id": "ev-catalhoyuk-shrine-building", "node_type": "timeline_event", "level": "event",
  "parent": "per-early-holocene", "date": { "value": "-7000", "precision": "century",
  "calendar": "proleptic-gregorian", "uncertainty": { "distribution": "uniform", "params": {"min": -7100, "max": -6900} } } }

// period
{ "id": "per-early-holocene", "node_type": "period", "level": "period",
  "parent": "era-holocene", "interval": { "start": {"year": -9700, "precision": "century"},
  "end": {"year": -6900, "precision": "century"} } }
```

**Allen's 13 interval relations** are the relation vocabulary for every sequence hypothesis and every edge between two dated nodes: `before`/`after`, `meets`/`met-by`, `overlaps`/`overlapped-by`, `starts`/`started-by`, `finishes`/`finished-by`, `during`/`contains`, `equals`. An edge is a claim like any other:

```jsonc
{ "id": "rel-yd-precedes-holocene", "node_type": "interval_relation",
  "relation": "before", "from": "per-younger-dryas", "to": "per-early-holocene",
  "confidence": 0.95, "derived_from": "date_posterior" }
```

**Nesting.** A period tree runs era, period, event, year, each level a `parent` pointer to the level above, the chain `TIMELINE-MODEL.md`'s `P361_part_of` already encodes:

```
era-holocene
  -- per-early-holocene                    (parent: era-holocene)
       -- ev-catalhoyuk-shrine-building     (parent: per-early-holocene)
            -- yr--7000                     (parent: ev-catalhoyuk-shrine-building, level: "year")
```

A period can carry more than one `parent` when two chronologies frame it differently: `parent` is one pointer per framing, per the existing rule in engine spec §4, so a period node can sit under two eras at once.

**Pulled from QAD v0.11:** an `oxcal-posterior` distribution's `pdf_samples` and any `dating_claim` above trace back to the retrieval envelope that supplied the radiocarbon date or documentary source, via the `RetrievalRun` id from engine spec §8's `retrieval.py`. A period's `date_posterior` is only as good as the dated observations feeding its OxCal phase model; linking each observation to an immutable envelope means a later re-fetch cannot silently change a phase model's inputs without a new `run_id` showing up in the model's provenance.

## 2. Concept Ontology

A hypothesis is a slot frame: ACTOR, ACTION, OBJECT, PLACE, TIME, MECHANISM, RELATION. The first six fill a placement hypothesis; RELATION fills a sequence hypothesis only, drawn from the 13 relations in §1.

Each slot value is a `concept` node carrying its own base rate, a stored, editable number in place of an assumption buried in code:

```jsonc
{
  "id": "concept-actor-extraterrestrials",
  "node_type": "concept",
  "slot": "ACTOR",
  "label": "Extraterrestrials",
  "consensus_status": "non-consensus",   // majority-scholarly|minority-scholarly|traditional|fringe|non-consensus
  "prior_logit": -4.0,
  "prior_rationale": "No independent physical, genetic, or documentary trace of a non-human actor in the archaeological or textual record.",
  "editable_by": "founder",
  "added_on": "2026-09-09"
}
```

`consensus_status` extends the `stance` vocabulary `ENTITY-MODEL.md §5` already uses on claims (`majority-scholarly`, `traditional`, `fringe`), so an actor's standing reads on the same scale as a claim's.

The ACTOR slot spans two registers. Human cultures and polities (`neolithic-farmers-anatolia`, `egyptian-old-kingdom-workforce`, one node per culture or polity the corpus names) sit alongside a fixed set of non-consensus actors, first-class concept nodes on the same footing: `extraterrestrials`, `lost-advanced-civilization`, `deity-literal-agent` (a deity modeled as a physically intervening agent, distinct from a `figure`/`entity`'s narrated role in `ENTITY-MODEL.md`), `natural-cataclysm` (a non-agentive actor for hypotheses with no intentional actor at all), and `unknown-actor` (a placeholder for "someone did this," carried at a near-neutral prior so the address space never forces a premature identification). Each of these five carries a `prior_logit` a founder can edit; none is generated by the engine and none is deleted by it.

## 3. The Combinatorial Function

The address space is complete before any evidence is read. A placement hypothesis is one point in

```
H = ACTOR x ACTION x OBJECT x PLACE x TIME_BIN x MECHANISM
```

A sequence hypothesis is one point in

```
H_seq = H x ALLEN_RELATION x H
```

With vocabulary sizes a working corpus this size can reach, ACTOR=40 (thirty human polities plus ten concept-ontology actors), ACTION=50, OBJECT=300, PLACE=120, TIME_BIN=200 (century bins across a 20,000-year span), MECHANISM=25: `|H| = 40 x 50 x 300 x 120 x 200 x 25 ~ 3.6 x 10^11`. `|H_seq| = 13 x |H|^2 ~ 1.7 x 10^24`. No process can materialize a space this size. The engine must address a point without visiting it.

**Address scheme.** Fix the first thirteen primes in slot order: 2, 3, 5, 7, 11, 13 for a placement; append 17 for RELATION and 19, 23, 29, 31, 37, 41 for the second placement in a sequence. Index each slot's vocabulary from 0. A hypothesis's ID is the product of each prime raised to its slot's index plus one:

```
address(slots) = product of prime_k ^ (vocab_index(slot_k) + 1)
```

The fundamental theorem of arithmetic gives every integer one prime factorization, and the prime bases are fixed and known, so decoding is trial division by thirteen known primes: divide by 2 until it fails, record the exponent, divide by 3, and continue. This sidesteps general integer factoring entirely, since the bases are never a secret to recover. The ID is the slots; no lookup table stands between the two. The alternative is a SHA-256 hash of the same slot tuple: fixed-width, URL-friendly, and opaque. No `address()` call recovers the slots from a hash without a stored table. A hypothesis needs an ID before it is materialized, and that ID needs to decode without querying anything, so the prime encoding is canonical. Store the SHA-256 as `address_hash` alongside the prime integer as `address_prime`, a short display alias only.

```python
PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41]
PLACEMENT_SLOTS = ["ACTOR", "ACTION", "OBJECT", "PLACE", "TIME_BIN", "MECHANISM"]
SEQUENCE_SLOTS = PLACEMENT_SLOTS + ["RELATION"] + PLACEMENT_SLOTS

def address(slots: dict) -> int:
    order = SEQUENCE_SLOTS if "RELATION" in slots else PLACEMENT_SLOTS
    n = 1
    for prime, slot in zip(PRIMES, order):
        n *= prime ** (vocab_index(slot, slots[slot]) + 1)
    return n

def enumerate(evidence_cluster):
    # ACTOR, ACTION, MECHANISM draw the full closed ontology every pass,
    # exotic actors and mechanisms always included, evidence or none.
    # OBJECT, PLACE, TIME_BIN anchor to this cluster for this pass only;
    # the same three axes stay addressable in full through other passes
    # (an era sweep, an object sweep) that call address() directly.
    axes = {
        "ACTOR":     ALL_ACTORS,                    # includes EXOTIC_ACTORS
        "ACTION":    ALL_ACTIONS,
        "OBJECT":    objects_in(evidence_cluster),
        "PLACE":     sites_or_traditions_in(evidence_cluster),
        "TIME_BIN":  candidate_bins(evidence_cluster, resolution="century"),
        "MECHANISM": ALL_MECHANISMS,                # includes EXOTIC_MECHANISMS
    }
    for combo in product(*axes.values()):
        slots = dict(zip(axes.keys(), combo))
        yield Hypothesis(id=address(slots), slots=slots)
        # no filtering here: scoring and display prune; generation does not

def neighbors(h):
    for slot, current in h.slots.items():
        for candidate in vocab(slot):
            if candidate != current:
                mutated = {**h.slots, slot: candidate}
                yield Hypothesis(id=address(mutated), slots=mutated)
```

`enumerate` supersedes the cluster-bounded loop in engine spec §5: that loop's `has_min_evidence` gate and its evidence-drawn axes move downstream to scoring, and ACTOR, ACTION, and MECHANISM stop being evidence-drawn at all. `neighbors` is the evolver's one-slot mutation move set.

## 4. Truth Score as Additive Prime Knowledge

Evidence groups into nine irreducible, independent modalities, kinds of prime knowledge: material/archaeological, textual/documentary, genetic, linguistic, astronomical and radiometric dating, geological and climate, oral tradition and myth, iconographic, model-based inference. Engine spec §2 sums evidence as one pool; this spec sums it by kind first, then combines kinds:

```
S_+/- = X(K_+/-) . sum_kind  D(n_kind,+/-) . sum_i  k(tier_i) . e_i
L(h) = L_prior(h) + S_+ - S_- - mu . min(S_+, S_-) + Theta_temporal(h)
tau(h) = sigmoid(L(h))
```

`D(n) = 1 + lambda . ln(1+n)` and the tier weights `k(tier)` reuse the engine spec's constants exactly (lambda=0.5, T1..T6 = 2.0, 1.5, 1.0, 0.5, 0.25, 0.1); `mu=0.5` and `Theta_temporal` are unchanged. `K_+/-` is the count of distinct kinds carrying supporting or refuting evidence. `X(K)` is the cross-kind independence bonus: corroboration from two different kinds counts more than two clusters of one kind, the move `CANON-TRUTH-PATTERNS.md`'s non-obvious score already makes with branch distance. Group the nine kinds into three families: material trace (material/archaeological, genetic, iconographic), textual trace (textual/documentary, linguistic, oral tradition and myth), inference (astronomical and radiometric, geological and climate, model-based). `kind_distance` is 1 across families and 0 within one, and

```
X(K) = 1 + 0.3 . sum_pairs kind_distance(pair)
```

reuses the branch-distance coefficient directly.

**Pulled from QAD v0.11:** `e_i` in the sum above stops being one blended scalar. Each evidence item carries a small vector of separate similarity views instead: `e_i_semantic` (embedding cosine), `e_i_lexical` (fuzzy string match), `e_i_motif` (shared-motif count), and any later view a new extractor contributes, the way `scientific-discovery` keeps task-family, math, operator, and lexical views apart rather than folding structural similarity into one number (`STRUCTURE_DISCOVERY_V0.10.md`). Engine spec §2's original formula, `e_i = min(0.99, 0.40·cos + 0.25·fuz + 0.10·motif)`, becomes one named view, `e_i_blended_A`, kept exactly as written so every correlation already scored under it keeps its stored `confidence`. `k(tier_i) . e_i` in the sum above reads `k(tier_i) . e_i_blended_A` until a view-aggregation rule (mean, max, or a learned weight per view) is chosen and versioned; that choice is scoped to `bkt-hte-multiview-evidence` below rather than decided here.

`L_prior(h)` is new for hypotheses: the sum of `prior_logit` on every slot's concept node, ACTOR through MECHANISM. A hypothesis with no evidence at all still gets `tau(h) = sigmoid(L_prior(h))`, computed the moment its address exists. "Extraterrestrials built a shrine at Çatalhöyük in 7000 BCE" needs no citation to sit in the frontier at a near-zero score. It needs a slot tuple.

**Worked example.** Fix ACTION=built, OBJECT=çatalhöyük-shrine, PLACE=çatalhöyük, TIME_BIN=-7000-century, and vary ACTOR and MECHANISM. `neolithic-farmers-anatolia` (prior_logit 2.0) paired with `organized-human-labor` (0.5) gives `L_prior = 2.5`, `tau0 = sigmoid(2.5) ~ 0.924`. `extraterrestrials` (-4.0) paired with `unknown-technology` (-2.5) gives `L_prior = -6.5`, `tau0 = sigmoid(-6.5) ~ 0.0015`. Both hypotheses already exist. Neither has been read against a single source.

Now pool three evidence items against both, flipped by which ACTOR they favor: a radiocarbon-dated construction fill with hand-tool marks (material/archaeological, T1, e=0.9), a tool-mark microwear study (material/archaeological, T2, e=0.5), and the documentary silence across every tradition on a non-human builder at the site (textual/documentary, T3, e=0.6). All three support farmers and refute aliens.

```
material kind:   sum k.e = 2.0*0.9 + 1.5*0.5 = 2.55   n=2   D(2)=1.549   -> 3.951
textual kind:    sum k.e = 1.0*0.6 = 0.60              n=1   D(1)=1.347   -> 0.808
E = 4.759,  K=2 kinds across 1 cross-family pair,  X(2) = 1 + 0.3*1 = 1.3
S = 1.3 * 4.759 = 6.186
```

For farmers, `S_+ = 6.186`, `S_- = 0`: `L = 2.5 + 6.186 = 8.686`, `tau ~ 0.9998`. For aliens, `S_+ = 0`, `S_- = 6.186`: `L = -6.5 - 6.186 = -12.686`, `tau ~ 0.0000031`. The same three sources move the mainstream reading from 92% to 99.98% and the exotic reading from 0.15% to three parts in a million, and both hypotheses stay on the frontier the whole time.

## 5. Timeline Hypothesis Views

The engine emits three views, each a slice of the same scored frontier, none a verdict:

- **Per time bin**: every hypothesis whose TIME_BIN falls in that bin, ranked by posterior.
- **Per event**: every placement hypothesis sharing that event's OBJECT/PLACE, the competing-claims pattern `TIMELINE-MODEL.md §3` already uses for disputed dates, extended to disputed actors and mechanisms.
- **Per pair**: every sequence hypothesis over an ordered pair of events, one entry per Allen relation the evidence has touched.

```jsonc
{
  "node_type": "hypothesis_timeline_view",
  "generated_at": "2026-09-09T00:00:00Z",
  "engine_version": "hte-0.1",
  "bins": [
    { "time_bin": {"start_year": -7000, "end_year": -6900, "resolution": "century"},
      "ranked_hypotheses": [
        {"hypothesis_id": "<address_hash>", "slots": {"ACTOR": "neolithic-farmers-anatolia"}, "posterior": 0.9998},
        {"hypothesis_id": "<address_hash>", "slots": {"ACTOR": "extraterrestrials"}, "posterior": 0.0000031}
      ] } ],
  "event_views": [ { "event_id": "ev-catalhoyuk-shrine-building", "competing_placements": ["<id1>", "<id2>"] } ],
  "pair_views": [ { "pair": ["per-younger-dryas", "per-early-holocene"],
      "competing_sequences": [ {"relation": "before", "posterior": 0.91}, {"relation": "overlaps", "posterior": 0.06} ] } ]
}
```

Display pruning belongs here: a per-bin view can cap at top-N, a per-event view can collapse a long tail, and neither cap touches what the generator produced.

## 6. Beads

These extend engine spec §8's list. `bkt-hte-combinatorial-generator` supersedes `bkt-hte-generator`. `bkt-hte-kind-truth-score` extends `bkt-hte-truth-score` rather than replacing it.

1. **bkt-hte-timeline-schema**: Add the astronomical-year axis, calendar converters, interval-uncertainty distributions, and the 13 Allen-relation edges to TIMELINE-MODEL.md and the period/event nodes.
2. **bkt-hte-concept-ontology**: Build the concept-node store for ACTOR/ACTION/OBJECT/PLACE/TIME_BIN/MECHANISM/RELATION with editable `prior_logit` and `consensus_status`, seeded with the five non-consensus actors.
3. **bkt-hte-address-scheme**: Implement the prime-encoding `address()` and decode functions as the canonical hypothesis ID, with a SHA-256 `address_hash` display alias.
4. **bkt-hte-combinatorial-generator**: Rewrite `generator.py`'s `enumerate()` to draw ACTOR/ACTION/MECHANISM from the full concept ontology on every pass, evidence or none, replacing the cluster-bounded loop and its `has_min_evidence` gate.
5. **bkt-hte-kind-truth-score**: Extend `truth_score.py` to group evidence by knowledge kind, apply the cross-kind independence bonus, and compute `L_prior` from slot concept priors for the zero-evidence case.
6. **bkt-hte-timeline-views**: Build the per-bin, per-event, and per-pair exporter and its JSON shape, with display-only pruning.
7. **bkt-hte-multiview-evidence**: Split `e_i` into separate similarity views per §4, keep the engine spec §2 formula as the `e_i_blended_A` view, and version the view-aggregation rule.
