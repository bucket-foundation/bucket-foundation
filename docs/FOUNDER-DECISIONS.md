# Founder decisions

Open decisions only you can make, what each one blocks, and what the loop does while it waits. The loop adds a row when it hits a wall and closes one when you answer. Nothing here stops other work: every row names what proceeds without it.

| # | Decision | Raised | Blocks | What happens while it waits |
|---|---|---|---|---|
| FD-1 | The account for the patent bulk data: the USPTO ODP account behind the research gateway's key, or a Google BigQuery project on the free sandbox tier | 2026-09-19 | `ros-patents 2` (the corpus load), and `ros-patents 3` through it | The memo and the design are done and merged (#189), so the load starts the day an account exists |
| FD-2 | Where patent citation fees go. The loop's default is operations with a public ledger | 2026-09-19 | Pricing in `ros-patents 4` | Nothing is charged, and no fee path is built |
| FD-3 | The IP stance before an invention disclosure becomes a production. Publishing ends European novelty at once and starts the twelve-month US grace period, so it cannot be undone | 2026-09-19 | `ros-patents 4` (disclosure as a production) | Disclosures stay private to their author |
| FD-4 | Where the human-AI-computer direction goes on the public site, and in whose words. Public copy ships after you approve the placement and the words | 2026-09-18 | Public site copy | The direction is built inside Research OS, where no public copy is involved |
| FD-5 | `ANTHROPIC_API_KEY` in Vercel for the Academy tutor | 2026-06-14 | The grounded Socratic tutor on the live site | The route ships dark and fails safe |
| FD-6 | The Nucleus host, unreachable since 2026-09-14 (no ping, no port) | 2026-09-14 | `bd-remote` and every `*.nucleus.agfarms.dev` call | Beads queue in `BEADS-PENDING.jsonl` and drain when the host returns |
| FD-7 | Promotion of `dev` to `main`, which is yours by the branch policy | standing | Anything reaching bucket.foundation | Work merges into `dev` and waits there |
| FD-8 | The legal entity behind a funding application: state incorporation and a 501(c)(3) filing, or a fiscal sponsor. Bucket is held in the founder's personal capacity today | 2026-09-21 | `ros-09c`: Cloudflare Project Galileo, which asks for a nonprofit doing public-interest work; Vercel for Startups, whose eligibility is unstated; and Fast Forward, whose 2026-09-18 date passed and whose next cycle has no posted date | `ros-09a` and `ros-09b` proceed. The Tools Competition takes individuals and teams at any phase, Phase I abstract due 2026-10-13; the Renaissance Philanthropy inquiry and the Sentry open-source plan ask for no entity, the plan on Bucket's MIT license; DPG registration names individuals as eligible submitters, with `WAVE-1-TARGETS.md` marking that point UNVERIFIED; NLnet takes individuals and needs its own answer on the European-dimension bar |
 | FD-9 | Whether a node's `standing` gates learning or only labels it. Gating the Check protects the graph from a learner building on a claim nobody has graded, and it also stops a learner reaching the frontier, which is where Bucket says the work is | 2026-09-21 | `ros-truth 2`, the schema; and every Check surface through it | `learning/research-os/TRUTH-TIERS.md` is written and the two axes are specified. Nothing is migrated |
| FD-10 | Who may move a node to `established`. The reviewer allowlist is two or three people today, and a citation over x402 is priced against that grade | 2026-09-21 | `ros-truth 2` | Nodes carry the `tier` smallint they carry now |
| FD-11 | Whether a move down invalidates a citation already sold. `cite-forever/v0.1` says nothing about it, and the answer decides whether a receipt records the grade at purchase or resolves it live | 2026-09-21 | `ros-truth 2` and the citation contract in `PROTOCOL.md` | PR #196 records the source revision on every receipt, so either answer stays available |
| PR-072 | An upward teacher override pays XP with no cap. The slice-1 review recorded it and left it, because a cap is a product decision | 2026-09-20 | Nothing; it is live behaviour | The override transaction is correct; only the reward is uncapped |
| PR-073 | `graph.level_overrides` survives a privacy delete. A teacher decision about a learner may count as the teacher record, which is why it stayed | 2026-09-20 | Nothing; it is live behaviour | Every other learner-scoped table is deleted |
| PR-074 | `holdsStaffRole` is self-grantable: anyone signed in can create a class, hold a teacher role in it, and become a reviewer. Class scoping now bounds what that reaches, and the gate itself is unchanged. `/class` also serves an unfiltered subgraph | 2026-09-20 | Nothing; it is live behaviour | PR #195 scopes the review queue and its decisions to the reviewer's own classes |

## How a row closes

Answer it in a session, or write the answer into the row. The loop reads this file at the start of a task, and an item whose decision is open cannot sit in the MVP stage of `learning/research-os/ROADMAP.md`. An answered one moves into Decisions made on the same pass, because a decision nobody can see gets made twice.

## Decisions made

A ruling given in one session is invisible to every other one. On 2026-09-21 two sessions built competing fixes for the same problem, four hours apart, because the answer lived in one transcript. Whoever receives a ruling writes it here the moment it lands, before starting the work.

| Date | Decision | Asked in | Carried by |
|---|---|---|---|
| 2026-09-21 | The 599 transcript cards under `bucket-canon/*/sub-claims/` are source excerpts and out of canon. They keep citing their video and timestamp, they move from `/canon/claims` to `/excerpts`, their graph kind is `excerpt` and their provenance type is `source_excerpt`. A card rejoins canon when it names its foundation and a person promotes it | the `bkt-nuc` session, as a posed question | #208, with the map filter in #195 and the promotion gate held on `fix/canon-claims-promotion-gate` until the first card is curated |
