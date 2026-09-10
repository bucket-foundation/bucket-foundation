# Canon Contributions, 2026-09-10

Review of the current Bucket Foundation setup, what landed since the last
ingestion-index update (2026-05-10), what the canon and the site should
absorb next, and the first contributions made against that list.

## 1. How Bucket is set up now

### Site routes

The Next.js app under `src/app/` serves five groups of routes.

| Group | Example paths | What it serves |
|---|---|---|
| Thesis and protocol | `/`, `/about`, `/manifesto`, `/protocol`, `/protocol/envelope`, `/protocol/agent-trust`, `/governance`, `/cite-forever/v0.1`, `/build`, `/join`, `/contribute` | The manifesto, the feed402/0.2 spec, the citation license, and the nonprofit governance page |
| Canon browsing | `/canon`, `/canon/[slug]`, `/canon/[slug]/figures/[figure]`, `/canon/claims`, `/canon/claims/[concept]/[slug]`, `/canon/bridges`, `/canon/bridges/[slug]`, `/canon/bridges/detected/[slug]`, `/canon/graph`, `/canon/search`, `/canon/timeline` | The 599 claim cards, the 99 figures, the curated and detected bridges, and a force-static full-text search over the claim embeddings |
| Research | `/research`, `/research/papers`, `/research/papers/[slug]`, `/research/tools/*` (37 ML/analysis tool pages), `/research/atlas`, `/research/datasets`, `/research/education`, `/research/education/[slug]`, `/research/agent`, `/research-os`, `/research-os/workspace` | The research-atlas funding graph, two published preprints, a tool directory, the education-atlas corpus hub, and the new Research OS K-12 prototype |
| Learning and language | `/academy`, `/learn`, `/ladder`, `/m/[handle]`, `/kruse`, `/kruse/search` | Bucket Academy (358 science atoms, FSRS-5 spaced repetition, Open Badges credentials) and the Kruse corpus search |
| Machine-facing | `/api/canon/search`, `/api/research`, `/api/research-os/*`, `/api/photon/*`, `/api/polingual`, `/llms.txt`, `/llms-full.txt`, `/.well-known/feed402.json`, `/.well-known/mcp.json`, `/.well-known/ai-plugin.json`, `/feed.xml`, `/canon/[slug]/feed.xml` | The zero-key research proxy, agent-discovery manifests, and the canon activity feed |

### Canon branches

`bucket-canon/` holds 599 claim cards across nine content branches plus a
tenth, `09-sacred-texts`, and a `_bridges/` cross-reference directory that
sits outside the ten. Three ingestion patterns coexist on disk:

| Branch | Claim cards | Concepts | Notes |
|---|---:|---:|---|
| 01-mathematics | 35 | 9 | |
| 02-physics | 136 | 24 | |
| 03-chemistry | 13 | 4 | plus a dossier layer (`CANON_INDEX.md` + `primary-papers.yaml`/`.bib`) for `chemical-bond`, `periodic-law`, `quantum-chemistry`, `reaction-kinetics` |
| 04-information | 9 | 4 | plus one new `concepts/` card (this pass) |
| 05-biophysics | 198 | 23 | includes the `concepts/` pattern (`chemiosmosis-proton-motive-force.md`) |
| 06-cosmology | 52 | 12 | |
| 07-mind | 105 | 15 | |
| 08-deep-history | 42 | 10 | |
| 09-art | 0 | 0 | open branch, no cards yet |
| 09-sacred-texts | 9 | 4 | |

`_bridges/` carries 11 curated primary-axis cards (time, light, information,
energy, water, quantum, field, consciousness, coherence, symmetry, sound), 17
algorithmically detected multi-branch primitives (`_bridges/detected/`), and
12 refined detections (`_bridges/detected-v2/`).

Three distinct on-disk formats all count as canon once listed in a branch's
manifest:

1. **Sub-claim cards**, `<branch>/sub-claims/<concept>/<NNN-slug>.md`, one
   verbatim excerpt with timestamp, source, and a curation checklist,
   extracted from a transcript or text corpus and reviewed for promotion.
2. **Dossiers**, `<branch>/<concept>/{CANON_INDEX.md, primary-papers.yaml,
   primary-papers.bib, queries.txt}`, a hand-verified, DOI-anchored set of
   primary papers run through `tools/canon-pipeline/intake.py`'s
   `canon_score` gate (score ≥ 70 to seed, per `CANON_INDEX.md`'s own
   discipline section).
3. **Concept nodes**, `<branch>/concepts/<slug>.md`, a single card stating a
   law or method that has no one external primary source or figure card to
   attach to, cross-linked to the figure cards and outcome domains that rest
   on it. `05-biophysics/concepts/chemiosmosis-proton-motive-force.md` is the
   only prior example; this pass adds the second, under `04-information`.

### Protocol surfaces

- **x402 paid-to-cite.** `PROTOCOL.md` §3.1 states the agent-trust rule: a
  caller-facing response never carries a payment challenge. Settlement, when
  it happens, runs server-side between the bucket's own wallet and the
  upstream source; the caller reads `agent_action_required: false` and
  `payment_required_from_you: false` on every envelope.
- **feed402 envelopes.** `/api/research?q=<query>&tier=<raw|query|insight>`
  returns `{ data, citation, receipt, cite, tags, canon_tier,
  foundation_branches, provenance, agent_action_required,
  payment_required_from_you }`. `tier` selects response detail, never a
  price; `reader_price_usd` is 0 on every tier.
- **`/llms.txt`, `/llms-full.txt`, and the three `.well-known/*.json`
  manifests** (feed402 discovery, MCP server, ChatGPT plugin) make the whole
  surface machine-discoverable with no auth.
- **MCP tools**, `mcp-server/bucket-mcp.py`, one stdio JSON-RPC server, seven
  tools: `canon_search`, `canon_get_claim`, `canon_list_branches`,
  `canon_list_bridges`, `canon_get_bridge` (local filesystem, no network),
  plus `bucket_research` and `bucket_cite` (hit the live `/api/research` and
  `/api/canon` HTTPS endpoints).

### Papers, figures, timelines

- **Papers** live in `papers/`: `PAPER-STANDARDS.md` sets the LaTeX, Lean,
  citation, and figure conventions; `papers/template/` is the working
  reference build; `papers/bib/common.bib` holds shared, DOI-verified
  citations; `papers/history-hypothesis-engine/` is the one paper written to
  the standard so far, with `main.tex`, `main.pdf`, a `lean/` Lake project,
  and a `figures/` directory of matplotlib scripts. Two more papers
  (`funding-landscape`, `paper-ranking`) are published through
  `/research/papers`, with PDFs vendored into `public/papers/<slug>/` and
  entries in `src/lib/papers.ts`; neither carries a Lean component.
- **Figures** live in `canon-figures/`: `figures.json` (99 cards across ten
  branches), one markdown shelf per branch, `bios/`, `SCHEMA.md` (the card
  contract), and `CONTRIBUTORS.md` (the master index). `CANON-WEB-AUDIT.md`
  (2026-05-14) found 98 of 99 figure pages 404 on the live site because
  `src/lib/canon.ts`'s `BRANCHES[].figures` is hand-curated and only carries
  Einstein; that gap is unresolved as of this pass.
- **Timelines** live in two places: `src/data/canon-timeline.json` and
  `canon-sites.json` feed the site's `/canon/timeline` and
  `/research/education/knowledge-access-gradient` pages, and
  `tools/hypothesis-engine/runs/<corpus>/<run-id>/{timeline.json,
  TIMELINE.md, MANIFEST.json}` holds the hypothesis engine's own scored
  timelines, not yet wired to any site route.

### How a new canon entry gets in

`CONTRIBUTING.md` names four contribution paths: a canon entry, a landscape
entry (`research-landscape/`, explicitly not canon), a canon figure, or a
code PR. A canon PR must cite a primary source (DOI or permanent URL), state
branch fit in one sentence, avoid marketing voice, and keep `canon_score`
above 50 when `tools/canon-pipeline` can resolve the DOI (a reviewer must
override and document any exception). Contested claims carry a `Disputed.`
paragraph rather than get excluded.

An entry becomes citeable in three steps: the file lands under `bucket-canon/`
per one of the three formats above; `tools/feed/feed.py` (driven by
`tools/feed/parse.py`'s git-diff classifier) emits an `add_canon_entry` or
`add_paper` event into `feed.json`/`feed.xml` on the commit that adds it; and
`canon_tier` (`draft` → `candidate` → `canon`, per `PROTOCOL.md` §4.3)
advances as the entry is reviewed, at which point the reference site's
`canon.json` sidecar and the MCP `canon_search` tool both pick it up with no
further wiring. Story Protocol IP-NFT minting is the optional final step
inherited from the prior version of the site; Bucket Academy dropped Story
Protocol for its own credentialing surface (2026-06-14 decision) but the
option remains for the canon-proper mint path per the README's status table.

## 2. What is new since the last ingestion-index update

`CANON-INGESTION-INDEX.md` and `CANON-MASTER.md` both carry a 2026-05-10
timestamp. `git log --since=2026-09-01` shows nine commits since, three of
them merged pull requests: PR #2 (`feat/hypothesis-engine`, 2026-09-10T03:03),
PR #3 (`feat/research-os-k12`, 2026-09-10T04:02), and PR #6
(`feat/research-os-k12-phase0`, 2026-09-10T12:02); PR #5
(`intake/research-os-k12-literature`) is open, not yet merged.

| What | Where | Canon tier |
|---|---|---|
| Design paper, "A Hypothesis Engine over History," plus its Lean 4 formalization (six files under `lean/Bucket/`, nine proved theorems, one disclosed `sorry`) | `papers/history-hypothesis-engine/` | **Primary method.** A combinatorial address scheme and a subjective-logic belief calculus, both stated and Lean-proved, original to Bucket's own research rather than extracted from an external source. |
| Five engine design specs: `HISTORY-HYPOTHESIS-ENGINE-SPEC.md`, `IDEAL-STATE-AND-UNKNOWNS-SPEC.md`, `TIMELINE-AND-COMBINATORICS-SPEC.md`, `CROSSWALK-QUANTUM-ALGORITHM-DISCOVERY.md` | `_intake/hypothesis-engine/` | **Infrastructure.** Design drafts (status: DRAFT throughout) that the paper above formalizes. Provenance for the primary-method card rather than canon entries on their own. |
| `SURVEY-AI-HYPOTHESIS-GENERATION.md`, a comparative table of OpenAI, Anthropic, and other labs' hypothesis-generation systems | `_intake/hypothesis-engine/` | **Review tier.** Secondary literature, landscape-shaped by `research-landscape/README.md`'s own definition ("comparative work that indexes patterns rather than deriving them from axioms"), outside canon. |
| The `hte` engine package (address, belief, timeline, concept, evidence, generator, tournament, calibration modules) and its unattended pipeline (`hte.pipeline`, `api.py`, `serve.py`, `mcp_tool.py`) | `tools/hypothesis-engine/` | **Infrastructure.** The reference implementation of the primary method above, plus a product layer (API, MCP tool, serving) with no canon claim of its own. |
| The quantum-history campaign run (`20260910T085020Z`) and its published 6-page referee-checked report (`runs/_pipeline/20260910T095939Z/paper/`) | `tools/hypothesis-engine/runs/quantum-history/`, `runs/_pipeline/` | **Outcome tier.** A scored timeline over one corpus applies the method to one dataset rather than stating a foundation. Each hypothesis's opinion is evidence-backed and citeable as data, outside canon. |
| `education-atlas` and `production` corpus adapters registered in `hte.runner`/`hte.cli` | `tools/hypothesis-engine/hte/corpus/{education_atlas,production}.py` | **Infrastructure.** Adapter code, carrying no content of its own. The underlying `education-atlas` dataset and its flagship synthesis, "The Knowledge-Access Gradient," are themselves outcome tier (downstream, data-grounded application research) and already carry a minted Zenodo DOI (`10.5281/zenodo.22083720`) for the synthesis report. |
| Research OS for K-12: the plan, intake, and site page (PR #3), the Phase 0 prototype, graph schema, and workspace (PR #6), and a 44-card AI-for-research and educational-methods literature corpus (PR #5, open) | `learning/research-os/`, `_intake/research-os-k12/`, `_intake/research-os-k12-literature/`, `src/app/research-os/` | **Product/infrastructure**, with one **outcome/review-tier** exception: the 44 literature cards in PR #5 (knowledge tracing, spaced repetition, mastery learning, AI-for-science metascience) are secondary reviews of primary results, review tier by the same test as the survey above rather than primary sources themselves. |
| `papers/PAPER-STANDARDS.md`, the LaTeX/Lean/citation/figure convention for every future Bucket paper | `papers/PAPER-STANDARDS.md` | **Infrastructure.** A process document. |

`RESEARCH-OS-INTEGRATION.md`'s own central finding is worth carrying
forward: none of the 49 Research OS questions asks the kind of question the
hypothesis engine answers (did an indicator move, by what mechanism, with
what evidence); the one real bridge between the two systems is that a
student production, once accepted by Research OS, becomes an evidence item
the engine can fuse, and the engine's ranked hypotheses and gap nodes become
routing targets Research OS can point a learner at. That bridge is designed,
not built.

## 3. What to provide next, prioritized

| # | What | Target path | Citation shape | Priority |
|---|---|---|---|---|
| 1 | Design paper as a primary-method canon card | `bucket-canon/04-information/concepts/hypothesis-engine-address-and-belief.md` | Concept-node card linking to `papers/history-hypothesis-engine/main.pdf` and `main.tex`, plus the Lean sources. **Done this pass**, see Part 4. | Done |
| 2 | Lean-verified lemmas as primary derivations | Same card, §3 (a table of nine theorem names, file, and status) | Each lemma cited by name and file path (`Bucket/Belief.lean`'s `sum_eq_one`, `project_mem_unit`, `u_eq_one_of_no_evidence`; `Bucket/Timeline.lean`'s `relate_total` and its converse lemmas; `Bucket/Unknowns.lean`'s `missingMass_le_one`, `chao1_ge_sObs`; `Bucket/Address.lean`'s `encode_injective_bounded`), with a GitHub permalink once this branch merges. **Done this pass**, folded into the same card. | Done |
| 3 | Hypothesis timelines as citeable envelopes with their opinions | New route (proposed) `/api/research/hypotheses` or an extension of `/api/research` reading `tools/hypothesis-engine/runs/quantum-history/20260910T085020Z/{timeline.json,MANIFEST.json}` | Each hypothesis becomes one feed402 envelope: `data` = the hypothesis's address, claim text, and interval; `citation` = the address as a stable id plus the source corpus and run id; `receipt.opinion` = `{b, d, u, a}` in place of one point score. Outcome tier; the `canon_tier` field on the envelope should read `draft` until a human review pass runs. | P1 |
| 4 | Education literature cards (44, from PR #5) as outcome-tier entries | `bucket-canon/07-mind/sub-outcomes/education/`, cross-linked from `04-information` for the AI-for-science and HCI groups | One outcome card per literature group (`educational-methods`, `hci-human-ai-collaboration`, `scientific-discovery-metascience`, `ai-and-researchers`), each listing its papers with DOI and a one-line finding, following the `sub-outcomes/longevity/` precedent named in the org `CLAUDE.md` (not yet created on disk; this would be its second instance and its first inside this repo). `07-mind` over `05-biophysics` because the corpus is cognitive and learning-science in kind. | P1 |
| 5 | AI-for-science survey as a review entry | `research-landscape/ai-for-science/SURVEY-AI-HYPOTHESIS-GENERATION.md` (new subfolder) | Tier-labeled on the artifact itself, `landscape — review-tier`, per `CONTRIBUTING.md`'s landscape-entry rule. A copy or a symlink-equivalent of `_intake/hypothesis-engine/SURVEY-AI-HYPOTHESIS-GENERATION.md`; the `_intake` copy stays as provenance for the design paper's Related Work section. | P1 |
| 6 | Site: `/research/papers` listing entry for the design paper | `src/lib/papers.ts`, append a third `Paper` object to `PAPERS` | See sketch below. Diverges from the existing two entries: no `pdfUrl` under `public/papers/` (the task requires linking to the paper's own path rather than copying the PDF), so this needs a `sourceUrl`-style field pointing at the GitHub blob instead of a vendored `public/` copy, or a `pdfUrl` that resolves to a new `/papers/history-hypothesis-engine/main.pdf` static passthrough if the team decides to vendor it after all. | P2, pending (touches `src/`) |
| 7 | Site: MCP `canon` tool exposure for the new concept node and campaign runs | `mcp-server/bucket-mcp.py`, `list_claims()`'s branch/concept walk already finds `concepts/` files (confirmed: it walks `sub-claims/` only), and `TOOLS` | `list_claims()` needs a second walk over `<branch>/concepts/*.md` alongside its existing `sub-claims/<concept>/*.md` walk, or the two cards (chemiosmosis, this pass's hypothesis-engine node) stay invisible to `canon_search`/`canon_get_claim`. A new `bucket_hypothesis_timeline(corpus, run_id)` tool would expose item 3 once that route exists. | P2, pending (touches `mcp-server/`, adjacent to `src/`) |
| 8 | `feed.json`/`feed.xml` entries and `public/llms.txt` lines for the paper and the five specs | `feed.json`, `feed.xml`, `feed/2026-09.json`, `public/llms.txt` | **Done this pass**, see Part 4. | Done |
| 9 | DOI for the design paper | Zenodo, via the same mint path `education-atlas` already used | `education-atlas`'s flagship synthesis, "The Knowledge-Access Gradient," already carries a minted DOI, `10.5281/zenodo.22083720` (`.zenodo.json`'s `related_identifiers`); the dataset's own `.zenodo.json` is prepared but not yet minted. The design paper's own `.zenodo.json` does not exist yet. Minting needs the founder's `ZENODO_TOKEN`; once minted, the DOI backfills `src/lib/papers.ts`'s `doi`/`doiUrl` fields (item 6) and the `CANON_INDEX.md`-style dossiers' `doi` column, matching the pattern both published `/research/papers` entries already follow. | P3, blocked on the founder |

## 4. Done now

Four artifacts, all outside `src/`:

1. **New canon card**:
   `bucket-canon/04-information/concepts/hypothesis-engine-address-and-belief.md`,
   a primary-method concept node stating the address scheme and the belief
   calculus, its nine key Lean derivations by name and proof status, and its
   two downstream campaign runs. Links to `papers/history-hypothesis-engine/main.tex`
   and the `lean/Bucket/` sources rather than copying the PDF.
2. **`CANON-INGESTION-INDEX.md`** and **`CANON-MASTER.md`**: each gets a
   dated "Recent additions, 2026-09-10" section listing the seven new
   artifacts (the paper, the survey, the four specs, and the canon card),
   kept separate from the audited pipeline counts above them rather than
   folded into those numbers, since these seven entered by hand instead of
   through the FTS ingestion pipeline.
3. **`feed.json`/`feed.xml`**: seven new events (one `add_canon_entry` for
   the concept card, six `add_paper` for the design paper and the five
   `_intake/hypothesis-engine/` docs), generated by running the repo's own
   `tools/feed/feed.py update` against a hand-built NDJSON stream, using its
   own `event_id()` function for correct hashing rather than a hand-edited
   JSON diff. `feed/2026-09.json` was created as the new monthly archive.
   `commit_sha` on all seven reads the current `HEAD` short sha (`bec8dba`)
   as a placeholder, since this pass does not commit; re-run
   `tools/feed/feed.py rebuild --from <pre-this-pass-sha>` after these files
   land in a real commit to backfill the authoritative shas.
4. **`public/llms.txt`**: a new "Primary research (papers)" section with
   direct GitHub links to the design paper's PDF, the new concept card, and
   the `_intake/hypothesis-engine/` specs, since no dedicated site route
   exists for them yet (item 6 above).

`agf-lint-voice check` ran clean (zero violations) on all four files plus
this one after two manual antithesis-construction fixes in the concept card
and one in `CANON-INGESTION-INDEX.md`.

Not done, by instruction: nothing under `src/` changed. Items 3, 4, 6, and 7
in Part 3 stay proposals with paths and diff sketches for whoever picks up
the site side.
