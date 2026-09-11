# Research OS for K-12: AI Disclosure Draft

**Draft. Not legal advice. Counsel review required before this text is published or shown to a school, district, parent, or learner.**

Bead `ros-07`, minors compliance pack part A. Written against `_intake/research-os-k12/04-compliance-distribution.md` section 5 (AI-specific rules and provider constraints) and the workspace route's own implementation, `src/app/api/research-os/workspace/route.ts`.

---

## 1. What the AI does

Research OS's workspace gives a learner four AI-backed tools, each scoped to one narrow job:

- **Locate**: searches the knowledge graph's seeded content for nodes matching a learner's query. Retrieval only, no model call.
- **Quote**: returns a verbatim, sourced passage (or, when no verified full-text passage exists yet, the node's own summary, always labeled so a learner can tell the difference) for a node the learner picked. Retrieval only, no model call.
- **Check**: grades a learner's OWN explanation against the node's grounding material and its prerequisites, and returns whether it supports, contradicts, or is unclear against the material, plus its own confidence and, when the model is unsure, an explicit abstention rather than a guess.
- **Organize**: relabels a learner's OWN notes into a claim, evidence, and sources scaffold, so the pieces the learner already wrote are sorted, never rewritten in substance.

## 2. What the AI does not do

**The AI never writes a learner's claim, explanation, or synthesis for them.** Two mechanisms enforce this directly in code: a closed list of four allowed actions rejects anything else before any model is called, and Locate and Quote never call a model at all. Check grades the learner's own words; it never emits a corrected or rewritten version of what they wrote. Organize's own system prompt forbids adding any fact not already present in the learner's input, and its output is always shown as an editable draft a learner reviews and can change, never auto-submitted on their behalf.

The AI supports a learner's own research and self-checking. It never generates an open-ended answer, an essay, or any submittable prose on a learner's behalf.

## 3. Human review before anything counts

A learner's submitted Production (their claim, evidence, sources, and transfer answer) is reviewed by a human teacher before it is accepted into the graph or becomes eligible for a citation payment. The AI's own grading on a Check event informs the learner in the moment; it does not, by itself, accept or reject a Production, decide a grade, or make a final judgment about a learner's understanding. `src/lib/research-os/EVIDENCE-SCHEMA.md`'s `teacher_review` evidence kind and `graph.teacher_reviews` table are where that human decision is recorded, and `learning/research-os/compliance/DATA-INVENTORY.md` names it as an education record in its own right.

This matters beyond good practice: several states' 2026 K-12 AI guidance explicitly bars AI from being the primary basis for a grade (Oklahoma is named directly in `_intake/research-os-k12/04-compliance-distribution.md` section 5), and New York City's March 2026 guidance builds an entire framework around exactly this line. The teacher review queue is this product's direct answer to that requirement.

## 4. Transparency to the learner

A learner is told, in the workspace itself, when an AI system is evaluating their work (a Check event) versus when a tool is doing retrieval only (Locate, Quote) versus when a tool is reorganizing their own words (Organize). Every state-transition decision the product makes carries, or should carry once this recommendation is implemented, a plain-language reason tied to the specific evidence it was based on, per `_intake/research-os-k12/04-compliance-distribution.md` section 5's "proof of learning" explainability recommendation. [Status note: the plain-language rationale attached to every state transition, part (a) of that section's three-part recommendation, is not yet implemented as of this draft; `onCheckResult`'s transition event carries a `result` and `confidence` but not yet a learner-facing sentence explaining the transition. Tracked as follow-up work outside part A's scope.]

## 5. Model Provider and Terms

Research OS runs its AI tools through an API-key deployment where Bucket Foundation is the accountable developer, per Anthropic's own published developer policy for organizations serving minors (`_intake/research-os-k12/04-compliance-distribution.md` section 5). No learner ever interacts with a consumer AI product (Claude.ai, ChatGPT, or a consumer Gemini account) directly; every request the workspace makes goes through Bucket Foundation's own server-side integration (`src/lib/research-os/llm.ts`), governed by Bucket Foundation's own content-safety and monitoring responsibility as the deploying developer.

## 6. EU AI Act framing

The European Union's AI Act, Annex III point 3(b), classifies an AI system used to steer the learning process (which this product's frontier-backward routing and five-state learner model does) as **high-risk**, once EU rollout is planned. `_intake/research-os-k12/04-compliance-distribution.md` section 3 recommends treating any EU launch as a distinct, later phase gated on its own dedicated AI Act compliance review, separate from the rest of this compliance pack, and that recommendation stands: this disclosure draft is not itself an AI Act conformity statement, and nothing in Research OS is offered in the EU market as of this draft's date. The human-teacher-review design in section 3 above is a real step toward the AI Act's human-oversight obligation, but does not, by itself, satisfy the full high-risk classification's requirements (risk management system, bias-tested training data documentation, automatic logging, a full conformity assessment).

## 7. Questions

[Placeholder: a named contact for a parent, teacher, or district to ask a question about how the AI tools work, once one exists.]

---

**Reminders for counsel review**: this draft's section 4 status note names a real gap (no per-transition plain-language rationale shipped yet); do not represent that feature as live in any public-facing version of this document until it ships. Section 6's EU framing is provisional; revisit it in full once any EU rollout is scoped.
