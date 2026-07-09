# Policy / Government Reader — Cycle 2 Review

**Reviewer lens:** advises on national quantum strategy, R&D funding, export controls,
standards, and procurement. Smart generalist, not a physicist. Fresh read.
**Read:** preface + full map; all 22 Chapter 6 nodes (deep); Chapter 4 crypto nodes
(A-qkd, A-pqc, A-satqkd, A-qinternet); Chapter 8 (O-crqc-timeline, O-hype, O-killerapp,
O-scaling, O-roi-business, O-talent-attrition, O-benchmark-standard); glossary + Ch6
synthesis prose.

---

## Verdict

**Trustworthy and directly useful for strategy work — one of the best-organized
quantum-landscape references I could put in front of a minister or a committee.** The
grading discipline (T1–T6) and the "find the denominator, find the motive" reflex are
exactly the antidote a policy reader needs to the vendor-and-analyst noise that dominates
this field. Chapter 6 is the strongest chapter for my job: it maps the national programs,
the standards fights, the supply-chain chokepoints, and the money cycle with the caveats
attached rather than buried. Chapter 8's CRQC-timeline and hype nodes give me a defensible,
non-alarmist read on the threat clock. Chapter 4's "honest call" on QKD is the single most
useful page for anyone being lobbied to fund a QKD backbone.

The gap is **prescription**. The atlas describes the landscape superbly but stops one step
short of telling a decision-maker *what to do and in what order* — on PQC migration, on
which policy instrument to pick, on which chokepoint to reshore first. That is a deliberate
design choice (it grades claims, it doesn't advocate), but a short set of clearly-labeled
"decision" boxes would multiply its value for my audience without compromising the neutrality.
It is not slanted toward any one country; if anything it *deflates* the standard
China-panic narrative by refusing to launder the uncitable $15B figure.

**Bottom line: fit for strategy decisions today, with the caveat that the reader must do
the last mile of synthesis themselves. Close that last mile and it becomes a reference I'd
cite in a briefing.**

---

## What's useful for policy (concrete)

**1. It inoculates against inflated numbers — the core service.** "How to read a quantum
dollar figure" (three quantities quoted interchangeably, differing 1–3 orders of magnitude)
is the framing every budget staffer needs. The specific debunks are load-bearing:
- China's "$15B" traced to circular citation with no primary budget document, insider
  estimate ~25% of it (E-china). This is the number that drives half the "we're losing the
  race" rhetoric, and the atlas kills it honestly.
- The **$3.9B (PitchBook, pure QC) vs $12.6B (McKinsey, all quantum tech + M&A)** VC split,
  with an explicit "do not add or compare these" warning (E-vc).
- The **patent race is denominator-dependent**: China ~60% of filings, US ~48% of
  international patent families — "which country leads depends entirely on the denominator
  you pick" (E-patents). Exactly the caveat a "China owns quantum IP" headline omits.
- The **PQC-market 30x definitional spread** ($0.5B vs $15B for the same year, E-pqcmarket)
  and the flag that PQC spend is *classical* cybersecurity double-counted into "quantum" TAMs.
- Government share of investment falling ~33% (2024) → ~3% (2025) as private capital took
  over (E-vc) — a real, decision-relevant shift, cleanly stated.

**2. The standards fights are mapped precisely.** For a standards adviser this is the best
part:
- PQC is the mature front (FIPS 203/204/205 finalized Aug 2024, HQC backup Mar 2025);
  everything else — terminology, benchmarking, QKD certification — runs years behind across
  ISO/IEC, ETSI, ITU, IEEE, plus the new ISO/IEC JTC 3 (E-standards).
- The **QKD-vs-PQC agency split** is framed as a live disagreement (NSA/NCSC/ANSSI/BSI
  advise *against* QKD for national-security systems; China builds QKD backbones) with a
  "what would resolve it" note — not a settled Western win (E-standards, A-qkd, CONFLICTS
  C-qkd-vs-pqc).
- The **benchmarking vacuum**: "logical qubit" and "QuOp" remain undefined while procurement
  targets (UK ProQure) already cite them — "buyers are writing contracts against undefined
  units" (E-standards, O-benchmark-standard). That sentence alone is worth a procurement
  memo.
- A second, quieter standards front most policy docs miss: the **SI-second redefinition**
  (BIPM/CGPM 2026, optical clocks) as metrological soft power (E-metrology-gov).

**3. Supply-chain chokepoints, modality by modality.** E-supplychain is exactly what a
reshoring/industrial-policy adviser wants: dilution fridges (~1 system/day industry-wide,
Bluefors/Oxford Instruments), helium-3 (sourced from tritium/nuclear-weapons decay,
national-security-controlled feedstock, structural deficit), enriched Si-28, CVD
quantum-grade diamond (Element Six near-monopoly), SNSPD uniformity; the NATO ">90% of
high-purity material processing outside NATO territory" figure; and the honest note that a
$20M NIST cryostat center is small against the capital intensity. The point that the
chokepoint map is *modality-dependent* (no single supply strategy covers all qubit types)
is a real strategy insight.

**4. Timeline risk done honestly (the CRQC / HNDL / Mosca material).** O-crqc-timeline lays
out both camps without picking a side: Gidney's <1M-qubit RSA-2048 estimate vs the 2–3
orders-of-magnitude gap to real machines *at Shor fidelity*; expert survey ~2030 ± 3,
~50% by 2035; NIST already standardized PQC "because the threat is treated as near enough
to act on now." Mosca's inequality is stated in decision terms: (migration time) +
(secrecy shelf-life) > (time to CRQC) means you are *already* exposed. This is the correct
way to brief the threat — the date is uncertain, the action is not.

**5. Export-control reality, with the caveats intact.** E-export is unusually good: the
2024 BIS plurilateral rule (ECCNs 3A901/3D901/3E901), the **IEC license exception that
rewards allies who adopt harmonized controls**, the **deemed-export reach** (sharing
controlled tech with a foreign national *inside* the US is itself a controlled export —
ties directly to hiring), the CFIUS expansion, and the honest "effectiveness is unproven /
controls slow but don't stop a determined state / China is building domestic supply to
route around them." The bloc-cohesion risk (Oxford Ionics→IonQ, Australia's bet on
US-domiciled PsiQuantum) is the live tension for an allied-coordination adviser.

**6. The honest read on QKD as a national investment.** A-qkd's "honest call" —
"commercial but structurally niche," capped by three things it can't escape (repeaterless
~few-hundred-km reach, the trusted-relay compromise, four-agency advice steering critical
infrastructure to PQC) — is the page I'd hand a colleague weighing a QKD procurement.
A-satqkd is balanced: China leads decisively (Jinan-1, ~45x cheaper spacecraft), but it
"inherits QKD's core limitation" and is a "strategic-sovereignty capability for states, not
a mass-market technology." This is fair to China's genuine lead and honest about the ceiling.

**7. Talent levers + the immigration/clearance paradox.** E-immigration names the
**self-defeating loop** most workforce strategies ignore: export controls and clearance
requirements shrink the eligible pool at the same time the strategies call foreign talent
the binding constraint ("50% of advanced-STEM-degree holders in the US defense industrial
base are foreign-born" vs the deemed-export rule that can require a license to hire them).
No government has published how it resolves the tradeoff. That's a real, actionable gap the
atlas surfaces.

**8. Policy-instrument raw material.** The atlas quietly documents the most interesting
instruments in the field: **DARPA QBI** as a vendor-neutral due-diligence *filter* ("not a
competition"; a rare public negative signal), **UK ProQure** demand-pull procurement vs
supply-push grants, the US **equity-stake turn** (grant-maker → shareholder), and
**EuroHPC's deliberate multi-modality hedge** (five qubit types across six machines). These
are the choices a policymaker actually faces.

---

## Jargon that blocks a policy reader

Accessibility is good overall — most nodes carry a plain "Summary" and a "The honest call"
that a generalist can read cold. The blockers:

**1. Node-ID codes in the standalone node files.** The cycle-1 revision brief already
orders these stripped from the compiled `_CHAPTER.md` prose — good. But the **individual
node files** (E-us.md, A-qkd.md, etc.) are still dense with `(E-sovereign)`, `(A-pqc)`,
`S-shor`, `§04`, `C-qkd-vs-pqc`. The preface *explicitly invites* a policy reader to "jump
in as a map," and the map links to these node files — so the landing page a policymaker
actually hits is the one still full of what read like error codes. The de-coding needs to
reach the node files, not only the chapter compile.

**2. Glossary gaps on terms a policy reader meets.** The glossary is strong on the
crypto-policy core (CRQC, HNDL, Mosca's inequality, PQC, QKD, logical/physical qubit,
threshold theorem, export controls all have clear plain-language entries). Missing, and a
policy reader hits all of these:
- **"Crypto-agility"** — A-pqc names it as *the gating work* ("crypto-agility and discovery
  tooling, not new math, is the gating work"), but it has no glossary entry. This is the
  single most important operational concept in PQC migration and it's undefined.
- **"Deemed export"** — used repeatedly and central to E-immigration/E-export; only "export
  controls" is glossed. The deemed-export concept is the counterintuitive one a generalist
  needs spelled out.
- **"Q-day"** — used in E-insurance without definition; absent from glossary.
- **"Trusted node/relay"** — "trusted relay" is glossed but the trust-model distinction
  (why a relay breaks end-to-end security) is the crux of the QKD-vs-PQC call and deserves
  a fuller entry.
- **"Quantum supremacy"** — absent (though "advantage" is in). A policymaker reads the word
  in the press constantly.

**3. Physics shorthand left inline in the crypto nodes.** A-qkd and A-satqkd throw
"twin-field QKD," "decoy-state," "QBER," "side-channel/detector-blinding," and
"magic-state cultivation" (O-crqc-timeline) at the reader without a clause of gloss. These
don't block the *conclusion* (the "honest call" recovers it), but they slow a generalist
skim. One appositive clause each would fix it.

**4. The T-tier reflex is taught in the preface, not re-cued per node.** A policymaker who
lands mid-atlas via the map may not carry the "T5 = softest anchor" discipline into a
numbers-heavy node like E-market or E-vc. A one-line tier reminder in each money-heavy node
header would help the jump-in reader.

---

## What a policymaker most needs that's missing

**1. No consolidated "PQC migration: what to do and when."** This is the #1 gap. Every
piece is present — the 2030/2031 OMB deadlines (E-us), CNSA 2.0 ~2033, HNDL/Mosca urgency,
"inventory is the real bottleneck," hybrid modes as the default, crypto-agility as the
gating work (A-pqc) — but they are scattered across five nodes. A policymaker being asked
"what should our agency do about the quantum crypto threat this year" needs a single
decision box: *(1) inventory where cryptography lives in your stack; (2) prioritize by
data-shelf-life against the Mosca window; (3) mandate crypto-agility in procurement now;
(4) deploy hybrid (classical + PQC) so a break in either half isn't catastrophic; (5) hit
key-establishment-2030 / signatures-2031.* The atlas has every ingredient and doesn't
assemble the recipe.

**2. No comparative national-strategy scorecard.** The country nodes (E-us, E-china, E-eu,
E-uk, E-others) are individually excellent, and the "Where the ecosystem stands" synthesis
gives a US/China/Europe tripole in prose. But there is no **side-by-side matrix** —
headline pledge / estimated real spend / instrument model (supply-push grants vs demand-pull
procurement vs equity stake vs sovereign-hosting) / modality specialization / stated key
weakness. A policymaker benchmarking their own country's approach wants that table on one
page. E-others covers a dozen countries in prose but not comparably to the big four.

**3. Policy instruments compared *as instruments*, not per-country.** The atlas documents
DARPA QBI (vendor-neutral verification filter), ProQure (demand-pull AMC), the US equity
stakes, and EuroHPC multi-modality hedging — but scattered across nodes, described rather
than compared. A short section "which lever, and what it buys you" — the filter vs the
demand signal vs the equity bet vs the portfolio hedge, with the tradeoff of each (QBI: cheap
signal, no capacity built; equity: upside + winner-picking distortion; ProQure: pulls
demand but may just subsidize R&D under a purchasing label — the atlas *says* this in
E-uk!) — would be the most decision-useful addition after the PQC box.

**4. Export-control effectiveness has no evaluation framework.** The atlas is honestly
agnostic ("effectiveness is unproven") but, unlike the O- frontier nodes, offers no "what
would resolve it" dial for export controls — no framework for what makes controls bite or
fail, or how to weigh the flagged chilling-effect-on-talent against the IP-protection gain.
For a reader who advises *on* export controls, that's the live decision left fully open. A
short "how you'd know the controls are working (or backfiring)" para would match the rigor
the rest of the atlas applies.

**5. Supply-chain reshoring economics / priority.** E-supplychain maps the chokepoints and
raises "is reshoring even affordable" — then drops it. The atlas *implies* dilution fridges
+ helium-3 are the binding constraint ("the single most critical bottleneck"), which is
actionable — it should say it as a procurement priority: if you fund one supply-resilience
line, fund cryogenics/He-3 alternatives (and it already has the Kiutra ADR / higher-temp-qubit
hedges to point at). Right now the leverage-per-dollar judgment is left to the reader.

**6. Timeline inconsistency to reconcile (small but decision-relevant).** The glossary CRQC
entry says expert surveys cluster **"2035–2040"**; O-crqc-timeline says **"2030 ± 3 years,
~50% by 2035."** That's a 5–10 year spread on the single number that sets PQC-migration
urgency. A policymaker keying migration deadlines off the atlas needs these reconciled (or
the divergence itself explained as the honest uncertainty band).

---

## Balance across countries

**Balanced, and notably fair where it would be easy to slant.** The US gets the most detail
(natural, given the 2026 EOs and source availability), but China is treated seriously
without alarmism — and the atlas's refusal to launder the $15B figure actually *cuts
against* the reflexive China-panic framing. Europe and the UK get full nodes; E-others
handles a dozen more with the "pledge ≠ disbursement" caveat applied uniformly to all. The
QKD-vs-PQC question is presented as a genuine live bet (China's physics-security wager vs
the Western agencies' PQC preference), not a settled call. China's real leads (QKD
infrastructure, satellite QKD, patent volume, the self-sufficient parallel software stack
in E-china-stack) are credited squarely.

Minor imbalances worth flagging:
- **Russia** is a one-line "opaque, sanctioned" mention in E-others, yet it's named as an
  HNDL actor in E-pqcmarket — a geopolitical reader wants a bit more on the adversary side
  of the threat model.
- **Gulf states, Singapore, Taiwan** are flagged as "future splits" but absent; for a
  reader tracking the full field these are live players.
- **Sourcing leans Western** (McKinsey, PitchBook, CSIS, postquantum.com, The Quantum
  Insider) — appropriate and the atlas acknowledges the China numbers all pass through
  Western secondary sources, but worth keeping in view when the conclusions touch adversary
  capability.

None of these rise to "slanted." The treatment is even-handed and, more importantly for my
job, it flags its own soft spots.

---

## Top-5 additions / fixes (prioritized)

1. **Add a one-page "PQC migration: what to do and when" decision box** — assemble the
   scattered pieces (inventory → prioritize by data-shelf-life against Mosca → mandate
   crypto-agility → deploy hybrid → hit 2030/2031) into a single actionable sequence. Highest
   value-per-effort addition in the atlas for a policy reader; every ingredient already exists.

2. **Add a comparative national-strategy scorecard** — one matrix: pledge / est. real spend /
   instrument model (supply-push vs demand-pull vs equity vs sovereign-hosting) / modality
   specialization / key weakness, across US/China/EU/UK + the E-others dozen. Turns five
   excellent prose nodes into a benchmarking tool.

3. **Extend the node-ID-code strip to the standalone node files, and fill the glossary gaps**
   (`crypto-agility`, `deemed export`, `Q-day`, `quantum supremacy`, a fuller `trusted
   relay/node` entry). The map invites policy readers to land on node files directly, and
   those are still full of error-code-looking parentheticals and hit undefined operational
   terms.

4. **Add a "which policy lever, and what it buys you" section** comparing DARPA QBI (cheap
   vendor-neutral filter), ProQure (demand-pull, risk of subsidizing R&D), equity stakes
   (upside + winner-picking distortion), and EuroHPC multi-modality hedging — as instruments
   with tradeoffs, not scattered per-country descriptions.

5. **Reconcile the CRQC timeline** (glossary "2035–2040" vs O-crqc-timeline "2030 ± 3, ~50%
   by 2035") and **state the supply-chain reshoring priority explicitly** (cryogenics/He-3
   as the binding chokepoint if you fund one line). Both are cases where the atlas has the
   right answer and stops just short of stating it for a decision-maker.
