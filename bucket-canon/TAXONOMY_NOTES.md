# Canon Taxonomy Notes

Open branch-placement questions and the taxonomy rename log, referenced from
individual branch `README.md` files rather than duplicated in each. An open
question here names the candidate homes and the tradeoff; it does not
resolve the placement or promote the material it discusses. Resolving a
question moves it from Open to a dated entry in the Rename Log with the
decision and its rationale.

## Open Questions

### Home for metascience and sociology-of-science material

**Raised**: 2026-09-10, Research OS for K-12 canon-intake promotion
(`intake/ros-canon-promotion`), triggered by two source cards in
`_intake/research-os-k12-literature/scientific-discovery-metascience/`:
Jones 2009 ("The Burden of Knowledge and the 'Death of the Renaissance
Man,'" DOI `10.1111/j.1467-937x.2008.00531.x`, on rising team size and
first-discovery age across the 20th century) and Fortunato et al. 2018
("Science of science," DOI `10.1126/science.aao0185`, the field-defining
review of bibliometric and network-science methods applied to the
scientific enterprise itself). Neither has been promoted; this question
names candidate homes for the material, independent of any future decision
to promote it.

**No new branch.** The question is which existing branch, if either, is
the right home.

**Candidate A: `07-mind/`.** Both papers study the cognitive and social
organization of research production: how researchers specialize, form
teams, and reach a field's frontier. That is continuous with `07-mind`'s
existing "Decision theory and cognition" sub-domain, extended from
individual to collective cognition. Tradeoff: `07-mind/README.md`'s
promotion rule (`c1`/`c2`/`c3`) is built around a primary statement by the
originator of a psychological or philosophical model; Jones 2009 is an
econometric analysis and Fortunato et al. 2018 is an explicit review
(review-tier does not promote under the branch's own rule unless it clears
`c3`, "discipline-standard normative reference," the way Marr 1982 does).
Filing here stretches the branch's unit of inclusion.

**Candidate B: `04-information/`.** Fortunato et al. 2018 is a
network-science and bibliometric-methods survey, citation graphs,
information diffusion through a research community, continuous with
`04-information`'s "Learning and complexity" sub-domain's quantitative,
structural framing. Jones 2009's team-size and specialization finding is
also a statement about how information/labor is partitioned across a
research system. Tradeoff: `04-information/README.md` explicitly excludes
"ML benchmark results" and "software systems" as adjacent-but-out-of-scope
categories, and does not name metascience or bibliometrics as one of its
five sub-domains; filing here requires either a sixth sub-domain or an
explicit boundary-call addition, not just an implicit extension of an
existing one.

**Tradeoff, stated plainly**: `07-mind` keeps the human/cognitive framing
(who does science, and how, as a mental and social act) but the branch's
own promotion rule names no clear path for either paper's genre (an
econometric analysis, a field-defining review). `04-information` keeps the
quantitative/structural framing (citation networks, information flow) that
matches Fortunato et al. 2018's actual content, but requires adding a
sub-domain the branch README does not currently name. Neither branch's
existing text resolves this; a future pass should pick one explicitly
rather than let the ambiguity persist through a promotion decision made
under time pressure.

### AlphaFold: primary method card vs. landscape entry

**Raised**: 2026-09-10, same promotion pass. Source card: Jumper et al.
2021, "Highly accurate protein structure prediction with AlphaFold," DOI
`10.1038/s41586-021-03819-2`, `_intake/research-os-k12-literature/
scientific-discovery-metascience/jumper-et-al-2021-alphafold.md`. **Not
promoted** by this pass; recorded here as an open question only.

**Option A: primary method card under `05-biophysics/`.** AlphaFold
resolves a structural-biology problem, protein structure from sequence, at
expert-level accuracy on a blind benchmark (CASP14). `05-biophysics/
README.md`'s promotion rule admits "a primary theoretical or experimental
text by the originator of the framework"; a method card would need to be
written as a primary statement of the method itself (architecture,
training regime, validation protocol), the way `05-biophysics/concepts/`
already holds internally authored method cards for results without a
single external figure to attach to. Tradeoff: AlphaFold is a deep-learning
system trained on structural data, a different category from a stated law
or mechanism of a physical system's behavior; the branch's own scope note
excludes "ML model architectures" elsewhere in the canon (see
`04-information/README.md`'s parallel exclusion), and writing a method
card is real authorship work rather than a citation task.

**Option B: stays a `research-landscape/` review-tier entry.** AlphaFold is
already well covered in the general literature and does not need a
Bucket-authored primary statement to be citeable; a landscape entry
under `research-landscape/biophysics/` (which already exists, see
`becker-commentariat/`) cites the paper and its reception without asserting
it as a foundation-tier primary. Tradeoff: this undersells AlphaFold
relative to how the `jumper-et-al-2021-alphafold.md` source card frames it
("the standing benchmark against which any claim of AI doing science gets
measured"), and leaves no canon-tier anchor for future AI-for-science
material that wants to cite it as a mechanism precedent rather than a
landscape reference.

Both options remain open. Resolving this requires either writing the
method card (Option A, real effort, precedent-setting for future AI-method
entries) or scaffolding `research-landscape/` for this material (Option B,
lower effort, defers the precedent question).

### Psychodynamic theory: originator entry or landscape only

**Pre-existing**, referenced from `07-mind/README.md`'s scope note on
therapy-tradition primary texts (Freud, Jung, Beck) but not previously
filed as its own entry here; recorded now so the reference resolves to
real content rather than a dangling filename. Not raised or resolved by
this pass. Open question: whether a therapy-tradition originator (Freud's
metapsychology papers, Jung's collected works, Beck's cognitive-therapy
founding texts) clears `07-mind`'s `c1`/`c2` promotion rule as a primary
statement of a model of mind, or whether therapy traditions sit entirely
in `research-landscape/` as clinical/practitioner material regardless of
originator status. Needs its own pass; not resolved here.

### Home for human-AI complementarity outcome meta-analyses

**Raised**: 2026-09-10, canon intake pass two
(`intake/ros-canon-promotion-2`), triggered by two source cards promoted
this pass as outcome-tier into `07-mind/sub-outcomes/education/`: Vaccaro,
Almaatouq and Malone 2024 ("When Combinations of Humans and AI Are Useful:
A Systematic Review and Meta-Analysis," DOI `10.1038/s41562-024-02024-1`)
and Bansal et al. 2021 ("Does the Whole Exceed its Parts? The Effect of AI
Explanations on Complementary Team Performance," DOI
`10.1145/3411764.3445717`). Neither is education-specific: both measure
general human-AI team performance across task types, a broader scope
than a classroom outcome. This question names the placement tradeoff; it
does not move either record out of `sub-outcomes/education/`.

**No new branch.** The question is whether `07-mind/sub-outcomes/`
needs a second topic folder alongside `education/`; a new top-level canon
branch is out of scope for this question entirely.

**Option A: a new `sub-outcomes/human-ai-collaboration/` folder.**
Groups general human-AI team-performance meta-analyses separately from
classroom-specific tutoring outcomes, the way `education/` groups
tutoring-specific ones. Tradeoff: two records is a thin seed for a new
folder, and a future card on the same theme (decision-support, not
tutoring) would need to be screened against a scope this pass has not
written yet.

**Option B: stay in `sub-outcomes/education/` with a pointer.** Keeps one
outcome folder under `07-mind/` until the theme grows past a couple of
records. Tradeoff: a reader looking for human-AI-collaboration outcome
material has to find it inside an education-scoped folder, and the
folder's own scope line has to carry both statements at once, tutoring
and general team performance, rather than one.

This pass takes Option B: both records are added to
`sub-outcomes/education/primary-papers.yaml` with a `depends_on_foundation`
pointer to `04-information/information-foraging/` (Pirolli and Card 1999),
not to the memory-systems foundation the tutoring records depend on, and
each carries a `TAXONOMY_NOTES.md` cross-reference in its
`outcome_reason` field. A future pass with more human-AI-collaboration
outcome cards should reconsider Option A.

## Rename Log

None yet. Entries here record a branch, sub-domain, or folder rename with
the date, the prior name, and the reason, once an Open Question above (or
elsewhere) resolves into one.
