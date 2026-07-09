# Cycle-2 Review — Skeptical Science Journalist

Re-read of all 8 `_CHAPTER.md` files (SVG/base64 math stripped and read past).
Judging: did the cycle-1 honesty/fairness fixes land; what regressions the
revision introduced; the next tier of confidence-outruns-evidence; style slips.

## Verdict

**The revision did its job on tone and fairness, and it broke one thing on facts.**
The four marquee cycle-1 asks — a fair Hossenfelder paragraph, cut self-honesty
narration, a flagged Aaronson posture, and the FeMoco reconciliation — all show
real edits. Three of the four landed cleanly. The fourth (FeMoco) was half-fixed
in a way that is arguably *worse* than the cycle-1 state: the two chapters now
carry explicit cross-references to each other that **contradict each other on the
number**. A hostile reader who flips Ch5 → Ch8 catches it in one hop.

Everything else got quieter and more honest. The mechanical sweeps are clean in
chapter prose: no `[T4]`/`**T4**` bracket forms, no node-ID codes, no backslash
escape artifacts, no comma-antithesis, no hype-word slips. The book still reads as
balanced-and-occasionally-proud-of-it, but the peak self-congratulation is gone.
Net: still an unusually honest document; the resource-estimate cross-links are the
one place a skeptic now has a clean shot.

## Landed (cycle-1 fixes that took)

1. **Hossenfelder — fixed, and well.** Ch8 now gives her a full paragraph (the
   "Hossenfelder's case deserves stating at full strength" graf) plus a fair line
   in the money section. Her checkable core claim is stated ("the number of quantum
   algorithms with a proven advantage… is small, and as of 2026 none has been shown
   delivering that advantage on real hardware"), her wrong-timing is owned honestly
   ("she forecast the hype would break by 2024… acknowledged plainly that it had
   not"), and — the key move — her ROI critique is explicitly leaned on the atlas's
   own advantage scorecard ("this chapter's own advantage scorecard corroborates
   it"). This closes the single biggest fairness gap. The O-hype node was also
   rebuilt to name her position at strength. (Note: the O-hype *node* still uses
   `[T5]` bracket tiers and a "This manual grades…" line — out of the edited scope,
   but it renders as part of the atlas, so it's an inconsistency with the swept
   chapter prose.)

2. **Self-honesty narration — cut where it was worst.** The cycle-1 peak offenders
   are gone: no "the reason the atlas can be trusted," no "refused to pretend
   otherwise," no "the manual working as designed," no "this manual insists." The
   Ch8 closer now ends on "the state of the field as the evidence has it, graded and
   dated" instead of a virtue flourish.

3. **Aaronson posture — flagged as editorial, twice.** Ch8 now says outright: "Here
   the atlas makes an editorial call rather than reporting a neutral finding: it
   adopts Aaronson's posture… the weight is a judgment," and repeats it in the
   closer ("an editorial call the evidence permits rather than compels"). Exactly
   the ask.

4. **Ch1 physics fixes.** SO(3)/SU(2) now correct ("The rotation of the sphere is an
   element of SO(3); the gate acting on the state vector is an element of SU(2), the
   double cover"). "The physics is ready" softened to "The core is settled; the open
   questions sit at the edges." Plain on-ramps added before the notation. The
   contextuality = Wigner-negativity = stabilizer "one resource wearing three faces"
   synthesis is now a real paragraph and flags the qubit case as open.

5. **Ch2 Quandela** now tagged "(a vendor spec, T4)." The "sensing, not computing"
   antithesis is gone ("its strongest near-term value is clearly in sensing").
   Below-threshold / surface-code / code-distance / logical-vs-physical are glossed
   inline on first use.

6. **Ch3 T-count antithesis** rewritten to a positive sentence ("The true currency…
   is T-count and T-depth… Raw gate count barely tracks the real cost"). Complexity
   paragraph marked "(safe to skip on a first read)."

7. **Ch4 antitheses** all split: "reimbursement, not physics" → "The honest gate
   here is reimbursement. The sensitivity is proven…"; "physics — not technology" →
   positive QLED definition; "a roadmap, not a deployment" → "a roadmap short of a
   deployment"; "cryptanalytic, not commercial" → "its only real risk is
   cryptanalytic." Kómár et al. regraded to T2.

8. **Ch5 cuEST** now tagged T4 in both places (was hedged/ungraded in one). The
   27-industry dashboard table with invest/watch/ignore reads is at the top, and the
   "What this means for buyers and investors" closer is added.

9. **Ch7 transmon** contradiction fixed: the transmon (Yale 2007) is no longer
   attributed to Martinis; the 2025 Nobel is correctly tied to the 1984–85
   macroscopic-quantum-tunneling work and now names **Clarke, Devoret, and Martinis**.

10. **Ch6** data-figure punchlines are now stated in plain sentences (dollar-ladder,
    the $3.9B-vs-$12.6B split, the patent volume-vs-quality flip); the over-stuffed
    valuation em-dash sentence is split.

## Regressions (introduced by the revision)

### R1 — FeMoco: the reconciliation created a cross-chapter contradiction (the headline)
The cycle-1 ask was one Google baseline, cross-linked cleanly. Instead the three
chapters now read:

- **Ch3** (bare, ungraded, no cross-ref): "the FeMoco cofactor… now sits near **~4M
  physical qubits** and days of runtime."
- **Ch5**: Alice & Bob's ~99,000 cat-qubit estimate is "a ~27x reduction against the
  **2.7-million-qubit configuration Alice & Bob benchmarked**. That 2.7M baseline is
  one point in the few-million-physical-qubit range of the 2021 Google/Lee study —
  **the same estimate Chapter 8 puts at ~4M physical qubits** and ~1,137 logical
  qubits."
- **Ch8**: "a 2021 Google study (Lee et al.) put the physical-qubit cost at **~2.7M**,
  which Alice & Bob's 2025 cat-qubit estimate cut about 27× to ~99,000 — **the same
  figures Chapter 5 carries**."

Two live contradictions:
1. **Ch5 says "Chapter 8 puts [the Google study] at ~4M." Ch8 says 2.7M.** The
   cross-reference names a number the sibling chapter no longer contains.
2. **The 2.7M is attributed to two different sources.** Ch8: it's the Google/Lee
   2021 figure. Ch5: it's "the configuration Alice & Bob benchmarked," and the
   Google/Lee study is a separate ~4M. And Ch8's "the same figures Chapter 5
   carries" is only half true (99k matches; the 2.7M/4M attribution does not).

So 99,000 / ~27× / 1,137-logical are now consistent — real progress — but the
2.7M-vs-4M crack that cycle-1 flagged is still open and is now *nailed into
explicit cross-references that disagree*. This is the exact "the estimates are all
over the place" impression the fix was meant to kill, and it's easier to catch now
than before. Reconcile the Google/Lee 2021 physical-qubit number to ONE value
across Ch3/Ch5/Ch8 and make the two cross-reference sentences agree.

### R2 — Ch3 copy defect
Line reads "…So the T gate is where quantum hardness lives, **and The true
currency** of a fault-tolerant resource estimate is T-count…" — stray capital "The"
mid-sentence, an editing artifact from the antithesis rewrite.

## New overclaim / ungraded-number list

- **[Ch5] cuEST is now asserted as a real, launched product** — "NVIDIA's cuEST — a
  CUDA-X electronic-structure library launched for chip-materials work — reports up
  to ~50x faster calculations for adopters including TSMC (T4)." The cycle-1
  physicist doubted this product exists (cuQuantum, cuLitho, CUDA-Q are the real
  ones). The revision followed the "if kept, tag T4" instruction, but T4 grades a
  *vendor claim*, not *whether the product exists* — and the prose now states its
  existence more confidently than the hedged cycle-1 version ("launched," named
  adopter, specific 50x). Confidence outruns verifiable evidence here. Verify cuEST
  is a real NVIDIA release or cut it; a T4 tag doesn't cover a possibly-nonexistent
  product.

- **[Ch2/Ch3/Ch7] Helios "independently validated by Sandia in Nature (June 2026)"**
  is stated as fact and does heavy lifting ("lifts it from a vendor claim toward a
  reproduced one," i.e. the T2 anchor of the whole ion section). Properly cited and
  dated, so lower-priority — but it is the load-bearing "reproduced" claim of the
  chapter and its weight rests entirely on that one June-2026 reference being real.

- **[Ch8, summary] "multiple platforms cleared 99.9% two-qubit gate fidelity in
  2025"** is stated flatly in the closer with no tier, while the neighboring
  below-threshold claim is attributed to four named teams. Widely corroborated, so
  venial — but it's an ungraded milestone in the one section that reads as verdict.

- **[Ch5] "~1,137 logical qubits"** (also Ch8) is presented as "now estimated" with
  no source and false precision for a resource estimate. Consistent across the two
  chapters now, so not a contradiction — just a suspiciously exact ungraded figure.

## Style slips

- **Antithesis: clean.** No comma-antithesis ("X, not Y") survives in chapter prose;
  the ~9 cycle-1 hits are all split. The one borderline survivor is Ch8's "a
  sub-1M-qubit *estimate* is not a sub-1M-qubit *machine*" — but that's a plain "A is
  not B" declarative, not a comma-spliced antithesis, and it says the point straight,
  so it reads as within-rule.
- **Hype words: clean.** Only hits are proper nouns / self-aware use ("Robust Quantum
  Sensors" = DARPA program; "silent about breakthrough").
- **Intensifiers:** no "genuinely/truly." "really" appears once, inside quotation
  marks (Ch7, "what the wavefunction 'really' meant"). Ch5 uses the *adjective*
  "genuine" 5× ("deployed, genuine, and niche"; "genuine production workflow"; etc.)
  — the global rule bans the adverb; the adjective is borderline and pre-existing,
  worth a light trim for repetition, not a hard slip.
- **Residual self-referential editorial voice** (the softened descendants of the cut
  self-honesty narration): "the atlas insists on separating them" (Ch8), "the grades
  are the point" (Ch8 closer), "the grading reflex" (Ch8). Much milder than the
  cycle-1 offenders — instructional rather than self-praising — but it's still the
  book narrating its own method. Next-tier tone note, not a failed fix.

## New top-5 (what to fix first)

1. **Reconcile the FeMoco Google/Lee 2021 number to ONE value across Ch3/Ch5/Ch8**
   and fix the two cross-reference sentences so they agree (Ch5 says "Ch8 → 4M";
   Ch8 says 2.7M). This is the one clean shot a hostile reader now has, and the
   revision created it.

2. **Verify or cut cuEST (Ch5).** It's now asserted as a launched CUDA-X product with
   a named adopter; the T4 tag doesn't cover whether it exists. Confirm against
   NVIDIA's real product line or remove it.

3. **Fix the Ch3 copy defect** — "and The true currency" → "and the true currency."

4. **Sweep the O-hype node** (and any other node rendered in the atlas) to match the
   swept chapter prose: plain-form tiers instead of `[T5]`, and drop the "This manual
   grades…" self-reference. Right now the node contradicts the house conventions the
   chapters were standardized to.

5. **Trim the residual "the atlas insists / the grades are the point / grading
   reflex" voice** in Ch8 and lightly de-duplicate Ch5's five "genuine"s. Let the
   T-tags demonstrate the method instead of narrating it.
