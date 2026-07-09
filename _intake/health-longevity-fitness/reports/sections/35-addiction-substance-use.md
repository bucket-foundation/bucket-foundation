# 35 — Addiction & Substance Use

For opioids, the intuition everyone shares — get them clean, get them off everything — is the one
that kills. Abstinence-only detox without maintenance is associated with *worse* outcomes, because
detox lowers your tolerance while leaving the craving intact, so a relapse at the old dose is now
lethal. The unglamorous daily medication saves lives; the dramatic "rock bottom" abstinence
intuition has a measurable body count. That inversion — where the moralized answer is the dangerous
one — runs through this whole domain.

This section covers the disorder, dependence, and treatment of addiction. The dose-response harm of
alcohol and tobacco lives in §09; the reward-mechanism neuroscience lives in §14; psychiatric
comorbidity lives in §20. Two rules do a lot of work here. First, three honesty rules the manual
leans on throughout: a **predictor isn't automatically a lever** (something that forecasts risk isn't
automatically something that, changed, lowers it), a **cohort study isn't an RCT** (watching what
happens is weaker evidence than a randomized trial), and **something beats nothing**. Second, two
rules specific to this domain: physical **dependence** (tolerance + withdrawal) is **not addiction**
(compulsive use despite harm), and most people who use most drugs never become addicted, while most
who do eventually remit.

_Not medical advice._

> **A word on tone.** This is the section where the framing has a body count and a prison population
> attached. Call it pure moral weakness and you justify punishing sick people and you ignore that
> treatment works. Call it purely a chronic brain disease and you erase the people who walk away on their
> own, you contradict the data on remission, and you can rob someone of the agency that recovery actually
> runs on. The honest position is **neither** — §1.2 grades the more accurate third model. Grade it
> straight, hold the person's dignity and the person's agency at the same time, and say so plainly.

---

## 0. The map at a glance

_Skim the three columns — how addictive / how lethal / first-line treatment; these are order-of-magnitude,
see the note below the table._

| Substance / behaviour | Roughly how addictive (transition to dependence among ever-users) | Lethality of the addiction itself | First-line, best-evidenced treatment |
|---|---|---|---|
| **Tobacco / nicotine** | **Highest** (~68% of ever-users → dependence) | **The most lethal** — ~half of long-term smokers die of it; ~8M deaths/yr globally | Varenicline (or combination NRT) **+** behavioural support; cytisine where available |
| **Opioids** (heroin, fentanyl, Rx) | High (~23%) | **Acutely lethal** — respiratory depression; fentanyl drives mass overdose | **MOUD: methadone or buprenorphine** (halves mortality) + naloxone access |
| **Alcohol** | Moderate (~22%) | High over time (liver, cancer, CVD) **and** acute (withdrawal can kill) | Naltrexone or acamprosate **+** psychosocial; **never** abrupt unsupervised detox in heavy users |
| **Cocaine** | Moderate (~21%) | High (cardiac, stroke, overdose — now often fentanyl-laced) | **Behavioural — contingency management;** no approved medication works well |
| **Methamphetamine / amphetamine** | Moderate–high | High (cardiac, stroke, neurotoxic; overdose rising) | **Contingency management** (best evidence); no robust approved medication |
| **Cannabis** | Lower but **real** (~9%; higher with adolescent onset) | Low acute lethality; real disorder, CHS, psychosis risk in vulnerable | CBT / MET / contingency management; no approved medication |
| **Benzodiazepines** | Moderate (dependence develops readily) | Dangerous in **withdrawal** (seizures) and in **combination** (with opioids/alcohol) | **Slow taper**; never abrupt stop; treat underlying anxiety properly (Section 20) |
| **Caffeine** | Real dependence; "use disorder" contested | Negligible at normal doses | Usually none needed; taper if desired |
| **Psychedelics** (psilocybin, LSD) | **Very low** addiction potential | Low physiological lethality; psychological-risk in vulnerable | N/A for addiction; the *therapy* frontier is Section 20 §6.4 |
| **Gambling** | The established behavioural addiction | No direct toxicity; high suicide risk | CBT; naltrexone has a signal; Gamblers Anonymous (thin evidence) |

_Abbreviations in the table: **MOUD** = medications for opioid use disorder (methadone, buprenorphine);
**NRT** = nicotine replacement therapy (patch, gum, lozenge); **CM** = contingency management (concrete
rewards for verified abstinence); **MET** = motivational enhancement therapy; **CBT** = cognitive
behavioural therapy; **CHS** = cannabinoid hyperemesis syndrome. "Transition to dependence among
ever-users" = of everyone who ever tried the drug, the share who went on to become dependent._

Transition-to-dependence percentages are from **Lopez-Quintero et al., *Drug Alcohol Depend* 2011**,[^lopez]
a NESARC analysis of ~43,000 US adults. The two data sets diverge on nicotine — Lopez-Quintero puts the nicotine transition near 67.5% versus roughly a third in the earlier **Anthony, Warner & Kessler
(1994)** comparative-dependence estimates. One exception: NESARC did not cover heroin/opioids, so the
**~23% opioid** figure is the **Anthony 1994** estimate specifically, not Lopez-Quintero. They are **order-of-magnitude** figures meant to convey
*relative* addiction potential, not precision — and the headline they carry is honesty rule #2: **for every
drug here, most people who try it never become dependent.** That is not an argument for complacency; it is
the necessary correction to "one hit and you're hooked," which is true for almost no one and false as a
general model.


@@FIG:D09-addictiveness-lethality@@

---

## 1. What addiction actually is

### 1.1 The reward mechanism — real, and necessary but not sufficient

Every addictive drug, by very different routes, converges on one place: it raises dopamine signalling in
the **mesolimbic reward pathway** (ventral tegmental area → nucleus accumbens, with prefrontal and
amygdala loops). Stimulants do it directly (blocking dopamine reuptake or forcing its release); opioids,
nicotine, alcohol, and cannabis do it indirectly (disinhibiting dopamine neurons or acting on their own
receptor systems). This is well-replicated neuroscience — and it is covered as **mechanism** in
Section 14 §3, which is where it belongs. (Read 14 also for why "dopamine = pleasure" is itself a
simplification: dopamine encodes **prediction error and wanting** more than **liking** — Berridge's
incentive-salience distinction — which is exactly why deep addiction can feature intense craving *without*
much pleasure. The drug is "wanted" long after it stops being "liked.")

The honest, load-bearing point: **the dopamine mechanism is real but it is not, by itself, an explanation
of addiction.** Sugar, sex, exercise, music, and winning a bet all raise accumbens dopamine; none reliably
produces addiction. The dopamine story tells you what addictive drugs *have in common*, not why a
particular person becomes compulsively attached to one. Treating "it hijacks dopamine" as the whole answer
is honesty rule #1 in its most common failure mode — a `mechanism` claim doing `outcome`/`explanation`
work it has not earned.

### 1.2 The brain-disease model — and its honest critiques

The dominant framework, championed by **Nora Volkow** (director of NIDA) and Alan Leshner before her, is
the **brain disease model of addiction (BDMA)**: addiction is a chronic, relapsing brain disease in which
repeated drug exposure produces lasting changes in reward, motivation, learning, memory, and inhibitory
(prefrontal) circuits — so the addicted brain is in a measurably different state, and "just stop" badly
underestimates the problem. The canonical statement is **Volkow, Koob & McLellan, *NEJM* 2016**,[^volkow2016]
which lays out three stages — **binge/intoxication**, **withdrawal/negative affect**, and
**preoccupation/anticipation (craving)** — each mapped to circuit changes. `mechanistic`/`cohort` (biology
plus observational data, short of a randomized trial).


**What the BDMA gets right** (and why it deserves to be the default frame, not the strawman):
- The neuroadaptations are **real and measurable** — this is not a metaphor.
- It is **anti-stigma and pro-treatment**: reframing addiction as a medical condition (like diabetes or
  hypertension — chronic, relapsing, manageable, not curable-by-willpower) helped move people toward care
  and away from pure punishment, and it justifies funding treatment.
- It explains the **involuntariness people report** — the gap between sincere intention and behaviour that
  defines the lived experience of addiction.

**The honest critiques — which the corpus indexes as serious, not fringe:**
- **Gene Heyman**, in *Addiction: A Disorder of Choice* (Harvard University Press, 2009), marshals the
  **epidemiology of remission**: in large national surveys, the **majority of people who meet criteria for
  drug dependence remit**, most by their early thirties, and **most without any treatment** (the
  "maturing out" pattern, seen vividly in returning Vietnam veterans — see §3.3). A *chronic, progressive
  brain disease* should not have a natural-recovery curve that looks like this. Heyman's reframe:
  addiction is a **disorder of choice** — not "free, unconstrained choice," but choice as economists model
  it, distorted by the steep discounting of the future that drugs produce. Choices, unlike diseases,
  respond to **incentives and consequences** — which is exactly what the most effective behavioural
  treatment (contingency management, §7.2) exploits.
- **Carl Hart** (Columbia neuroscientist, *Drug Use for Grown-Ups*, 2021; *High Price*, 2013) pushes from a
  different angle: most drug use, even of "hard" drugs, is **non-addictive and non-pathological**, and the
  brain-disease frame, by foregrounding the dependent minority, **distorts public understanding** and
  **fuels prohibitionist policy** that does more harm than the drugs. His own lab work showed that
  crack/meth users, given a **choice between the drug and a modest alternative reward**, frequently chose
  the reward — behaviour incompatible with the "hijacked, choiceless brain" caricature. Hart's emphasis on
  **set, setting, and socioeconomic context** echoes Bruce Alexander's **"Rat Park"** experiments (late
  1970s): rats in enriched, social cages self-administered far less morphine than isolated caged rats —
  suggesting addiction is partly a response to **environmental impoverishment**, not just a pharmacological
  inevitability. (Rat Park is `animal`-tier and has replication caveats, but it durably reframed the
  question.)
- **The learning model** (Marc Lewis, *The Biology of Desire*, 2015): the brain changes in addiction are
  **real** but are the **same kind of changes** the brain makes whenever it learns a deep, motivated habit
  — falling in love, religious conversion, mastering a craft. Calling them "disease" pathologizes
  ordinary, if extreme, **neuroplasticity** (Section 14 §4), and obscures that the same plasticity is the
  **route out**.

**The corpus's graded synthesis** (`conflict`-status, status: *open but converging*): the disease model
and its critics are **less opposed than the rhetoric suggests**, and the honest position takes the true
part of each. Addiction involves **real neuroadaptation** (the disease model's truth) in circuits of
**learning, motivation, and choice that remain responsive to incentives and context** (the critics'
truth). The most
defensible label is something like a **disorder of motivated choice under altered neural conditions** — a
condition that is simultaneously a real change in the brain *and* responsive to consequences, environment,
and meaning. Both can be true; the schema's job is to refuse to collapse them. `mechanistic`+`cohort` —
contested framing, converging.

### 1.3 Dependence vs addiction vs tolerance — the distinction that prevents the most harm

These three are routinely conflated, and the conflation hurts people:
- **Tolerance:** needing more of the drug for the same effect (a pharmacological adaptation).
- **Physical dependence:** the body has adapted such that **stopping produces withdrawal**. This is
  **normal physiology**, not pathology — a cancer patient on around-the-clock opioids, a person on an SSRI
  or a beta-blocker, and a daily coffee drinker are all "dependent" in this sense. Dependence alone is
  **not** addiction.
- **Addiction (substance use disorder):** **compulsive use despite harm** — loss of control, craving,
  continued use despite consequences, life narrowing around the substance. This is the disorder.

DSM-5 (2013) — the American Psychiatric Association's diagnostic manual — made a crucial honest move here:
it **abolished the old "abuse vs dependence" split** —
which had wrongly implied that physical dependence *was* the disease — and replaced it with a single
**substance use disorder** rated on a **dimensional severity scale** (mild / moderate / severe, by number
of 11 criteria met). This better matches reality: substance problems are a **continuum**, not a binary,
and most people are not at the severe end. The practical payoff of getting this right: a pain patient who
develops dependence is **not** an addict; a person can be addicted (compulsive, harmful use) with
relatively little physical dependence (e.g., cocaine); and **withdrawal severity does not equal addiction
severity.** `clinical` — definitional, high-confidence.

---

## 2. Tobacco & nicotine — the most lethal, and the cessation that works

### 2.1 Why it leads the table

If addiction has a single most important fact, it is this: **tobacco is the most addictive common drug
*and* the most lethal**, and those two facts are not the same axis. By transition-to-dependence, nicotine
tops the list (~68% of ever-users in Lopez-Quintero 2011). By body count, combustible tobacco is the
single largest cause of preventable death — roughly **8 million deaths a year globally**, about **half of
long-term smokers** dying of a smoking-related disease, and (Section 09 §2) roughly **10 years of life**
lost, with **cessation before ~40 recovering nearly all of it** (Jha *NEJM* 2013; Doll 2004). The harm is
almost entirely from **combustion**, not from nicotine — a distinction that matters enormously for
cessation strategy (§2.3). Cross-ref **Section 09 §2** for the full exposure epidemiology, which this
section does not re-derive.

### 2.2 Cessation that actually works — graded

The anchor is **Cahill et al., *Cochrane* 2013**,[^cahill] an overview and **network meta-analysis** (a
study that pools many trials and ranks the options against each other) of pharmacological smoking-cessation
aids:

- **Varenicline** (a partial nicotinic-receptor agonist) is the **most effective single agent** — roughly
  **2–3× placebo** quit rates — and an important secondary finding from later work (the EAGLES trial)
  **cleared its earlier neuropsychiatric "black box" fears**: it does not meaningfully raise serious
  psychiatric events versus placebo or NRT. It is the first-line drug. `meta`/`rct`.
- **Combination NRT** (a long-acting patch **plus** a short-acting form — gum/lozenge/inhaler for
  breakthrough craving) substantially outperforms single-form NRT and approaches varenicline. "Use two
  kinds of nicotine replacement, not one" is one of the most actionable and under-used facts in the field.
  `meta`.
- **Bupropion** is modestly effective and a reasonable alternative.
- **Cytisine** — a cheap plant-derived partial agonist used for decades in Eastern Europe — is effective
  and **non-inferior or superior to varenicline in head-to-head trials** (Courtney et al., *JAMA* 2021),[^courtney]
  and is a globally important low-cost option. `rct` (the strongest evidence tier — a randomized trial).

- **Behavioural support multiplies all of the above.** Medication + counselling/quitline beats medication
  alone; the honest message is **"drug *and* support,"** not either alone.
- **What to do after a failed attempt:** most quit attempts fail, and that is normal, not defeat. A 2024
  RCT (*JAMA*, 2024)[^switch2024] showed that **switching or augmenting** after an initial varenicline/NRT
  failure still yields meaningful further quits — the honest counsel is *iterate*, don't conclude you
  "can't quit." `rct`.


@@FIG:D10-smoking-cessation@@

### 2.3 Nicotine vs combustion, and the vaping question — honestly

Cross-referenced from **Section 09 §2.2–2.3** (the harm-reduction grading lives there): the lethal agents
are the **~7,000 combustion products** (tar, CO, nitrosamines), not nicotine itself. So for an **adult who
already smokes**, switching completely to a non-combustible nicotine source is a **large harm reduction** —
the Cochrane review[^ecig] finds e-cigarettes help cessation with moderate-certainty evidence, more
effective than traditional NRT. The honest two-sidedness: **less bad ≠ safe**, the real
population cost is **nicotine initiation in never-smoking adolescents** (recruiting a new dependent
generation), and nicotine itself — while not the carcinogen — is not benign (cardiovascular, adolescent
brain development). Net: a **cessation tool for existing smokers**, a **harm for
non-smoking youth who start.** Don't let either truth cancel the other.


---

## 3. Opioids — the epidemic, told straight

### 3.1 What they are and why they kill

Opioids (heroin; prescription oxycodone/hydrocodone/morphine; and the synthetic **fentanyl** family) act on
**µ-opioid receptors** to produce analgesia, euphoria, and — the lethal part — **respiratory depression**:
in overdose, the drive to breathe simply switches off. They are powerfully reinforcing and produce severe
physical dependence, and the withdrawal — though agonizing (the "dopesickness" of flu-like misery, GI
distress, restlessness) — is, unlike alcohol or benzodiazepine withdrawal, **rarely directly fatal**. The
deaths come from **overdose**, not withdrawal. That asymmetry shapes everything about treatment.

### 3.2 Fentanyl and the scale of the epidemic

The US overdose crisis is the defining drug-policy fact of the era, and it has moved through **waves**:
prescription opioids (1990s–2010), then heroin (~2010), then **illicitly manufactured fentanyl** (~2013–),
and increasingly **fentanyl combined with stimulants** ("the fourth wave"). Fentanyl is ~50× more potent
than heroin, cheap to make, and now **contaminates much of the illicit supply** — including counterfeit
pills and stimulants, so people die who did not knowingly take an opioid at all. US overdose deaths exceeded
**100,000/year** in the early 2020s, the great majority opioid/fentanyl-driven. This is **acute lethality
at population scale** — a different shape of harm from tobacco's slow attrition. `cohort`/`surveillance`.

### 3.3 The honest recovery story — including the part the disease model struggles with

The single most important historical data point: **Robins's Vietnam veteran studies** (1970s). Large
numbers of US soldiers used heroin heavily in Vietnam; on return, the great majority **stopped, most
without treatment, and most did not relapse** — when the **environment** changed. This is the empirical
spine of Heyman's and Hart's critiques (§1.2): the same drug, in a different context, produced a different
outcome. It does **not** mean opioid addiction is easy to escape at home (the Vietnam context change was
total); it means **context is causal**, and recovery is possible — both of which the
fatalistic "chronic brain disease, once an addict always an addict" framing handles badly. `cohort`.

### 3.4 What actually treats it — and it is not what intuition says

This is the highest-stakes evidence-grading in the section, and the intuition (detox → abstinence →
willpower) is **dangerously wrong**. The strongest evidence in all of addiction medicine supports
**medications for opioid use disorder (MOUD / MAT)**:
- **Methadone** (full µ-agonist) and **buprenorphine** (partial agonist, usually with naloxone as
  Suboxone) are **agonist maintenance** treatments — they occupy the receptor, prevent withdrawal and
  craving, blunt the high from illicit use, and let people stabilize their lives. The anchor is **Sordo et
  al., *BMJ* 2017**,[^sordo] a systematic review and meta-analysis of cohort studies: methadone and
  buprenorphine **roughly halve all-cause and overdose mortality** versus being out of treatment. Retention
  is the mechanism — and the **highest-risk window is right after leaving treatment** (or leaving prison),
  when tolerance has dropped. `cohort` (observational, large and consistent) — one of the most robust
  mortality findings in the corpus.

- **The counterintuitive, load-bearing fact:** **abstinence-only detox without maintenance is associated
  with *worse* outcomes**, including higher overdose death, because detox lowers tolerance while leaving
  the addiction (craving, cues, context) intact — so relapse at the old dose is now lethal. "Get them off
  everything" is, for opioids, frequently the more dangerous path. This is the clearest case in the whole
  manual where the moralized intuition kills and the unglamorous medication saves. `cohort`.
- **Naltrexone (extended-release, Vivitrol)** — an **antagonist** that blocks the receptor — works **if you
  can get the person through detox and onto it** (the catch: you must be opioid-free first, a hard bridge).
  Where induction succeeds it is comparable to buprenorphine (the X:BOT trial), but the induction hurdle
  makes agonist therapy first-line for most. `rct`.
- **Naloxone (Narcan)** — the overdose **reversal** agent — is the harm-reduction keystone: a nasal-spray
  µ-antagonist that **reverses respiratory depression in minutes**. Community **overdose education and
  naloxone distribution (OEND)** puts it in the hands of people who use drugs and their families; the
  evidence (MMWR, and multiple program evaluations)[^oend] supports **reduced overdose mortality** where
  distribution is real and wide. It does not treat addiction; it keeps people **alive long enough to access
  treatment**, which is the entire point. `cohort`/`program`.


The honest synthesis for opioids: **MOUD is the standard of care, it halves death, it is chronically
under-provided** (stigma, regulation, the moralized preference for abstinence), and **detox-alone can be
worse than no treatment.** If this section changes one belief, it should be this one.

@@FIG:D08-moud-mortality@@

---

## 4. Stimulants — cocaine, methamphetamine, amphetamine

### 4.1 What they are

**Cocaine** (short-acting) and the **amphetamines** including **methamphetamine** (longer-acting) force
dopamine (and norepinephrine) into the synapse — producing euphoria, energy, confidence, and
appetite/sleep suppression. The risks are **cardiovascular** (arrhythmia, MI, stroke — even in the young
and healthy, even on a first use), **psychiatric** (stimulant psychosis, especially with meth),
**neurotoxic** (meth damages dopaminergic terminals), and increasingly **overdose**, both directly and via
**fentanyl contamination** of the stimulant supply (the "fourth wave," §3.2). Withdrawal is mostly a
**crash** (depression, anhedonia, hypersomnia, intense craving) rather than the medically dangerous
syndrome of alcohol/benzodiazepines — which misleads people into thinking stimulants are "less addictive"
than they are.

### 4.2 What treats it — the honest gap and the underused fix

Here the evidence ledger is lopsided in an instructive way:
- **No medication works well.** Despite decades of trials, **no pharmacotherapy is robustly effective or
  FDA-approved** for cocaine or methamphetamine use disorder. The systematic review for cocaine (Chan et
  al., *J Gen Intern Med* 2019)[^chan] found **no medication with consistent benefit.** (A 2021 trial of
  **bupropion + injectable naltrexone** for meth showed a real but *modest* effect — a signal, not a
  solution.) `meta` — honest null.

- **The behavioural treatment that *does* work is under-used: contingency management (CM)** — paying
  people, in vouchers or prizes, for **drug-negative urine tests**. CM has **the strongest evidence of any
  treatment for stimulant use disorder**, and a 2025 cohort even linked CM participation to **lower
  mortality** (*Am J Psychiatry* 2025).[^cm2025] It is **scandalously
  under-deployed** — partly because "paying addicts to not use drugs" collides with a punitive instinct,
  which is precisely the §7.2 story. For stimulants, where pharmacology has failed, **the behavioural lever is the
  main lever**, and we mostly don't pull it. `meta`/`cohort`.


---

## 5. The other substances — graded honestly

### 5.1 Alcohol — the legal drug with lethal withdrawal

Cross-ref **Section 09 §1** for the exposure epidemiology (the dead J-curve; no safe level for cancer;
Biddinger/Bryazka). Here, the **disorder** layer:
- **Alcohol use disorder (AUD)** is common, dimensional (DSM-5 mild→severe), and under-treated. Moderate
  addiction potential (~22% of ever-drinkers, Lopez-Quintero), but **enormous absolute harm** because the
  exposed population is so large.
- **The acute danger that distinguishes alcohol: withdrawal can kill.** In a physically dependent heavy
  drinker, **abrupt cessation** can produce seizures and **delirium tremens (DTs)** — autonomic storm,
  confusion, hyperthermia — with meaningful mortality if unmanaged. This is a medical emergency
  requiring **benzodiazepine-supported, supervised detox.** "Just quit cold turkey" is sound advice for
  nicotine and dangerous advice for severe alcohol or benzodiazepine dependence. `clinical` — high-
  confidence, consequential.
- **Medications that work (and are under-prescribed):** the anchor is **Jonas et al., *JAMA* 2014**,[^jonas]
  a systematic review/meta-analysis: **naltrexone** (reduces heavy drinking; blocks the reinforcement) and
  **acamprosate** (supports abstinence) both have **real, modest RCT-backed benefit** (number-needed-to-treat
  in the ~12 range — how many people you treat to prevent one bad outcome — unglamorous but real, and
  comparable to many accepted medical treatments). **Disulfiram** (makes drinking aversive) works only
  with supervision/adherence. These are cheap, generic, and **prescribed to a small minority** of people
  with AUD — a treatment gap as much cultural as clinical. `meta`. **The Sinclair Method** (targeted
  naltrexone taken before drinking, aiming at pharmacological extinction rather than abstinence) is a
  legitimate naltrexone strategy with a real evidence base, often invisible in abstinence-only settings.


### 5.2 Cannabis — not harmless, not the devil

The honest middle is hard to hold here because both poles shout. Anchor: **Volkow et al., *NEJM*
2014** ("Adverse Health Effects of Marijuana Use")[^volkow2014] and **Hall** (*Addiction* 2016).[^hall]

- **Cannabis use disorder is real.** ~9% of ever-users become dependent (Lopez-Quintero) — lower than
  alcohol/opioids but **not zero**, rising to ~**17%** for those who start in adolescence and higher in
  daily users. "Marijuana isn't addictive" is false; withdrawal (irritability, sleep disruption, appetite
  loss, craving) is real if mild. `cohort`.
- **Adolescent exposure is the strongest concern:** earlier, heavier use is associated with worse cognitive
  and educational outcomes and — in the genetically/clinically vulnerable — **increased risk of psychosis**
  (dose-related, strongest for high-THC products). Causation vs shared-vulnerability is still debated, but
  the signal is consistent enough to take seriously. `cohort` — association, partial causation.
- **Cannabinoid Hyperemesis Syndrome (CHS):** chronic heavy use can paradoxically cause **cyclic severe
  vomiting** relieved oddly by hot showers — under-recognized, often misdiagnosed for years, and resolving
  only on **cessation**. A concrete, non-moralized harm worth naming. `clinical`.
- **The honest frame:** today's high-potency cannabis is **not** the low-THC plant of older epidemiology;
  it is **not** a benign herb *and* it is **not** the reefer-madness menace. It has a real but moderate
  addiction profile, real risks concentrated in adolescents and the psychosis-vulnerable, and real medical
  uses elsewhere. No approved medication treats the disorder; **CBT/MET/contingency management** help.

### 5.3 Benzodiazepines — dependence that develops quietly and withdraws dangerously

Covered as a treatment trap in **Section 20 §2.3**; here as a substance. Benzodiazepines (alprazolam,
diazepam, clonazepam, lorazepam) produce **dependence readily**, often **iatrogenically** (prescribed for
anxiety/insomnia, then hard to stop). Two dangers define them: **(1) withdrawal can cause seizures** and a
protracted, miserable syndrome — like alcohol, **never stop abruptly** in a dependent user; taper **slowly**
(weeks to months). **(2) combination lethality** — benzodiazepines + opioids (or + alcohol) **multiply
respiratory depression** and are a major contributor to overdose deaths. The honest counsel: legitimate
short-term/crisis role, large illegitimate chronic role, and the exit is a **slow medically-supervised
taper**, not cold turkey and not indefinite continuation. `clinical`.

### 5.4 Psychedelics — low addiction potential, a different conversation

Classic psychedelics (psilocybin, LSD, mescaline, DMT) have **very low addiction potential** — they are
not reliably reinforcing, produce rapid tolerance that discourages bingeing, and lack the compulsive-use
signature. The risks are **psychological** (frightening experiences, precipitating psychosis in the
vulnerable) and **behavioural** (acting unsafely while intoxicated), not dependence. They mostly
**don't belong in the addiction conversation the way prohibition lumped them.** The live and important
story — **psychedelic-assisted therapy** for depression, PTSD, and addiction itself — is graded in
**Section 20 §6.4** (promising, unblindable, early, and **not** FDA-approved; MDMA-therapy was *rejected*
in 2024). Note the irony worth flagging: psilocybin and ibogaine are themselves being trialled **as
treatments for** other addictions — early-stage, not established. `rct` (early).

### 5.5 Caffeine — the socially-accepted dependence

The world's most widely used psychoactive drug produces **real physical dependence**: regular users
develop tolerance and a real **withdrawal syndrome** (headache, fatigue, low mood, poor concentration,
peaking ~1–2 days after stopping). DSM-5 recognizes **caffeine withdrawal** and **intoxication** as real,
and lists **caffeine use disorder** as a *condition for further study* — i.e., the field's honest verdict
is "**dependence yes, clinically significant addiction for most people no.**" For the large majority,
caffeine is a well-tolerated dependence with a favourable or neutral health profile at normal doses; a
minority have real problematic use (anxiety, insomnia, escalating doses). The reason it's in this
section is **honesty, not alarm**: it demonstrates that **dependence is common and usually benign**, which
is exactly the §1.3 distinction that the moralized drug conversation forgets. Taper to quit without
withdrawal. `clinical`.

---

## 6. Behavioural addictions — the established one and the contested ones

### 6.1 Gambling — the one that's real

**Gambling disorder** is the **only behavioural addiction with broad scientific and diagnostic acceptance**
— DSM-5 moved it *out* of "impulse-control disorders" and *into* "substance-related and addictive
disorders" in 2013, precisely because it shares the phenomenology (craving, tolerance-like chasing,
withdrawal-like irritability, loss of control, continued play despite ruin) **and the reward-circuit
biology** of drug addiction. Anchor: **Potenza et al., *Nat Rev Dis Primers* 2019**.[^potenza] It carries a
**high suicide risk** and is being amplified by
the explosion of **online/in-app sports betting** engineered for compulsive engagement. Treatment: **CBT**
has the best evidence; **naltrexone** (the same opioid antagonist as for alcohol) shows a real signal,
especially with a family history of addiction; **Gamblers Anonymous** is widely used but **thinly
evidenced**. `cohort`/`rct`.


### 6.2 "Food / sex / internet / phone / porn addiction" — contested constructs, graded as such

This is where honesty rule #1 earns its keep, because the **"addiction" label is doing rhetorical work the
evidence has not licensed.** The honest grading, verdict first:
- **Gaming** — *split verdict.* "Internet gaming disorder" is in DSM-5 only as a *condition for further
  study*, while "gaming disorder" *is* in **ICD-11** — the **WHO and APA disagree**. Real-seeming problem
  for a small minority, wrapped in measurement chaos and the risk of pathologizing normal heavy play.
  `contested`.
- **Food** — *unresolved category.* Real research literature (Yale Food Addiction Scale; ultra-processed
  foods do engage reward circuits), but whether it's a **substance** addiction (to sugar/fat), a
  **behavioural** one (binge-eating pattern), or a category error is open. See eating disorders in **§20 §7.**
  `contested`.
- **Sex / porn** — *rejected as addiction.* Not a DSM-5 diagnosis; ICD-11's "compulsive sexual behaviour
  disorder" is deliberately filed as an **impulse-control disorder, not an addiction.** Self-labelled "porn
  addiction" tracks **moral disapproval of one's own use** more than the amount of use. `contested` — frame
  with care.
- **Phone / social media** — *popular language, not a diagnosis.* Real compulsive, reward-engineered use
  and real harms (sleep, attention, mood — §14, §20), but the "addiction" framing outruns the evidence; the
  honest term is **"problematic use."**

The unifying honest point: **behaviours can become compulsive and harmful, and that is worth taking
seriously — but stretching the word "addiction" onto every compelling activity both cheapens the term and
risks pathologizing ordinary life.** Gambling cleared the bar; the rest are, to varying degrees, **still in
the dock.** Grade the construct, not the vibe.

---

## 7. What actually treats addiction — the evidence ledger

The single most important honest message of this section: **addiction is treatable, the effective
treatments are unglamorous and under-used, and the dramatic interventions are mostly the weak ones.**

### 7.1 Medication-assisted treatment (MAT/MOUD) — the strongest evidence

@@FIG:DX2-mat-moud@@

Anchors, by substance (verdicts graded in the body): **opioids** — Sordo *BMJ* 2017[^sordo] (§3.4);
**alcohol** — Jonas *JAMA* 2014[^jonas] (§5.1); **tobacco** — Cahill *Cochrane* 2013[^cahill] (§2.2);
**stimulants** — no effective medication, contingency management instead (§4.2); **cannabis** — no
medication, CBT/MET/CM (§5.2). MAT is held back less by evidence than by stigma — the "replacing one drug
with another" canard (§8).

### 7.2 Behavioural treatments — including the under-used winner

- **Contingency management (CM)** — concrete rewards for verified abstinence. **The most effective
  psychosocial treatment, especially for stimulants** (where medication fails), with mortality signal
  (§4.2). **Drastically under-used** because paying people to abstain offends a moral reflex — a direct
  illustration that the field's choices are driven by *moralism over evidence.* If one behavioural fact
  should change practice, it is **"use contingency management."** `meta`.
- **Cognitive behavioural therapy (CBT)** — relapse-prevention skills, trigger/cue management, coping. Solid
  evidence across substances; standard of care; effect sizes modest and durable. `meta`.
- **Motivational interviewing (MI)** (Miller & Rollnick) — a collaborative, non-confrontational method for
  resolving ambivalence and eliciting the person's *own* reasons to change. Evidence-based, and the
  **direct refutation of the old "break them down / confront the denial" model**, which is not only
  unevidenced but often counterproductive. `meta`/`rct`.
- **12-step / AA / NA** — the honest grade matters because the claims are huge in both directions. **Kelly
  et al., *Cochrane* 2020**[^kelly] found that **manualized Twelve-Step Facilitation (TSF)**, a clinician
  systematically linking people into AA, produces
  **abstinence outcomes at least as good as — often better than — other active treatments (including
  CBT), and is more cost-effective.** That is a real, important, evidence-based finding. **The honest
  caveats that keep it from being the whole story:** (1) the strong evidence is for **structured TSF**, not
  for the bare advice "go to meetings"; (2) AA's culture (powerlessness, lifelong abstinence, spiritual
  surrender) **fits some people and actively repels others**, and the field's historic **one-size-fits-all
  insistence on AA** failed the latter; (3) selection/self-selection make the naturalistic numbers
  (famously fuzzy "success rates") unreliable in both directions. The defensible position: **AA/TSF is a
  effective, free, widely-available option that works well *for those it fits* — and it is one
  tool, not the only tool, and not a substitute for MAT in opioid or alcohol use disorder.** `meta` (for
  TSF) — real, but not universal.


### 7.3 Harm reduction — the evidence and the controversy, both honest

Harm reduction accepts that **some people will use drugs no matter what**, and works to **keep them alive
and healthier** rather than conditioning all help on abstinence. The evidence is, on the whole, **good**;
the controversy is **moral/political, not primarily empirical**:
- **Naloxone distribution** (§3.4) — reverses overdose; saves lives; `cohort`/`program`.
- **Syringe service programs** — reduce HIV/HCV transmission **without increasing drug use** (a robust,
  repeatedly-replicated finding that contradicts the "enabling" worry); `cohort`/`meta`.
- **Supervised consumption sites / drug checking (fentanyl test strips)** — reduce overdose death and
  connect people to care; the evidence is favourable though more contested and politically fraught;
  `cohort`/`observational`.
- **Medication maintenance (MOUD)** is itself harm reduction — and the best-evidenced of all.

The honest framing of the **abstinence-vs-harm-reduction** debate: it is a **false binary**. Harm reduction
**keeps people alive long enough to reach abstinence if and when they choose it**; the data do **not**
support the fear that it "enables" or prolongs addiction; and for opioids especially, the abstinence-only
insistence has a **measurable death toll** (the detox-relapse-overdose pathway, §3.4). Abstinence is a fine
**goal**; it is a **deadly precondition** for receiving help.

---

## 8. The honest debunks

- **The "rock bottom" myth.** The belief that an addicted person must lose everything before they can
  recover is **false and dangerous** — it rationalizes **withholding help** and **waiting for catastrophe**
  when early intervention works better and people recover from every "depth," including those who never hit
  any bottom. Motivational interviewing (§7.2) is built on the opposite, evidenced premise: **ambivalence is
  workable now.** `clinical` — debunked.
- **"Rapid / ultra-rapid detox" (anaesthesia-assisted opioid detox).** Marketed as a fast cure; it is
  **expensive, medically risky (deaths have occurred), and does nothing for the addiction** — it only
  compresses withdrawal, leaving craving, cues, and relapse risk intact (and lowered tolerance → raised
  overdose risk, §3.4). **Detox is not treatment.** `clinical` — debunked/harmful.
- **"Addiction is purely willpower / moral weakness."** Refuted by the real neuroadaptation, the
  involuntariness people report, and the efficacy of *medications* (you cannot will your receptors). But —
  honesty rule, both directions — **its mirror image is also an overclaim:** "addiction is purely a chronic
  brain disease and the person has no agency" is refuted by the remission data (§1.2, §3.3) and undercuts
  the agency that recovery runs on. **Both poles are wrong.**
- **"One-size 12-step is the only real recovery."** Refuted by the existence of multiple effective paths
  (MAT, CBT, CM, MI, and — for many — moderation rather than abstinence): the field's historic insistence
  that **everyone** must do AA and **everyone** must be abstinent forever **failed the large minority it
  didn't fit.** TSF works (§7.2) **and** is not universal. Both halves are true.
- **"Replacing one drug with another" (the anti-MAT canard).** This conflates **dependence** (the
  medication produces it) with **addiction** (compulsive harmful use, which the medication *resolves*) —
  honesty rule #2's most lethal failure. `cohort` — debunked.
- **"Moderation is always relapse / abstinence is the only goal."** For many with **less severe** alcohol
  or cannabis problems, **moderation/controlled use is an achievable, evidence-supported goal** (harm
  reduction, the Sinclair Method); for **severe** dependence, abstinence is often the realistic target. The
  honest answer is **severity-stratified**, not dogmatic — average ≠ individual again.

---

## 9. The honest summary of this section

**The three belief-changers, if you remember nothing else:**

1. **Opioids: MOUD (methadone/buprenorphine) roughly halves death** (Sordo 2017), and **detox-alone can be
   worse than nothing** — the moralized abstinence intuition kills; the daily medication saves. Naloxone
   keeps people alive long enough to reach treatment.
2. **Stimulants have no effective medication — and contingency management, the behavioural treatment that
   *does* work, is scandalously under-used** because rewarding abstinence with cash sits badly with moral instinct.
3. **Dependence ≠ addiction.** Conflating physical dependence (a cancer patient, a coffee drinker) with
   addiction (compulsive harmful use) is the field's most harmful error; DSM-5 fixed it by making substance
   use disorder **dimensional**.

**The rest, in one line each:**

- **The model:** neither moral weakness nor purely a chronic brain disease — a **disorder of motivated
  choice under altered neural conditions** (real brain change *and* responsiveness to context).
- **Tobacco** is the most addictive common drug *and* the most lethal; cessation that works is **varenicline
  or combination NRT + behavioural support** — iterate after failure; nicotine ≠ combustion.
- **Alcohol withdrawal can kill** (never abrupt unsupervised detox in heavy users); **naltrexone and
  acamprosate** are real, modest, generic, and under-prescribed.
- **Cannabis** is a real disorder (~9%, higher with adolescent onset) with real psychosis risk and CHS —
  *and* not the reefer-madness menace; today's high-THC product isn't the old plant.
- **Behavioural addictions:** gambling is the established one; "food/sex/internet/phone addiction" are
  contested constructs where the word outruns the evidence. Grade the construct, not the vibe.
- **Treatment ranked by evidence:** MAT/MOUD → contingency management → CBT/MI → structured 12-step
  facilitation → harm reduction. The effective tools are under-deployed; the dramatic ones (rapid detox,
  "rock bottom") are weak or harmful.
- **The compassionate move and the honest move are the same:** hold **dignity** and **agency** at once,
  treat with **medication + behaviour + harm reduction**, and stop letting moralism override evidence.

---

## Go deeper

A short, honestly-annotated reading list. Grades flag where a source is contested or thinner than its
visibility implies.

1. **Volkow, Koob & McLellan — *Neurobiologic Advances from the Brain Disease Model of Addiction*** (*NEJM*
   2016, `10.1056/NEJMra1511480`, PMID 26816013). The canonical statement of the dominant framework — the
   three-stage circuit model. Read it **with** its critics (next two) to get the honest debate, not the
   slogan. **Tier: mechanistic/cohort — the default frame, not the whole story.**
2. **Heyman — *Addiction: A Disorder of Choice*** (Harvard University Press, 2009). The most rigorous
   challenge to the disease model, built on the **epidemiology of natural remission**. Pair with **Carl
   Hart — *Drug Use for Grown-Ups*** (2021) and the **Robins Vietnam veteran studies** for the context-and-
   choice case. **Tier: book + cohort — serious, not fringe; the corpus indexes this conflict as open-but-
   converging.**
3. **Sordo et al. — *Mortality risk during and after opioid substitution treatment*** (*BMJ* 2017,
   `10.1136/bmj.j1550`, PMID 28446428). The meta-analysis behind "MOUD halves death" — the single most
   consequential treatment fact in the section. **Tier: meta of cohort studies — robust.**
4. **Jonas et al. — *Pharmacotherapy for Adults With Alcohol Use Disorders in Outpatient Settings*** (*JAMA*
   2014, `10.1001/jama.2014.3628`, PMID 24825644). The evidence for naltrexone and acamprosate — real,
   modest, generic, under-used. **Tier: meta of RCTs.**
5. **Cahill et al. — *Pharmacological interventions for smoking cessation: network meta-analysis***
   (*Cochrane* 2013, `10.1002/14651858.CD009329.pub2`, PMID 23728690). Why varenicline and combination NRT
   lead. Pair with the cytisine trial (Courtney, *JAMA* 2021, `10.1001/jama.2021.7621`). **Tier: network
   meta of RCTs.**
6. **Kelly et al. — *Alcoholics Anonymous and other 12-step programs for AUD*** (*Cochrane* 2020,
   `10.1002/14651858.CD012880.pub2`, PMID 32159228). The honest AA verdict: **structured TSF** matches or
   beats other treatments and is cost-effective — *and* it is one path, not the only one. **Tier: meta of
   RCTs — real but not universal.**
7. **Potenza et al. — *Gambling disorder*** (*Nat Rev Dis Primers* 2019, `10.1038/s41572-019-0099-7`, PMID
   31346179). The established behavioural addiction — the bar the contested constructs have not cleared.
   **Tier: authoritative review.**
8. **Lopez-Quintero et al. — *Probability and predictors of transition from first use to dependence***
   (*Drug Alcohol Depend* 2011, `10.1016/j.drugalcdep.2010.11.004`, PMID 21145178). The comparative
   addiction-potential numbers in §0 — and the honesty-rule-#2 headline that **most users of most drugs
   never become dependent.** **Tier: large cohort (NESARC).**
9. **Volkow et al. — *Adverse Health Effects of Marijuana Use*** (*NEJM* 2014, `10.1056/NEJMra1402309`,
   PMID 24897085). The "not harmless, not the devil" cannabis synthesis. **Tier: review.**

---

## Cross-links

- **SIDEWAYS:** alcohol & tobacco **exposure epidemiology** (J-curve, ~10 life-years, cessation benefit) ↔
  **Section 09** (`09-exposures-environment.md` §1–2); psychiatric **comorbidity** (depression, anxiety,
  bipolar, PTSD, ADHD — self-medication, dual diagnosis), the **benzodiazepine trap**, and the
  **psychedelic-therapy frontier** ↔ **Section 20** (`20-mental-health-psychiatry.md` §2.3, §6.4); the
  **dopamine / mesolimbic reward mechanism** and the **"dopamine detox" debunk** ↔ **Section 14**
  (`14-nervous-system.md` §3); **eating disorders** and the "food addiction" construct ↔ **Section 20 §7**;
  **suicide** risk (gambling, alcohol, the lithium/clozapine anti-suicide signals) ↔ **Section 20 §9**.
- **UP to canon:** the receptor pharmacology and reward-circuit signalling under all of this — **µ-opioid
  and nicotinic/cannabinoid receptors, dopamine transmission, synaptic plasticity, the \(\mathrm{Na^{+}}\)/\(\mathrm{K^{+}}\)-gradient
  excitability that lets neurons fire at all** — rest on **membrane bioelectricity, ion gradients, and
  receptor-ligand thermodynamics** → `bucket-canon/05-biophysics/` and `bucket-canon/03-chemistry/`.
  Addiction is the **outcome-layer application** of those foundations (a learned, motivated state of an
  excitable, plastic network), **not** a foundation itself — exactly as Sections 14 and 20 frame the brain.

## Gaps flagged for next wave

A medication that actually works for **stimulant** use disorder (the field's biggest pharmacological hole);
whether **psilocybin/ibogaine as treatments *for* addiction** survive blinding and replication (cross-ref
Section 20's unblindable-trial problem); the real long-term outcomes of **contingency management at scale**
(and whether the moral objection can be overcome in policy); the causal share of cannabis in **psychosis**
(causation vs shared vulnerability); a validated resolution of the **"behavioural addiction" boundary**
(WHO vs APA on gaming and compulsive sexual behaviour); the **fourth-wave** stimulant-fentanyl
co-involvement and how to treat polysubstance overdose; the durability and real-world reach of **harm-
reduction** programs against the political headwinds; and a defensible, severity-stratified answer to
**abstinence vs moderation** as a treatment goal (the field's oldest open argument).

[^lopez]: Lopez-Quintero et al. — *Probability and predictors of transition from first use to dependence.* Drug Alcohol Depend 2011. doi:10.1016/j.drugalcdep.2010.11.004. PMID 21145178. Large cohort (NESARC).

[^volkow2016]: Volkow, Koob & McLellan — *Neurobiologic Advances from the Brain Disease Model of Addiction.* NEJM 2016. doi:10.1056/NEJMra1511480. PMID 26816013.

[^cahill]: Cahill et al. — *Pharmacological interventions for smoking cessation: network meta-analysis.* Cochrane 2013. doi:10.1002/14651858.CD009329.pub2. PMID 23728690.

[^courtney]: Courtney et al. — cytisine vs varenicline head-to-head. JAMA 2021. doi:10.1001/jama.2021.7621. PMID 34228066.

[^switch2024]: Switch/augment-after-failure smoking-cessation RCT. JAMA 2024. doi:10.1001/jama.2024.4183. PMID 38696203.

[^ecig]: Cochrane review of e-cigarettes for smoking cessation. doi:10.1002/14651858.CD010216.

[^sordo]: Sordo et al. — *Mortality risk during and after opioid substitution treatment.* BMJ 2017. doi:10.1136/bmj.j1550. PMID 28446428. Meta-analysis of cohort studies.

[^oend]: CDC MMWR on overdose education and naloxone distribution. doi:10.15585/mmwr.mm6933a2. PMID 32817603.

[^chan]: Chan et al. — systematic review of pharmacotherapy for cocaine use disorder. J Gen Intern Med 2019. doi:10.1007/s11606-019-05074-8. PMID 31183685.

[^cm2025]: Contingency management and mortality — cohort study. Am J Psychiatry 2025. doi:10.1176/appi.ajp.20250053. PMID 40926572.

[^jonas]: Jonas et al. — *Pharmacotherapy for Adults With Alcohol Use Disorders in Outpatient Settings.* JAMA 2014. doi:10.1001/jama.2014.3628. PMID 24825644. Meta-analysis of RCTs.

[^volkow2014]: Volkow et al. — *Adverse Health Effects of Marijuana Use.* NEJM 2014. doi:10.1056/NEJMra1402309. PMID 24897085.

[^hall]: Hall — cannabis health effects review. Addiction 2016. doi:10.1111/add.13428. PMID 27082374.

[^potenza]: Potenza et al. — *Gambling disorder.* Nat Rev Dis Primers 2019. doi:10.1038/s41572-019-0099-7. PMID 31346179.

[^kelly]: Kelly et al. — *Alcoholics Anonymous and other 12-step programs for AUD.* Cochrane 2020. doi:10.1002/14651858.CD012880.pub2. PMID 32159228. Meta-analysis of RCTs.
