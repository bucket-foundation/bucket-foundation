# Fast Forward 2027 Accelerator: Application Draft

Bead `ros-09`. Verified 2026-09-10 by direct WebFetch against ffwd.org's live pages. Every fact below carries its page or file source. Word counts are approximate: the live application is a JS-rendered multi-step form (apply.ffwd.org/2027-accelerator) that a static fetch only partly renders, so the literal essay prompts and their character limits could not be retrieved. Confirm exact prompts and limits against the live form before submitting. The narrative blocks in section 3 are drafted material sized to a typical accelerator answer, meant for pasting into whichever prompts the form shows, since the live prompts themselves could not be retrieved.

## 1. Does the deadline hold

**Yes, 2026-09-18 holds**, with one wrinkle worth flagging to the founder. The ffwd.org homepage carries a banner: "The application deadline for the 2027 Accelerator has been extended to September 18!" A separate, older paragraph elsewhere on the same page still reads "Applications for the 2027 Accelerator are open through September 7 at 11:59 p.m. PST," a stale line the banner supersedes. Apply against September 18, and do not let the stale September 7 text on the page cause a false sense of more runway than exists, eight days from this draft's date.

Source: [ffwd.org](https://www.ffwd.org/), [ffwd.org/apply](https://www.ffwd.org/apply/), fetched 2026-09-10.

## 2. Does eligibility hold

**Conditionally yes, and the condition is the live blocker.**

Fast Forward's two hard requirements, quoted verbatim from ffwd.org/apply: "1) You are pursuing a nonprofit business model to fund your work. 2) You have at least a minimum viable product (MVP) built." Bucket Foundation clears requirement 2 today: Phase 0 of Research OS for K-12 shipped and runs end to end against real seeded content (`learning/research-os/PLAN-REVISION-1.md` section 1, PR #6).

Requirement 1 is where the FAQ adds a condition the base packet has not yet met. Quoted from Fast Forward's FAQ: on current 501(c)(3) determination, "Yes. We can help with the incorporation process. Teams that are fiscally sponsored by larger nonprofits are also eligible." On pending status: "Yes. As long as you're registered as a nonprofit in your country."

Bucket Foundation today has **neither** a signed fiscal sponsor **nor** a filed state nonprofit incorporation. `GOVERNANCE.md` section: "Legal status: nonprofit, formalization in progress." `nonprofit-application/00-BASE-INFO-MEMO.md` gaps G-1 through G-4: no EIN filed, no board named, no bylaws drafted, no state of incorporation chosen. The same memo's own status line states plainly: "Nothing has been filed. No sponsor has been contacted." `_intake/research-os-k12/funding-log.md` already logged this exact gap against this exact funder: "Deadline 2026-09-18; state the fiscal-sponsor plan in the application."

So this thread does not stop, but it does not clear on the current packet alone either. Two paths close the gap before 2026-09-18, and either one is enough on Fast Forward's own eligibility language:

1. File state nonstock nonprofit articles of incorporation. `00-BASE-INFO-MEMO.md` section 4 puts a home-state filing (New York quoted) at roughly $75. The memo does not state a processing turnaround; confirm current filing turnaround directly with the state before relying on it to close inside the eight days remaining.
2. Get a fiscal sponsorship application in motion with the sponsor named in `FISCAL-SPONSOR-DECISION.md` (this packet, filed alongside this document). Players Philanthropy Fund's own FAQ states an initial review response within 3 to 5 business days, tight but inside the window if submitted this week.

Either path lets the application state a concrete answer instead of "pending, unresolved" on the one question the FAQ makes load-bearing. This is the single founder action that determines whether the application is submittable at all; everything in section 3 below can be drafted regardless.

Sources: [ffwd.org/apply](https://www.ffwd.org/apply/), [ffwd.org/faq](https://www.ffwd.org/faq/), fetched 2026-09-10; `GOVERNANCE.md`; `nonprofit-application/00-BASE-INFO-MEMO.md`; `_intake/research-os-k12/funding-log.md`.

## 3. What Fast Forward funds

Quoted from ffwd.org: a "$25K philanthropic grant" (elsewhere on the same page, "$25K+ seed capital"), plus mentorship, community, and access to Fast Forward's own tools (an AI Policy Builder and an AI Grant Writing Coach, named on the homepage). Program length: three months, late February to early June 2027 (ffwd.org), consistent with the "12-week program" figure already logged in `_intake/research-os-k12/04-funding-and-people.md` row 2. This resolves that row's earlier "amount unverified" note to a confirmed $25K+.

## 4. Logistics questions

These are the fields apply.ffwd.org/2027-accelerator rendered on fetch. All are short factual fields with no meaningful word-count pressure.

| Field | Answer | Source |
|---|---|---|
| Primary contact name | Gian Dichio | `nonprofit-application/README.md`, "Founding maintainer: Gian Dichio (@gianyrox)" |
| Primary contact title | Founding maintainer | `MANIFESTO.md` closing signature; `GOVERNANCE.md` section 5 |
| Primary contact email | gianyrox@gmail.com | `nonprofit-application/README.md` |
| Applied to the Accelerator before | No | No prior Fast Forward application exists in any file this pass read |
| How did you learn about Fast Forward | Founder-only, no source file states this | Founder must answer |
| Can you commit to one co-founder/leader attending every virtual session | Founder-only | Depends on founder's calendar; Bucket has a single founder, worth stating plainly rather than implying a co-founder team exists |
| Can you commit to 8 to 10 hours per week of programming and supplemental work | Founder-only | Capacity question, cannot be answered from any file |
| Can at least one founder attend every in-person session in San Francisco | Founder-only | Travel and cost commitment, cannot be answered from any file |
| Professional-level English fluency for an English-conducted program | Yes | The entire repository, every document this pass read, is written in English by the founder |
| May Fast Forward share your application with ecosystem partners and funders | Founder-only | A yes plausibly helps discovery by the funders named in `WAVE-1-TARGETS.md`; a no is defensible if the founder wants to control initial framing. No file states a prior decision either way |

## 5. Narrative blocks

Standard categories a nonprofit tech accelerator asks about, built from Fast Forward's own stated evaluation criteria (ffwd.org/apply: "leadership, tech talent, impact potential, scalability, lived experience, and alignment with Fast Forward's expertise"). Each block cites its source file. Paste into whichever literal prompt the live form shows; each is sized near 120 words, a common accelerator ceiling, so trim rather than expand if the live form's limit is lower.

**What problem are you solving, and for whom (approx. 118 words)**

> Scholarly and general knowledge foundations exist online in more volume than at any point in history, but a school-age learner has no workspace built to use AI on that knowledge without the AI doing the thinking for them. Consumer chatbots answer the question directly and the practice of finding, checking, and organizing evidence never happens. Research OS for K-12 constrains an AI research assistant to four non-generative tools, find, quote, check, organize, so the learner keeps doing the thinking: AI removes the friction of search and citation-checking, and the thinking stays the learner's own. The system already runs end to end against a seeded prerequisite path: a graph schema, frontier-backward routing, and the four-tool workspace, shipped and working today.
>
> Source: `learning/research-os/PLAN-REVISION-1.md` section 5 (ETH AI Center fellowship paragraph, the same claim reused here); section 1 (PR #6 shipped evidence).

**What is your organization, and why does it exist as a nonprofit (approx. 96 words)**

> Bucket Foundation makes primary research paid for once and citeable forever, and routes citation fees back to the authors who wrote the foundations, away from the publishers that paywall them. Research OS for K-12 is the education-facing extension of that mission: the constrained-AI workspace and the citation-canon substrate share one graph, one production schema, and one citation rail. A nonprofit structure is the only one consistent with the mission's own terms, no equity, no exit, and a payment rail that exists to route value to authors and learners rather than extract it.
>
> Source: `GOVERNANCE.md` section 1 ("Mission"); `MANIFESTO.md` sections 3 and 6 ("What bucket is not," on equity and exit).

**Team and technical capability (approx. 84 words)**

> Bucket Foundation is founder-led by Gian Dichio, the sole technical author of Research OS for K-12's production code: the Postgres graph schema, the frontier-backward routing algorithm, and the four-tool workspace, all shipped and running against real seeded content (PR #6, merged). A bidirectional bridge already connects this graph to a combinatorial hypothesis-generation engine (`tools/hypothesis-engine`, PR #10, PR #14), so a reviewed student production and an AI-generated hypothesis sit in one address space.
>
> Source: `learning/research-os/PLAN-REVISION-1.md` section 1, rows for PR #6, #10, #14.

**Traction and impact potential (approx. 76 words)**

> No pilot has run yet, and this application makes no claim of one. What exists is working infrastructure: the four-tool workspace, the graph schema, and frontier-backward routing all run end to end on a seeded grades 3 to 5 physics path today. A twelve-question research testbed (`RESEARCH-QUESTIONS.md`, extended with named literature evidence) and a five-decision Phase 1 scope (`PLAN-REVISION-1.md` section 3) define exactly what a funded pilot would test first.
>
> Source: `learning/research-os/PLAN-REVISION-1.md` sections 1, 3, 4; `learning/research-os/RESEARCH-QUESTIONS.md`.

**Funding ask and use of funds (approx. 68 words)**

> $25,000 plus program participation would fund roughly one to two months of `BUDGET-PHASE-1.md`'s pilot-phase operating cost (Phase 1 infra and compliance lines, per the system review's own cost model), or, held as runway, would cover the state incorporation and fiscal-sponsorship transition costs (`FISCAL-SPONSOR-DECISION.md`, this packet) needed before any larger grant in `WAVE-1-TARGETS.md` can close.
>
> Source: `learning/research-os/funding/BUDGET-PHASE-1.md`; `learning/research-os/funding/FISCAL-SPONSOR-DECISION.md`.

## 6. Checklist of founder-only inputs

Nothing above requires the founder to invent a figure; everything below requires a founder decision or an act only the founder can take, none of it draftable from existing files.

- Confirm the fiscal-sponsor-or-incorporation path from section 2 is started before 2026-09-18, and which path was chosen, so the application's nonprofit-status answer states a real, current fact rather than "in progress, undecided."
- Legal name to use on the application: confirm "Bucket Foundation" is the name to file under, or whether a different legal name is planned once incorporated.
- EIN, once filed (`00-BASE-INFO-MEMO.md` gap G-1); not required to submit this application per section 2, but likely asked at a later Fast Forward stage if selected.
- Confirm calendar availability for a three-month program, late February to early June 2027, including the 8 to 10 hour weekly commitment and in-person San Francisco sessions.
- References: no file in this repository names any reference, advisor, or prior collaborator willing to vouch for the founder or the project; if the live form asks for one, the founder supplies it directly.
- How the founder learned about Fast Forward, and the yes/no on sharing the application with ecosystem partners.
- A final read of the live application at apply.ffwd.org/2027-accelerator to confirm the literal essay prompts and their word or character limits against the pre-drafted blocks in section 5, since the JS-rendered form did not expose them to a static fetch.
