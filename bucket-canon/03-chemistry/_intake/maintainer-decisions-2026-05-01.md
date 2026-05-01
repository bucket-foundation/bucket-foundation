# Chemistry canon — maintainer decisions on pass-3 §8 unresolved

Date: 2026-05-01
Decided by: orchestrator on standing brief from founder; flag for founder review at next `bkt-` session if any call should be reversed.
Binds: pass-3 work queue execution. None of these decisions reopens the canon tree.

---

## Q1. Where do canon-adjacent textbooks (Atkins, March, Cotton-Wilkinson, Coulson, Cotton 1990, Streitwieser, Anslyn-Dougherty, Szabo-Ostlund, Skoog) live?

**Decision: open `03-chemistry/_landscape/textbooks.md`.** Single file, one paragraph per text, no folder explosion.

Reasoning: pass-3 §3.4 closed the door on these as canon (they are not originator works, and "normative" in c3 means standards-body adoption, not popularity). But a chemistry researcher arriving at Bucket needs to know these books exist and where they sit relative to canon, otherwise the absence reads as ignorance, not discipline. A flat registry file solves the discoverability problem without diluting canon. Same pattern available to other branches when they hit the same question.

---

## Q2. Does `polymer-chemistry/` get its own sub-folder?

**Decision: yes, own sub-folder, as pass-3 recommends.** Stand-alone.

Reasoning: Staudinger 1920 is a paradigm shift, not a bonding sub-case. Folding macromolecules into `bonding/` would imply they are special cases of small-molecule bonding, which is precisely the framing Staudinger's macromolecular hypothesis demolished. Folding into `thermodynamics/` would obscure that polymer chemistry's distinguishing claim is structural (covalent chains), not thermodynamic. Own sub-folder, four entries, done.

---

## Q3. IUPAC books — `03-chemistry/reference/iupac/` or top-level `bucket-canon/_reference/iupac/`?

**Decision: keep IUPAC in `03-chemistry/reference/iupac/`.** Cross-link from any branch that cites it.

Reasoning: the IUPAC books are chemistry-discipline normative references first, cross-cutting second. Other branches will declare their own normative bodies as they mature (NIST CODATA for `02-physics/`, IEEE/ISO for `04-information/`, IUPHAR for biophysics-pharmacology cross-links). A premature top-level `_reference/` folder would force a vocabulary decision before the second branch is even built. When the second normative-body holding appears, open a portfolio bead and revisit. Until then, IUPAC stays in chemistry and other branches cross-link by exact path (`../../03-chemistry/reference/iupac/<book>.md`).

---

## Q4. Lewis 1907 *Proc. Am. Acad.* 43, 259 — separate entry or fold into Lewis-Randall 1923?

**Decision: separate entry.** Add `1907-lewis-outlines-new-system-thermodynamic-chemistry.md` to `thermodynamics/` per pass-3 tree.

Reasoning: cleaner attribution. The activity concept has its own originator priority and its own paper; folding it into the 1923 Lewis-Randall *Thermodynamics* monograph would conflate the originator paper with the discipline-defining textbook. Pass-3 §3 just spent a section establishing that originator priority and edition-of-record monograph are different canon tiers; honor that rule consistently. Three Lewis-Randall lineage entries (1907, 1923, 1961 ed.) is the clean read.

---

## Q5. Open `03-chemistry/spectroscopy/` or not?

**Decision: do not open a chemistry spectroscopy folder.** Originator entries (Zeeman 1897, Stark 1913, Raman 1928, Bloch 1946 + Purcell 1946) live in `02-physics/`. Cross-link from `03-chemistry/CROSS_LINKS.md`.

Reasoning: pass-3's view is correct. A chemistry spectroscopy folder containing only landscape (Cotton 1990 group theory, Atkins chapters) sends a worse signal to a chemist than no folder at all — it suggests Bucket has nothing originator-tier to point at when in fact the originators are one branch over. The cross-link table is the right mechanism to make the relationship visible. If a future maintainer disagrees, the cost of opening the folder later is low (mkdir, write README, point cross-links inward).

---

## Status

All five decisions executed in this session's Phase A scaffold (Q2 and Q5 are folder presence/absence calls; Q1 created `_landscape/`; Q3 used `reference/iupac/`; Q4 added the 1907 entry to the work queue carry-forward).

None of these decisions reopens canon adjudication. Pass-3's tree is frozen at 79 entries across 17 sub-folders.
