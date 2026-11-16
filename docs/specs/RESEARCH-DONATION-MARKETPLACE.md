# Research Donation Marketplace

Drafted 2026-11-16 from the founder ruling of the same day: taxpayers give to research through Bucket Foundation and take the deduction the Foundation provides. Every rule below is a legal judgment. Confirm with counsel before any page ships.

## How A Gift Stays Deductible

| # | Rule | Product consequence | Source |
|---|---|---|---|
| 1 | The gift goes to the Foundation, never to the researcher | Checkout names the Foundation as payee. Receipts come from the Foundation. | [Publication 526](https://www.irs.gov/publications/p526) |
| 2 | No gift is set aside for a named individual | A donor picks a project fund. Copy says "support this project". | Publication 526, contributions for a specific person |
| 3 | The Foundation keeps control and discretion | Board approval before listing. Variance clause on every gift page: the Foundation may redirect the fund. | [Rev. Rul. 68-489](https://www.irs.gov/pub/irs-tege/rr68-489.pdf) |
| 4 | Grants to non-charities fund specific projects, with records | Written agreement, budget, milestones, reports, open publication, clawback | Rev. Rul. 68-489 |
| 5 | No donor advised fund | No donor wallet, balance or later say over a gift | [IRS donor advised funds](https://www.irs.gov/charities-non-profits/charitable-organizations/donor-advised-funds) |
| 6 | Receipt for each gift of $250 or more | Emailed acknowledgment: Foundation name, amount, "no goods or services were provided" | [IRS acknowledgments](https://www.irs.gov/charities-non-profits/charitable-organizations/charitable-contributions-written-acknowledgments) |
| 7 | Nothing of value returns to the donor | No rewards, perks, equity or data access for donors | [Publication 1771](https://www.irs.gov/pub/irs-pdf/p1771.pdf) |
| 8 | No insider receives a grant | Directors, officers, the founder, families and their companies are blocked as recipients | [IRS private benefit](https://www.irs.gov/charities-non-profits/charitable-organizations/inurement-private-benefit-charitable-organizations) |
| 9 | Foreign recipients need extra checks | US recipients only at launch. Sanctions screening on every payee. | [Instructions for Form 1023](https://www.irs.gov/instructions/i1023), Part IV lines 9 and 10 |
| 10 | States regulate the asking | Register in the home state first, then state by state before national promotion | `nonprofit-application/10-FILING-ORDER.md`, [Multi-State Filer Project](http://multistatefiling.org/) |

Expenditure responsibility under section 4945 binds private foundations. A public charity follows rule 4. If the Foundation ever fails the public support test, the stricter regime applies ([IRS](https://www.irs.gov/charities-non-profits/private-foundations/grants-by-private-foundations-expenditure-responsibility)).

## Before The Determination Letter

| Claim or action | Before the letter | With a fiscal sponsor meanwhile |
|---|---|---|
| "Tax-deductible" | Banned | Allowed, in the sponsor's name |
| "501(c)(3)" or "tax-exempt" | Banned | Sponsor's status only, with the sponsor named |
| "Application pending, deduction not assured" | Allowed after Form 1023 is filed | Not needed |
| Receipts | Plain payment receipt, no deduction wording | Sponsor issues the acknowledgment |
| Employer matching, gifts from donor advised funds | Banned, both need the letter | Through the sponsor |
| Asking New York or New Jersey residents | Only after state registration | Under the sponsor's registrations |
| Who owns the money | The Foundation | The sponsor, which must approve each regrant |

The IRS gives donors no assurance while an application is pending. Gifts become deductible back to formation when a timely Form 1023 is approved ([IRS](https://www.irs.gov/charities-non-profits/charitable-organizations/exempt-organizations-general-issues-deductibility-of-contributions-while-application-pending)).
Sponsor models: in Model A the marketplace is the sponsor's own program. In Model C the sponsor grants to the Foundation as a separate entity ([Fiscal Sponsorship: 6 Ways To Do It Right](https://fiscalsponsorship.com/the-models-summary/)). Either way the sponsor takes a fee and holds the control this spec gives the board.

## How Others Do It

| Platform | Structure | Deduction |
|---|---|---|
| [Experiment](https://experiment.com/faq) | For-profit platform, 8% fee plus card fees | Only for projects tied to a 501(c)(3) that issues the receipt |
| [DonorsChoose](https://www.donorschoose.org/about) | Public charity that buys and ships the requested materials itself | Yes, the charity controls the spend |
| Fiscal sponsors | Charity owns project funds and regrants | Yes |

## Data Model

| Table | Key fields |
|---|---|
| `mkt_projects` | id, title, summary, budget_cents, recipient_id, status (draft, review, approved, funded, closed), approved_by, approved_at, open_license |
| `mkt_recipients` | id, kind (public_charity, organization, individual), ein_verified, sanctions_checked_at, insider_check_at, country |
| `mkt_gifts` | id, donor_id, project_id, amount_cents, processor_ref, received_at, variance_ack, ack_sent_at |
| `mkt_grant_agreements` | id, project_id, document_ref, signed_at, milestones |
| `mkt_disbursements` | id, project_id, amount_cents, approved_by, paid_at, milestone |
| `mkt_reports` | id, project_id, due_at, received_at, publication_url |
| `mkt_redirects` | id, from_project_id, to_project_id, amount_cents, board_resolution_ref |
| `mkt_donor_states` | donor_id, state, used to gate promotion by registration |

No table holds a donor balance. Donor addresses live in the payment processor.

## Build Slices

| Slice | Content | Gate |
|---|---|---|
| S1 | Project intake and grants committee review queue | Board seated |
| S2 | Public project pages with the variance clause and separation statement | S1, counsel sign-off on copy |
| S3 | Checkout to a Foundation-owned restricted account, receipts and $250 acknowledgments | Determination letter or sponsor |
| S4 | Grant agreements, milestone disbursements, sanctions and insider checks | S1 |
| S5 | Reporting, open publication links, yearly Form 990 export | S4 |
| S6 | State registration gate on promotion and email | Home-state registration |

## Open Questions For Counsel

1. Does project-level giving stay outside the donor advised fund definition when a donor funds one researcher's project?
2. May individuals receive research grants directly, and does Form 1023 Schedule H apply?
3. What share may the Foundation keep from each gift, and how must the page disclose it?
4. Which states need registration before the site accepts gifts from their residents?
5. Is a grant taxable income to an individual researcher, and which information returns follow?
6. May a marketplace page run under a fiscal sponsor before the letter, and under which model?
7. May gifts or payouts use stablecoin, and what does that change on Form 1023?
8. Which crowdfunding or payment-platform rules apply in New York and New Jersey?
