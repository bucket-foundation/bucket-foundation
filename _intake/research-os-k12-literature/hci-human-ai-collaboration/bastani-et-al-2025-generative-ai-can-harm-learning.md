---
title: "Generative AI without guardrails can harm learning: Evidence from high school mathematics"
authors:
  - "Bastani, Hamsa"
  - "Bastani, Osbert"
  - "Sungu, Alp"
  - "Ge, Haosen"
  - "Kabakcı, Özge"
  - "Mariman, Rei"
year: 2025
venue: "Proceedings of the National Academy of Sciences"
doi: "10.1073/pnas.2422633122"
url: "https://doi.org/10.1073/pnas.2422633122"
openalex_id: "https://openalex.org/W4411627694"
branch: "hci-human-ai-collaboration"
tier: "canon"
status: "promoted"
promoted_to: "bucket-canon/07-mind/sub-outcomes/education/primary-papers.yaml (id bkt-1b34ca6c5af4)"
promoted_at: "2026-09-10"
depends_on_foundation: "bucket-canon/07-mind/memory-systems/primary-papers.yaml (id bkt-0333f4a853f3, Roediger and Karpicke 2006)"
why_it_matters: >
  A field experiment with about 1,000 Turkish high school students, the sharpest available
  causal evidence for the exact design choice Research OS treats as fixed: an AI that answers
  directly raises practice performance and lowers unassisted exam performance once access is
  removed, while a hint-only guardrail keeps the practice gain and removes the exam harm.
key_claims:
  - "Unrestricted GPT-4 access on math practice problems raised practice-set performance by about 48 percent but lowered unassisted exam performance by about 17 percent relative to a no-AI control, once the tool was taken away for the test."
  - "A guardrailed version of the same tool, restricted to hints rather than answers, raised practice performance by about 127 percent while producing no significant drop in unassisted exam performance."
  - "The harm from unrestricted access concentrated on problems structurally similar to what the AI had already solved, consistent with students substituting AI output for their own problem-solving rather than learning the method."
research_questions_it_leaves_open:
  - "Whether the guardrail's protection holds over a full semester rather than the study's shorter window, or decays as students find workarounds."
  - "Whether a hint ladder tuned for math procedure problems transfers to reading, synthesis, and citation tasks, the domains Research OS's own find-quote-check-organize workspace targets."
how_it_bears_on_research_os: >
  This is the direct causal precedent behind Research OS's rule that the AI never writes an
  answer for the learner: the same mechanism, answer substitution crowding out practice, is
  what the workspace's four-tool design (find, quote, check, organize) is built to prevent
  by construction rather than by guardrail alone. It also sets a falsifiable bar for the
  three-arm testbed in `RESEARCH-QUESTIONS.md` Q8 and Q11: a scoped workspace should reproduce
  the guardrailed condition's protected exam performance, not the unrestricted condition's
  practice-only gain. Cross-indexed against `_intake/research-os-k12/raw/lit-educational-methods.md`
  and `raw/lit-hci-human-ai.md`, which already carry this paper's earlier SSRN working-paper
  version (doi:10.2139/ssrn.4895486).
---

# Generative AI without guardrails can harm learning: Evidence from high school mathematics

> **Promoted to outcome tier, 2026-09-10.** This record lives in
> `bucket-canon/07-mind/sub-outcomes/education/primary-papers.yaml` (id
> `bkt-1b34ca6c5af4`, `canon_score` 75) and `bucket-canon/07-mind/sub-outcomes/education/CANON_INDEX.md`.
> Outcome tier, not canon: it reports an intervention or team-performance effect
> size, RUBRIC E7, and depends on the foundation record named by
> Roediger and Karpicke 2006. This file stays in place as the Research OS-specific reading;
> the canon entry is the citeable record.

A randomized field experiment with about 1,000 high school students in Turkey testing GPT-4
access on math practice. Unrestricted access raised practice performance but lowered unassisted
exam performance once the tool was removed; a hint-only guardrail kept most of the practice gain
without the exam harm.

## Key Claims

- Unrestricted access: practice performance up about 48 percent, unassisted exam performance
  down about 17 percent relative to a no-AI control.
- Guardrailed, hints-only access: practice performance up about 127 percent, no significant
  exam harm.
- Harm concentrated on problems structurally similar to ones the AI had already solved for the
  student, consistent with answer substitution rather than skill transfer.

## Research Questions It Leaves Open

- Whether the guardrail's protection holds over a full school year rather than the study window.
- Whether a hint ladder built for math procedures transfers to reading and synthesis tasks.

## How It Bears on Research OS

This is the direct causal precedent for the rule that the AI in Research OS's workspace never
writes an answer: the same substitution mechanism this study documents is what the four-tool
design (find, quote, check, organize) prevents by construction. It sets a falsifiable target for
the three-arm testbed named in `RESEARCH-QUESTIONS.md` Q8 and Q11: a scoped workspace should
match the guardrailed condition's protected exam performance, not the unrestricted condition's
practice-only gain.
