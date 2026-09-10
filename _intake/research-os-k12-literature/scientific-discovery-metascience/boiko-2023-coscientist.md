---
title: "Autonomous chemical research with large language models"
authors:
  - "Boiko, Daniil A."
  - "MacKnight, Robert"
  - "Kline, Ben"
  - "Gomes, Gabe"
year: 2023
venue: "Nature"
doi: "10.1038/s41586-023-06792-0"
url: "https://doi.org/10.1038/s41586-023-06792-0"
openalex_id: "https://openalex.org/W4389991792"
branch: "scientific-discovery-metascience"
tier: "canon"
why_it_matters: >
  Coscientist chains a large language model to literature search, code execution, and robotic
  laboratory automation so it can plan, run, and interpret real wet-lab chemistry experiments,
  including a palladium-catalyzed cross-coupling reaction, with limited human input. It is an
  early working demonstration of a system closing the loop from hypothesis to physical experiment
  to logged result.
key_claims:
  - "A language model given tools for literature search, code execution, and robotic experiment execution can plan and carry out a multistep chemistry experiment with limited human supervision."
  - "The system was tested against reaction optimization and synthesis-planning tasks, and completed a real palladium-catalyzed cross-coupling reaction end to end."
  - "Access to literature search, code execution, and robotic experiment execution let the system move from a proposed plan to a physically executed and verified result."
research_questions_it_leaves_open:
  - "The paper leaves open how such a system fails: what fraction of its autonomously planned experiments would be wrong, unsafe, or wasteful without the safeguards used in this demonstration."
  - "It leaves open what verification a claim produced this way needs before it can be cited as evidence by other researchers, since the experiment's success here was checked by the paper's own authors."
how_it_bears_on_research_os: >
  Coscientist is a concrete precedent for treating an experiment planned and run by an AI system,
  with a physical or logged result, as its own evidence tier the belief-fusion engine can score,
  distinct from a text-mined claim or a human-authored study. Bucket's evidence-tier weighting
  should account for the gap this paper leaves open between the system reporting success and an
  independent party confirming it. For the Research OS, it is a model for what a K-12
  transfer-proof pipeline could look like at the far end of automation: a student production that
  pairs a claim with a logged, tool-executed procedure a teacher can re-run and check step by
  step.
---

# Autonomous chemical research with large language models

Coscientist matters to Bucket Foundation because it names a new evidence tier: a claim backed not
just by text but by a logged, tool-executed procedure another party can re-run. The system chains
a language model to literature search, code execution, and robotic lab hardware, and used that
chain to plan and complete a real cross-coupling reaction with limited human input. That is close
to what a K-12 transfer-proof pipeline should aim for at its most automated end, a student claim
paired with a procedure a teacher can check step by step rather than a narrative alone. It also
raises a caution for the belief-fusion engine: the paper's own authors checked its success, so the
evidence-tier weight this kind of claim earns should reflect that it has not yet been confirmed by
an independent party.

Key claims:
- A language model with literature search, code execution, and robotic experiment tools can plan and run a multistep chemistry experiment with limited supervision.
- Tested against reaction optimization and synthesis planning, and completed a real palladium-catalyzed cross-coupling reaction end to end.
- Tool access, literature search, code execution, and robotic experiment execution, carried the plan through to a physically executed result.

Open questions:
- The failure rate of autonomously planned experiments without the safeguards used in this demonstration.
- What independent verification a claim produced this way needs before other researchers can cite it as evidence.
