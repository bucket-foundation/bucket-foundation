# Erdős Tag Check

Bead bkt-c32x. Two public records track the same Erdős problems: the `@[category research open|solved]` tags in formal-conjectures at `137aec5c`, dated 2026-09-30, and the status field of the Erdős problems database at `b916d95`, dated 2026-09-28. This check lists where they disagree.

## Method

A problem's upstream state comes from every theorem in `ErdosProblems/<n>.lean` whose name has no `.variants.` part. It counts as open upstream when all of those are tagged open and as solved upstream when all are tagged solved. The database counts as resolved for the states proved, disproved, solved and independent, with or without a Lean mark. The 2 problems in the states not provable and not disprovable are left out of the comparison.

## Result

| Measure | Value |
|---|---|
| Erdős files upstream | 785 |
| Compared | 772 |
| Both resolved, or upstream partly solved | 387 |
| Both open, or upstream partly solved | 362 |
| Resolved in the database, open upstream | 2 |
| Solved upstream, unresolved in the database | 21 |
| Of those, with a formal-proof link on a main theorem | 19 |
| Open upstream and marked falsifiable, decidable or verifiable in the database | 31 |

[empirical: formal-conjectures 137aec5c and erdosproblems b916d95, 2026-10-01, python3 stale_tags.py --repo fc-history.git --head 137aec5c --database erdosproblems]

The two records agree on 749 of 772 problems. Upstream lags on 2. The database lags, or declines the claim, on 21.

## Open Upstream

| Problem | Database state | Updated | Proof repositories |
|---|---|---|---|
| 321 | solved | 2025-08-31 | none |
| 547 | proved | 2026-09-03 | none |

Problem 547 upstream splits the statement: the all-n form stays open and the large-n form is tagged solved, so the database entry may refer to the large-n form. Problem 321 asks "what is R(N)", and the two records may hold different standards for an answer. Each needs a reader before a correction goes upstream.

## Solved Upstream

| Problem | Database state | Updated | Proof repositories |
|---|---|---|---|
| 130 | open | 2025-08-31 | williamjblair/lean-proofs |
| 254 | open | 2025-08-31 | williamjblair/lean-proofs |
| 260 | open | 2025-08-31 | Hanziwww/erdos260 |
| 267 | open | 2025-08-31 | williamjblair/lean-proofs |
| 341 | open | 2025-08-31 | plby/lean-proofs |
| 394 | open | 2025-10-28 | williamjblair/lean-proofs |
| 424 | open | 2025-08-31 | plby/lean-proofs |
| 486 | open | 2025-08-31 | Konamiu/formal-conjectures, plby/lean-proofs |
| 489 | open | 2025-08-31 | williamjblair/lean-proofs |
| 520 | open | 2025-08-31 | plby/lean-proofs |
| 521 | open | 2025-08-31 | williamjblair/lean-proofs |
| 522 | open (Lean) | 2026-09-25 | KitaKen1/erdos-522-strong-law, chreia/erdos-522 |
| 550 | open (Lean) | 2026-09-11 | plby/lean-proofs |
| 655 | open | 2025-08-31 | AlperTheKing/formal-conjectures |
| 769 | open | 2025-08-31 | williamjblair/lean-proofs |
| 796 | open | 2025-08-31 | williamjblair/lean-proofs |
| 848 | decidable | 2025-10-19 | none |
| 973 | open | 2025-08-31 | none |
| 1041 | falsifiable | 2025-09-15 | wcook04/plectis-erdos |
| 1097 | open | 2025-10-18 | mo271/formal-conjectures |
| 1188 | open | 2026-04-04 | williamjblair/lean-proofs |

19 of these 21 cite a Lean proof in a third-party repository on a main theorem, and 14 of the links point to two repositories. The database had not accepted them by 2026-09-28. Upstream narrows some statements: for problem 130 the solved theorem covers the chromatic number and leaves the clique number out. This list is a queue of proof claims to audit. No proof here was compiled or read.

## Checkable And Open

The database marks these 31 problems as falsifiable, decidable or verifiable, meaning a finite computation or one example could prove or disprove each, and upstream still tags a main theorem open: 7 verifiable, 19 decidable, 23 falsifiable, 64 falsifiable, 97 falsifiable, 107 falsifiable, 128 falsifiable, 242 falsifiable, 287 falsifiable, 307 verifiable, 364 verifiable, 366 verifiable, 375 falsifiable, 398 falsifiable, 458 falsifiable, 488 falsifiable, 506 decidable, 551 decidable, 583 falsifiable, 617 falsifiable, 628 falsifiable, 647 verifiable, 672 verifiable, 699 falsifiable, 723 falsifiable, 742 decidable, 779 falsifiable, 835 verifiable, 982 falsifiable, 1020 falsifiable, 1082 falsifiable.

## Limits

- The rule reads tags and names. A file that formalizes a narrower statement than the database entry shows as a disagreement.
- 11 files had no main theorem under the naming rule or no database entry.
- The database commit is two days older than the upstream commit.
