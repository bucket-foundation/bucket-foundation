# Human, AI, computer

**Status:** research memo, bead `ros-ai`. No code. Each design rule at the end names a surface that exists or a bead that would build it.

Quotation convention: `[...]` inside a quoted passage marks text cut from the middle. Everything else inside quotation marks is byte-equal to the source at the locator given.

Human-computer interaction studies a person and a machine. Research OS has a third party in the loop. A model reads a learner's explanation, returns a verdict that moves the learner's standing, proposes edges that change the graph, and generates hypotheses that become nodes. It acts, and its acts have consequences the learner and the teacher live with. The design question is what the human keeps, what the model gets, and which surfaces make the split visible.

`_intake/research-os-k12/raw/lit-hci-human-ai.md` already surveys 56 sources on the CHI side of this: mixed-initiative interfaces, sensemaking, citation checking with language models, co-writing and ownership. The foundational line sits outside that survey, and it is the line the design rules below rest on.

## The lineage

### Licklider 1960

J. C. R. Licklider, "Man-Computer Symbiosis", IRE Transactions on Human Factors in Electronics 1960;HFE-1:4-11. Section labels below are the printed edition's roman numerals. The Summary, p.4, sets the division of labour:

<!-- voice-ignore-next 2: verbatim quotation of Licklider 1960 Summary -->
> In the anticipated symbiotic partnership, men will set the goals, formulate the hypotheses, determine the criteria, and perform the evaluations. Computing machines will do the routinizable work that must be done to prepare the way for insights and decisions in technical and scientific thinking.

§IV, "Separable Functions of Men and Computers in the Anticipated Symbiotic Association", p.7, expands the human half: "Men will set the goals and supply the motivations, of course, at least in the early years. They will formulate hypotheses. They will ask questions." And, in the same section, the residual role that survives every advance in automation: "Men will fill in the gaps, either in the problem solution or in the computer program, when the computer has no mode or routine that is applicable in a particular circumstance."<!-- voice-ignore-line: verbatim quotations of Licklider 1960 section IV -->

The measurement that motivated the paper, §III.A, "A Preliminary and Informal Time-and-Motion Analysis of Technical Thinking", heading on p.5 and the sentence on p.6: "About 85 per cent of my 'thinking' time was spent getting into a position to think, to make a decision, to learn something I needed to know. Much more time went into finding or obtaining information than into digesting it."<!-- voice-ignore-line: verbatim quotation of Licklider 1960 section III.A -->

§I.B, "Between 'Mechanically Extended Man' and 'Artificial Intelligence'", p.4, marks the boundary Licklider drew against the older frame: "In the man-machine systems of the past, the human operator supplied the initiative, the direction, the integration, and the criterion. The mechanical parts of the systems were mere extensions, first of the human arm, then of the human eye."<!-- voice-ignore-line: verbatim quotation of Licklider 1960 section I.B -->

### Engelbart 1962

Douglas C. Engelbart, "Augmenting Human Intellect: A Conceptual Framework", SRI Summary Report AFOSR-3223, October 1962, Contract AF 49(638)-1024, SRI Project 3578. §I.A.1:

<!-- voice-ignore-next 2: verbatim quotation of Engelbart 1962 section I.A.1 -->
> By "augmenting human intellect" we mean increasing the capability of a man to approach a complex problem situation, to gain comprehension to suit his particular needs, and to derive solutions to problems.

The unit of analysis is the whole assembly, §II.A: "We assume that it is our H-LAM/T system (Human using Language, Artifacts, Methodology, in which he is Trained) that has the capability and that performs the process in any instance of use of this repertoire."<!-- voice-ignore-line: verbatim quotation of Engelbart 1962 -->

Engelbart's own statement of where the intelligence sits, §II.C.2 "Intelligence Amplification", statement `2c2b`, printed p.19: "What possesses the amplified intelligence is the resulting H-LAM/T system, in which the LAM/T augmentation means represent the amplifier of the human's intelligence."<!-- voice-ignore-line: verbatim quotation of Engelbart 1962 -->

Four augmentation means, and training is one of them. That is the claim Research OS rests on. A research workspace that teaches is an augmentation system in Engelbart's sense, and a workspace that answers for the learner removes the training term from the product.

### Suchman 1985

Lucy A. Suchman, "Plans and Situated Actions: The Problem of Human-Machine Communication", Xerox PARC ISL-6, February 1985, later Cambridge University Press 1987. The Preface, which the report leaves unpaginated, sets the two models against Gladwin's 1964 account of navigation:

<!-- voice-ignore-next 3: verbatim quotation of Suchman ISL-6 Preface, quoting Berreman 1966 on Gladwin 1964 -->
> The European navigator begins with a plan, a course, which he has charted according to certain universal principles, and he carries out his voyage by relating his every move to that plan. His effort throughout his voyage is directed to remaining 'on course.' If unexpected events occur, he must first alter the plan, then respond accordingly. The Trukese navigator begins with an objective rather than a plan.

Her own claim, Chapter 4, p.35: "common sense notions like plans are not faulted versions of scientific models of action, but rather are resources for people's practical deliberations about action."<!-- voice-ignore-line: verbatim quotation of Suchman ISL-6 chapter 4 -->

And the sharper form at p.28: "As common sense constructs, plans are a constituent of practical action, but they are constituent as an artifact of our reasoning about action, not as the generative mechanism of action."<!-- voice-ignore-line: verbatim quotation of Suchman ISL-6 -->

The Abstract states the design consequence: "As common sense formulations designed to accomodate the unforseeable contingences of situated action, plans are inherently vague. Researchers interested in machine intelligence attempt to remedy the vagueness of plans, to make them the basis for artifacts intended to embody intelligent behavior."<!-- voice-ignore-line: verbatim quotation of Suchman ISL-6 abstract, spelling as printed -->

The canoeist passage that circulates with Suchman's name is absent from ISL-6. It enters with the 1987 Cambridge edition, and Suchman gives its page herself when she answers Vera and Simon in the 2007 second edition, Chapter 1, "Readings and Responses", pp.18-19: "When it really comes down to the details of responding to the currents and handling a canoe, you effectively abandon the plan and fall back on whatever skills are available to you" (Suchman 1987: 52).<!-- voice-ignore-line: verbatim quotation of Suchman 2007 quoting Suchman 1987 -->

Her correction on the same page is the part worth building on: "the phrase 'effectively abandon' was an unfortunate one and legitimately prone to such a reading", and the sentence Vera and Simon omitted says what the plan was for: "The purpose of the plan in this case is not to get your canoe through the rapids, but rather to orient you in such a way that you can obtain the best possible position from which to use those embodied skills on which, in the final analysis, your success depends" (ibid.: 52).<!-- voice-ignore-line: verbatim quotations of Suchman 2007 chapter 5 -->

The second edition's own formulation of the thesis, Chapter 6: "The alternative view is that plans are resources for situated action but do not in any strong sense determine its course."<!-- voice-ignore-line: verbatim quotation of Suchman 2007 chapter 6 -->

A plan that positions a person to use a skill is what the routed chain is. `computeFrontier` in `src/lib/research-os/frontier.ts:52` returns a chain to a target and the learner walks it. The chain never runs the node for them.

### Hollnagel and Woods 1983

Erik Hollnagel and David D. Woods, "Cognitive Systems Engineering: New wine in new bottles", International Journal of Man-Machine Studies 1983;18(6):583-600, doi:10.1016/s0020-7373(83)80034-0. First issued as Risø-M-2330, Risø National Laboratory, 1982. The report's abstract, which its author reproduces on his own page at erikhollnagel.com/ideas/cognitive-systems-engineering-1982 and there calls "the introduction to the report". The journal article sits behind Elsevier's paywall and was not read for this memo; the 41-page scan of the 1982 report was. The abstract opens on the title page:

<!-- voice-ignore-next 3: verbatim quotation of the Risoe-M-2330 abstract as reproduced by its author -->
> Instead of viewing an MMS as decomposable by mechanistic principles, CSE introduces the concept of a cognitive system: an adaptive system which functions using knowledge about itself and the environment in the planning and modification of actions. Operators are generally acknowledged to use a model of the system (machine) they are working with. But similarly the machine has an image of the operator, whether implicit or explicit. The designer of an MMS must recognize this, and strive to obtain a match between the machine's image and user characteristics on a cognitive level, rather than just on a physical level.

Hollnagel's own account of what the three themes were, on the same page: "coping with complexity, joint cognitive systems, and the use of tools/artefacts". That is his later summary rather than the report's own words: in the 1982 report "coping with complexity" appears once, in the reference list, as the title of Rasmussen and Lind 1981. And his diagnosis of why the dyadic frame fails, which is the reason this memo exists: "the focus on the interaction between humans and something, be it -machine, -computer, -environment or something else, reduced the problems to a dyadic relationship. This completely missed the point that we cannot really understand what takes place unless we adopt a genuine system perspective, hence look at the joint system, or the whole, rather than its parts."<!-- voice-ignore-line: verbatim quotations of Hollnagel's own retrospective -->

On the two books that followed: "both referred to joint cognitive systems and thereby tried to make clear that it was the 'jointness' rather than the 'cognition' bit that was important."<!-- voice-ignore-line: verbatim quotation of Hollnagel's retrospective -->

The phrase "joint cognitive system" is absent from the 1982 Risø report itself, checked by search over the report's text. It arrives with Hollnagel and Woods 2005. What the 1982 report gives is the claim the phrase later names: the operator and the machine each hold an image of the other, and the designer owes a match between them.

The machine having an image of the operator is the part that matters most here. In Research OS the model is handed a grounding that says what the node means and what the learner has already covered. That grounding is the machine's image of the operator, and `buildGrounding` at `src/lib/research-os/grounding.ts:38` is where it is constructed, line by line.

### Shneiderman 2020

Ben Shneiderman, "Human-Centered Artificial Intelligence: Reliable, Safe & Trustworthy", International Journal of Human-Computer Interaction 2020;36(6):495-504, doi:10.1080/10447318.2020.1741118. Preprint arXiv:2002.04087v1. The move the paper makes, p.6:

<!-- voice-ignore-next 3: verbatim quotation of Shneiderman 2020 -->
> Designers thought they had to choose a point on the one-dimensional line from human control to computer automation. The implicit message was that more automation meant less user control. The decoupling of these concepts leads to a two-dimensional HCAI framework, which suggests that achieving high levels of human control and high levels of automation is possible.

The four regions, pp.6-7. High automation with low human control is "home of computer autonomy requiring rapid action, for example, airbag deployment, anti-lock brakes, pacemakers". High human control with low automation is "the home of human autonomy where human mastery is desired to enable competence building, free exploration, and creativity", with piano playing among the examples. Low on both is "the home of simple devices such as clocks or mousetraps[...]". High on both is the target, and Shneiderman puts the hard cases there: "For poorly understood and complex tasks with varying contexts of use, the upper right quadrant is needed. These tasks involve creative decisions, making them currently at the research frontier."<!-- voice-ignore-line: verbatim quotations of Shneiderman 2020 pp.6-7 -->

Research OS is a competence-building product whose learner surfaces belong in the human-autonomy region, and whose reviewer surfaces belong in the upper right. The two are different quadrants inside one product, and the code already splits them. The learner's Check is deliberately low-automation: the model never writes the answer. The reviewer's edge queue is high-automation and high-control: a model proposes, a second model checks, a named human decides.

### Amershi et al. 2019

Saleema Amershi, Dan Weld, Mihaela Vorvoreanu, Adam Fourney, Besmira Nushi, Penny Collisson, Jina Suh, Shamsi Iqbal, Paul N. Bennett, Kori Inkpen, Jaime Teevan, Ruth Kikin-Gil and Eric Horvitz, "Guidelines for Human-AI Interaction", CHI 2019, Glasgow, 4-9 May 2019, 13 pages, doi:10.1145/3290605.3300233. Table 1 gives 18 guidelines in four phases: `Initially` G1 to G2, `During interaction` G3 to G6, `When wrong` G7 to G11, `Over time` G12 to G18. The audit below quotes each guideline's own short title from that table, and quotes the one-sentence description in the four cells whose verdict turns on it.

### Heer 2019

Jeffrey Heer, "Agency plus automation: Designing artificial intelligence into interactive systems", PNAS 2019;116(6):1844-1850, doi:10.1073/pnas.1807184115. Abstract: "We seek to balance the often-complementary strengths and weaknesses of each, while promoting human control and skillful action" and "we describe the use of shared representations of tasks augmented with predictive models of human capabilities and actions."<!-- voice-ignore-line: verbatim quotations of Heer 2019 abstract -->

The design rule, in the section "Designing Shared Representations": "the interaction models in Wrangler, Voyager, and PTM are fundamentally asymmetric: Automated methods suggest possible actions, which are then displayed for review and revision by the user, who remains the ultimate decision maker."<!-- voice-ignore-line: verbatim quotation of Heer 2019 -->

And what a shared representation buys: "By leveraging shared representations that can be authored and edited, ranging from simple text to specifications of data transformations or visualizations, people and algorithms can both contribute to, and adaptively learn from, solutions to shared problems."<!-- voice-ignore-line: verbatim quotation of Heer 2019 -->

Heer's framing problem comes from Bar-Hillel, quoted at p.1844: "The decisive problem becomes to determine the region of optimality in the continuum of possible divisions of labor" between people and computers.<!-- voice-ignore-line: verbatim quotation of Bar-Hillel as reproduced in Heer 2019 -->

## Where each idea lands in the repo

### Licklider's division of labour is the Check contract

Licklider gives the human the goals, the hypotheses, the criteria and the evaluations. `CHECK_SYSTEM_PROMPT` at `src/lib/research-os/grounding.ts:107` gives the model the opposite list and forbids the rest:

```
You are the Check tool in Bucket's Research OS workspace. You NEVER write or correct the learner's explanation, you only judge it against the GROUNDING.
```

HARD RULE 4, `grounding.ts:63`: `NEVER rewrite the learner's explanation. Return a short "feedback" string: if support, name what makes it grounded; if contradiction or unknown, ask ONE guiding question or name what part of the grounding to revisit -- never supply the corrected sentence.`

The prompt is a request. The type is the enforcement. `GradeResult` at `grounding.ts:4` has fields `result`, `confidence`, `abstained`, `feedback` and `citations`, and no field for a corrected explanation, so a prompt-injected response has nothing to populate that reaches the learner as their own text.

### Engelbart's training term is the fade

Engelbart counts training among the four augmentation means. `nextGuidanceLevel` at `src/lib/research-os/guidance.ts:31` removes scaffolding as the learner stops needing it:

```ts
export function nextGuidanceLevel(base: GuidanceLevel, recentOutcomes: CheckOutcome[]): GuidanceLevel {
  const lastTwo = recentOutcomes.slice(-2);
  if (lastTwo.length < 2) return base;
  if (lastTwo.every((o) => o === "pass")) return stepLevel(base, -1);
  if (lastTwo.every((o) => o === "fail")) return stepLevel(base, 1);
  return base;
}
```

At high guidance, `buildGrounding` adds one POINTER line naming the exact passage sentence, and only when a curated `QuotePassage` exists (`grounding.ts:101-103`). At medium, `firstHalfOfWorkedExample` in `src/lib/research-os/worked-examples.ts` shows part of a model explanation, rounded up to whole sentences. At low, neither appears. The product's capability shrinks as the learner's grows, which is what augmenting intellect means when training is one of the means.

### Suchman's situated action is the probe and the abstain

A plan that cannot accommodate the unforeseeable is the failure Suchman names. Two surfaces in Research OS refuse to hold a plan the situation has broken.

`probeDue` at `src/lib/research-os/probe.ts:6` fires only when the learner has no state row on any ancestor of the target:

```ts
export function probeDue(ancestorIds: Set<string> | string[], states: LearnerNodeState[]): boolean {
  const ids = ancestorIds instanceof Set ? ancestorIds : new Set(ancestorIds);
  if (ids.size === 0) return false;
  return !states.some((s) => ids.has(s.nodeId));
}
```

The question it asks is fixed and gives nothing away, `probe.ts:47`: `In your own words, what do you already know about "${node.title}"?` The comment above it at `probe.ts:41` says why: "A plain, retrieval-only prompt -- no model call, no hint from the node's summary (that would give away the answer being probed for)."

The abstain is the second. `ABSTAIN_FALLBACK` at `grounding.ts:74` is what the code returns whenever the model's response fails to parse into the expected shape, and `sanitizeGradeResult` at `grounding.ts:82` enforces it without asking the model's permission:

```ts
export function sanitizeGradeResult(parsed: GradeResult | null, allowLabel: string): GradeResult {
  if (!parsed || !VALID_RESULTS.has(parsed.result) || !VALID_CONFIDENCE.has(parsed.confidence) || typeof parsed.feedback !== "string") {
    return { ...ABSTAIN_FALLBACK };
  }
```

The closed citation set is the same idea applied to sources. The prompt gives one allowed label (`grounding.ts:95`), and the code filters everything else out with an exact string match after trim (`grounding.ts:91`). A model that invents a citation produces an empty array.

### Hollnagel's jointness is the review queue

`graph.edge_proposals` at `supabase/migrations/20260910050001_research_os_edge_proposals.sql:38` is a joint artifact: `confidence`, `agreement`, `justification`, `secondary_justification`, `model`, `prompt_hash`, `secondary_prompt_hash`, `status`, `reviewer_id`, `decision_reason`, `decided_at`. One row carries what the model said, what a second model blind to the first said, and what the human decided, with the reason.

The migration header, lines 13 to 20, states the rule that keeps the system joint rather than automated:

```
-- Deliberately a separate table from graph.edges rather than a fifth
-- 'inferred_llm' confidence_source value on that table: an
-- 'inferred_llm'-sourced row would need to exist on graph.edges before a
-- reviewer ever sees it for this UI to have anything to show, which is
-- exactly the "queues for human review before it can affect routing" step
-- learning/research-os/INGESTION.md's own architecture-review citation
-- warns against skipping. This table is that queue; graph.edges only ever
-- gains a row once a reviewer decides.
```

`graph.edges` gains a row when a person decides. The model's output never reaches routing on its own.

### Shneiderman's two dimensions are the NO-MODEL switch

`llmEnabled` at `src/lib/research-os/deterministic.ts:23` reads `RESEARCH_OS_LLM_ENABLED` and defaults to off. `learning/research-os/NO-MODEL.md` decides that the first integrated release runs no model behind any tool. With the switch off, the Check becomes `deterministicCheck`, which grades whether the learner did the work and hands the verdict back to them. `deterministic.ts:121`:

```ts
const result: GradeResult["result"] = ok ? input.verdict : "unknown";
```

The learner supplies `result`. The machine scores whether the attempt was well formed. The feedback string ends with the disclosure, `deterministic.ts:103`:

```ts
    " No model read this; the verdict is yours and the rubric is fixed.";
```

That is Shneiderman's upper-left region built as a shipping configuration. The same product with the switch on moves right without giving up control, because every rule above still holds.

### Heer's shared representation is the graph

Heer's shared representation in Wrangler is a domain-specific language both parties can read and write. Bucket's is `graph.nodes` and `graph.edges`. A learner's accepted production becomes a node through `createNodeFromProduction` at `src/lib/research-os/production-node.ts:52`, written with `created_by: p.learner_id` and `owner_id: p.learner_id` at lines 71 and 72. An engine hypothesis becomes a node through `buildEngineNode` at `src/lib/research-os/engine-bridge.ts:135`, carrying `type: "engine_hypothesis"` at line 150 and the model role at line 155, both inside the node's provenance. Both write to the same two tables. Both are inspectable by the same map.

Heer's asymmetry rule holds here too. `buildProductionOutboxRow` at `engine-bridge.ts:219` throws when a production is not accepted:

```ts
  if (production.status !== "accepted") {
    throw new Error(`buildProductionOutboxRow: production ${production.id} is not accepted (status=${production.status})`);
  }
```

Nothing crosses the seam to the engine until a human has approved it through `POST /api/research-os/review`.

## The 18 guidelines, audited

Verdicts are against the tree at `feat/ros-truth-memo`, branched from `origin/dev` at `b36c160ab`.

| # | Guideline | Verdict | Evidence |
|---|---|---|---|
| G1 | Make clear what the system can do | satisfied | `src/app/research-os/(app)/workspace/page.tsx:941-944` states the boundary in copy a learner reads, rendered when `probe?.due` is true (`:938`). `GET /api/research-os/route` returns `llmEnabled` at `src/app/api/research-os/route/route.ts:79` so the UI renders the matching controls. `src/app/research-os/page.tsx:31` carries the same sentence, in the `twitter:` metadata block at `:27-32`, which no user sees in the product |
| G2 | Make clear how well the system can do what it can do, "Help the user understand how often the AI system may make mistakes." | violated | The Check returns `confidence` per attempt (`grounding.ts:39`) and nothing aggregates it. `src/lib/research-os/calibration.ts:17` measures the learner's calibration. The four inter-rater fields at `src/lib/research-os/stages.ts:219-224` have no writer, so no grader error rate is computed or shown |<!-- voice-ignore-line: the guideline text quoted in this row is verbatim Amershi et al. 2019 Table 1 -->
| G3 | Time services based on context | satisfied | `probeDue`, `src/lib/research-os/probe.ts:36`, fires a probe only on a cold start. `nextGuidanceLevel`, `guidance.ts:31`, waits for two consecutive outcomes before moving |
| G4 | Show contextually relevant information | satisfied | `buildGrounding`, `grounding.ts:84`, sends the node summary plus the prerequisites the learner already covered, and adds the POINTER line only at high guidance with a curated passage present (`grounding.ts:101-103`) |
| G5 | Match relevant social norms | violated | `CHECK_SYSTEM_PROMPT`, `grounding.ts:107-119`, carries no reading-level or register instruction. `WorkedExample.text` at `src/lib/research-os/types.ts:108` specifies "grade-4 level, 2-4 sentences" for seeded content, and no rule constrains the model's own `feedback` string |
| G6 | Mitigate social biases | violated | No bias evaluation, test or mitigation exists in `src/lib/research-os/` or `src/app/api/research-os/`. The closed-grounding rule narrows what the model may draw on, which is a containment measure with no measured effect on bias |
| G7 | Support efficient invocation | satisfied | Scoped to `src/app/api/research-os/`. Every model call there is learner-initiated through `POST /api/research-os/workspace` or `POST /api/research-os/probe`, and no route calls the model on a schedule or on page load. The product also ships `POST /api/academy/tutor`, which builds free prose at `src/app/api/academy/tutor/route.ts:275-384`; the Research OS Learn surface under `src/app/research-os/(app)/learn/` does not call it |
| G8 | Support efficient dismissal | satisfied | `llmEnabled`, `deterministic.ts:3`, defaults off, and `NO-MODEL.md` makes running with no model the shipping default. The model produces nothing a learner has to dismiss, because it answers only when asked |
| G9 | Support efficient correction, "Make it easy to edit, refine, or recover when the AI system is wrong." | violated | A learner can re-run the Check and has no way to tell the system a verdict was wrong. Correction is staff-only: `POST /api/research-os/override` with `validateOverride` at `src/lib/research-os/roles.ts:51` requiring a reason of at least 3 characters. `graph.edge_flags` logs a low-confidence edge a learner's routing crossed, and the learner never raises it |
| G10 | Scope services when in doubt | satisfied | `ABSTAIN_FALLBACK`, `grounding.ts:74`, and `sanitizeGradeResult`, `grounding.ts:82`, force an abstain on any malformed response. `isGroundedCheck`, `stages.ts:268`, refuses to advance a learner on `confidence === "low"` |
| G11 | Make clear why the system did what it did | satisfied | The Check returns a `feedback` string plus citations filtered to one allowed label. `stages.ts:59-105` stores `modelFeedback` and `citations` on the evidence event beside `learnerText`. `graph.edge_proposals` stores `justification`, `model` and `prompt_hash` for the reviewer |
| G12 | Remember recent interactions, "Maintain short term memory and allow the user to make efficient references to that memory." | partial | The system remembers: `graph.learner_node_state.evidence` is append-only, and `graph.check_attempts` holds a pending verdict. The guideline's second clause, efficient references to that memory, has no surface because the model is stateless per call. `gradeExplanation` at `src/lib/research-os/grounding.ts:95` receives the node, the prerequisite summaries and one explanation, with no conversation history. The first clause holds and the second has nothing to hold it |
| G13 | Learn from user behavior | satisfied | `computeGuidanceLevel`, `guidance.ts:8`, and `nextGuidanceLevel`, `guidance.ts:31`, personalize scaffolding from the learner's own recorded outcomes. The model itself is never tuned on learner data |
| G14 | Update and adapt cautiously | satisfied | `stepLevel` moves guidance one rung at a time and only after two consecutive matching outcomes (`guidance.ts:31-113`). `firstHalfOfWorkedExample` rounds up to whole sentences so a fade never produces a fragment |
| G15 | Encourage granular feedback, "Enable the user to provide feedback indicating their preferences during regular interaction with the AI system." | violated | No surface accepts a learner's judgment of a verdict. The forcing flow collects `learnerConfidence` and `sourcePrediction` before a reveal, which records the learner's state rather than their assessment of the system |
| G16 | Convey the consequences of user actions, "Immediately update or convey how user actions will impact future behaviors of the AI system." | violated | A learner's actions do change the system's future behavior. `nextGuidanceLevel` at `src/lib/research-os/guidance.ts:31` moves the level on two consecutive outcomes, and `buildGrounding` at `src/lib/research-os/grounding.ts:101-103` adds or withholds the POINTER line on that level. Nothing conveys either step. Design rule 6 below is the fix |
| G17 | Provide global controls | satisfied | Operator level: `RESEARCH_OS_LLM_ENABLED`, `RESEARCH_OS_SECOND_SOURCE_REQUIRED`, and the class overrides `second_source_required` and `research_os_guidance_enabled`. Learner level: `requireConsent`, `src/lib/research-os/consent.ts:56`, `exportLearnerData` and `deleteLearnerData`, `src/lib/research-os/privacy.ts:170` and `:225`, and node visibility through `POST /api/research-os/access` |
| G18 | Notify users about changes | violated | `src/app/whats-new/page.tsx` is a change feed for canon contributions and site changes, and its `FeedEventType` at `src/app/whats-new/types.ts:1-10` covers papers, figures, branches, promotions and retractions. No event type covers a model, a prompt or a capability change. `prompt_hash` is stored on a proposal row and never surfaced as a notice |

Ten satisfied, seven violated, one partial. After the re-score no guideline is inapplicable to Research OS.

The seven violations cluster. G2, G9 and G15 are one missing surface: a learner has no way to see the grader's track record and no way to push back on a verdict. G5 and G6 are one missing evaluation: nobody has measured what the model's feedback string does to a nine-year-old. G16 and G18 are one missing disclosure: the product tells a learner neither what an action will do to the guidance the model gets, nor when the model itself changes.

## The design rules Bucket adopts

Each rule is stated so that a test could fail it, and each names the surface that carries it. All seven scope to `src/app/api/research-os/` and `src/lib/research-os/`. The Academy tutor at `src/app/api/academy/tutor/` is a separate surface with its own contract, and nothing below governs it.

**Rule 1. The model never produces text the learner can submit as their own.**
Enforced by `GradeResult`'s shape at `src/lib/research-os/grounding.ts:4`, which has no field for a corrected explanation. Falsified by: any response type gaining a field whose value a learner can paste into their own explanation box, or any UI that renders `feedback` into an editable field. Test: a fixture where the model returns a `correctedExplanation` key, asserting it never reaches the client.

**Rule 2. The model cites from a set of one, checked in code.**
Enforced by the filter at `src/lib/research-os/grounding.ts:91`, an exact string match after trim against the label `citationLabel` builds at `src/lib/research-os/grounding.ts:63`. Falsified by: any citation reaching the learner that was not byte-equal to the allowed label. Test: a fixture returning a plausible-but-different citation, asserting an empty array.

**Rule 3. Abstain is the default when parsing fails.**
Enforced by `sanitizeGradeResult` at `grounding.ts:82` returning `ABSTAIN_FALLBACK` on a null parse or an out-of-range enum. Falsified by: any code path that surfaces a verdict from an unparsed response. Test: `parseModelJson` returning null, asserting `abstained === true`.

**Rule 4. A model's output changes the graph only after a named human decides.**
Enforced by `graph.edge_proposals`, `graph.node_proposals` and `graph.irreducible_proposals` as separate tables from `graph.edges` and `graph.nodes`, with `verifyGraphReviewer` at `src/lib/research-os/reviewer.ts:31` as the gate. Falsified by: any writer that inserts into `graph.edges` with `confidence_source` set from a model without a `reviewer_id` on the originating proposal. Test: a contract test over every `graph.edges` insert path.

**Rule 5. The product runs with the model off.**
Enforced by `llmEnabled` at `deterministic.ts:3` defaulting off, and by `deterministicCheck` and `deterministicOrganize` covering the two tools that would otherwise call a model. Falsified by: any Research OS route returning a 5xx or an empty tool when `RESEARCH_OS_LLM_ENABLED` is unset. Test: the full route suite with the flag unset.

**Rule 6. A learner sees what an action will do to their standing before they take it.**
Not built. The consequence copy does not exist on the Check button, the probe answer box or the production submit. This is the fix for Amershi G16 and it is the smallest of the seven gaps. Bead: `ros-ai consequence copy`, one string per action, read from `stages.ts`'s own transition rules so the copy and the rule cannot drift.

**Rule 7. A learner can dispute a verdict, and the dispute is recorded.**
Not built. Closes G2, G9 and G15 together. A dispute writes an evidence event of a new kind beside the `"check"` event it disputes, carrying the learner's reason. The teacher's class view lists disputes the way `graph.edge_flags` lists crossed low-confidence edges today. Once disputes accumulate, the grader's agreement rate against teacher decisions becomes computable, which is what G2 asks for. Bead: `ros-ai dispute a verdict`.

**Rule 8. The reading level of model output is measured before it reaches a child.**
Not built. Closes G5. `WorkedExample` at `src/lib/research-os/types.ts:66` already sets the target for seeded content. The same target belongs on the model's `feedback` string, checked in code after the model returns and before the learner sees it, with an abstain on a failure the way a malformed response already abstains. Bead: `ros-ai reading level gate`.

**Rule 9. A change to a model, a prompt or a tool appears in the change feed.**
Not built. Closes G18. `src/app/whats-new/types.ts` already carries a typed `FeedEventType` union and a commit SHA per event. Adding `model_change` and `prompt_change` to that union, emitted when `MODEL` in `src/lib/research-os/llm.ts:22` or `CHECK_SYSTEM_PROMPT` in `grounding.ts:107` changes, puts the model on the same public record as the canon. Bead: `ros-ai model change feed`.

**Rule 10. Every model call is attributable after the fact.**
Partly built. `logToolCall` at `src/app/api/research-os/workspace/route.ts:173` and `logToolCost` at `src/lib/research-os/llm.ts:47` write structured console lines, and no durable store exists yet. Falsified by: a model call that leaves no record of tool, learner, provider and token count. The durable sink is the open half. Bead: the Viatika metering hook.

## What this settles about the frame

The dyad Hollnagel warned about is a person and a tool. The triad Research OS has is a person, a model with its own agency, and a graph that both of them write to. The graph is the shared representation in Heer's sense, and it is what makes the third party governable: every model act lands as a row that names the model, carries a justification, and waits for a human.

Licklider gave the human the hypotheses and the criteria. Research OS gives the learner the explanation and the verdict, and gives the model the grounding check. Engelbart counted training among the augmentation means, and the guidance fade is that term made operational. Suchman said a plan is a resource for action, and the probe and the abstain are the two places the system declines to act on a plan the situation has broken. Shneiderman showed that control and automation are two axes, and the no-model switch is the proof that Bucket can sit anywhere on them.

The seven Amershi violations are what that position costs today. Five of them are one product decision away.

## Sources

- Licklider, J.C.R. Man-Computer Symbiosis. IRE Transactions on Human Factors in Electronics 1960;HFE-1:4-11. Sections I.A, I.B, III.A and IV. doi:10.1109/THFE2.1960.4503259
- Engelbart, D.C. Augmenting Human Intellect: A Conceptual Framework. SRI Summary Report AFOSR-3223, October 1962. Contract AF 49(638)-1024, SRI Project 3578. Sections I.A.1, II.A and II.C.2. dougengelbart.org/content/view/138/
- Suchman, L.A. Plans and Situated Actions: The Problem of Human-Machine Communication. Xerox PARC ISL-6, Corporate Accession P85-00005, February 1985. Preface, Abstract, p.28 and Chapter 4 at p.35. Published as Cambridge University Press, 1987.
- Suchman, L.A. Human-Machine Reconfigurations: Plans and Situated Actions, 2nd edition. Cambridge University Press, 2007. ISBN 0-521-85891-7. Chapters 1 and 6. The 1987 first edition's p.52 is cited here through Suchman's own quotation of it in Chapter 1. Suchman revised the sentence for the 2007 reprint, where Chapter 6 p.72 reads "embodied skills"; the wording quoted above is the 1987 one she herself quotes.
- Hollnagel, E., Woods, D.D. Cognitive Systems Engineering: New wine in new bottles. International Journal of Man-Machine Studies 1983;18(6):583-600. doi:10.1016/s0020-7373(83)80034-0. First issued as Risø-M-2330, Risø National Laboratory, February 1982, ISBN 87-550-0821-6. The document paginates to 41 and its final folio prints "- 41 -"; DTU Orbit's catalogue record says 40 and lists the title as "New wind on new bottles". The introduction quoted above is reproduced by Hollnagel at erikhollnagel.com/ideas/cognitive-systems-engineering-1982; the journal article sits behind Elsevier's paywall and was not read. A scan of the 1982 report was searched to confirm that "joint cognitive system" is absent from it.
- Hollnagel, E., Woods, D.D. Joint Cognitive Systems: Foundations of Cognitive Systems Engineering. Boca Raton: CRC Press, 2005. doi:10.1201/9781420038194. Cited for its title and thesis only; not read.
- Shneiderman, B. Human-Centered Artificial Intelligence: Reliable, Safe & Trustworthy. International Journal of Human-Computer Interaction 2020;36(6):495-504. doi:10.1080/10447318.2020.1741118. Read in the arXiv:2002.04087v1 preprint, 20 Feb 2020; page numbers above are that version's. The bare identifier now serves v2, where the two-dimensional framework quote moves to p.7 and the low-on-both quote to p.8. All five quotations are verbatim in both versions.
- Amershi, S., Weld, D., Vorvoreanu, M., Fourney, A., Nushi, B., Collisson, P., Suh, J., Iqbal, S., Bennett, P.N., Inkpen, K., Teevan, J., Kikin-Gil, R., Horvitz, E. Guidelines for Human-AI Interaction. CHI 2019, Glasgow, 4-9 May 2019, 13 pages. doi:10.1145/3290605.3300233. Table 1.
- Heer, J. Agency plus automation: Designing artificial intelligence into interactive systems. PNAS 2019;116(6):1844-1850. doi:10.1073/pnas.1807184115.
- Gladwin, T. 1964, quoted in Suchman ISL-6's Preface via Berreman 1966. Cited here through Suchman; the original was not read.
- Bar-Hillel, Y., quoted in Heer 2019 at p.1844. Cited here through Heer; the original was not read.
