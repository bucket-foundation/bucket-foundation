# Research OS for K-12, Literature Corpus

This corpus grounds the Research OS for K-12 design and its overlap with Bucket's hypothesis
engine in verified primary literature. Each file covers one real, published paper: a DOI checked
against OpenAlex, Crossref, Semantic Scholar, or DataCite at intake time, plain-language claims,
the open questions it leaves, and a paragraph tying it to a named part of the Research OS design
or the hypothesis engine. Four areas: educational methods (mastery, retrieval, knowledge tracing,
transfer, motivation), HCI and human-AI collaboration (cognitive offloading, mixed-initiative
interfaces, intelligent tutoring, LLM-assisted learning), scientific discovery research and
metascience (AI for discovery, literature-based discovery, the science of science), and AI and
researchers (division of cognitive labor, hypothesis evaluation, scientific understanding). See
`_intake/research-os-k12/OVERLAP-RESEARCH-OS-AND-AI-FOR-RESEARCH.md` for the map from this corpus
onto the shared substrate between Research OS and the hypothesis engine.

## Relationship to the existing literature passes

`_intake/research-os-k12/raw/lit-educational-methods.md`, `lit-hci-human-ai.md`, and
`lit-ai-for-science.md` already carry a verbatim, DOI-resolved research-agent pass over 49, 56,
and 42 sources, cited into `learning/research-os/RESEARCH-QUESTIONS.md`'s 49 open questions. This
corpus does not restate that pass; it is the canon-intake conversion of a curated subset of it,
one structured file per paper with plain-language claims, named open questions, and a paragraph
tying the paper to a specific part of the Research OS or engine design, which the raw notes do
not carry in per-paper form. A file whose paper also appears in one of those raw passes carries a
closing line naming which raw file it is cross-indexed against; a reader who wants the full,
unfiltered research-agent pass for an area should start from the raw file instead of this corpus.

## Index

| Paper | Area | Year | Tier | Status |
|---|---|---|---|---|
| [When and where do we apply what we learn?: A taxonomy for far transfer.](educational-methods/barnett-ceci-2002-far-transfer-taxonomy.md) | Educational methods | 2002 | canon | verified |
| [The 2 Sigma Problem: The Search for Methods of Group Instruction as Effective as One-to-One Tutoring](educational-methods/bloom-1984-two-sigma-problem.md) | Educational methods | 1984 | canon | verified |
| [Eliciting Self‐Explanations Improves Understanding](educational-methods/chi-et-al-1994-self-explanation.md) | Educational methods | 1994 | canon | verified |
| [Knowledge tracing: Modeling the acquisition of procedural knowledge](educational-methods/corbett-anderson-1995-knowledge-tracing.md) | Educational methods | 1995 | canon | verified |
| [The "What" and "Why" of Goal Pursuits: Human Needs and the Self-Determination of Behavior](educational-methods/deci-ryan-2000-self-determination-theory.md) | Educational methods | 2000 | canon | verified |
| [An NCME Instructional Module on: Comparison of Classical Test Theory and Item Response Theory and Their Applications to Test Development](educational-methods/hambleton-jones-1993-ctt-vs-irt.md) | Educational methods | 1993 | canon | verified |
| [Assessing the effects of gamification in the classroom: A longitudinal study on intrinsic motivation, social comparison, satisfaction, effort, and academic performance](educational-methods/hanus-fox-2015-gamification-classroom.md) | Educational methods | 2015 | canon | verified |
| [The Wick in the Candle of Learning](educational-methods/kang-et-al-2009-curiosity-memory.md) | Educational methods | 2009 | canon | verified |
| [Productive Failure](educational-methods/kapur-2008-productive-failure.md) | Educational methods | 2008 | canon | verified |
| [Effectiveness of Mastery Learning Programs: A Meta-Analysis](educational-methods/kulik-kulik-bangert-drowns-1990-mastery-learning-meta-analysis.md) | Educational methods | 1990 | canon | verified |
| [Deep Knowledge Tracing](educational-methods/piech-2015-deep-knowledge-tracing.md) | Educational methods | 2015 | canon | verified |
| [The Power of Testing Memory: Basic Research and Implications for Educational Practice](educational-methods/roediger-karpicke-2006-power-of-testing.md) | Educational methods | 2006 | canon | verified |
| [Learning Trajectory Based Instruction](educational-methods/sztajn-et-al-2012-learning-trajectories.md) | Educational methods | 2012 | canon | verified |
| [Ironies of automation](hci-human-ai-collaboration/bainbridge-1983-ironies-of-automation.md) | HCI and human-AI collaboration | 1983 | canon | verified |
| [From Chalkboards to Chatbots: Evaluating the Impact of Generative AI on Learning Outcomes in Nigeria](hci-human-ai-collaboration/de-simone-2025-chalkboards-to-chatbots-nigeria.md) | HCI and human-AI collaboration | 2025 | candidate | verified |
| [Principles of mixed-initiative user interfaces](hci-human-ai-collaboration/horvitz-1999-mixed-initiative-interfaces.md) | HCI and human-AI collaboration | 1999 | canon | verified |
| [AI tutoring outperforms in-class active learning: an RCT introducing a novel research-based design in an authentic educational setting](hci-human-ai-collaboration/kestin-et-al-2025-ai-tutoring-outperforms-active-learning.md) | HCI and human-AI collaboration | 2025 | canon | verified |
| [Explainable Artificial Intelligence in education](hci-human-ai-collaboration/khosravi-et-al-2022-explainable-ai-education.md) | HCI and human-AI collaboration | 2022 | canon | verified |
| [Effectiveness of Intelligent Tutoring Systems](hci-human-ai-collaboration/kulik-fletcher-2016-intelligent-tutoring-meta-analysis.md) | HCI and human-AI collaboration | 2016 | canon | verified |
| [Spatial hypertext](hci-human-ai-collaboration/marshall-shipman-1995-spatial-hypertext.md) | HCI and human-AI collaboration | 1995 | canon | verified |
| [Information foraging.](hci-human-ai-collaboration/pirolli-card-1999-information-foraging.md) | HCI and human-AI collaboration | 1999 | canon | verified |
| [Google Effects on Memory: Cognitive Consequences of Having Information at Our Fingertips](hci-human-ai-collaboration/sparrow-liu-wegner-2011-google-effects-on-memory.md) | HCI and human-AI collaboration | 2011 | canon | verified |
| [From promise to practice: harnessing generative AI to improve foundational learning in Sub-Saharan Africa](hci-human-ai-collaboration/unesco-2025-generative-ai-foundational-learning-sub-saharan-africa.md) | HCI and human-AI collaboration | 2025 | candidate | verified |
| [The Relative Effectiveness of Human Tutoring, Intelligent Tutoring Systems, and Other Tutoring Systems](hci-human-ai-collaboration/vanlehn-2011-relative-effectiveness-tutoring.md) | HCI and human-AI collaboration | 2011 | canon | verified |
| [Tutor CoPilot: A Human-AI Approach for Scaling Real-Time Expertise](hci-human-ai-collaboration/wang-et-al-2024-tutor-copilot.md) | HCI and human-AI collaboration | 2024 | candidate | verified |
| [Autonomous chemical research with large language models](scientific-discovery-metascience/boiko-et-al-2023-coscientist.md) | Scientific discovery and metascience | 2023 | canon | verified |
| [Science of science](scientific-discovery-metascience/fortunato-et-al-2018-science-of-science.md) | Scientific discovery and metascience | 2018 | canon | verified |
| [The Burden of Knowledge and the "Death of the Renaissance Man": Is Innovation Getting Harder?](scientific-discovery-metascience/jones-2009-burden-of-knowledge.md) | Scientific discovery and metascience | 2009 | canon | verified |
| [Highly accurate protein structure prediction with AlphaFold](scientific-discovery-metascience/jumper-et-al-2021-alphafold.md) | Scientific discovery and metascience | 2021 | canon | verified |
| [The AI Scientist: Towards Fully Automated Open-Ended Scientific Discovery](scientific-discovery-metascience/lu-et-al-2024-ai-scientist.md) | Scientific discovery and metascience | 2024 | candidate | verified |
| [The Matthew Effect in Science](scientific-discovery-metascience/merton-1968-matthew-effect.md) | Scientific discovery and metascience | 1968 | canon | verified |
| [Estimating the reproducibility of psychological science](scientific-discovery-metascience/open-science-collaboration-2015-reproducibility.md) | Scientific discovery and metascience | 2015 | canon | verified |
| [OpenAlex: A fully-open index of scholarly works, authors, venues, institutions, and concepts](scientific-discovery-metascience/priem-piwowar-orr-2022-openalex.md) | Scientific discovery and metascience | 2022 | candidate | verified |
| [Mathematical discoveries from program search with large language models](scientific-discovery-metascience/romera-paredes-et-al-2024-funsearch.md) | Scientific discovery and metascience | 2024 | canon | verified |
| [Fish Oil, Raynaud's Syndrome, and Undiscovered Public Knowledge](scientific-discovery-metascience/swanson-1986-undiscovered-public-knowledge.md) | Scientific discovery and metascience | 1986 | canon | verified |
| [Large teams develop and small teams disrupt science and technology](scientific-discovery-metascience/wu-wang-evans-2019-large-small-teams.md) | Scientific discovery and metascience | 2019 | canon | verified |
| [Assessment of Course-Based Undergraduate Research Experiences: A Meeting Report](ai-and-researchers/auchincloss-et-al-2014-cure-assessment.md) | AI and researchers | 2014 | canon | verified |
| [Understanding Scientific Understanding](ai-and-researchers/de-regt-2017-understanding-scientific-understanding.md) | AI and researchers | 2017 | canon | verified |
| [The Automation of Science](ai-and-researchers/king-et-al-2009-automation-of-science.md) | AI and researchers | 2009 | canon | verified |
| [On scientific understanding with artificial intelligence](ai-and-researchers/krenn-et-al-2022-scientific-understanding-with-ai.md) | AI and researchers | 2022 | canon | verified |
| [Predicting research trends with semantic and neural networks with an application in quantum physics](ai-and-researchers/krenn-zeilinger-2020-predicting-research-trends.md) | AI and researchers | 2020 | canon | verified |
| [Toward systematic review automation: a practical guide to using machine learning tools in research synthesis](ai-and-researchers/marshall-wallace-2019-systematic-review-automation.md) | AI and researchers | 2019 | canon | verified |
| [Can LLMs Generate Novel Research Ideas? A Large-Scale Human Study with 100+ NLP Researchers](ai-and-researchers/si-yang-hashimoto-2024-llm-novel-research-ideas.md) | AI and researchers | 2024 | candidate | verified |
| [ChatGPT listed as author on research papers: many scientists disapprove](ai-and-researchers/stokel-walker-2023-chatgpt-listed-as-author.md) | AI and researchers | 2023 | candidate | verified |
| [Scientific discovery in the age of artificial intelligence](ai-and-researchers/wang-et-al-2023-scientific-discovery-age-of-ai.md) | AI and researchers | 2023 | canon | verified |

45 papers: 13 educational methods, 12 HCI and human-AI collaboration, 11 scientific discovery and
metascience, 9 AI and researchers. Every DOI listed above was checked at intake time; none are
placeholders.
