# The workspace without a model

ros-23. The first integrated release runs no model behind any tool (INTEGRATION-PLAN.md section 5). One switch, `RESEARCH_OS_LLM_ENABLED`, default off, routes Check and Organize to the model paths when set to `1` or `true`; `GET /api/research-os/route` reports the state as `llmEnabled` so the workspace renders the right controls.

## Per tool

| Tool | Off (default) | On |
|---|---|---|
| Find | the locate index over node titles and summaries, the closure table, the canon locator (unchanged, retrieval only) | same |
| Quote | passage locators over stored text (unchanged) | same |
| Check | the learner records `support` or `contradiction` against the quotes they attached; `deterministicCheck` grades the attempt on a fixed rubric | `gradeExplanation` over the grounding prompt |
| Organize | `deterministicOrganize` splits the learner's own notes into claim, evidence points, and sources by sentence and line | the Organize prompt, output grounded by `groundOrganizeResult` |
| Tutor, research agent | hidden | shown |
| Pen | free writing stored in the browser, keyed by node; no tool or route reads it | same |

## The Check rubric

`src/lib/research-os/deterministic.ts`, tested by `scripts/test-research-os-deterministic.ts`.

1. At least one quoted passage is attached, and the learner's evidence log holds a quote event on this node. Otherwise the check abstains and asks for a quote.
2. A verdict is recorded. Otherwise the check abstains and asks for one.
3. The explanation is at least a sentence and is in the learner's own words: it is not a copy of a quote (no 60-character run shared verbatim).
4. The explanation draws on the quoted passages: at least a quarter of its content terms appear in the quotes (`MIN_OVERLAP`); half or more counts as strong (`STRONG_OVERLAP`).

When every rule passes, `result` is the learner's verdict, `confidence` is `high` with strong overlap and two or more quotes, otherwise `medium`; `abstained` is false. When a rule fails, `result` is `unknown`, `abstained` is true, and the feedback names what passed and what is missing. The feedback always says that no model read the attempt. The shape is grounding.ts's `GradeResult`, so cognitive forcing, lateral reading, the evidence log, and the level transitions run unchanged on top of it.

## What this does not do

It does not judge whether the explanation is true. That judgment is the learner's, the teacher's on review, and later the model's when the switch is on. The rubric measures effort and grounding: quoted, verdict recorded, own words, drawn from the quotes.
