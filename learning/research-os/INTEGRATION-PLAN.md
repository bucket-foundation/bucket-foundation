# Research OS: the one product

Source: the founder's answers to the requirements questionnaire, 2026-09-15 (artifact `KuAjHWswfh9pzownAjcPzp`, pasted into the session). Where an answer settles a decision that `PLAN-REVISION-3.md` left open, this file records the settlement; the revision files stay as history.

## 1. Thesis

Research OS is the product. Every surface built on bucket.foundation since 2026-04 lands inside it: the canon and the citation rail as its backbone, the Academy as its learning layer, the research tools and the hypothesis engine as its frontier layer, the teacher and roster tools as its school layer. K-12 is the first audience, libraries are the first venue (a school library, a public library, a library's tool ecosystem), and the product's job is to carry a learner from access to production. Access on its own is table stakes; the gap between having access and producing knowledge is what the product closes.

Decisions settled by the answers:

| Decision | Answer |
|---|---|
| 1, front door | K-12 now; any library as the venue. Grade band open; the placement probe decides where a learner starts. |
| 2, second product or on-ramp | One product. Research OS contains everything built. |
| 3, engine output | Lives in the graph. Compute runs privately or publicly; private portions of the graph exist. |
| 4, homepage | Reform education above, canon search below, equal weight; most other homepage sections go. |
| 5, PR #11 | Superseded by the shipped landing branch. |
| 6, required participation | Settled 2026-09-15. A teacher assigns a paper and requires the class to write it in Research OS; the finished paper is the production and is required as the assignment. Acceptance into the public graph stays a review outcome and is never required. |

## 2. The five levels

The founder's reframe: the five words are levels of interaction with the graph, each containing the ones before it, in the way a permission order works. They apply to a person and a node together. The site copy and the learner-state code both take this meaning from now on.

**Access.** Who can see and use a node. A node is public, private, or shared with named people, in the way a repository or a drive works. A lab can hold internal research and grant ten researchers selective access to continue, extend, or cite it; access can be requested and granted, open and closed systems side by side. Learners import data and share access as part of this level.

Built today: consent gate, profile, privacy export and delete, roster, the public canon, the sign-off audit trail. Missing: node visibility (public, private, shared), grants to named people and groups, access requests, data import, sharing.

**Awareness.** Knowing the directions knowledge can go. Curiosity gets a place to run: from any node, the learner sees what lies beyond it, where it leads, and the frontier around it. For a K-12 learner this is the map of futures.

Built today: the canon search globe, timeline, bridges, claims, the depth ladder page, what's new, the routing preview. Missing: a directions view on every node (dependents, the frontier around it, open questions), the path map.

**Understanding.** Learning the node itself. The standard learning system: lessons, recall, checks, until the concept holds.

Built today: Academy lessons and quizzes, FSRS-5 with FIRe and mastery, the diagnostic placement, the assessment with its deterministic grader, the tutor, Find and Quote and Check in the workspace.

**Internalization.** The learned node meets the rest of the graph. Connections, transfer, use beyond where it was taught; the learner's own held set and its edges.

Built today: delayed transfer items, lateral reading, Organize, bridges, the closure table. Missing: the learner's held-graph view, an explicit record of which edges a learner has exercised.

**Production.** A new node on the graph, built from the nodes the producer holds and placed among them. Anything can be produced; placement is computed against the whole graph.

Built today: production submission, the provenance guard, the review queue, sign-off, citable node id, the citation rail, what's new, contributor pages, the hypothesize bridge. Missing: placement computation, an ingenuity score (a comparison against everything in the graph), production kinds beyond a claim (extension, replication, peer review), graph rules for objective and subjective proof.

## 3. The graph

One graph. Every corpus seeds it; the tier and the visibility of a node say where it sits and who sees it.

- **Seeds**: the canon (seven branches), the Academy's 358 atoms, the education atlas, the research atlas and datasets, quantum/07-history, the learning-to-learn atoms, the Kruse corpus (citation only, outside the paid flow), the sacred-history texts (rights-gated).
- **Tier by primality.** The founder's rule: a node's tier follows how prime it is. A seed idea is prime; ideas in the next tier combine primes; and so on outward. The tier metric needs a dependency graph over decomposed concepts and a measure of penetration, the count and spread of nodes that depend on a concept. The equals sign is the worked example: a small node with a reach across most fields, so an optimal learning order puts it early. Research item, with data science behind it: prime decomposition of knowledge, the dependency graph, the penetration measure, the learning order it implies.
- **Who sets a tier**: the engine score proposes, a named human signs off, as the canon writeback works today. Teachers can add class-tier nodes below canon for their own classes.
- **Visibility**: public, private, shared with named people or groups. Private portions of the graph hold their own state of the truth; a public publication into the same place updates the public state, and the people with private access keep theirs until they merge. Contribution credit flows to the people whose nodes affect the graph the most.
- **Frontier kinds**: the frontier itself, extensions of the frontier, replications, peer reviews. Each is a node or edge kind with its own provenance, so a replicated study and a peer review sit on the graph beside the claim they touch.
- **Frontier targets** come from all four sources: live engine hypotheses, canon claims flagged as open questions, teacher-picked targets, learner-picked nodes anywhere on the graph.

## 4. Roles

Learner, teacher, librarian, parent, peer, reviewer, researcher. Roles are access grants on the graph in the way a repository has collaborators, and a person can hold several. A parent needs no separate view; the role grants visibility into a learner's work and payments. A peer role grants selective access to another learner's research. The library is a first-class venue: a librarian runs classes and access the way a teacher does.

## 5. The workspace

Every tool sits inside one workspace, opened in place from a node: Find, Quote, Check, Organize (built); the Socratic tutor; Academy lessons and quizzes; the canon search globe; the research agent and the research tools for older learners; a pen for free writing the AI never touches. The tools work together on the same node and the same evidence list.

**No AI at first release.** The founder's call: the first integrated release runs without a model behind any tool, with the seams in place for a later integration. What that means per tool:

- Find: the search index, the closure table, and the canon locator.
- Quote: passage locators over stored text.
- Check: a deterministic rubric (every cited passage exists, every claim has a quote, the second source is independent by the recorded rule); the learner records support or contradiction against the quotes; the model judge stays behind `RESEARCH_OS_LLM_ENABLED` for later.
- Organize: the scaffold builder over the evidence list, as built.
- Tutor and research agent: hidden until the model switch is on.

Cognitive forcing, lateral reading, and faded guidance stay in the code as built, each behind its own switch; defaults for the first release: forcing off, lateral reading optional, guidance high for K-8.

## 6. Motivation and identity

- One account for everyone: Supabase email one-time code. No web3 sign-in on learner surfaces; the canon's Dynamic sign-in retires from the nav.
- Every motivation layer the founder picked: streaks and daily goals, XP and levels, the winding path map applied to every branch (the Academy languages path generalized), Open Badges credentials at Internalization and Production, the public mastery profile at /m/handle, class leaderboards only. State progress stays the spine underneath.
- Under-13 learners are in, through the right gates: the COPPA school exception for rostered classes, vendor consent (PRIVO or k-ID) for everyone else, zero retention at any model provider, guardian as payee for any payment with parental visibility.

## 7. Teachers and schools

All of it, kept simple: class view with learner levels, review queue, roster CSV, Clever or Google Classroom sync, assigning a frontier target to a class, overriding a learner's level with a recorded reason. Closer to feature than core; required for a school to adopt it. Pilot partner: none yet; candidates are a school, a district, a school library, a teacher.

## 8. Productions and money

- Acceptance: teacher and a Bucket reviewer, as built, with the placement computation and the ingenuity score as research items beside them.
- An accepted production becomes a citable node with an id, feeds the hypothesis engine as evidence, shows on the contributor page, appears in what's new, and registers on the citation rail.
- Payments to a contributor under 18: guardian as payee, parental visibility into every payment. A learner who deserves payment gets paid.

## 9. Module map

Where each built surface lands inside Research OS. Nothing is deleted; frozen surfaces stay in the repo.

| Area | Surfaces folded in |
|---|---|
| Map | canon search globe, claims, graph, bridges, timeline, research atlas, datasets, library and knowledge pages, the depth ladder, what's new |
| Learn | Academy lessons, diagnostic placement, FSRS and mastery, assessment, onboarding, languages and Polingual |
| Workspace | Find, Quote, Check, Organize, pen, tutor (switch), research agent (switch), research tools (switch), lessons in place, search in place |
| Produce | production submission, provenance guard, review queue, sign-off page and CLI, papers and publish form, contributor index |
| Frontier | hypothesis engine campaigns, prediction register, canon writeback, hypothesize API, engine frontier targets |
| Class | class view, review queue, roster, Clever and Classroom sync, assignment, overrides |
| Profile | mastery profile, credentials and verify, consent, privacy export and delete, payments view |
| Corpora | Kruse index, sacred-history texts, education research corpus, quantum/07-history, learning-to-learn |
| Chat and Learn with Claude | wrapped into the workspace tutor seam, hidden until the model switch is on |

Site structure that follows: the homepage keeps the reform-education hero and the canon search panel and loses the rest; the top nav collapses to Research OS, Canon, What's new, About; the manifesto consolidates to one canonical version.

## 10. First integrated release

The founder picked all twelve items. Sequence inside the release:

1. Shell and nav: Research OS as the one product, the module map above, the two-section homepage, one manifesto.
2. The five levels: data model for visibility, grants, and requests; the page copy and the state code renamed to levels.
3. Learn inside: Academy lessons, placement probe, FSRS, assessment, credentials, mastery profile reachable from any node.
4. Map inside: canon search, claims, bridges, timeline, atlas, in place from the workspace.
5. Workspace without AI: deterministic Find, Quote, Check, Organize, plus the pen.
6. Path map and game layer over every branch.
7. Class: view, roster, sync, assignment, overrides; review queue and productions into the graph.
8. Consent flow for under-13, guardian payee.
9. Frontier: engine targets, frontier kinds, private and public graph regions.

Research items running beside the build: primality and penetration tiering, production placement and ingenuity score, graph rules for proof and replication.

## 11. Dates and partner

- **Done date: as soon as possible.** The nine steps ship in order to the landing branch, each merged when it passes review, with no release gate holding finished steps back. Step 1 (shell and nav, two-section homepage, one manifesto) started 2026-09-15 on the founder's approval.
- **First partner contact: Dr. Cristofer Slotoroff**, the founder's tenth-grade English teacher. Public profile: Chief Officer for Education and Libraries at The Juice Learning, Ed.D., 13 years as a New Jersey high-school English teacher and district administrator, publishes educational research, ORCID 0000-0003-4078-6637. The education-and-libraries brief matches the plan's venue. Approach: the founder writes first, as a former student, with the Research OS page and this plan; the ask is one conversation about a library or classroom pilot and an introduction to a school library. No edtech sales motion is needed for that.
- **Required participation**: settled, see the decisions table.
