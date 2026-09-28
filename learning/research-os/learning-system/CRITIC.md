# Learning system critic

The independent Bucket critic uses frozen repository weights and a target above 9/10, every dimension at least 8, with no high or critical finding. Round reports are evidence assessments. They grant no production or learner-outcome certification.

## Round 1

Verdict: fail, 8.05/10. Baseline `ce7f9395`; draft plan SHA256 prefix `3b911febcfab`. Proof and analysis were unrun.

| Dimension | Weight | Score |
|---|---:|---:|
| Grounding | 10 | 9 |
| Workflow | 10 | 9 |
| Contracts | 15 | 8 |
| Authorization | 20 | 7 |
| Operations | 15 | 8 |
| Evaluation | 10 | 8 |
| Rollout | 5 | 9 |
| Tracking | 5 | 8 |
| Privacy | 5 | 6 |
| Claims | 5 | 9 |

Weighted sum: 805/100 = 8.05.

- C1, high: client-owned progress can advance mastery. Require server-assessed evidence and trusted writers before certified planning.
- C2, medium: define axis denominators, allocation and duplicate handling.
- C3, medium: define evidence retention/deletion and cache invalidation.
- C4, medium: bind revision, theorem assumptions and acceptance commands.

| Review | Severity | File | Line | Issue | Fix |
|---|---|---|---|---|---|
| Secrets | None | PLAN.md | All | None found | None |
| QA | High | PLAN.md | Integration | C1 | Server evidence gate |

Parent repairs: PLAN now excludes legacy stages from certified mastery, defines the evidence transaction and deletion policy, supplies the numerical axis fixture, and states proof assumptions. Execution evidence follows in later rounds.

## Round 2

Verdict: threshold unmet, 9.00/10 against a threshold above 9. Scope: plan SHA `0ac228ae`, Lean SHA `13bcf8f6`, analysis SHA `885defd0`. C1 through C4 closed. No high or critical finding.

Scores in frozen table order: 9, 9, 9, 9, 9, 9, 9, 9, 8, 10.
Arithmetic: `(90+90+135+180+135+90+45+45+40+50)/100 = 9.00`.

- C5, medium: Lean assumes global mastery closure while Python checks target-local closure. Add the restriction lemma and disconnected inconsistency fixture.
- C6, medium: 180-day evidence deletion conflicts with lifetime attainment. Define a minimal historical receipt and its erasure/revocation policy.

Executed: Lean build and axiom audit; 57,060 graph cases; axis assertions; synthetic residual analysis. Production authorization and learner outcomes remain untested.

| Review | Severity | File | Line | Issue | Fix |
|---|---|---|---|---|---|
| Secrets | None | Artifacts | All | None found | None |
| QA | Medium | PLAN.md | Contracts | C5, C6 | Restriction and receipt rules |

## Round 3

Verdict: pass, 9.05/10. Reviewed candidate `db49e53d774884b19358c7d8a41c2052244a758b`. Scope: implementation plan and formal/synthetic prototype. All dimensions meet the critic threshold; no unresolved high or critical findings.

Scores in frozen table order: 9, 9, 9, 9, 9, 9, 9, 9, 9, 10.
Arithmetic: `(90+90+135+180+135+90+45+45+45+50)/100 = 9.05`.

C1 through C4 remain closed. C5 closed through the restriction lemmas and disconnected-mastery fixture. C6 closed through retained attainment receipts and erasure/revocation contracts.

Executed: Lean compilation, ten axiom outputs, 57,060 graph cases, axis assertions, synthetic statistics and diff check. Production authorization tests and human studies remain unrun. Optimality depends on exact prerequisite enumeration and a ready-order certificate.

| Review | Severity | File | Line | Issue | Fix |
|---|---|---|---|---|---|
| Secrets | None | Candidate artifacts | All | None found | None |
| QA | None | Candidate artifacts | All | No remaining finding | None |

## Reviewed artifact identity

| Artifact | SHA256 |
|---|---|
| PLAN.md | `79473c68f39de0d088f4e7e8ef3c5da9cbb4bc082203c95dc94652fa978d67c0` |
| lean/LearningSystem.lean | `44b5450158265f971bcccdbe7692a70dc290f83207b3ec82bcd7f6427bd727cb` |
| analysis/evaluate.py | `4190094b52e8a08337080f3909b0a27c9079db7b63315fd47960516c81c18d92` |

The delivery commit after the reviewed candidate adds this final review record. The plan, proof and analysis retain the reviewed hashes.
