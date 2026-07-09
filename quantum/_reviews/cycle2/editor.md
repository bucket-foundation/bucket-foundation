# Cycle-2 review — Copy Editor / Prose Stylist

## Verdict

The consistency pass landed. This is a clean, disciplined revision — the manuscript
that read like eight authors in cycle 1 now reads like one on every axis I flagged.
Self-name is uniform, tier typography is 100% plain form, the node-ID/§ codes are gone,
the chapter openers and closers match, and every banned-word and antithesis fix is in.
The prose underneath was already good; the seams between authors are what closed.

It is ship-ready after a short cleanup: one real typo introduced by an edit, one pocket
of leaked dollar-sign escapes in Chapter 5, and a few polish items. None is a rewrite.
The revision did the hard 90%; what remains is a 20-minute find-and-replace pass plus two
sentence trims.

## Landed (verified by sweep across all 8 chapters)

- **Self-name standardized.** Zero "the manual," zero "the book." "the atlas" is the object
  noun everywhere (Ch1 6×, Ch4 6×, Ch7 9×, Ch8 9×). "the map" survives only 4× in Ch5, each
  a literal reference to the industry-readiness *figure* — exactly the carve-out the
  convention allows.
- **Tier typography is now one form.** 100% plain `T1…T6`. Zero `**Tn**` bold (was Ch6/7/8),
  zero `[Tn]`/`\[Tn\]` brackets (was Ch5). The book's core credibility device now looks
  identical in every chapter.
- **Node-ID codes eliminated.** Zero `§0N` symbols (Ch8 went from 27 to none — now spells out
  "Chapter N"), zero `(F-…)`/`(S-…)`/`(O-…)`/`(I-…)`/`(C-…)` parentheticals in prose.
- **Openers uniform.** No italic datelines anywhere, no middot/em-dash separator divergence,
  no "Layer 4" label (Ch5's is gone), no lone `## From Qubit to Answer` H2 (Ch3 now opens on
  narrative). All eight open on a bridge sentence into a first `###`.
- **Closers uniform (7/8).** All `### Where the {foundations/hardware/algorithms/adjacent
  tech/industry/ecosystem/story} stand(s).` — one outlier remains (Ch8, below).
- **Heading depth rationalized.** `####` now appears only in the two long chapters (Ch5 ×9,
  Ch8 ×4); no chapter uses mid-body `##` anymore.
- **House-style violations fixed.** "genuinely" and "truly" gone; Ch8 "how far, really"
  heading → "how far." The four antitheses are clean positive sentences (T-count, OPM-MEG
  "reimbursement," QLED definition, "legal as well as technical") — no `X, not Y` /
  `not X but Y` residue anywhere in prose.
- **Per-chapter content fixes confirmed present:** Ch1 SO(3)/SU(2) corrected + contextuality
  "one resource, three faces" now a full paragraph + info-theory back-third marked skippable;
  Ch2 Quandela specs tagged T4 + transduction sentence split; Ch3 complexity paragraph marked
  "safe to skip on a first read"; Ch4 Kómár regraded T2; Ch5 dashboard table + investor
  synthesis added + FeMoco reconciled with an explicit Ch8 cross-reference; Ch7 transmon no
  longer credits Martinis and the 2025 Nobel now names Clarke/Devoret/Martinis for the
  1984–85 MQT work; Ch8 Hossenfelder given a full paragraph + Aaronson-posture flagged as an
  explicit editorial call + FeMoco reconciled with Ch5 (2.7M / 99k / ~4M all consistent).

## Regressions (introduced by the 8 parallel edits)

1. **Ch3 — capitalization typo from the T-count rewrite.** The antithesis fix produced:
   "…the T gate is where quantum hardness lives, **and The true currency** of a fault-tolerant
   resource estimate is T-count and T-depth…" — mid-sentence capital "The." Should be "and the
   true currency." (03-stack-algorithms, ~line 11.)

2. **Ch5 — leaked dollar-sign escapes, the one un-swept pocket.** Every dollar figure in Ch5 is
   written `\$` (10 occurrences), while Ch6 (52×), Ch7, and Ch8 (10×) all use a bare `$`. Ch5 is
   the sole chapter escaping, so this is the exact leaked-escape category global-rule #4 targeted —
   cleaned everywhere else, missed here. It likely renders as a visible backslash. The table
   header also carries a stray `\#` (line 17). These are the last raw-escape artifacts in the book.

## New top-5 (cleanup, in priority order)

1. **Fix the Ch3 typo** — "and The true currency" → "and the true currency."
2. **Sweep Ch5 `\$` → `$` (×10) and `\#` → `#` (×1)** to match Ch6–8. This closes the last
   leaked-escape pocket and the single most visible remaining author seam.
3. **Align the Ch8 closer.** "### Where quantum stands, 2026" is the lone closer that appends a
   year; the other seven are bare "Where … stands." Either drop ", 2026" or accept it as a
   deliberate book-ending — but it is a conscious deviation, so make it a decision, not a leftover.
4. **Split Ch4's 251-word block.** "Two cross-cutting resources close the sensing cluster…"
   still packs QRNG, certified randomness, squeezed light, and quantum memories into one
   paragraph — the one cycle-1 em-dash-split item not carried out. Break at each bolded resource.
5. **Trim the Ch1 closer's repetition.** "…the open questions at the edges change none of it.
   The core is settled; the open questions sit at the edges, and the rest of the atlas is about
   learning to build on the core." — "open questions at the edges" appears twice in adjacent
   sentences and "the core" three times. State it once.

## Consistency check (residual, low priority — defensible either way)

- **`------` horizontal rules** appear only in Ch5 (×5) and Ch8 (×7); the other six use none.
  Reads as a long-chapter structural device, so defensible — but it is still an author seam. Make
  it a house device or drop it.
- **Apostrophe glyph is mixed** — "atlas's" (straight) in Ch1/Ch4 vs "atlas’s" (curly) in Ch3.
  A whole-book straight-vs-curly quote/apostrophe normalization would catch this; trivial.
- **"genuine" (adjective) ×5 in Ch5** — not a banned word (only "genuinely" is), but it's a mild
  tic within one chapter ("genuine production workflow," "genuine near-term wins," "genuine
  nuclear-physics results"…). Vary one or two.
- **Ch7 "what the wavefunction 'really' meant"** — "really" is in quotes and reads as the
  philosophical "in reality," not an intensifier. Defensible; cut only if you want zero "really."
- **Not a copy issue, flagging for the physicist:** "NVIDIA cuEST" is kept and now tagged T4 in
  both places (Ch5 lines 97, 139), which satisfies the revision brief. The underlying
  "does this product exist" concern is a factual question, unresolved by tagging.

## Newly-added sections — voice match

- **Ch5 dashboard table + "What this means for buyers and investors."** On-voice. The table's
  "Invest read" column is the one-line verdict the chapter earns; the synthesis is tight and
  imperative in the book's register ("Buy the revenue that already exists"; "For lower variance,
  buy the picks and shovels"; "When a vendor cannot name the qubits, assume there are none").
  Reads as the same author, and it gathers conclusions already argued in the cards rather than
  importing new claims.
- **Ch8 Hossenfelder paragraph.** Fixes the biggest fairness gap in the book. States her
  position at full strength, isolates the checkable core claim, notes her own wrong-timing
  concession, and ties it to the book's advantage scorecard — the same fair-hearing treatment
  Kalai gets two sections up. The Aaronson-posture flag ("Here the atlas makes an editorial
  call rather than reporting a neutral finding") is the right move and matches the manuscript's
  grading honesty. Both new Ch8 passages are indistinguishable in voice from the surrounding
  prose.
