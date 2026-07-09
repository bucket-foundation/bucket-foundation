# Cycle-3 Flow Pass — *The Quantum Atlas*

Copy editor, integration/flow review after the cycle-2 additive revision.
Scope: preface + 8 chapters. Focus: do the new tables/boxes/sections integrate,
did they introduce duplication, does each chapter still read as a narrative,
cross-chapter consistency, and sentence-level slips. No chapters were edited.

---

## Verdict

**Ship after targeted duplication trims — the additions are real value and mostly
well-seamed, but cycle 2 left four visible duplication/flow seams and two
cross-chapter number inconsistencies.**

The new material is genuinely additive, not filler: the Ch3 practitioner layer and
SDK box, the Ch5 investor table, the Ch2 characterization section, and the Ch6
national scorecard all earn their place and are introduced with honest transitions
("Everything above reads the stack from altitude…", "Laid side by side, the five
centers resolve into a scorecard…"). None of them read as dropped-in from a
different document. The problem cycle 2 created is **restatement**: several new
sections re-state facts the surrounding prose already carried, and in two chapters
(2 and 5) the chapter now has two conclusions running back-to-back. Two numeric
claims (Quantinuum's logical-qubit count; QuEra's "48 logical" date) drifted between
chapters and now contradict.

Nothing here is structural. It is a trim-and-reconcile pass, not a rewrite.

---

## Integration & flow, per chapter

### Ch1 — Foundations
No cycle-2 tables. Reads clean end to end; the "spine and branches" framing (¶2)
still governs, and the skip-ahead signpost ("On a first read, this can wait") is the
one navigational aid and it works. **No flow issues.**

### Ch2 — Hardware  *(new: "field on one page" table, "How the numbers get measured", "Scenarios")*
Two of the three additions integrate cleanly. The table is set up by "Read across the
rows and the picture resolves" (¶ after the table) and the characterization section
hooks straight back to it: *"Every fidelity in the tables above is the output of a
characterization protocol."* Good seam.

The **"Scenarios" section creates a double-conclusion seam.** "Where the hardware
stands" already closes the chapter — *"There is no winner, and anyone who tells you
otherwise is selling a modality."* — and then the chapter re-opens:

> Annealing already ships and already sells, inside a problem class whose quantum
> advantage remains contested.
> ### Scenarios: who wins each, and when

The chapter now has **four** overlapping closing passes saying the same modality
ranking: the table's read-across paragraph, "Where the hardware stands", "Scenarios",
and the final paragraph. A reader gets the "ions+superconducting lead on fidelity,
neutral atoms on logical count, silicon on density, photonics/topological on promise"
verdict three to four times. Either fold the timing content of "Scenarios" up into
"Where the hardware stands" (it is the one thing Scenarios adds), or demote one of the
two section headers so the chapter has a single conclusion with a timing sub-beat.

### Ch3 — Stack & algorithms  *(new: "The practitioner layer", SDK box)*
**Best-integrated of the new material.** The practitioner layer is introduced with a
clean altitude shift (*"Everything above reads the stack from altitude. The engineer's
day happens at the surface…"*), and — unusually — it *cross-references* rather than
repeats: it points back to the "2× depth cut is worth a hardware generation" claim
instead of restating it, and forward to "Kalai's correlated-noise argument in Chapter
8" instead of re-arguing it. The SDK box (Qiskit 1.0, primitives V1→V2, OpenPulse
removal) is concrete and appears nowhere else. **No trim needed.** One minor overlap
noted under duplication below (live-calibration drift).

### Ch4 — Adjacent tech  *(new: PQC migration box)*
The box is introduced honestly — *"The pieces are scattered through this section; here
they are in the order you execute them"* — which is the tell that it is a recap, and it
reads as one. Integration is fine (it's a set-off box in a maturity-gradient chapter).
**The issue is duplication, not the seam** — see below; this is the single heaviest
duplication in the atlas.

### Ch5 — Industries  *(new: dashboard/ticker table, "What this means for buyers and investors" + "The names, graded")*
The ticker table is set up well (*"Read the dashboard first, then the evidence behind
each card"*) and the "Invest read" column is a legitimate scannable index of the
prose. The company table ("The names, graded") is strong, decision-grade, and additive.

But like Ch2, **Ch5 now has two conclusions.** "Where the industry stands" closes the
chapter hard — *"That is where the industry stands in 2026. The sensing is real, the
crypto-defense is mandatory, and the computer is still the most important machine the
economy is waiting on."* — and then a fresh "What this means for buyers and investors"
section opens. The investor section carries real new content (picks-and-shovels, the
company table), so the fix is not to cut it but to make "Where the industry stands"
hand off to it rather than fully concluding first.

### Ch6 — Ecosystem & geopolitics  *(new: national scorecard table, policy-lever/instrument table)*
Both tables have proper transitions (¶ before the scorecard: *"Laid side by side, the
five centers resolve into a scorecard"*; ¶ before the instrument table: *"Strip the
money down to instruments and four distinct bets emerge"*). The scorecard is the
standard prose-then-summary-table pattern and is fine.

**The instrument table creates the chapter's worst redundancy downstream.** It
tabulates DARPA QBI / UK ProQure / US equity / EuroHPC — and then the later prose
re-explains three of the four *in full*. Most glaringly, QBI gets an entire dedicated
paragraph near the end:

> One instrument stands apart from the equity-picking turn, and the whole field cites
> it: **DARPA's Quantum Benchmarking Initiative.**

That paragraph (¶ before "Where the ecosystem stands") re-introduces something the
instrument table already defined a full section earlier, and QBI is *also* a column in
Ch5's company table — so QBI is explained three times across the atlas. EuroHPC and the
"12-to-54-qubit NISQ = symbolic sovereignty until fault tolerance" line likewise appear
in both the table (row 4) and the "sovereign compute" paragraph, near-verbatim. After
the instrument table, the later prose should *reference* the levers, not re-teach them.

### Ch7 — History
No cycle-2 tables. Reads as a continuous narrative; the three-movements spine holds and
the Nobel-spine / winter-question coda lands. **No flow issues.** (Two number claims
that touch this chapter are flagged under consistency below.)

### Ch8 — Frontier
No new cycle-2 tables. Dense but coherent; each open problem carries its "what would
settle it" as designed. **No flow issues** beyond the Quantinuum number (below).

---

## Duplication to cut

**1. Ch4 PQC box ↔ the three prose paragraphs above it (heaviest).**
Every load-bearing fact in the box is already stated in the prose immediately above,
in some cases verbatim:

- SIKE's afternoon collapse (2022): prose *"the isogeny scheme SIKE collapsed in a
  single afternoon on a classical laptop in 2022"* → box step 3 *"SIKE's collapse in a
  single afternoon in 2022 is the standing reminder…"*
- Hybrid default: prose *"Hybrid X25519 + ML-KEM-768 key exchange is the default in
  Chrome, Firefox, and Cloudflare"* → box step 4, same three browsers, same suite.
- FIPS 203/204/205, Aug 2024: prose and box step 4.
- CNSA 2.0 dates (2027 / 2030 / 2035, NIST IR 8547): prose sentence → box step 5 table,
  same three dates.
- Mosca / 5–15-yr shelf-life / "at risk today": prose ¶ (HNDL) → box step 2.
- "inventory is the real bottleneck": prose *"most organizations cannot enumerate where
  cryptography lives… crypto-agility and discovery tooling are the real bottleneck"* →
  box step 1, same claim.

**Fix:** keep the box as the actionable 5-step sequence, and thin the prose so each fact
appears once (state SIKE, the three-browser default, and the CNSA dates in the box only;
let the prose set up *why* migration is urgent). Right now the reader is told the same
six facts twice within one screen.

**2. Ch5 "two traps" — stated twice in the same chapter.**
"Where the industry stands" ¶: *"A dollar of 'quantum chemistry advantage' appears in
the pharma line, the chemicals line, the climate line, the agriculture line, and the
energy line at once. Sum them and you have counted the same fault-tolerant computer five
times."* Then "What this means for buyers and investors" ¶ *"Discount two traps on
sight"*: *"one fault-tolerant chemistry advantage is booked separately in the pharma,
chemicals, climate, agriculture, and energy forecasts, so the summed market numbers
count the same machine five times."* Same two traps, same five verticals, same "five
times" — near-verbatim. (The preface also previews these as "Two traps in the money
numbers," which is fine.) **Cut one** — keep the investor-section version (it's the
punchier "when a vendor cannot name the qubits, assume there are none") and reduce the
"Where the industry stands" instance to a one-clause pointer.

**3. Ch6 QBI — explained in three places.** Instrument-table row + the dedicated
"One instrument stands apart" paragraph + the Ch5 company-table QBI column. Collapse the
Ch6 standalone paragraph into a reference back to the instrument table.

**4. Ch2 characterization ↔ Ch3 practitioner layer — the live-calibration point.**
Ch2 closes "How the numbers get measured" with *"a practitioner re-reads the live
calibration map before every run… any single headline fidelity is a snapshot of a moving
target."* Ch3's practitioner layer opens transpilation with *"reading the backend's live
calibration data… measured hours ago and already drifting."* Same insight, two chapters.
Minor (different altitude, different framing) — leave if trimming budget is tight, but
the Ch3 instance could add "as Chapter 2 noted" and drop the re-explanation.

---

## Cross-chapter inconsistency

**A. Quantinuum logical-qubit count: 48 vs 94 (Ch3/Ch7 vs Ch8) — reconcile.**
- Ch3: *"Quantinuum's Helios produced **48 error-corrected logical qubits at a 2:1
  physical:logical ratio** plus a **94-logical-qubit GHZ state**."*
- Ch7: *"Helios… 98 barium-ion qubits… **up to 48 logical qubits**."*
- Ch8: *"**Quantinuum reported 94 logical qubits at roughly 2:1** with logical error
  below 10⁻⁴."* (masked math decodes to "2:1" and "10⁻⁴").

Ch8 treats **94** as the corrected-logical count *and* pins a 2:1 overhead on it — but
94 logical at 2:1 implies ~188 physical qubits, and Helios has 98. Ch3/Ch7 are internally
consistent (48 × 2 ≈ 96 ≈ 98 physical; the 94 is a GHZ *state* size, not 94 independent
corrected qubits). **Ch8's "94 logical qubits at 2:1" is the wrong number** — it should
be 48 corrected logical (with the 94-qubit GHZ as a separate demonstration), or the
ratio must change. This one is load-bearing: it sits in the overhead-ratio argument.

**B. QuEra "48 logical qubits" date: Nature (2025) vs late 2023 (Ch2 vs Ch7).**
- Ch2: *"QuEra (with Harvard and MIT) published **48 logical qubits** with logical-layer
  magic-state distillation in **Nature (2025)**…"*
- Ch7: *"In **late 2023** a Harvard/QuEra/MIT collaboration operated **48 logical
  qubits** on 280 neutral atoms — logical qubits at scale, credibly, for the first time."*

The first "48 logical qubits at scale" result (Bluvstein et al.) was Nature **December
2023** (Ch7's date). Ch2 may intend a *later* magic-state-distillation result, but as
written both chapters say "48 logical qubits" at different years, which reads as a
contradiction. Disambiguate: if Ch2 means a distinct 2025 result, name what makes it
distinct from the 2023 one; if it's the same result, fix the year to 2023.

**Consistent (verified, no action):** self-name is "the atlas / this atlas" throughout
(no stray "the manual" survives in the live chapters — those only appear in the stale
`clean.txt` scratch files, not the current `_CHAPTER.md`s); tier form T1–T6 is uniform;
"below-threshold", "qLDPC", Willow's Λ-suppression framing are consistent; and the
FeMoco / RSA resource numbers line up across Ch3, Ch5, Ch8 (~99,000 physical, ~27×
against 2.7M, 2021 Google/Lee ~4M physical / ~2,100 logical; Gidney ~20M→<1M). The
explicit "the same figures Chapters 5 and 8 carry" cross-refs check out.

**Minor:** Ch5's inline tier gloss (¶3) defines only T1–T5 and omits T6, but the chapter
then uses T6 four times (CRQC date, QML, intelligence, quantum radar). The preface
defines T6 fully, so it's not a contradiction — but the local gloss is incomplete where
it's introduced.

---

## Sentence-level / style

Largely clean; the parallel edits didn't drag in many slips. Notes:

- **Motif phrases repeating across chapters** ("picks and shovels" in Ch2/Ch5/Ch6;
  "an estimate is not a machine" Ch6 ↔ "a sub-1M-qubit *estimate* is not a sub-1M-qubit
  *machine*" Ch8; "find the denominator" Ch6). These read as intentional throughlines,
  not errors — leave them, but be aware Ch6 leans on "find the denominator / name the
  definition" three times within its own bounds.
- **Ch5 ¶ ("What this means for buyers"):** *"a quantum computer is a research instrument
  that runs paying pilots, a quantum sensor is a product, and a quantum-safe migration is
  a deadline"* — rule-of-three; it lands well here as a deliberate close, so keep.
- No banned "X, not Y" antithesis constructions surfaced in the new sections. Ch5 ¶5's
  paired sentences ("The near-term economy of quantum is sensing and crypto-migration.
  The near-term economy of quantum *computing* is controlled proof-of-concept…") are two
  positive declaratives, which is the correct form.

---

## Top-5 flow fixes

1. **Ch4 — de-duplicate the PQC box against its own lead-in prose.** Six facts (SIKE,
   three-browser hybrid default, FIPS dates, CNSA 2027/2030/2035, Mosca window,
   inventory-is-the-bottleneck) are stated twice within one screen. Keep the box as the
   action sequence; state each fact once.

2. **Reconcile the Quantinuum 48-vs-94 logical-qubit number.** Ch8's "94 logical qubits
   at 2:1" contradicts Ch3/Ch7 (48 corrected + a 94-qubit GHZ *state*) and is
   arithmetically impossible against Helios's 98 physical qubits. Fix Ch8 to 48
   corrected (94 = GHZ state).

3. **Ch2 — collapse the double conclusion.** "Where the hardware stands" already ends
   the chapter; "Scenarios" then re-ranks the same modalities. Fold Scenarios' timing
   beat into the single conclusion so the modality verdict isn't delivered four times.

4. **Ch5 — cut the duplicate "two traps" statement.** Keep the investor-section version,
   reduce the "Where the industry stands" instance to a pointer, and let that section
   hand off to the investor section instead of fully concluding first.

5. **Ch6 — stop re-teaching the policy levers after the instrument table.** Fold the
   standalone "One instrument stands apart… DARPA QBI" paragraph and the duplicate
   EuroHPC "symbolic sovereignty" line into references back to the instrument table;
   reconcile the QuEra "48 logical" date (Ch2 2025 vs Ch7 2023) while in the neighborhood.
