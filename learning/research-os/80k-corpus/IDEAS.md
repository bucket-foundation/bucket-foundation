# Research ideas and source graph

The five ideas share a decision problem: choose an action using evidence about its consequences. Bucket already supplies a prerequisite graph and a learner evidence model. These ideas add choices about research partners and where acquired knowledge could have value.

## Comparison

| Idea and Bead | Existing systems | Connection to Bucket | Distinct question to test |
|---|---|---|---|
| PhD advisor matching, `bkt-fo7y` | [SupervisorMatch](https://www.supervisormatch.com/) advertises matching applicants with supervisors using research fit and funding. [Portsmouth](https://www.port.ac.uk/study/postgraduate-research/research-degrees/phd/find-a-phd-supervisor) has a supervisor research-interest search. These are product descriptions; their outcome claims were not tested. | Connect a research question to the papers and methods a lab uses, then expose the learner's missing prerequisites. Keep supervision availability and mentorship preferences as separate, consented inputs. | Does a two-sided match based on research evidence improve accepted introductions and six-month fit over a topic-search baseline? A swipe interface alone supplies no new matching evidence. |
| Predict high-impact roles, `bkt-ggsv` | [80,000 Hours' career framework](https://80000hours.org/articles/framework/) already considers role impact and personal fit alongside career capital and personal priorities. | Connect a role to its required skills and the learner's verified knowledge. Preserve impact estimates as dated hypotheses with outcome definitions. | Can predictions outperform the current framework on held-out, dated career cases? Measure calibration and counterfactual contribution, including displacement. |
| Cognitive decline and existential risk, `bkt-uumu` | Flynn-effect research studies changes in cognitive test scores. Global-priorities research studies catastrophic risk and institutional response. | Add a causal hypothesis graph linking specific cognitive capacities to error detection and institutional response, with source-backed mechanisms for each risk. | Does a measured change in a defined population predict a risk-relevant intermediate outcome after confounder adjustment? Neither global decline nor a causal link to extinction is established by this proposal. |
| Impact of research and education reform, `bkt-bj58` | [GiveWell's cost-effectiveness approach](https://www.givewell.org/how-we-work/our-criteria/cost-effectiveness) offers a comparison structure. Bucket's [preregistration draft](../study/PREREGISTRATION-DRAFT.md) already proposes learner outcomes and comparison groups. | Measure transfer, retention, and subsequent research outcomes using the learner-state system. Connect intervention costs and adoption evidence to an impact estimate. | What changes relative to a specified alternative, for whom, and for how long? The target project still needs clarification from the user. |
| Expected value theorem, `bkt-yxw1` | Probability theory already provides expectation identities. Expected utility and global-priorities research investigate decision rules under uncertainty. | Existing Academy atoms include `random-variables`, `probability-basics`, and `bayes-theorem`. Link any proposed theorem to its assumptions and proof. | Which exact proposition is intended? Keep linearity of expectation, representation theorems, and the normative choice to maximize expected value separate. |

The supervisor idea and role-prediction idea could share a research-fit profile. Their success measures differ: a compatible supervisory relationship and a counterfactual social outcome. Education impact supplies a test of whether Bucket changes capability. The cognitive-risk idea concerns a possible external causal mechanism. Expected-value reasoning supplies a formal component once its assumptions are chosen.

## Evidence boundaries

[Bratsberg and Rogeberg's 2018 study](https://pmc.ncbi.nlm.nih.gov/articles/PMC6042097/) used Norwegian conscription records and within-family comparisons. Its findings support an environmental explanation for the trends it studied. That population and design cannot establish worldwide cognitive decline or quantify existential risk. An analysis here needs distinct measures of test performance, learned skill, institutional competence, and dependence on automation.

[GiveWell's uncertainty discussion](https://www.givewell.org/how-we-work/our-criteria/cost-effectiveness/uncertainty-optimizers-curse) identifies parameter sensitivity and the optimizer's curse as concerns when selecting among impact estimates. Use those concerns in role and education-reform evaluation: report distributions, validation dates, and sensitivity to moral weights. A large expected value from an uncertain model does not constitute an observed outcome.

[The Case for Strong Longtermism](https://www.globalprioritiesinstitute.org/wp-content/uploads/The-Case-for-Strong-Longtermism-GPI-Working-Paper-June-2021-2-2.pdf) and [The Epistemic Challenge to Longtermism](https://www.globalprioritiesinstitute.org/wp-content/uploads/Tarsney-Epistemic-Challenge-to-Longtermism.pdf) provide opposing pressure on assumptions about far-future consequences. Preserve both as source works. A graph link expresses a relationship to inspect; it grants no truth grade.

## Fit with the learning-system proposal

The earlier [learning-system plan](https://github.com/bucket-foundation/bucket-foundation/pull/348) asks which prerequisites a learner must acquire to reach a target. The new ideas ask which target or collaborator to choose and what outcome to expect from that choice. Keep prerequisite necessity distinct from expected benefit.

The existing Academy importer, `src/lib/research-os/ingest/academy.ts`, derives prerequisite edges from authored `requires` lists. The raw corpus collector records observed hyperlinks as `bridges`. A hyperlink alone cannot establish a prerequisite, causal effect, agreement, or mastery.

Suggested evaluation order: use the education-reform idea to define Bucket's outcomes; test supervisor discovery with consented users; evaluate role predictions against dated cases; investigate cognitive-risk mechanisms with population-specific evidence. Clarify the expected-value proposition before attempting a formal proof. This order is an implementation judgment, with no measured ranking of social value.

## Source coverage

The collection includes 80,000 Hours website material and both podcast archives. Adjacent collections cover EffectiveAltruism.org, topic-linked EA Forum posts, Longtermism.com, the Global Priorities Institute, Rethink Priorities, Giving What We Can, and GiveWell. Links to other works are retained for source discovery. The acquisition ledger determines coverage; this list is not a claim of exhaustive collection.

Raw responses and extracted source text live in the local corpus. This comparison is authored analysis and is stored outside that corpus.
