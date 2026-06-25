# AI and the Future of Education

### How artificial intelligence is changing education — and how education may need to change in the age of AI

> **A note on stance.** This document is deliberately *neutral*. It maps a fast-moving and
> genuinely contested field, not a program for any one route through it. The serious expert
> positions catalogued below flatly contradict one another. Some hold that AI tutors will at last
> democratize the kind of one-to-one mastery that has always been the privilege of the rich
> (the **techno-optimist** view). Some hold that AI mostly automates the *appearance* of learning
> while quietly eroding the cognitive work that produces the real thing (the **skeptic** view).
> Some hold that the AI shock is less a new problem than a flashlight: it has exposed that much of
> what schools assessed and credentialed was testing the wrong things all along (the
> **structuralist** view). Where a view is contested, the aim is to state it in its *strongest*
> form before placing it beside its rivals. The reader will not find a verdict. The honest
> conclusion is that the evidence is early, mixed, and often funded or framed by interested
> parties, and that distinguishing **hype from evidence from genuine unknown** is the single most
> important discipline in the subject. This document tries to keep those three categories visibly
> separate.

---

## 0. The rupture and its timeline

The proximate event is precise. OpenAI released **ChatGPT on 30 November 2022**. Within months a
free, conversational system could produce a passable five-paragraph essay, solve routine homework,
summarize any reading, and write working code — the exact outputs that a century of mass schooling
had used to *measure* learning. The disruption was not that AI could think (it cannot, in any
ordinary sense) but that it could cheaply manufacture the **artifacts by which thinking had been
graded**. Everything downstream — the cheating panic, the detector arms race, the return of the
blue book, the tutoring gold rush, the deskilling worry — flows from that one mismatch between what
machines can now produce and what schools were built to assess.

It is worth naming the speed, because it conditions everything else. Adoption among students has
been among the fastest of any technology ever measured. The UK's **Higher Education Policy
Institute (HEPI)** found in its 2025 survey (n≈1,041 undergraduates) that **92% of students now use
AI in some form, up from 66% a year earlier, and 88% use it for assessments, up from 53%**
([HEPI, *Student Generative AI Survey 2025*](https://www.hepi.ac.uk/reports/student-generative-ai-survey-2025/);
[University World News](https://www.universityworldnews.com/post.php?story=20250228175423255)). In
the United States, **Pew Research** found that the share of teens using ChatGPT *for schoolwork*
doubled in a single year — from 13% in 2023 to 26% in 2024 — and that by a Fall 2025 survey **54% of
teens reported using a chatbot for help with schoolwork**
([Pew, Jan 2025](https://www.pewresearch.org/short-reads/2025/01/15/about-a-quarter-of-us-teens-have-used-chatgpt-for-schoolwork-double-the-share-in-2023/);
[Pew, Feb 2026](https://www.pewresearch.org/internet/2026/02/24/how-teens-use-and-view-ai/)). No
school system chose this; it arrived faster than any policy cycle could respond.

Two cautions about the numbers themselves. First, "use AI" is a slippery category — it spans
asking for a concept explained, summarizing a reading, brainstorming, drafting, and wholesale
ghost-writing, and surveys rarely separate these. Pew's own data show teens *distinguish* sharply:
54% think using ChatGPT for research is acceptable, but only 18% think using it to write an essay
is ([Pew, Jan 2025](https://www.pewresearch.org/short-reads/2025/01/15/about-a-quarter-of-us-teens-have-used-chatgpt-for-schoolwork-double-the-share-in-2023/)).
Second, self-report on a behavior teachers frown upon is unreliable in both directions. The
headline "92%" should be read as "near-universal exposure," not "near-universal cheating."

---

## 1. The assessment rupture: cheating, detection, and the swing back to the room

### 1.1 The take-home crisis

The take-home essay, the problem set done at home, the overnight lab write-up — the dominant
assessment forms of the late twentieth century — share an assumption that quietly collapsed in
2022: that the student is the only intelligence in the room at 11 p.m. Once a free tool can produce
a B-grade essay in thirty seconds, the take-home essay no longer reliably measures the student. It
measures the student's *access to, and willingness to use,* a machine. Whether that constitutes
"cheating" depends on a course's rules, which in 2023 mostly did not exist yet.

The institutional reaction was first denial, then detection, then — increasingly — a retreat to
supervised conditions. Survey data confirm the perception of a real shift: **59% of higher-education
leaders believe cheating has increased since generative AI became widely available, with 21% saying
it increased "a lot"**
([KQED MindShift, 2025](https://www.kqed.org/mindshift/64992/taking-exams-in-blue-books-its-back-to-help-curb-ai-use-and-rampant-cheating/)).
It is important to hold this honestly: *perception* of more cheating is not the same as *measured*
more cheating, and some pre-AI baseline of academic dishonesty was already very high. What changed
unambiguously is that the marginal cost and effort of producing a convincing fake fell to near zero.

### 1.2 Why detection does not reliably work — and harms equity when it is trusted

The first reflex was technological: if AI can write it, AI can catch it. This has largely failed,
and the failure is instructive.

- **Detectors are unreliable at the level that matters.** AI-text detectors output a probability,
  but the consequences (an academic-integrity charge) are binary and severe. The combination is
  dangerous because even a low false-positive rate, applied across millions of submissions,
  guarantees large absolute numbers of wrongly accused students.
- **They are systematically biased against non-native English speakers.** A 2023 Stanford study
  (Liang, Zou, et al., published in *Patterns*) found that **detectors flagged over 61% of TOEFL
  essays written by non-native English speakers as AI-generated, and 97.8% were flagged by at least
  one detector**, because the detectors keyed on low lexical variety and predictable word choice —
  features of competent second-language writing
  ([Business & Human Rights summary](https://www.business-humanrights.org/en/latest-news/stanford-study-finds-ai-detection-tools-to-be-biased-against-international-students/)).
- **Neurodivergent students are also disproportionately flagged**, for similar reasons —
  repetition and constrained vocabulary patterns associated with autism, ADHD, or dyslexia
  ([University of San Diego LRC guide](https://lawlibguides.sandiego.edu/c.php?g=1443311&p=10721367)).
- **Major institutions have responded by switching detection off.** Vanderbilt, Yale, Johns
  Hopkins, Northwestern and others disabled Turnitin's AI detector, citing accuracy and bias
  ([Business & Human Rights](https://www.business-humanrights.org/en/latest-news/stanford-study-finds-ai-detection-tools-to-be-biased-against-international-students/)).
  An influential academic argument, "Contra generative AI detection in higher education
  assessments" ([arXiv:2312.05241](https://arxiv.org/pdf/2312.05241)), holds that detection is not
  merely imperfect but structurally untenable, since paraphrasing tools defeat detectors while the
  innocent bear the false positives.

The vendor-marketing claim that any detector is "99% accurate" should be treated as hype until
independently replicated on adversarial, paraphrased, and ESL text; the published independent
evidence points the other way.

### 1.3 The swing back to the room

With detection discredited, the most concrete institutional response has been to move assessment
back into supervised, low-tech conditions — what some call **"securing"** rather than
"AI-proofing" assessment. The most visible symbol is the **return of the blue book**: handwritten,
in-class exams. Blue-book sales rose **roughly 50% at the University of Florida and 80% at UC
Berkeley** over recent years, with Texas A&M reporting similar surges
([Fox News](https://www.foxnews.com/tech/schools-turn-handwritten-exams-ai-cheating-surges);
[KQED](https://www.kqed.org/mindshift/64992/taking-exams-in-blue-books-its-back-to-help-curb-ai-use-and-rampant-cheating/)).
Oral examinations ("vivas"), once confined to doctoral defenses and some European systems, are
being revived for undergraduates as a way to test understanding that a chatbot cannot sit
([Tandfonline, *Resilient assessment in the age of AI*](https://www.tandfonline.com/doi/full/10.1080/02602938.2026.2644516)).

The trade-offs of the swing-back are real and pull against equity gains made over decades.
Timed handwritten exams disadvantage students with disabilities, slow handwriters, anxious
test-takers, and — again — non-native speakers; many current undergraduates have **never written
anything longer than a paragraph by hand** ([Daily Cardinal](https://www.dailycardinal.com/article/2025/11/blue-books-are-back-the-revival-of-pen-and-paper-exams)).
A century of assessment research moved *away* from one-shot timed recall toward authentic,
process-based, multi-draft work precisely because the latter better predicts real capability. "Lock
it back in a proctored room" protects integrity at the cost of validity — it may once again measure
performance-under-pressure rather than learning. This is the central tension of section 6's policy
spectrum, surfacing first here.

A skeptical note on "AI-resistant assignments." A cottage industry now sells prompts and task
designs claimed to be immune to AI — "ask students to reflect on a personal experience," "require
in-class data," "make them critique the AI's output." Some of these genuinely raise the cost of
cheating. But, as one widely-shared critique put it, much of this is **"lies we tell ourselves":**
most assignments that can be done by a human at a desk can be done by a human at a desk *with* an
AI, and frontier models increasingly handle personal-reflection and source-critique tasks too
([Larsen, Medium](https://meganworkmonlarsen.medium.com/how-to-ai-proof-your-assessments-and-other-lies-we-tell-ourselves-bba39db704ec)).
The honest position is that there is no fully AI-proof unsupervised assessment, only supervised
assessment and assessment redesigned so that AI *use* is part of what's being evaluated.

---

## 2. The tutoring and personalization promise — graded honestly

### 2.1 The 2-sigma hope

The optimistic case has a precise intellectual anchor. In 1984, Benjamin Bloom published the
**"2 sigma problem":** students given one-to-one mastery tutoring performed about **two standard
deviations** better than students in conventional classrooms — i.e., the average tutored student
beat 98% of the conventionally-taught ([Wikipedia, *Bloom's 2 sigma problem*](https://en.wikipedia.org/wiki/Bloom%27s_2_sigma_problem)).
The "problem" was economic: society cannot afford a human tutor per child. The techno-optimist
thesis is that a competent AI tutor finally makes one-to-one instruction free and infinitely
scalable, collapsing the cost side of Bloom's equation. If even *part* of the 2-sigma effect
survives, the upside for global learning is enormous.

### 2.2 What the effect-size evidence actually says

The honest grading starts by deflating the 2-sigma figure itself. Bloom's result rested on **two
small dissertation studies** (Anania 1981; Burke 1980), and later, larger meta-analyses found human
tutoring effects closer to **0.4 SD** (Cohen, Kulik & Kulik 1982 found ~0.33 SD), and mastery
learning alone around 0.5 SD ([Education Next, *Two-Sigma Tutoring: Separating Science Fiction from
Science Fact*](https://www.educationnext.org/two-sigma-tutoring-separating-science-fiction-from-science-fact/)).
Two sigma was likely a ceiling produced by ideal conditions, not a reliable expectation. For
*Intelligent Tutoring Systems* (the pre-LLM software lineage), the best meta-analysis (Kulik &
Fletcher 2016, *Review of Educational Research*) found a **median effect of ~0.66 SD** across 50
evaluations, with Carnegie Learning's Cognitive Tutor landing around **0.4 SD** in algebra and
geometry ([Kulik & Fletcher, *RER*](https://journals.sagepub.com/doi/10.3102/0034654315581420)).
So even before LLMs, "personalized tutoring software" was a solid 0.4–0.7 SD intervention — real
and valuable, but not magic, and well short of 2 sigma.

### 2.3 The generative-AI tutoring evidence (2024–2026): early, promising, contested

The genuinely new evidence concerns LLM-based tutors. The most-cited result is a **World Bank
randomized controlled trial in Edo State, Nigeria** (Benin City, nine public schools, six weeks of
after-school sessions using Microsoft Copilot/GPT-4 for English). The headline, widely repeated, was
that students achieved learning gains "that typically take two years." The underlying number is
more modest and more useful: **0.31 SD on the combined assessment (0.23 SD on English specifically)**,
which the authors note outperformed about **80% of comparable RCTs** in the developing world, with
**female students gaining more** ([World Bank blog, *Edo State Nigeria*](https://blogs.worldbank.org/en/developmenttalk/addressing-the-learning-crisis-with-generative-ai--lessons-from-);
[ICTworks](https://www.ictworks.org/genai-advance-learning-outcomes/)). A separate study in **Ghana**
on an AI math tutor likewise found positive achievement effects
([arXiv:2402.09809](https://arxiv.org/pdf/2402.09809)).

How to grade this honestly:
- **It is real and meaningful** — a 0.31 SD effect from a cheap, six-week add-on is a strong
  result by the standards of education RCTs, where most interventions show much less.
- **It is not "two years in six weeks" in any rigorous sense.** That framing converts a one-time
  effect size into a grade-equivalent extrapolation, which is the kind of translation that inflates.
- **Key caveats:** short duration (six weeks; no evidence yet on persistence or fade-out), an
  *after-school, teacher-facilitated* design (not a child alone with a chatbot), a specific subject
  (English in an English-medium curriculum), and a single context. Generalization is unproven.

On the vendor side, **Khan Academy's Khanmigo** (GPT-4-based) grew from ~68,000 users in 2023–24 to
**over 700,000 in 2024–25** ([Khan Academy annual report](https://2023-2024.annualreport.khanacademy.org/khanmigo)).
But the rigorous outcome evidence Khan Academy publishes is overwhelmingly about the **broader Khan
Academy platform**, not Khanmigo specifically: e.g., an India RCT (~5,500 students, 74 schools)
found **0.44–0.47 SD** gains where usage was high, and US studies show ~20% higher-than-expected
gains at 30+ minutes/week ([Khan Academy efficacy blog, Nov 2024](https://blog.khanacademy.org/khan-academy-efficacy-results-november-2024/)).
Khan Academy itself states that **Khanmigo-specific efficacy studies are still underway**
([Khan Academy blog](https://blog.khanacademy.org/how-khan-academy-is-building-a-better-ai-tutor-our-most-recent-learnings/)).
This is the single most common confusion in the field: **strong platform evidence is being
borrowed to vouch for AI-tutor features whose own evidence is not yet in.** A recent exploratory
RCT of AI tutoring in UK classrooms reported it "can safely and effectively support students"
([arXiv:2512.23633](https://arxiv.org/pdf/2512.23633)), but described itself as exploratory.

**Bottom line for section 2:** The personalization promise is plausible and has genuine early
support, especially in under-resourced settings where the counterfactual is *no* tutoring. It is
not yet established that an AI tutor delivers Bloom-scale gains, persists over time, or works when a
child uses it unsupervised rather than inside a structured program. The correct posture is
"promising, under-evidenced, watch the durable RCTs," not "solved."

---

## 3. What AI can and cannot (yet) do for learning

A neutral ledger, separating capability from limitation.

**What current systems do well (capabilities):**
- **Content generation and reformatting** — explanations at multiple levels, practice problems,
  worked examples, rephrasings, quizzes, lesson-plan scaffolding. The most-reported student uses in
  HEPI are exactly these: explaining concepts, summarizing articles, suggesting research ideas
  ([HEPI 2025](https://www.hepi.ac.uk/reports/student-generative-ai-survey-2025/)).
- **On-demand, patient, judgment-free feedback** — available at 2 a.m., infinitely repeatable, never
  visibly exasperated. For many learners the *affective* difference (no fear of looking stupid) is as
  important as the content.
- **Access and translation** — instant translation, reading-level adjustment, text-to-speech, and
  accommodation support that can lower barriers for second-language learners and students with
  disabilities. This is the strongest equity-positive case (section 5).

**What current systems do poorly or cannot do (limitations):**
- **Reliability / hallucination.** LLMs fluently assert false things — wrong citations, invented
  facts, plausible-but-wrong derivations. A confident wrong tutor is more dangerous than an
  obviously incompetent one, because novices cannot detect the error (the very thing they lack is
  the knowledge to catch it). This interacts badly with the deskilling worry below.
- **Motivation and relationship.** A large part of what teachers do is not information transfer but
  motivation, accountability, belonging, and the modeling of a curious adult mind. Whether a chatbot
  can sustain the *relational* drivers of learning over months is unknown; engagement-spike data
  from pilots may not survive novelty wearing off.
- **It does not, by itself, ensure that the learner does the cognitive work.** This is the crux.

### 3.1 The cognitive-offloading / deskilling research

The skeptic's strongest empirical card. The worry is that AI lets learners offload precisely the
effortful thinking that *is* the learning — and that the skill being taught is eroded by the tool
meant to teach it.

- **Gerlich (2025), *Societies*** — a survey-and-interview study (n≈666) found a **strong negative
  correlation between frequent AI-tool use and critical-thinking scores** (Halpern assessment),
  mediated by cognitive offloading, strongest among younger users
  ([SSRN](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=5082524)). Crucially it is
  **correlational** — it cannot show AI *causes* lower critical thinking rather than weaker critical
  thinkers leaning on AI more. Notably, **higher education appeared protective**: degree-holders
  questioned AI output more and fact-checked more.
- **"Metacognitive laziness."** Research on AI in learning describes self-regulation processes —
  orientation, monitoring, evaluation — being quietly displaced when AI handles revision, so
  learners disengage from the metacognition that drives durable learning
  ([arXiv:2512.12306](https://arxiv.org/pdf/2512.12306)).
- **MIT Media Lab, "Your Brain on ChatGPT" (Kosmyna et al., 2025).** An EEG study (n=54) of essay
  writing across LLM / search-engine / brain-only conditions found LLM users showed the **weakest
  brain connectivity, lowest sense of essay ownership, and the most trouble quoting their own just-
  written work** — coining "cognitive debt" ([MIT Media Lab](https://www.media.mit.edu/publications/your-brain-on-chatgpt/);
  [arXiv:2506.08872](https://arxiv.org/abs/2506.08872)). This study went viral and is frequently
  over-read. It is **small-n, not peer-reviewed at release, and has drawn a formal critique** of its
  EEG methodology and reproducibility ([arXiv:2601.00856](https://arxiv.org/abs/2601.00856)). It is
  suggestive, not dispositive.

The honest synthesis: there is converging *early* evidence — across correlational, qualitative, and
small neuro studies — that **offloading the productive struggle can suppress the learning it was
meant to support.** None of it is yet strong enough to be called settled, and almost all of it has
methodological limits. What it does is shift the burden of proof: "AI helps learning" cannot be
assumed; it depends entirely on whether the design forces the learner to do the thinking or lets
them skip it.

---

## 4. The skills question: if AI can write, code, and summarize, what should humans learn?

If machines now do the canonical outputs of education, what is left to teach? The serious answers
genuinely conflict.

**Position A — Foundational knowledge matters *more*, not less (the cognitive-science camp).**
Daniel Willingham's long-standing finding is that **critical thinking is not a content-free skill;
it is domain knowledge in action.** You cannot evaluate, critique, or even prompt well in a field you
do not understand, because knowledge in long-term memory is what frees working memory to reason and
"acts as a ready supply of things you've already thought about"
([Willingham, *AFT American Educator*](https://www.aft.org/ae/spring2006/willingham);
[Willingham brief, Knowledge Matters](https://knowledgematters.org/wp-content/uploads/2016/05/Willingham-brief.pdf)).
On this view, the deskilling research is exactly what theory predicts: outsource the knowledge-
building and you lose the substrate that judgment runs on. Worse, knowledge gaps are where AI
hallucination is most dangerous — only someone who already knows the field can catch the confident
error. Implication: schools should double down on building durable, well-organized background
knowledge, *especially* now.

**Position B — Shift the center of gravity to judgment, taste, and AI-orchestration (the
"co-intelligence" camp).** Ethan Mollick argues that pretending AI doesn't exist is untenable;
educators should integrate it and raise ambition. His own courses now *require* AI use and push
students toward tasks "ambitious to the point of impossible," with the human role being to direct,
evaluate, and improve AI output rather than to produce the first draft
([Stanford GSB, *Co-Intelligence*](https://www.gsb.stanford.edu/insights/co-intelligence-ai-masterclass-ethan-mollick/);
[AI Literacy Institute review](https://ailiteracy.institute/review-of-ethan-mollicks-co-intelligence-living-and-working-with-ai/)).
On this view the durable skills are prompting, critical evaluation of machine output, synthesis,
and the "taste" to tell good from bad — skills of orchestration in a world of cheap generation.
(Note the tension Mollick himself acknowledges: AI is "a personalized tutor" in potential but
"cannot replace human teachers" today.)

**Position C — "Learning to learn" / metacognition is the durable core.** A third camp argues that
specific content and even specific tools will churn, so the stable target is self-regulated
learning: knowing how to set goals, monitor understanding, and persist. The cruel irony, as the
metacognitive-laziness research shows, is that the very tool meant to support this may be the thing
that atrophies it if used as a shortcut.

**Position D — "Don't outsource the struggle" (the productive-difficulty camp).** Drawing on
desirable-difficulties research, this view holds that learning requires effortful retrieval and
generation, and that the danger of AI is *fluency without effort* — the work feels done, but no
learning occurred. The prescription is not to ban AI but to **protect the moments of struggle** that
build skill, and to relocate AI to before-and-after the struggle (brainstorming, feedback) rather
than inside it (doing the work).

**The institutional middle.** Both **UNESCO** and the **OECD** land on a "human-centred,"
competence-plus-AI-literacy framing: keep building human capabilities, *add* AI literacy and ethical
judgment, and don't let tool fluency substitute for understanding
([UNESCO guidance](https://www.unesco.org/en/articles/guidance-generative-ai-education-and-research);
[OECD Digital Education Outlook 2023](https://www.oecd.org/en/publications/oecd-digital-education-outlook-2023_c74f03de-en/full-report/opportunities-guidelines-and-guardrails-for-effective-and-equitable-use-of-ai-in-education_2f0862dc.html)).
These positions are not all mutually exclusive — most educators blend A through D — but they
prioritize different things, and a curriculum cannot maximize all of them at once. That is the real
disagreement.

---

## 5. Equity: leveler or divider?

The equity question splits cleanly into two strong, opposed cases — and the likely truth is "both,
depending on conditions."

**The leveler case (AI narrows gaps).** The most compelling argument for AI as an equalizer is that
a free, competent tutor is a luxury good made universal. The wealthy have always bought
one-to-one tutoring, test prep, and editing help; an AI tutor offers a version of that to everyone
with a device. The Nigeria RCT is the strongest data point — gains accrued to *all* participants,
not just top students, and **girls (a structurally disadvantaged group in that context) gained
more** ([World Bank](https://blogs.worldbank.org/en/developmenttalk/addressing-the-learning-crisis-with-generative-ai--lessons-from-)).
Translation, reading-level adjustment, and accessibility features (section 3) are real, concrete
levelers for second-language learners and students with disabilities.

**The divider case (AI widens gaps).** The OECD's analysis is blunt: schools with high shares of
socio-economically disadvantaged students **already report worse digital resources**, so layering
AI on top risks compounding the existing **digital divide** rather than closing it
([OECD, *Potential Impact of AI on Equity and Inclusion*](https://www.oecd.org/content/dam/oecd/en/publications/reports/2024/08/the-potential-impact-of-artificial-intelligence-on-equity-and-inclusion-in-education_0d7e9e00/15df715b-en.pdf)).
HEPI found the divide is not only about access but *uptake*: **male, STEM/health, and more advantaged
students use AI more** ([HEPI 2025](https://www.hepi.ac.uk/reports/student-generative-ai-survey-2025/)).
There are at least four distinct gaps: an **access gap** (devices, connectivity, paid frontier
models vs. free weaker ones), a **usage-knowledge gap** (advantaged students get better coaching on
how to use AI well), an **algorithmic-bias gap** (systems trained on biased data and detectors that
penalize ESL and neurodivergent students — section 1.2), and a **substitution gap** (under-resourced
schools may use AI to *replace* teachers while well-resourced schools use it to *augment* them, the
worst-case two-tier outcome).

The Pew finding that **Black and Hispanic US teens use ChatGPT for schoolwork at higher rates than
White teens (31% vs 22%)** complicates the simple "rich kids get the tool" story
([Pew, Jan 2025](https://www.pewresearch.org/short-reads/2025/01/15/about-a-quarter-of-us-teens-have-used-chatgpt-for-schoolwork-double-the-share-in-2023/)).
The neutral conclusion: AI is **equity-ambivalent**. It is a free tutor *and* a new axis of
advantage; which dominates is a policy choice about access, teacher support, and whether AI augments
or replaces human instruction — not a property of the technology.

---

## 6. Policy, the teacher's changing role, and the spectrum of "how education must change"

### 6.1 The policy field and its reversals

The early policy story is one of fast bans and faster reversals. **New York City public schools
banned ChatGPT on school devices in January 2023, then reversed the ban in May 2023**, with the
chancellor saying the district had moved from fear to looking for "guardrails"
([Chalkbeat](https://www.chalkbeat.org/newyork/2023/1/3/23537987/nyc-schools-ban-chatgpt-writing-artificial-intelligence/);
[District Administration](https://districtadministration.com/briefing/why-new-york-city-public-schools-reversed-its-ban-on-chatgpt/)).
That arc — ban, then realize bans are unenforceable on personal devices and may widen inequity
between schools that integrate and schools that prohibit — has repeated widely.

The most influential international frame is **UNESCO's *Guidance for Generative AI in Education and
Research* (September 2023)**, the first global guidance of its kind. It is explicitly
**human-centred**, calls on governments to **regulate quickly** (data-privacy standards, ethical
validation, teacher training), and notably **recommends a minimum age of 13 for independent use of
GenAI in the classroom**, while noting the EU's GDPR threshold of 16
([UNESCO](https://www.unesco.org/en/articles/guidance-generative-ai-education-and-research);
[UN News](https://news.un.org/en/story/2023/09/1140477);
[Washington Examiner on the age-13 recommendation](https://www.washingtonexaminer.com/news/2431826/unesco-recommends-age-limit-of-13-for-classroom-artificial-intelligence-use/)).
The OECD's parallel work stresses guardrails for **effective and equitable** use and warns about the
digital divide ([OECD Digital Education Outlook 2023](https://www.oecd.org/en/publications/oecd-digital-education-outlook-2023_c74f03de-en/full-report/opportunities-guidelines-and-guardrails-for-effective-and-equitable-use-of-ai-in-education_2f0862dc.html)).

### 6.2 The teacher's changing role

Across nearly all camps, one prediction recurs: the teacher's role shifts from **information
deliverer** toward **designer, coach, and verifier** — designing the experiences AI cannot fake,
coaching judgment and metacognition, and authenticating that learning happened. HEPI's finding that
the share of students who see staff as "well-equipped" to work with AI **jumped from 18% to 42% in a
year** suggests rapid (if incomplete) teacher adaptation
([HEPI 2025](https://www.hepi.ac.uk/reports/student-generative-ai-survey-2025/)). The unresolved
risk is the opposite trajectory: AI used to *deskill or replace* teachers in under-resourced
systems, which most experts regard as the failure mode to avoid.

### 6.3 The structuralist reframing: AI as a flashlight, not just a problem

A distinct and important position holds that AI did not *create* education's problems so much as
*reveal* them. If a chatbot can ace your essay prompt, the prompt may have been testing formulaic
output rather than thinking all along; if a credential can be earned by AI-assisted work, the
credential may have been certifying compliance rather than competence. On this reading, the AI shock
is an opportunity to fix what was already broken: move from **"did you produce the artifact?"** to
**"can you demonstrate understanding?"** — via authentic, process-based, portfolio, and verbal
assessment that mirrors real-world tasks
([Times Higher Education, *evolution of authentic assessment*](https://www.timeshighereducation.com/campus/evolution-authentic-assessment-higher-education);
[ASCCC](https://www.asccc.org/content/ai-powered-education-authentic-assessments-and-learning)).
The structuralist is neither optimist nor pessimist about AI itself; the claim is that the
*assessment and credentialing system* was always the weak point, and AI merely forced the issue.

### 6.4 The spectrum of "how education must change"

There is no single proposal, but the serious ones can be arrayed from minimal to maximal
intervention. Each buys its strengths with characteristic costs.

**1. Minimal — Restrict and protect (the containment position).**
*Do:* ban or restrict AI for core assessed work; move high-stakes assessment back to supervised,
low-tech conditions (blue books, oral exams, proctored settings); keep teaching largely as-is.
*Strength:* directly protects assessment integrity; cheap; no curriculum overhaul.
*Cost:* unenforceable on personal devices; reintroduces the validity and equity problems timed
exams were designed away from (section 1.3); fails to prepare students for an AI-saturated world;
can widen the gap between prohibiting and integrating institutions.

**2. Modest — Disclose and integrate-at-the-margins.**
*Do:* permit AI with disclosure and clear per-assignment rules ("AI allowed for brainstorming, not
drafting"); add AI-literacy units; redesign *some* assignments to be more authentic.
*Strength:* honest about near-universal use; teaches judgment; preserves most of the existing system.
*Cost:* disclosure rules are hard to verify and unevenly followed; "AI-resistant assignments" are
partly illusory (section 1.3); risks incoherence across instructors.

**3. Substantial — Rebuild assessment around demonstrated understanding (the structuralist
program).**
*Do:* shift the assessment center of gravity to portfolios, vivas, in-class performance, and
authentic real-world tasks; grade the *process and the thinking*, not just the artifact; treat AI as
an allowed tool whose use is itself assessed.
*Strength:* attacks the actual root cause; arguably improves validity regardless of AI; aligns
assessment with real competence.
*Cost:* labor-intensive and hard to scale and standardize; oral and portfolio assessment carry their
own equity and reliability concerns; expensive in teacher time — the resource AI was supposed to save.

**4. Maximal — Rebuild teaching around AI tutors plus new assessment (the transformation position).**
*Do:* put a personalized AI tutor at the center of practice and feedback (the Bloom-2-sigma bet),
flip the teacher into a coach/designer, and pair this with continuous, AI-aware, demonstrated-mastery
assessment.
*Strength:* if the tutoring evidence holds and scales, the largest potential upside, especially for
under-resourced and developing-world settings (the Nigeria signal).
*Cost:* the strongest evidence (section 2) is still early, short-term, and often facilitated rather
than solo; bets heavily on tools that hallucinate (section 3); risks deskilling if it lets learners
skip the struggle (section 3.1); maximal exposure to the equity/digital-divide downside (section 5)
and to the replace-rather-than-augment failure mode.

A neutral reading is that real systems will not pick one but blend them — likely **#1 for high-stakes
certification** (you cannot fake a proctored demonstration), **#2–#3 for everyday coursework**, and
**#4 selectively where the tutoring evidence is strongest and human instruction is scarcest.** The
disagreement among serious people is about the *mix and the speed*, and that disagreement is
rational given how thin and contested the evidence still is.

---

## 7. What is hype, what is evidence, what is unknown

A deliberately blunt ledger, since separating these is the whole task.

**Closest to established evidence:**
- Student AI use is near-universal and rose extraordinarily fast (HEPI 92%/88%; Pew teen doubling).
- AI-text detectors are unreliable and biased against non-native speakers and neurodivergent
  students; major universities have disabled them (Stanford/*Patterns*; institutional actions).
- Pre-LLM intelligent tutoring systems produce real, moderate gains (~0.4–0.7 SD).
- The digital divide in access and uptake is real and documented (OECD; HEPI).

**Promising but early / contested:**
- LLM tutors can produce meaningful gains (Nigeria 0.31 SD; Ghana) — but short-term,
  often facilitated, single-context, persistence unknown.
- Cognitive offloading may suppress learning and critical thinking (Gerlich; MIT "cognitive
  debt") — but correlational and/or small-n, with formal methodological critiques.

**Hype / unsupported as usually stated:**
- "AI delivers two years of learning in six weeks" as a general claim (it is an extrapolated single
  effect size from one short study).
- "Khanmigo is proven to raise outcomes" (platform evidence is being borrowed; Khanmigo-specific
  studies are still underway, per Khan Academy).
- Any detector marketed as "99% accurate."
- "AI-proof assignments" as a general solution.

**Genuinely unknown:**
- Whether AI tutoring gains persist and compound over years, or fade.
- Whether a chatbot can sustain the *motivational and relational* drivers of learning at scale.
- The long-run cognitive effect on a generation that learns *with* AI from the start — the deskilling
  studies test adults retrofitting AI, not children raised on it.
- Whether AI nets out as leveler or divider — this appears to be a policy outcome, not a fixed
  property of the technology.

The most defensible overall stance is not optimism or pessimism but **conditional**: the same tool,
under different designs and policies, plausibly produces opposite outcomes, and the evidence base is
still too thin to license confident prediction in either direction.

---

## Sources

- HEPI, *Student Generative AI Survey 2025* — https://www.hepi.ac.uk/reports/student-generative-ai-survey-2025/ ; coverage: https://www.universityworldnews.com/post.php?story=20250228175423255
- Pew Research Center, *Share of teens using ChatGPT for schoolwork doubled* (Jan 2025) — https://www.pewresearch.org/short-reads/2025/01/15/about-a-quarter-of-us-teens-have-used-chatgpt-for-schoolwork-double-the-share-in-2023/ ; *How Teens Use and View AI* (Feb 2026) — https://www.pewresearch.org/internet/2026/02/24/how-teens-use-and-view-ai/
- Liang, Zou et al. (Stanford, *Patterns* 2023), detector bias against non-native speakers — https://www.business-humanrights.org/en/latest-news/stanford-study-finds-ai-detection-tools-to-be-biased-against-international-students/
- "Contra generative AI detection in higher education assessments" — https://arxiv.org/pdf/2312.05241
- USD Legal Research Center, AI detectors / false positives — https://lawlibguides.sandiego.edu/c.php?g=1443311&p=10721367
- Return of blue books — Fox News https://www.foxnews.com/tech/schools-turn-handwritten-exams-ai-cheating-surges ; KQED https://www.kqed.org/mindshift/64992/taking-exams-in-blue-books-its-back-to-help-curb-ai-use-and-rampant-cheating/ ; Daily Cardinal https://www.dailycardinal.com/article/2025/11/blue-books-are-back-the-revival-of-pen-and-paper-exams
- Resilient assessment / verbal exams (Assessment & Evaluation in HE, 2026) — https://www.tandfonline.com/doi/full/10.1080/02602938.2026.2644516
- "How to AI-Proof Your Assessments and Other Lies We Tell Ourselves" — https://meganworkmonlarsen.medium.com/how-to-ai-proof-your-assessments-and-other-lies-we-tell-ourselves-bba39db704ec
- Bloom's 2 sigma problem — https://en.wikipedia.org/wiki/Bloom%27s_2_sigma_problem ; Education Next, *Two-Sigma Tutoring* — https://www.educationnext.org/two-sigma-tutoring-separating-science-fiction-from-science-fact/
- Kulik & Fletcher, *Effectiveness of Intelligent Tutoring Systems* (Review of Educational Research) — https://journals.sagepub.com/doi/10.3102/0034654315581420
- World Bank, Edo State Nigeria GenAI RCT — https://blogs.worldbank.org/en/developmenttalk/addressing-the-learning-crisis-with-generative-ai--lessons-from- ; ICTworks summary — https://www.ictworks.org/genai-advance-learning-outcomes/ ; Ghana AI math tutor — https://arxiv.org/pdf/2402.09809
- Khan Academy efficacy (Nov 2024) — https://blog.khanacademy.org/khan-academy-efficacy-results-november-2024/ ; Khanmigo annual report — https://2023-2024.annualreport.khanacademy.org/khanmigo ; building a better AI tutor — https://blog.khanacademy.org/how-khan-academy-is-building-a-better-ai-tutor-our-most-recent-learnings/ ; UK exploratory RCT — https://arxiv.org/pdf/2512.23633
- Gerlich (2025), *AI Tools in Society: Cognitive Offloading and Critical Thinking*, Societies — https://papers.ssrn.com/sol3/papers.cfm?abstract_id=5082524
- Metacognitive laziness (vocational education) — https://arxiv.org/pdf/2512.12306
- Kosmyna et al. (MIT Media Lab 2025), *Your Brain on ChatGPT* — https://www.media.mit.edu/publications/your-brain-on-chatgpt/ ; arXiv https://arxiv.org/abs/2506.08872 ; critique https://arxiv.org/abs/2601.00856
- Willingham on knowledge and critical thinking — https://www.aft.org/ae/spring2006/willingham ; https://knowledgematters.org/wp-content/uploads/2016/05/Willingham-brief.pdf
- Ethan Mollick, *Co-Intelligence* — Stanford GSB https://www.gsb.stanford.edu/insights/co-intelligence-ai-masterclass-ethan-mollick/ ; review https://ailiteracy.institute/review-of-ethan-mollicks-co-intelligence-living-and-working-with-ai/
- UNESCO, *Guidance for Generative AI in Education and Research* (2023) — https://www.unesco.org/en/articles/guidance-generative-ai-education-and-research ; UN News https://news.un.org/en/story/2023/09/1140477 ; age-13 recommendation https://www.washingtonexaminer.com/news/2431826/unesco-recommends-age-limit-of-13-for-classroom-artificial-intelligence-use/
- OECD, *Digital Education Outlook 2023* — https://www.oecd.org/en/publications/oecd-digital-education-outlook-2023_c74f03de-en/full-report/opportunities-guidelines-and-guardrails-for-effective-and-equitable-use-of-ai-in-education_2f0862dc.html ; *Potential Impact of AI on Equity and Inclusion* (2024) — https://www.oecd.org/content/dam/oecd/en/publications/reports/2024/08/the-potential-impact-of-artificial-intelligence-on-equity-and-inclusion-in-education_0d7e9e00/15df715b-en.pdf
- NYC ChatGPT ban and reversal — Chalkbeat https://www.chalkbeat.org/newyork/2023/1/3/23537987/nyc-schools-ban-chatgpt-writing-artificial-intelligence/ ; District Administration https://districtadministration.com/briefing/why-new-york-city-public-schools-reversed-its-ban-on-chatgpt/
- Authentic assessment — Times Higher Education https://www.timeshighereducation.com/campus/evolution-authentic-assessment-higher-education ; ASCCC https://www.asccc.org/content/ai-powered-education-authentic-assessments-and-learning
