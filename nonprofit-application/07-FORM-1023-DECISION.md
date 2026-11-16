# Form 1023 Decision

Checked on 2026-11-16 against the Form 1023-EZ Eligibility Worksheet in the [Instructions for Form 1023-EZ, revised January 2025](https://www.irs.gov/instructions/i1023ez). The worksheet has 34 questions. One "Yes" sends the organisation to the full [Form 1023](https://www.irs.gov/forms-pubs/about-form-1023).

The May 2026 worksheet in this folder listed 25 questions and included a question on unrelated business income. The IRS worksheet has no such question, and the January 2025 revision added questions 31 to 34.

## Verdict

File the full Form 1023. Confirm with counsel.

| Deciding question | Answer | Why |
|---|---|---|
| 1. Gross receipts above $50,000 in any of the next 3 years | Yes | Gross receipts count every dollar received with no costs subtracted. Marketplace gifts that pass through to researchers count in full. The May budget already sat at $50,000 in year 3 before any marketplace. |
| 34. Exchanging, creating or distributing digital assets | Yes if the citation rail stays planned | The specified citation rail settles in a stablecoin on Base and pays authors in it. Confirm with counsel whether a specified rail that has never settled counts. |
| 26. Donor advised funds | No by design, at risk | A donor who keeps a named balance and advises where it goes makes a donor advised fund. The marketplace spec bans that pattern. Confirm with counsel that project-level giving stays outside the definition. |

## Decision Table

| Factor | Form 1023-EZ | Form 1023 |
|---|---|---|
| User fee | $275 | $600 |
| IRS wait, 80% of cases | 22 days | 191 days |
| Narrative of activities | None, attestation only | Full description in Part IV |
| Marketplace regranting disclosed to the IRS | No field for it | Part IV lines 9 to 11 |
| Licence with a founder-owned company disclosed | No field for it | Part IV line 7, Part V line 4 |
| Expedite request | Never | Allowed in listed cases |
| Outcome if ineligible | Application rejected | Does not apply |
| Fit for this organisation | Fails questions 1 and 34 | Fits |

Fees: [IRS user fee page](https://www.irs.gov/charities-non-profits/form-1023-and-1023-ez-amount-of-user-fee). Waits: [IRS processing times](https://www.irs.gov/charities-non-profits/charitable-organizations/wheres-my-application-for-tax-exempt-status), checked on 2026-11-16.

A determination letter protects the organisation only for the facts the application disclosed. The marketplace and the Polingual licence are the two facts an examiner would ask about first, so the full form is the place to disclose both. Confirm with counsel.

## Worksheet

Answers assume a nonstock corporation formed in a US state with a US mailing address.

| # | Question, shortened | Answer | Basis |
|---|---|---|---|
| 1 | Gross receipts projected above $50,000 in any of the next 3 years | Yes | Marketplace gifts count in full |
| 2 | Gross receipts above $50,000 in any of the past 3 years | No | No entity, no receipts |
| 3 | Total assets above $250,000 | No | No assets |
| 4 | Formed under foreign law | No | US state corporation |
| 5 | Foreign mailing address | No | US address |
| 6 | Successor to or controlled by an entity suspended under section 501(p) | No | |
| 7 | Organised as an entity other than a corporation, association or trust | No | Nonstock corporation |
| 8 | Formed as a for-profit entity | No | |
| 9 | Successor to a for-profit entity | No | The Foundation takes over no for-profit. Polingual moves out, and nothing moves in. Confirm with counsel. |
| 10 | Previously revoked, or successor to a revoked organisation | No | |
| 11 | Exempt now or before under another section of 501(a) | No | |
| 12 | Church | No | |
| 13 | School, college or university | No | The Academy has no faculty and no enrolled student body |
| 14 | Hospital or medical research organisation | No | |
| 15 | Agricultural research organisation | No | |
| 16 | Cooperative hospital service organisation | No | |
| 17 | Cooperative service organisation of educational organisations | No | |
| 18 | Qualified charitable risk pool | No | |
| 19 | Supporting organisation under section 509(a)(3) | No | Public charity under 509(a)(1) or 509(a)(2) |
| 20 | Credit counselling as a substantial purpose | No | |
| 21 | 5% or more of assets in securities that are not publicly traded | No | The Foundation takes no equity in the Polingual company. An equity stake above 5% of assets flips this. |
| 22 | Partnerships that share losses with partners outside 501(c)(3) | No | The Polingual deal is a licence with a royalty. A profit-and-loss sharing venture flips this. Confirm with counsel. |
| 23 | Sells carbon credits or offsets | No | |
| 24 | Health maintenance organisation | No | |
| 25 | Accountable care organisation | No | |
| 26 | Maintains or intends to maintain donor advised funds | No by design | See the deciding questions |
| 27 | Testing for public safety | No | |
| 28 | Private operating foundation | No | |
| 29 | Private foundation seeking reinstatement as a public charity | No | |
| 30 | Retroactive reinstatement under Rev. Proc. 2014-11 section 5 or 6 | No | |
| 31 | Previously denied recognition of exemption | No | |
| 32 | Previously found ineligible to file Form 1023-EZ | No | |
| 33 | Activities involving Schedule I or II controlled substances | No | The canon holds published literature only. Confirm with counsel. |
| 34 | Exchanging, creating or distributing digital assets | Yes if the rail stays planned | See the deciding questions |

## Form 1023 Parts That Need Founder Facts

| Part | Content | Source in this folder |
|---|---|---|
| I | Legal name, address, EIN, directors and officers | Founder inputs in `README.md` |
| II | State and date of formation, articles, bylaws | `06-ARTICLES-*.md`, `08-BYLAWS-OUTLINE.md` |
| III | Purpose clause and dissolution clause locations | `06-ARTICLES-*.md` |
| IV | Narrative, grants, intellectual property, donor advised funds | `02-NARRATIVE.md` |
| V | Compensation, related-party dealings | `05-CONFLICT-OF-INTEREST-POLICY.md`, `11-FOR-PROFIT-LICENCE-TERMS.md` |
| VI | Three years of projected revenue and expenses | `03-BUDGET.md` |
| VII | Public charity classification | `03-BUDGET.md`, public support section |
| VIII | Effective date | File within 27 months of formation |

The application goes in through [Pay.gov](https://www.pay.gov/public/form/start/704509645) with one PDF attachment under 15 MB: articles first, then amendments, then bylaws, then supplemental responses. Source: [Instructions for Form 1023](https://www.irs.gov/instructions/i1023).
