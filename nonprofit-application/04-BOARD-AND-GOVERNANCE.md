# Board & Governance

> Companion document to `GOVERNANCE.md` at the repo root. This file is the application-facing version: it describes who is in charge **today**, who will be in charge **after sponsor onboarding**, and the decision rules for the gap in between.

---

## 1. Today (as of 2026-04-14)

| Role | Person | Capacity |
|---|---|---|
| Founding maintainer | Gian Dichio (@gianyrox) | Personal capacity, unincorporated |
| Operating wallet custodian | Gian Dichio | Personal custody, pending transfer to sponsor |
| Domain registrant | Gian Dichio | Personal capacity |
| Code repository owner | Gian Dichio | `gianyrox/bucket-foundation` (planned transfer) |

There is **one decision-maker** today. This is a known weakness, and the first concrete governance milestone (§ 4 below) is to add at least two additional human voices to the decision-making loop — even on an advisory, non-binding basis — before any third-party money enters the wallet.

## 2. Decision rules — interim (today through sponsor onboarding)

Until a fiscal sponsor is in place or a board is seated, the founding maintainer follows these self-imposed constraints:

| Decision class | Rule |
|---|---|
| Merging changes to `PROTOCOL.md` | 7-day public comment window on the PR; founding maintainer merges. |
| Accepting a grant or sponsorship | Public disclosure on the GitHub repo at least 7 days before acceptance. |
| Spending operating funds > $250 in a single transaction | Public disclosure within 7 days, with receipt or on-chain link. |
| Any transaction touching AGFarms LLC | Public disclosure **before** the transaction; founding maintainer does not unilaterally approve. |
| Adding a new maintainer with merge rights | Public disclosure on the repo and a 14-day comment window. |
| Removing a maintainer | Same as adding, plus a written reason in the disclosure. |
| Closing the project / transferring the domain | Requires a 30-day public notice and a written explanation. |

These rules are weaker than a real board, and the founding maintainer acknowledges that. They are stronger than no rules at all, and they are auditable: every decision in the categories above produces a public artifact that any third party can review.

## 3. Decision rules — once sponsored

Upon sponsor acceptance, the Foundation adopts the sponsor's standard governance template. At minimum:

- The sponsor holds (or co-holds) the operating wallet.
- The sponsor reviews quarterly financial and activity reports.
- The sponsor has the authority to halt disbursements if the Foundation is operating outside its stated purposes.
- Any change to the Foundation's mission statement requires sponsor approval.
- Any commercial transaction with AGFarms LLC requires sponsor pre-approval in writing.

## 4. Decision rules — once a board is seated

The Foundation will recruit a board of **3–7 members** within 12 months of sponsor onboarding, with the following composition targets:

| Seat | Filled by | Purpose |
|---|---|---|
| 1 | Founding maintainer | Continuity, technical authority |
| 2 | Author / researcher | Voice of the constituency the Foundation serves |
| 3 | Open-science / open-source veteran | Governance and fiscal discipline |
| 4 (optional) | Library / institutional liaison | Adoption pathway |
| 5 (optional) | Legal / compliance advisor | Risk and policy |
| 6–7 (optional) | Community-elected seats | Once the contributor base is large enough to vote |

**Board rules at adoption:**

- Quorum = a simple majority of seated members.
- The founding maintainer holds **one** vote, equal to any other seat.
- The founding maintainer **does not** hold a permanent veto.
- No board member receives compensation in year one. If compensation is later introduced, it is capped at IRS-published reasonable-compensation benchmarks for nonprofits of comparable size.
- All board members sign the Conflict of Interest Policy (`05-CONFLICT-OF-INTEREST-POLICY.md`) annually.
- Board meetings are held at least quarterly. Minutes are public unless they discuss an active legal matter, personnel, or a specific donor's PII.
- A board member may be removed for cause by a 2/3 vote of the remaining members, or for any reason by a unanimous vote of the remaining members.

## 5. Founding maintainer — bio

**Gian Dichio**
- Founder, AGFarms LLC (Delaware, 2024) — for-profit venture studio
- Prior: software engineering, applied AI, distributed systems
- GitHub: @gianyrox
- Email: gianyrox@gmail.com
- Disclosed conflict: see § 6 and `GOVERNANCE.md` § 7

The founding maintainer's role in the Foundation is **technical stewardship and decision-making of last resort during the interim period**. The role is not designed to be permanent. The first board chair, once seated, is expected to be someone other than the founding maintainer.

## 6. Conflict of interest summary

The founding maintainer is also the founder of AGFarms LLC. AGFarms is a for-profit Delaware LLC operating a venture studio with multiple internal product lines, including an AI orchestration platform called Nucleus Brain.

**The conflict is real, and it has the following specific failure modes:**

1. AGFarms could direct engineering labor toward the Foundation's repos in ways that subtly tilt the protocol toward AGFarms's needs.
2. AGFarms could become a paying consumer of the Foundation's citation data on terms that are not arm's-length.
3. The founding maintainer's attention could be unfairly biased toward AGFarms (which generates revenue) over the Foundation (which does not).
4. A donor could mistakenly believe that a donation to the Foundation benefits AGFarms, or vice-versa.

**Mitigations (each of which is enforceable and auditable):**

1. Every AGFarms-funded engineering contribution to a Foundation repo is disclosed in the PR description. **Auditable** via PR history.
2. Any commercial agreement between AGFarms and the Foundation is disclosed publicly **before** signing, and approved by a non-conflicted board member (or, in the interim, simply not entered into without the sponsor's pre-approval). **Auditable** via the Foundation's quarterly reports and the sponsor's records.
3. The founding maintainer publishes a quarterly attention disclosure: rough hours allocated to AGFarms vs. the Foundation. **Auditable** via the quarterly report.
4. Donation pages and sponsor-facing materials carry a one-line disclosure that AGFarms LLC is a separate for-profit entity not owned by, and not the owner of, the Foundation. **Auditable** by inspection of the public site.

The full text of the policy is in `05-CONFLICT-OF-INTEREST-POLICY.md`.
