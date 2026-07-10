The rest of this atlas is a map of the present: the physics that makes qubits possible, the machines that hold them, the software stack above them, and the industries and governments betting on all of it. This chapter is the road that leads to that map. Read the timeline figure as the spine, and read this as the story it tells — how a reluctant physicist's arithmetic trick in 1900 became, over 126 years, a global race to build a machine that has not yet paid for itself. The arc has three long movements: discovering the rules, arguing about what they mean, and learning to engineer with them. Each set up the one after it, and every topic elsewhere in this atlas has an ancestor on this line.

One habit travels with the whole chapter. The evidence schema grades every claim from T1 established physics down to T6 speculation, and the farther we walk toward the present, the more the grades matter. The early eras are almost entirely T1 — textbook, reproduced for a century. The recent era mixes Nature papers and launch-day press releases in the same month. The story is real; a growing number of its superlatives are provisional.

**Learning objectives.** After this chapter you can:
- Place the field's major milestones on a timeline and name the three movements it divides into — discovering the rules, arguing over what they mean, and learning to engineer with them.
- Explain why the "old quantum theory" of 1900–1925 produced correct spectra without any governing equation, and what forced the full formalism of the decade that followed.
- Distinguish an established result (T1–T2) from a contested vendor claim (T4–T6) when both appear in the same month of the recent era.
- Trace how a foundations-era idea once treated as a career risk — entanglement, Bell nonlocality, no-cloning — became a working component of today's engineering layer.
- State the two questions Feynman and Shor left open in the 1980s and say why neither has yet been closed.

### The rules arrive without an equation (1900–1925)

Classical physics broke on two experimental fronts, and the field began as a quarter-century of brilliant patching. In December 1900 Max Planck, a conservative 42-year-old thermodynamicist, quantized the exchange of energy into units of *E = hν* to fit the blackbody spectrum — and disliked his own result enough to call it "an act of desperation." He treated the constant *h* as a mathematical device. The whole field is now named after it. Five years later Einstein, a patent clerk in Bern, took the quantum literally as a particle of light, a step so radical that Planck resisted it for a decade — and, nominating Einstein for the Prussian Academy in 1913, added a note excusing his "occasional" overreach on the light-quantum. In 1913 Bohr — then 27, working from Rutherford's Manchester lab — quantized the atom's orbits and computed the hydrogen spectrum's Rydberg constant from first principles. De Broglie closed the loop in his 1924 doctoral thesis by giving *matter* a wavelength; his examiners found the idea so strange they forwarded it to Einstein, who approved.

This was physics done by very young people under an old guard's skeptical eye, and its founders did not believe their own equations meant what they said. The "old quantum theory" produced correct spectra while lacking any governing equation. Sommerfeld's elliptical orbits and the Bohr–Sommerfeld rule *∮p dq = nh* were the high-water mark, and by 1925 the patchwork was visibly failing — it could not handle helium's two electrons or the anomalous Zeeman effect. Along the way came results this atlas still leans on: Stern and Gerlach's 1922 space-quantization experiment, now read as the prototype of a projective qubit measurement; Bose–Einstein statistics in 1924, the seed of every bosonic mode; Pauli's 1925 exclusion principle, the reason atoms have shell structure. The failure of the patchwork is exactly what forced the full formalism of the next decade. Nothing about quantum mechanics was chosen for elegance. It was dragged out of the laboratory.

### One decade builds the whole formalism (1925–1935)

Then, in a single astonishing decade, the patches were replaced by a complete mathematical framework — twice, independently, from opposite instincts. Heisenberg, 23 and recovering from hay fever on the island of Helgoland in June 1925, built matrix mechanics by refusing to talk about anything unobservable and keeping only measurable transition amplitudes. Schrödinger, 38 and unusually old for a revolution, took de Broglie's matter waves literally and wrote his wave equation over the Christmas holidays of 1925–26. The two formalisms looked nothing alike, and their authors disliked each other's approach — Heisenberg called wave mechanics "disgusting," Schrödinger found matrix mechanics "repellent" — yet within months they were proven mathematically equivalent. Born supplied the piece that made the whole thing physics: *|ψ|²* is a probability, entered in a footnote added in proof, and Einstein spent the rest of his life objecting to it. Dirac, the quietest of them, unified the formalism, married it to special relativity in 1928, and predicted antimatter from the mathematics alone — Anderson found the positron in 1932. Von Neumann handed the field its Hilbert-space axioms in 1932, still the machinery in use today.

Notice how much of the present atlas is already present in this decade. The Born rule, Heisenberg's 1927 uncertainty relation, Dirac's relativistic equation as the bridge to quantum field theory, and von Neumann's density operator are all foundations the rest of this atlas leans on. The speed was the story: from Heisenberg's notebook to von Neumann's axioms was seven years, most of it among people in their twenties at Göttingen, Copenhagen, and Munich. The credit fell unevenly — Born, whose interpretation is arguably the deepest single idea of the decade, was left off Heisenberg and Jordan's Nobel and waited until 1954.

The decade did not close on completion. Its own architects flagged what the theory left unresolved, and those loose ends became the next movement's raw material. Two of them deserve their own place on the timeline.

### The argument goes public: Solvay and EPR (1927–1935)

In October 1927 twenty-nine physicists gathered in Brussels for the Fifth Solvay Conference on "Electrons and Photons"; seventeen were or would become Nobel laureates. The group portrait — Einstein front-center, Curie the only woman, Bohr, Planck, Dirac, Heisenberg, Schrödinger, de Broglie, Born, and Pauli around them — is often called the most intelligent photograph ever taken. It is the moment quantum mechanics, barely two years old, was presented as a finished theory, and the moment its interpretation split the field. Bohr and Heisenberg's Copenhagen view — the wavefunction is complete, and a system has no definite properties until measured — met Einstein's refusal to accept that physics had become irreducibly probabilistic. The popular story compresses a week of hard argument into one quip, but the real exchange ran through breakfast and dinner: Einstein built ingenious thought experiments to beat the uncertainty relation, and Bohr answered each by showing that the very apparatus needed to make the measurement would blur the conjugate quantity by exactly enough to preserve the bound. "God does not play dice" captures the temperature of the debate, though it is a paraphrase. Einstein conceded the internal consistency of quantum mechanics. He never conceded its completeness.

He shifted ground to completeness and locality in May 1935, and it produced the most fertile question in the field's history. The EPR paper — Einstein, Podolsky, Rosen — ran four pages under a title posed as a question: "Can Quantum-Mechanical Description of Physical Reality Be Considered Complete?" Their answer was no. Using two particles that had interacted and separated, they argued that measuring one instantly fixes a property of the other; if no signal can travel between them and the outcome is definite, that property was real all along — an "element of reality" the wavefunction omits. Either quantum mechanics is incomplete, or nature is nonlocal. Bohr replied five months later that the two particles form a single indivisible system. Schrödinger, energized by the paper, coined *Verschränkung* — entanglement — to name precisely the correlation EPR had isolated, and wrote his cat into the record the same year.

The word "paradox" is a misnomer; there is no logical contradiction, only a forced choice between locality and completeness. Einstein intended EPR as a critique. It became the seed of entanglement, teleportation, quantum key distribution, and the speedups quantum computers run on. For thirty years the exchange looked like unresolvable philosophy. Then someone made it an experiment.

### The foundations era and its career risk (1935–1980)

For three decades the EPR question sat in philosophical exile while physics built QED and the bomb. Asking what the wavefunction "really" meant was, as John Clauser later put it, a good way to end a career. The renormalization of QED moved the mainstream to fields, leaving foundations to a marginalized few. David Bohm reopened it in 1952 with a working hidden-variable theory, pilot waves, that the orthodoxy had declared impossible by citing von Neumann's 1932 no-go proof; Bohm's counterexample showed the proof assumed too much. Everett's 1957 relative-state ("many-worlds") interpretation offered a collapse-free alternative and was ignored for a decade, after which Everett left academia for defense work.

The pivot of the whole era came from John Stewart Bell, a particle physicist at CERN who did foundations "on the side." In 1964 he proved that *any* local hidden-variable theory obeys an inequality that quantum mechanics violates — turning a metaphysical dispute into a laboratory measurement. He published it in an obscure, short-lived journal that paid its authors, partly so he could keep his real job. This is the founding act of Bell nonlocality, and everything downstream in the atlas — device-independent cryptography, certified randomness, the security of E91 — descends from it. CHSH recast the inequality in 1969 into a form real, inefficient detectors could test. Freedman and Clauser ran the first experiment in 1972 on borrowed equipment at Berkeley; Clauser had been warned it would sink his career, ran it anyway, and got the "wrong" answer, quantum mechanics being right and disappointing his own realist hopes. Aspect's 1981–82 experiments in Orsay switched their analyzer settings while the photons were in flight, closing the locality loophole of the day. Quantum mechanics won every round. In parallel, Zeh's 1970 decoherence program explained why the classical world emerges from the quantum — the mechanism now the enemy of every qubit. The people who built the conceptual foundation of a trillion-dollar field mostly did it against professional incentives.

### Information before computation (1970–1984)

Before there was quantum computing, there was quantum information — the recognition that a quantum state carries information under its own rules, distinct from Shannon's. The patient zero is Stephen Wiesner, a Columbia graduate student who around 1970 wrote "Conjugate Coding," describing how to encode two messages in conjugate observables so a receiver can read one or the other but never both, and how to mint banknotes that cannot be counterfeited because an unknown quantum state cannot be copied. It was so far ahead of its time that it was rejected and sat unpublished for thirteen years; Wiesner spent years as a construction laborer in Israel while the field he seeded became a global enterprise. Two people who took the manuscript seriously, Charles Bennett and Gilles Brassard, turned it in 1984 into BB84 — the first quantum key distribution protocol, and quantum information's first working technology, still deployed. In parallel, Holevo proved in 1973 that a qubit carries at most one bit of accessible classical information, and Wootters, Zurek, and Dieks proved the no-cloning theorem in 1982 that makes the whole edifice secure.

This lineage corrects a common simplification: the field learned to *protect* information with quantum mechanics before it learned to *process* it. By 1984 the conceptual toolkit — qubits as carriers, no-cloning as a security primitive, channel capacities, conjugate coding — was in place, waiting for computation to arrive.

### The birth of quantum computing (1980–1994)

It arrived from several directions at once. Yuri Manin (1980, in a Russian book) and Paul Benioff (1980, with an explicit quantum Turing machine) asked whether computation itself could be quantum-mechanical. Richard Feynman flipped the question at a May 1981 MIT keynote: classical computers choke on simulating quantum systems because the state space grows exponentially, so build a machine to simulate quantum physics natively — "Nature isn't classical, dammit." He was pitching a simulator, skeptical it could be built. David Deutsch made it rigorous in 1985 with a universal quantum computer and the first quantum algorithm, motivated partly by wanting to test the many-worlds interpretation. The Deutsch–Jozsa algorithm (1992) gave the first provable exponential separation, and quantum teleportation (1993) turned entanglement into a communication resource.

Then came the detonation. In November 1994 Peter Shor, at Bell Labs, factored integers in polynomial time — threatening RSA and the entire public-key infrastructure. The algorithm reportedly grew out of Simon's problem, which Shor heard about at a talk and generalized within weeks. Overnight, quantum computing went from a physicists' curiosity to a national-security priority. Every funding line in the ecosystem layer of this atlas — the US, China, EU, and defense programs — traces back to that one result, and the post-quantum cryptography migration it forced is still underway thirty years later. Shor's algorithm remains mathematically proven and hardware-starved, which is the tension the rest of this history is about.

### Learning to build one (1995–2010)

After Shor, the question stopped being "is it useful?" and became "can you build one?" This era answered "in principle, yes," while revealing how hard the engineering would be. Cirac and Zoller published a realistic trapped-ion gate in May 1995, and Wineland's NIST group demonstrated a working logic gate on a single beryllium ion within seven months. The deepest results were theoretical: Shor (1995) and Steane (1996) proved that quantum errors could be corrected *without measuring, and thereby destroying, the encoded data*, removing the single strongest objection to the whole enterprise. The threshold theorem (Aharonov–Ben-Or, Knill–Laflamme–Zurek, Kitaev, 1996–98) then showed that below a critical error rate, arbitrarily long computation is possible. That theorem is the license under which the entire error-correction layer of this atlas operates, and its experimental realization would not come for another 28 years.

Grover added a second headline algorithm in 1996, the quadratic search speedup. NMR machines ran the first real algorithms — including Shor's algorithm factoring 15 in 2001 — before hitting a wall: Braunstein and colleagues showed in 1999 that room-temperature liquid-state NMR states are so mixed they are arguably never entangled, and the signal decays exponentially with qubit count. The early NMR lead was real and then it evaporated, a first lesson in how a demonstration can be true and un-scalable at once. DiVincenzo wrote down the five-item checklist any real platform must satisfy (2000), still the field's scorecard. And superconducting circuits went from the first coherent charge qubit (NEC 1999) through circuit QED (Yale 2004) to the transmon (Yale 2007), the charge-noise-insensitive design that still dominates superconducting hardware today. The transmon is built on a Josephson junction, the same device whose 1984–85 macroscopic-quantum-tunneling experiments later earned Clarke, Devoret, and Martinis the 2025 Nobel — the Nobel spine section below tells that story. This era is where the modern hardware map was drawn: ions and superconductors as the two front-runners, error correction as the organizing goal.

### Naming the eras: the second revolution and NISQ

Two acts of naming shaped how the field was funded and pursued, and both belong on the timeline because a name changes what gets built. In 2003 Jonathan Dowling and Gerard Milburn crystallized the phrase "second quantum revolution" in a Royal Society paper that opened flatly: "We are currently in the midst of a second quantum revolution." The distinction is substantive. The first revolution (1900–1935) discovered the rules and used them passively — the transistor, the laser, the atomic clock all exploit quantum mechanics in bulk without addressing a single electron. The second revolution engineers individual quantum systems: trap one ion, entangle two photons on demand, hold a superconducting qubit coherent long enough to run a gate. That capability is exactly what the 2012 Nobel to Haroche and Wineland honored, and it is the precondition for every node in the hardware and stack layers. The framing also set an honest expectation bar: if the first revolution's payoff was the transistor, the second's advocates are implicitly promising something comparable, which the skeptics say has not yet arrived.

The second naming was narrower and more sober. By 2017 the field needed a word for the machines it was actually building: 50 to 100 physical qubits, imperfect gates, no error correction — powerful enough to be hard to simulate classically, too noisy to run a deep useful circuit. John Preskill supplied it in a December 2017 keynote: NISQ, Noisy Intermediate-Scale Quantum. The coinage stuck instantly and organized a research program around variational algorithms and error mitigation. Preskill gave hardware groups a realistic near-term target while warning that NISQ technology "will not change the world by itself." Eight years on, that warning reads as prescient: no NISQ algorithm has produced a clear, durable practical advantage, and the field's own answer has been to shift focus from noisy circuits to early fault tolerance.

### The engineering race and the first "supremacy" (2011–2019)

Quantum computing left the physics lab and became an industrial race. D-Wave sold the first commercial machine in 2011 — an annealer rather than a gate-model computer — kicking off a decade-long argument about whether it delivered any quantum speedup at all; Rønnow and Troyer's 2014 benchmark found no generic speedup, and annealing settled into niche uses without ever demonstrating the general exponential speedup its early marketing implied. IBM put a real 5-qubit processor on the open cloud in 2016 and normalized publishing qubit counts as press events, birthing the cloud-QC business model. Google hired John Martinis's UCSB group in 2014 and pointed it at a single target: beat a classical supercomputer at *something*. Governments answered with billion-dollar programs — the EU Flagship (2016) and the US National Quantum Initiative Act (2018).

The era peaked in October 2019 with Google's Sycamore claim: a 53-qubit chip sampling random circuits in about 200 seconds against an estimated 10,000 classical years — the first claimed "quantum supremacy." IBM published its rebuttal the same week the Nature paper ran, arguing a well-configured Summit supercomputer could do the task in 2.5 days, and over the next three years tensor-network methods shrank the gap to hours. The demo stands; the "10,000 years" figure does not. That claim-and-counterattack cycle — a headline number, a rapid classical response, a milestone that survives while its superlative does not — became the template governing every advantage announcement since, and it is why the evidence schema treats "advantage" and "supremacy" claims as contested by default.

### The error-correction era (2020 → 2026)

The scoreboard metric changed. Through the 2010s the field measured itself in physical qubit counts and one-off supremacy stunts; from about 2023 it measures itself in *logical* qubits and error suppression. Two results reset expectations. In a 2024 Nature result (Bluvstein et al.) a Harvard/QuEra/MIT collaboration operated 48 logical qubits on 280 neutral atoms — logical qubits at scale, credibly, for the first time. Then in December 2024 Google's Willow achieved the first *below-threshold* surface code: making the code larger made the logical error rate exponentially *smaller* (Λ ≈ 2.14 across code distances 3, 5, and 7). This is the 1996 threshold theorem realized in hardware rather than proven on paper, and it is peer-reviewed (Nature 2025, T2). Fault tolerance became an engineering trajectory instead of a hope, and the record kept climbing — QuEra reported 96 logical qubits on 448 atoms in January 2026, a peer-reviewed Nature result that roughly doubled the count in about two years.

The rest of the era is where the grading discipline earns its keep, because peer-reviewed landmarks and contested vendor claims now appear in the same month. IBM's 2023 "utility" experiment on 127-qubit Eagle was matched by tensor-network methods within weeks. Google's 2025 "Quantum Echoes" verifiable-advantage claim is contested by default per the schema. Quantinuum launched Helios in November 2025 (98 barium-ion qubits, 99.921% two-qubit fidelity, up to 48 logical qubits) and filed confidentially for a ~$20B IPO in January 2026 — a T4 launch and a T5 valuation, neither an independent computational result. In June 2026 a Duke/IonQ team distributed a tripartite GHZ state across three networked trapped-ion nodes linked by photonic interconnects, a real step toward modular quantum computing, graded T3 as a preprint.

Three recent claims show exactly where the honest edges are. Sycamore's 2019 superlative fell to classical simulation. Willow's below-threshold QEC is peer-reviewed, but its companion random-circuit-sampling claim ("under 5 minutes vs. 10²⁵ classical years") is a T4 marketing figure riding alongside a T2 result in the same press release. And Microsoft's topological-qubit program — Majorana 1 (Feb 2025), Majorana 2 progress (June 2026) — remains the era's sharpest credibility test: Nature's referees noted the 2025 data "does not, on its own, determine whether Majorana zero modes are present," and in June 2026 Henry Legg published a formal Nature critique citing flawed tune-up routines and software errors, to which Microsoft replied that it stands by its results. Two years of announcements without independent confirmation is the honest status. The trajectory is real; the specific superlatives are provisional.

### The Nobel spine and the winter question

Two threads run underneath the whole timeline. The first is the Nobel spine, a reliable record of what is *established* that, by construction, lags the frontier by decades. The early prizes canonized the discovery of the rules — Planck (1918), Einstein (1921), Bohr (1922), Heisenberg (1932), Schrödinger and Dirac (1933). A middle cluster honored the deep theory and materials physics that became hardware — Born's probability rule (1954, a 28-year wait), BCS superconductivity (1972), the Josephson effect (1973). The recent prizes reward the second revolution directly — individual-quantum control to Haroche and Wineland (2012), the Bell-test verdict to Aspect, Clauser, and Zeilinger (2022), and macroscopic quantum tunneling in Josephson-junction circuits to Clarke, Devoret, and Martinis (2025), the direct ancestor of every superconducting qubit. The 2025 prize honored circuit experiments from 1984. No gate-model quantum *computer* has yet earned a Nobel, which is itself an honest signal about where the field is versus where the press releases say it is.

The second thread is the "quantum winter" question, the AI-winter analogy made into a live risk. The bear case is concrete: private quantum funding reportedly fell sharply in 2023 before recovering; the generative-AI boom pulled capital and talent toward a technology with immediate revenue; and every beyond-classical claim from Sycamore forward has drawn a classical counterattack. The bull case is also concrete: below-threshold QEC and doubling logical-qubit counts are peer-reviewed, and national programs provide funding floors that do not exit on a bad quarter. This is a scenario graded T5/T6 rather than an established fact, and it is the honest frame for reading every vendor roadmap in the ecosystem layer.

> **Key takeaways**
> - Quantum mechanics was dragged out of the laboratory: its founders distrusted their own equations, and correct spectra arrived before any single governing equation did.
> - The rules are settled to T1 — superposition, the Born rule, entanglement, the Bell violation — while the interpretation argument Einstein opened at Solvay is still open.
> - The scoreboard shifted around 2023 from physical-qubit counts to logical qubits and error suppression; below-threshold QEC (Willow, 2024) and doubling logical counts (QuEra) are peer-reviewed.
> - The Nobel spine lags the frontier by decades, and no gate-model quantum computer has yet earned one — an honest signal about where the field is versus where press releases say it is.
> - The "quantum winter" is a live scenario graded T5/T6, not a fact, and it is the frame for reading every vendor roadmap.
> - No quantum computer has yet produced a verified, durable advantage that survives classical counterattack.

### Where the story stands

The three movements of this history hand the present a specific inheritance. The rules were dragged out of the laboratory and are settled to T1 — superposition, the Born rule, entanglement, and the Bell violation are not in dispute, and the loophole-free tests of 2015 closed the last experimental door. The interpretation argument that Einstein opened at Solvay is *not* settled; the measurement problem remains open, and the field built a trillion-dollar engineering program on top of a question it never answered. The foundations era's career-risky work became the resource layer of the whole atlas: entanglement, no-cloning, teleportation, and Bell nonlocality are now components.

The engineering movement is the one still in motion, and it is where this atlas is most alive. The field has crossed from proving fault tolerance on paper to demonstrating it in hardware, the reason the error-correction layer is the center of gravity today. But the two questions Shor and Feynman left open in the 1980s are still open. Shor's algorithm is proven and waiting on millions of physical qubits it does not yet have. Feynman's simulation pitch is the application most likely to pay off first, and it has not yet paid off. Between them sits the verdict the timeline forces: the trajectory from foundations to engineering is real and accelerating, and no quantum computer has yet produced a verified, durable advantage that survives classical counterattack. That gap — between a physics that is finished and a machine that is not — is the present the rest of this atlas maps. The history explains why the gap exists, why it is narrower than it was, and why every claim about closing it should be read with its grade attached.

### Exercises and discussion

1. **(Timeline.)** From the milestones in this chapter, pick eight and place them on a single timeline. Tag each with the movement it belongs to — discovering the rules, arguing over meaning, or engineering with them — and write one sentence defending every boundary you draw. Where does one movement bleed into the next, and which milestone was hardest to file?
2. **(Physics.)** The Bohr–Sommerfeld quantization rule *∮p dq = nh* reproduced the hydrogen spectrum but broke on helium and the anomalous Zeeman effect. Explain, in your own words, why a rule that fits a one-electron atom fails on a two-electron atom, and name what the 1925–1926 formalism supplied that the old quantum theory lacked.
3. **(Resource estimation, for CS.)** Shor's algorithm is proven and "waiting on millions of physical qubits it does not yet have." Given a below-threshold surface code with Λ ≈ 2, sketch how logical error rate falls as code distance grows, and argue qualitatively why a cryptographically relevant factoring run needs so many physical qubits per logical one. No exact figure is required — reason about the scaling.
4. **(Critical reading.)** Choose one milestone from 2019–2026 that was over-claimed — Sycamore's 2019 "supremacy," IBM's 2023 "utility" run, or Google's 2025 "Quantum Echoes" — and reconstruct how the field learned the claim's limits. What was asserted, who counterattacked and with what method, and what grade (T1–T6) does the result deserve now?
5. **(Seminar.)** The Bohr–Einstein debate that opened at the 1927 Solvay conference was never resolved: the measurement problem stays open while a trillion-dollar engineering program was built on top of it. Is an unresolved interpretation a problem for the engineering or irrelevant to it? Argue both sides, then take a position.
6. **(Seminar.)** "Second quantum revolution" and "NISQ" are two names the field gave itself. What work does each framing do, and what does each hide? Consider who coined each term, when, and what they were arguing against.

### Further reading

- **R. P. Feynman, "Simulating Physics with Computers," *International Journal of Theoretical Physics* 21 (1982).** The lecture that framed quantum simulation as the field's first natural application — the pitch this chapter calls still-unpaid.
- **J. S. Bell, "On the Einstein Podolsky Rosen Paradox," *Physics* 1, 195 (1964).** Six pages that turned the Solvay interpretation argument into an experiment, producing the inequality whose violation is now T1.
- **A. Aspect, "Closing the Door on Einstein and Bohr's Quantum Debate," *Physics* 8, 123 (2015).** A short retrospective by a principal of the Bell-test program on the 2015 loophole-free experiments; a readable history of how the tests closed each loophole.
- **J. Preskill, "Quantum Computing in the NISQ Era and Beyond," *Quantum* 2, 79 (2018).** The paper that named the present hardware era and set honest expectations for what noisy machines can and cannot do.
- **D. Kaiser, *How the Hippies Saved Physics* (Norton, 2011).** A popular history of how foundations work survived the "shut up and calculate" decades to become today's resource layer.
- **J. Gribbin, *In Search of Schrödinger's Cat* (Bantam, 1984).** A durable popular narrative of the 1900–1935 discovery movement for readers who want the story before the formalism.


<figure class="figblock">
<span class="fig-light"><svg xmlns:xlink="http://www.w3.org/1999/xlink" width="922.885103pt" height="410.267439pt" viewbox="0 0 922.885103 410.267439" xmlns="http://www.w3.org/2000/svg" version="1.1">
 <metadata>
  <rdf xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:cc="http://creativecommons.org/ns#" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
   <work>
    <type rdf:resource="http://purl.org/dc/dcmitype/StillImage"></type>
    <date>2026-07-09T09:57:41.128074</date>
    <format>image/svg+xml</format>
    <creator>
     <agent>
      <title>Matplotlib v3.11.0, https://matplotlib.org/</title>
     </agent>
    </creator>
   </work>
  </rdf>
 </metadata>
 <defs>
  <style type="text/css">*{stroke-linejoin: round; stroke-linecap: butt}</style>
 </defs>
 <g id="figure_1">
  <g id="patch_1">
   <path d="M 0 410.267439 
L 922.885103 410.267439 
L 922.885103 0 
L 0 0 
z
" style="fill: #faf9f6" />
  </g>
  <g id="axes_1">
   <g id="patch_2">
    <path d="M 53.875125 192.126122 
L 168.644008 192.126122 
Q 168.644008 192.126122 168.644008 192.126122 
L 168.644008 178.733022 
Q 168.644008 178.733022 168.644008 178.733022 
L 53.875125 178.733022 
Q 53.875125 178.733022 53.875125 178.733022 
L 53.875125 192.126122 
Q 53.875125 192.126122 53.875125 192.126122 
z
" clip-path="url(#p3016a1ec9e)" style="fill: #8fd0d9; fill-opacity: 0.85" />
   </g>
   <g id="patch_3">
    <path d="M 168.644008 192.126122 
L 214.551562 192.126122 
Q 214.551562 192.126122 214.551562 192.126122 
L 214.551562 178.733022 
Q 214.551562 178.733022 214.551562 178.733022 
L 168.644008 178.733022 
Q 168.644008 178.733022 168.644008 178.733022 
L 168.644008 192.126122 
Q 168.644008 192.126122 168.644008 192.126122 
z
" clip-path="url(#p3016a1ec9e)" style="fill: #5ab0bb; fill-opacity: 0.85" />
   </g>
   <g id="patch_4">
    <path d="M 214.551562 192.126122 
L 316.800203 192.126122 
Q 316.800203 192.126122 316.800203 192.126122 
L 316.800203 178.733022 
Q 316.800203 178.733022 316.800203 178.733022 
L 214.551562 178.733022 
Q 214.551562 178.733022 214.551562 178.733022 
L 214.551562 192.126122 
Q 214.551562 192.126122 214.551562 192.126122 
z
" clip-path="url(#p3016a1ec9e)" style="fill: #2ba0af; fill-opacity: 0.85" />
   </g>
   <g id="patch_5">
    <path d="M 316.800203 192.126122 
L 419.048845 192.126122 
Q 419.048845 192.126122 419.048845 192.126122 
L 419.048845 178.733022 
Q 419.048845 178.733022 419.048845 178.733022 
L 316.800203 178.733022 
Q 316.800203 178.733022 316.800203 178.733022 
L 316.800203 192.126122 
Q 316.800203 192.126122 316.800203 192.126122 
z
" clip-path="url(#p3016a1ec9e)" style="fill: #0e8ea0; fill-opacity: 0.85" />
   </g>
   <g id="patch_6">
    <path d="M 419.048845 192.126122 
L 579.725281 192.126122 
Q 579.725281 192.126122 579.725281 192.126122 
L 579.725281 178.733022 
Q 579.725281 178.733022 579.725281 178.733022 
L 419.048845 178.733022 
Q 419.048845 178.733022 419.048845 178.733022 
L 419.048845 192.126122 
Q 419.048845 192.126122 419.048845 192.126122 
z
" clip-path="url(#p3016a1ec9e)" style="fill: #0b6d7a; fill-opacity: 0.85" />
   </g>
   <g id="patch_7">
    <path d="M 579.725281 192.126122 
L 740.401718 192.126122 
Q 740.401718 192.126122 740.401718 192.126122 
L 740.401718 178.733022 
Q 740.401718 178.733022 740.401718 178.733022 
L 579.725281 178.733022 
Q 579.725281 178.733022 579.725281 178.733022 
L 579.725281 192.126122 
Q 579.725281 192.126122 579.725281 192.126122 
z
" clip-path="url(#p3016a1ec9e)" style="fill: #b5741a; fill-opacity: 0.85" />
   </g>
   <g id="patch_8">
    <path d="M 740.401718 192.126122 
L 871.864257 192.126122 
Q 871.864257 192.126122 871.864257 192.126122 
L 871.864257 178.733022 
Q 871.864257 178.733022 871.864257 178.733022 
L 740.401718 178.733022 
Q 740.401718 178.733022 740.401718 178.733022 
L 740.401718 192.126122 
Q 740.401718 192.126122 740.401718 192.126122 
z
" clip-path="url(#p3016a1ec9e)" style="fill: #2f7d4f; fill-opacity: 0.85" />
   </g>
   <g id="text_1">
    <text style="font-weight: 700; font-size: 7.6px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #8fd0d9" x="111.259567" y="203.015972" transform="rotate(-0 111.259567 203.015972)">Old quantum theory</text>
   </g>
   <g id="text_2">
    <text style="font-weight: 700; font-size: 7.6px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #5ab0bb" x="191.597785" y="203.781909" transform="rotate(-0 191.597785 203.781909)">The formalism</text>
   </g>
   <g id="text_3">
    <text style="font-weight: 700; font-size: 7.6px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #2ba0af" x="265.675882" y="203.781909" transform="rotate(-0 265.675882 203.781909)">Foundations era</text>
   </g>
   <g id="text_4">
    <text style="font-weight: 700; font-size: 7.6px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #0e8ea0" x="367.924524" y="203.015972" transform="rotate(-0 367.924524 203.015972)">Birth of computing</text>
   </g>
   <g id="text_5">
    <text style="font-weight: 700; font-size: 7.6px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #0b6d7a" x="499.387063" y="203.015972" transform="rotate(-0 499.387063 203.015972)">Early experiments</text>
   </g>
   <g id="text_6">
    <text style="font-weight: 700; font-size: 7.6px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #b5741a" x="660.0635" y="203.015972" transform="rotate(-0 660.0635 203.015972)">Engineering race</text>
   </g>
   <g id="text_7">
    <text style="font-weight: 700; font-size: 7.6px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #2f7d4f" x="806.132987" y="203.781909" transform="rotate(-0 806.132987 203.781909)">Error-correction era</text>
   </g>
   <g id="line2d_1">
    <path d="M 53.875125 192.126122 
L 53.875125 194.637328 
" clip-path="url(#p3016a1ec9e)" style="fill: none; stroke: #5c6069; stroke-width: 0.7; stroke-linecap: square" />
   </g>
   <g id="text_8">
    <text style="font-size: 6.6px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #5c6069" x="53.875125" y="222.252636" transform="rotate(-0 53.875125 222.252636)">1900</text>
   </g>
   <g id="line2d_2">
    <path d="M 99.782678 192.126122 
L 99.782678 194.637328 
" clip-path="url(#p3016a1ec9e)" style="fill: none; stroke: #5c6069; stroke-width: 0.7; stroke-linecap: square" />
   </g>
   <g id="text_9">
    <text style="font-size: 6.6px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #5c6069" x="99.782678" y="222.252636" transform="rotate(-0 99.782678 222.252636)">1910</text>
   </g>
   <g id="line2d_3">
    <path d="M 145.690232 192.126122 
L 145.690232 194.637328 
" clip-path="url(#p3016a1ec9e)" style="fill: none; stroke: #5c6069; stroke-width: 0.7; stroke-linecap: square" />
   </g>
   <g id="text_10">
    <text style="font-size: 6.6px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #5c6069" x="145.690232" y="222.252636" transform="rotate(-0 145.690232 222.252636)">1920</text>
   </g>
   <g id="line2d_4">
    <path d="M 191.597785 192.126122 
L 191.597785 194.637328 
" clip-path="url(#p3016a1ec9e)" style="fill: none; stroke: #5c6069; stroke-width: 0.7; stroke-linecap: square" />
   </g>
   <g id="text_11">
    <text style="font-size: 6.6px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #5c6069" x="191.597785" y="222.252636" transform="rotate(-0 191.597785 222.252636)">1930</text>
   </g>
   <g id="line2d_5">
    <path d="M 225.912522 192.126122 
L 225.912522 194.637328 
" clip-path="url(#p3016a1ec9e)" style="fill: none; stroke: #5c6069; stroke-width: 0.7; stroke-linecap: square" />
   </g>
   <g id="text_12">
    <text style="font-size: 6.6px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #5c6069" x="225.912522" y="222.252636" transform="rotate(-0 225.912522 222.252636)">1940</text>
   </g>
   <g id="line2d_6">
    <path d="M 248.634442 192.126122 
L 248.634442 194.637328 
" clip-path="url(#p3016a1ec9e)" style="fill: none; stroke: #5c6069; stroke-width: 0.7; stroke-linecap: square" />
   </g>
   <g id="text_13">
    <text style="font-size: 6.6px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #5c6069" x="248.634442" y="222.252636" transform="rotate(-0 248.634442 222.252636)">1950</text>
   </g>
   <g id="line2d_7">
    <path d="M 271.356362 192.126122 
L 271.356362 194.637328 
" clip-path="url(#p3016a1ec9e)" style="fill: none; stroke: #5c6069; stroke-width: 0.7; stroke-linecap: square" />
   </g>
   <g id="text_14">
    <text style="font-size: 6.6px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #5c6069" x="271.356362" y="222.252636" transform="rotate(-0 271.356362 222.252636)">1960</text>
   </g>
   <g id="line2d_8">
    <path d="M 294.078283 192.126122 
L 294.078283 194.637328 
" clip-path="url(#p3016a1ec9e)" style="fill: none; stroke: #5c6069; stroke-width: 0.7; stroke-linecap: square" />
   </g>
   <g id="text_15">
    <text style="font-size: 6.6px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #5c6069" x="294.078283" y="222.252636" transform="rotate(-0 294.078283 222.252636)">1970</text>
   </g>
   <g id="line2d_9">
    <path d="M 316.800203 192.126122 
L 316.800203 194.637328 
" clip-path="url(#p3016a1ec9e)" style="fill: none; stroke: #5c6069; stroke-width: 0.7; stroke-linecap: square" />
   </g>
   <g id="text_16">
    <text style="font-size: 6.6px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #5c6069" x="316.800203" y="222.252636" transform="rotate(-0 316.800203 222.252636)">1980</text>
   </g>
   <g id="line2d_10">
    <path d="M 389.834947 192.126122 
L 389.834947 194.637328 
" clip-path="url(#p3016a1ec9e)" style="fill: none; stroke: #5c6069; stroke-width: 0.7; stroke-linecap: square" />
   </g>
   <g id="text_17">
    <text style="font-size: 6.6px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #5c6069" x="389.834947" y="222.252636" transform="rotate(-0 389.834947 222.252636)">1990</text>
   </g>
   <g id="line2d_11">
    <path d="M 475.758175 192.126122 
L 475.758175 194.637328 
" clip-path="url(#p3016a1ec9e)" style="fill: none; stroke: #5c6069; stroke-width: 0.7; stroke-linecap: square" />
   </g>
   <g id="text_18">
    <text style="font-size: 6.6px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #5c6069" x="475.758175" y="222.252636" transform="rotate(-0 475.758175 222.252636)">2000</text>
   </g>
   <g id="line2d_12">
    <path d="M 570.273726 192.126122 
L 570.273726 194.637328 
" clip-path="url(#p3016a1ec9e)" style="fill: none; stroke: #5c6069; stroke-width: 0.7; stroke-linecap: square" />
   </g>
   <g id="text_19">
    <text style="font-size: 6.6px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #5c6069" x="570.273726" y="222.252636" transform="rotate(-0 570.273726 222.252636)">2010</text>
   </g>
   <g id="line2d_13">
    <path d="M 740.401718 192.126122 
L 740.401718 194.637328 
" clip-path="url(#p3016a1ec9e)" style="fill: none; stroke: #5c6069; stroke-width: 0.7; stroke-linecap: square" />
   </g>
   <g id="text_20">
    <text style="font-size: 6.6px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #5c6069" x="740.401718" y="222.252636" transform="rotate(-0 740.401718 222.252636)">2020</text>
   </g>
   <g id="line2d_14">
    <path d="M 871.864257 192.126122 
L 871.864257 194.637328 
" clip-path="url(#p3016a1ec9e)" style="fill: none; stroke: #5c6069; stroke-width: 0.7; stroke-linecap: square" />
   </g>
   <g id="text_21">
    <text style="font-size: 6.6px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #5c6069" x="871.864257" y="222.252636" transform="rotate(-0 871.864257 222.252636)">2030</text>
   </g>
   <g id="text_22">
    <text style="font-weight: 700; font-size: 7.4px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #16181d" x="53.875125" y="140.895483" transform="rotate(-0 53.875125 140.895483)">1900</text>
   </g>
   <g id="text_23">
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #16181d" x="53.875125" y="129.406855" transform="rotate(-0 53.875125 129.406855)">Planck: energy quanta (h)</text>
   </g>
   <g id="text_24">
    <text style="font-weight: 700; font-size: 7.4px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #16181d" x="76.828902" y="278.878203" transform="rotate(-0 76.828902 278.878203)">1905</text>
   </g>
   <g id="text_25">
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #16181d" x="76.828902" y="288.953362" transform="rotate(-0 76.828902 288.953362)">Einstein: light quanta</text>
   </g>
   <g id="text_26">
    <text style="font-weight: 700; font-size: 7.4px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #16181d" x="168.644008" y="115.783421" transform="rotate(-0 168.644008 115.783421)">1925</text>
   </g>
   <g id="text_27">
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; fill: #16181d" transform="translate(121.798446 97.094794)">Heisenberg / Schrödinger:</text>
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; fill: #16181d" transform="translate(131.920633 104.294794)">quantum mechanics</text>
   </g>
   <g id="text_28">
    <text style="font-weight: 700; font-size: 7.4px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #16181d" x="214.551562" y="305.664402" transform="rotate(-0 214.551562 305.664402)">1935</text>
   </g>
   <g id="text_29">
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; fill: #16181d" transform="translate(190.562062 315.739561)">EPR paradox;</text>
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; fill: #16181d" transform="translate(173.622937 322.939561)">&#39;entanglement&#39; named</text>
   </g>
   <g id="text_30">
    <text style="font-weight: 700; font-size: 7.4px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #16181d" x="280.445131" y="90.667891" transform="rotate(-0 280.445131 90.667891)">1964</text>
   </g>
   <g id="text_31">
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #16181d" x="280.445131" y="79.880232" transform="rotate(-0 280.445131 79.880232)">Bell&#39;s theorem</text>
   </g>
   <g id="text_32">
    <text style="font-weight: 700; font-size: 7.4px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #16181d" x="298.622667" y="332.450601" transform="rotate(-0 298.622667 332.450601)">1972</text>
   </g>
   <g id="text_33">
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; fill: #16181d" transform="translate(275.160792 343.22326)">First Bell test</text>
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; fill: #16181d" transform="translate(262.522542 349.999698)">(Freedman–Clauser)</text>
   </g>
   <g id="text_34">
    <text style="font-weight: 700; font-size: 7.4px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #16181d" x="331.407152" y="65.559298" transform="rotate(-0 331.407152 65.559298)">1982</text>
   </g>
   <g id="text_35">
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #16181d" x="331.407152" y="54.070671" transform="rotate(-0 331.407152 54.070671)">No-cloning theorem</text>
   </g>
   <g id="text_36">
    <text style="font-weight: 700; font-size: 7.4px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #16181d" x="346.014101" y="359.2368" transform="rotate(-0 346.014101 359.2368)">1984</text>
   </g>
   <g id="text_37">
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #16181d" x="346.014101" y="369.311959" transform="rotate(-0 346.014101 369.311959)">BB84 key distribution</text>
   </g>
   <g id="text_38">
    <text style="font-weight: 700; font-size: 7.4px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #16181d" x="353.317575" y="140.895483" transform="rotate(-0 353.317575 140.895483)">1985</text>
   </g>
   <g id="text_39">
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #16181d" x="353.317575" y="129.69148" transform="rotate(-0 353.317575 129.69148)">Deutsch: universal QC</text>
   </g>
   <g id="text_40">
    <text style="font-weight: 700; font-size: 7.4px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #16181d" x="419.048845" y="278.874734" transform="rotate(-0 419.048845 278.874734)">1994</text>
   </g>
   <g id="text_41">
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #16181d" x="419.048845" y="288.953362" transform="rotate(-0 419.048845 288.953362)">Shor&#39;s algorithm</text>
   </g>
   <g id="text_42">
    <text style="font-weight: 700; font-size: 7.4px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #16181d" x="437.951955" y="115.779953" transform="rotate(-0 437.951955 115.779953)">1996</text>
   </g>
   <g id="text_43">
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; fill: #16181d" transform="translate(402.839017 97.379419)">Grover; QEC codes;</text>
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; fill: #16181d" transform="translate(404.621017 104.992294)">threshold theorem</text>
   </g>
   <g id="text_44">
    <text style="font-weight: 700; font-size: 7.4px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #16181d" x="475.758175" y="305.664402" transform="rotate(-0 475.758175 305.664402)">2000</text>
   </g>
   <g id="text_45">
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #16181d" x="475.758175" y="316.437061" transform="rotate(-0 475.758175 316.437061)">DiVincenzo criteria</text>
   </g>
   <g id="text_46">
    <text style="font-weight: 700; font-size: 7.4px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #16181d" x="485.20973" y="90.67136" transform="rotate(-0 485.20973 90.67136)">2001</text>
   </g>
   <g id="text_47">
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #16181d" x="485.20973" y="79.45667" transform="rotate(-0 485.20973 79.45667)">Shor factors 15 (NMR)</text>
   </g>
   <g id="text_48">
    <text style="font-weight: 700; font-size: 7.4px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #16181d" x="541.919061" y="332.450601" transform="rotate(-0 541.919061 332.450601)">2007</text>
   </g>
   <g id="text_49">
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #16181d" x="541.919061" y="342.52576" transform="rotate(-0 541.919061 342.52576)">Transmon qubit</text>
   </g>
   <g id="text_50">
    <text style="font-weight: 700; font-size: 7.4px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #16181d" x="579.725281" y="65.559298" transform="rotate(-0 579.725281 65.559298)">2011</text>
   </g>
   <g id="text_51">
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #16181d" x="579.725281" y="54.768171" transform="rotate(-0 579.725281 54.768171)">D-Wave One sold</text>
   </g>
   <g id="text_52">
    <text style="font-weight: 700; font-size: 7.4px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #16181d" x="651.137031" y="359.2368" transform="rotate(-0 651.137031 359.2368)">2015</text>
   </g>
   <g id="text_53">
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; fill: #16181d" transform="translate(626.406718 369.311959)">Loophole-free</text>
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; fill: #16181d" transform="translate(634.519093 377.209459)">Bell tests</text>
   </g>
   <g id="text_54">
    <text style="font-weight: 700; font-size: 7.4px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #16181d" x="722.548781" y="140.895483" transform="rotate(-0 722.548781 140.895483)">2019</text>
   </g>
   <g id="text_55">
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; fill: #16181d" transform="translate(704.621906 122.143293)">Sycamore</text>
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; fill: #16181d" transform="translate(700.688906 129.296043)">&#39;supremacy&#39;</text>
   </g>
   <g id="text_56">
    <text style="font-weight: 700; font-size: 7.4px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #16181d" x="784.222564" y="278.878203" transform="rotate(-0 784.222564 278.878203)">2022</text>
   </g>
   <g id="text_57">
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; fill: #16181d" transform="translate(754.851064 289.650862)">Nobel: Bell tests</text>
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; fill: #16181d" transform="translate(737.243127 296.153362)">(Aspect/Clauser/Zeilinger)</text>
   </g>
   <g id="text_58">
    <text style="font-weight: 700; font-size: 7.4px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #16181d" x="806.132987" y="115.783421" transform="rotate(-0 806.132987 115.783421)">2023</text>
   </g>
   <g id="text_59">
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; fill: #16181d" transform="translate(776.450425 97.094794)">48 logical qubits</text>
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; fill: #16181d" transform="translate(792.247675 104.564794)">(QuEra)</text>
   </g>
   <g id="text_60">
    <text style="font-weight: 700; font-size: 7.4px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #16181d" x="828.043411" y="305.664402" transform="rotate(-0 828.043411 305.664402)">2024</text>
   </g>
   <g id="text_61">
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; fill: #16181d" transform="translate(802.309598 316.437061)">Willow: below-</text>
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; fill: #16181d" transform="translate(802.323098 323.224186)">threshold QEC</text>
   </g>
   <g id="text_62">
    <text style="font-weight: 700; font-size: 7.4px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #16181d" x="849.953834" y="90.67136" transform="rotate(-0 849.953834 90.67136)">2025</text>
   </g>
   <g id="text_63">
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; fill: #16181d" transform="translate(814.582146 71.982732)">Nobel: macroscopic</text>
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; fill: #16181d" transform="translate(819.627771 79.182732)">quantum circuits</text>
   </g>
   <g id="text_64">
    <text style="font-weight: 700; font-size: 7.4px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #16181d" x="871.864257" y="332.450601" transform="rotate(-0 871.864257 332.450601)">2026</text>
   </g>
   <g id="text_65">
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; fill: #16181d" transform="translate(842.181695 342.52576)">96 logical qubits</text>
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; fill: #16181d" transform="translate(843.482757 349.99576)">(QuEra, Nature)</text>
   </g>
   <g id="text_66">
    <text style="font-weight: 700; font-size: 15px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #16181d" x="17.357753" y="18.597656" transform="rotate(-0 17.357753 18.597656)">A century of quantum, 1900 → 2026</text>
   </g>
   <g id="text_67">
    <text style="font-size: 9px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #5c6069" x="17.357753" y="39.291643" transform="rotate(-0 17.357753 39.291643)">milestones from the §07 history cards, banded by era — ★ marks a physics Nobel</text>
   </g>
   <g id="text_68">
    <text style="font-style: italic; font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: end; fill: #5c6069" x="915.685103" y="392.967064" transform="rotate(-0 915.685103 392.967064)">time axis compressed 1935–1980 so the modern era is legible</text>
   </g>
   <g id="line2d_15">
    <path d="M 53.875125 178.733022 
L 53.875125 143.576136 
" clip-path="url(#p3016a1ec9e)" style="fill: none; stroke: #5c6069; stroke-width: 0.6; stroke-linecap: square" />
   </g>
   <g id="line2d_16">
    <path d="M 76.828902 192.126122 
L 76.828902 270.810581 
" clip-path="url(#p3016a1ec9e)" style="fill: none; stroke: #5c6069; stroke-width: 0.6; stroke-linecap: square" />
   </g>
   <g id="line2d_17">
    <path d="M 168.644008 178.733022 
L 168.644008 118.464075 
" clip-path="url(#p3016a1ec9e)" style="fill: none; stroke: #5c6069; stroke-width: 0.6; stroke-linecap: square" />
   </g>
   <g id="line2d_18">
    <path d="M 214.551562 192.126122 
L 214.551562 297.59678 
" clip-path="url(#p3016a1ec9e)" style="fill: none; stroke: #5c6069; stroke-width: 0.6; stroke-linecap: square" />
   </g>
   <g id="line2d_19">
    <path d="M 280.445131 178.733022 
L 280.445131 93.352013 
" clip-path="url(#p3016a1ec9e)" style="fill: none; stroke: #5c6069; stroke-width: 0.6; stroke-linecap: square" />
   </g>
   <g id="line2d_20">
    <path d="M 298.622667 192.126122 
L 298.622667 324.382979 
" clip-path="url(#p3016a1ec9e)" style="fill: none; stroke: #5c6069; stroke-width: 0.6; stroke-linecap: square" />
   </g>
   <g id="line2d_21">
    <path d="M 331.407152 178.733022 
L 331.407152 68.239951 
" clip-path="url(#p3016a1ec9e)" style="fill: none; stroke: #5c6069; stroke-width: 0.6; stroke-linecap: square" />
   </g>
   <g id="line2d_22">
    <path d="M 346.014101 192.126122 
L 346.014101 351.169178 
" clip-path="url(#p3016a1ec9e)" style="fill: none; stroke: #5c6069; stroke-width: 0.6; stroke-linecap: square" />
   </g>
   <g id="line2d_23">
    <path d="M 353.317575 178.733022 
L 353.317575 143.576136 
" clip-path="url(#p3016a1ec9e)" style="fill: none; stroke: #5c6069; stroke-width: 0.6; stroke-linecap: square" />
   </g>
   <g id="line2d_24">
    <path d="M 419.048845 192.126122 
L 419.048845 270.810581 
" clip-path="url(#p3016a1ec9e)" style="fill: none; stroke: #5c6069; stroke-width: 0.6; stroke-linecap: square" />
   </g>
   <g id="line2d_25">
    <path d="M 437.951955 178.733022 
L 437.951955 118.464075 
" clip-path="url(#p3016a1ec9e)" style="fill: none; stroke: #5c6069; stroke-width: 0.6; stroke-linecap: square" />
   </g>
   <g id="line2d_26">
    <path d="M 475.758175 192.126122 
L 475.758175 297.59678 
" clip-path="url(#p3016a1ec9e)" style="fill: none; stroke: #5c6069; stroke-width: 0.6; stroke-linecap: square" />
   </g>
   <g id="line2d_27">
    <path d="M 485.20973 178.733022 
L 485.20973 93.352013 
" clip-path="url(#p3016a1ec9e)" style="fill: none; stroke: #5c6069; stroke-width: 0.6; stroke-linecap: square" />
   </g>
   <g id="line2d_28">
    <path d="M 541.919061 192.126122 
L 541.919061 324.382979 
" clip-path="url(#p3016a1ec9e)" style="fill: none; stroke: #5c6069; stroke-width: 0.6; stroke-linecap: square" />
   </g>
   <g id="line2d_29">
    <path d="M 579.725281 178.733022 
L 579.725281 68.239951 
" clip-path="url(#p3016a1ec9e)" style="fill: none; stroke: #5c6069; stroke-width: 0.6; stroke-linecap: square" />
   </g>
   <g id="line2d_30">
    <path d="M 651.137031 192.126122 
L 651.137031 351.169178 
" clip-path="url(#p3016a1ec9e)" style="fill: none; stroke: #5c6069; stroke-width: 0.6; stroke-linecap: square" />
   </g>
   <g id="line2d_31">
    <path d="M 722.548781 178.733022 
L 722.548781 143.576136 
" clip-path="url(#p3016a1ec9e)" style="fill: none; stroke: #5c6069; stroke-width: 0.6; stroke-linecap: square" />
   </g>
   <g id="line2d_32">
    <path d="M 784.222564 192.126122 
L 784.222564 270.810581 
" clip-path="url(#p3016a1ec9e)" style="fill: none; stroke: #5c6069; stroke-width: 0.6; stroke-linecap: square" />
   </g>
   <g id="line2d_33">
    <path d="M 806.132987 178.733022 
L 806.132987 118.464075 
" clip-path="url(#p3016a1ec9e)" style="fill: none; stroke: #5c6069; stroke-width: 0.6; stroke-linecap: square" />
   </g>
   <g id="line2d_34">
    <path d="M 828.043411 192.126122 
L 828.043411 297.59678 
" clip-path="url(#p3016a1ec9e)" style="fill: none; stroke: #5c6069; stroke-width: 0.6; stroke-linecap: square" />
   </g>
   <g id="line2d_35">
    <path d="M 849.953834 178.733022 
L 849.953834 93.352013 
" clip-path="url(#p3016a1ec9e)" style="fill: none; stroke: #5c6069; stroke-width: 0.6; stroke-linecap: square" />
   </g>
   <g id="line2d_36">
    <path d="M 871.864257 192.126122 
L 871.864257 324.382979 
" clip-path="url(#p3016a1ec9e)" style="fill: none; stroke: #5c6069; stroke-width: 0.6; stroke-linecap: square" />
   </g>
   <g id="PathCollection_1">
    <defs>
     <path id="m11c352dd29" d="M 0 3.5 
C 0.928211 3.5 1.81853 3.131218 2.474874 2.474874 
C 3.131218 1.81853 3.5 0.928211 3.5 0 
C 3.5 -0.928211 3.131218 -1.81853 2.474874 -2.474874 
C 1.81853 -3.131218 0.928211 -3.5 0 -3.5 
C -0.928211 -3.5 -1.81853 -3.131218 -2.474874 -2.474874 
C -3.131218 -1.81853 -3.5 -0.928211 -3.5 0 
C -3.5 0.928211 -3.131218 1.81853 -2.474874 2.474874 
C -1.81853 3.131218 -0.928211 3.5 0 3.5 
z
" style="stroke: #faf9f6; stroke-width: 0.8" />
    </defs>
    <g clip-path="url(#p3016a1ec9e)">
     <use xlink:href="#m11c352dd29" x="53.875125" y="185.429572" style="fill: #0e8ea0; stroke: #faf9f6; stroke-width: 0.8" />
    </g>
   </g>
   <g id="PathCollection_2">
    <g clip-path="url(#p3016a1ec9e)">
     <use xlink:href="#m11c352dd29" x="76.828902" y="185.429572" style="fill: #0e8ea0; stroke: #faf9f6; stroke-width: 0.8" />
    </g>
   </g>
   <g id="PathCollection_3">
    <g clip-path="url(#p3016a1ec9e)">
     <use xlink:href="#m11c352dd29" x="168.644008" y="185.429572" style="fill: #0e8ea0; stroke: #faf9f6; stroke-width: 0.8" />
    </g>
   </g>
   <g id="PathCollection_4">
    <g clip-path="url(#p3016a1ec9e)">
     <use xlink:href="#m11c352dd29" x="214.551562" y="185.429572" style="fill: #0e8ea0; stroke: #faf9f6; stroke-width: 0.8" />
    </g>
   </g>
   <g id="PathCollection_5">
    <g clip-path="url(#p3016a1ec9e)">
     <use xlink:href="#m11c352dd29" x="280.445131" y="185.429572" style="fill: #0e8ea0; stroke: #faf9f6; stroke-width: 0.8" />
    </g>
   </g>
   <g id="PathCollection_6">
    <g clip-path="url(#p3016a1ec9e)">
     <use xlink:href="#m11c352dd29" x="298.622667" y="185.429572" style="fill: #0e8ea0; stroke: #faf9f6; stroke-width: 0.8" />
    </g>
   </g>
   <g id="PathCollection_7">
    <g clip-path="url(#p3016a1ec9e)">
     <use xlink:href="#m11c352dd29" x="331.407152" y="185.429572" style="fill: #0e8ea0; stroke: #faf9f6; stroke-width: 0.8" />
    </g>
   </g>
   <g id="PathCollection_8">
    <g clip-path="url(#p3016a1ec9e)">
     <use xlink:href="#m11c352dd29" x="346.014101" y="185.429572" style="fill: #0e8ea0; stroke: #faf9f6; stroke-width: 0.8" />
    </g>
   </g>
   <g id="PathCollection_9">
    <g clip-path="url(#p3016a1ec9e)">
     <use xlink:href="#m11c352dd29" x="353.317575" y="185.429572" style="fill: #0e8ea0; stroke: #faf9f6; stroke-width: 0.8" />
    </g>
   </g>
   <g id="PathCollection_10">
    <g clip-path="url(#p3016a1ec9e)">
     <use xlink:href="#m11c352dd29" x="419.048845" y="185.429572" style="fill: #0e8ea0; stroke: #faf9f6; stroke-width: 0.8" />
    </g>
   </g>
   <g id="PathCollection_11">
    <g clip-path="url(#p3016a1ec9e)">
     <use xlink:href="#m11c352dd29" x="437.951955" y="185.429572" style="fill: #0e8ea0; stroke: #faf9f6; stroke-width: 0.8" />
    </g>
   </g>
   <g id="PathCollection_12">
    <g clip-path="url(#p3016a1ec9e)">
     <use xlink:href="#m11c352dd29" x="475.758175" y="185.429572" style="fill: #0e8ea0; stroke: #faf9f6; stroke-width: 0.8" />
    </g>
   </g>
   <g id="PathCollection_13">
    <g clip-path="url(#p3016a1ec9e)">
     <use xlink:href="#m11c352dd29" x="485.20973" y="185.429572" style="fill: #0e8ea0; stroke: #faf9f6; stroke-width: 0.8" />
    </g>
   </g>
   <g id="PathCollection_14">
    <g clip-path="url(#p3016a1ec9e)">
     <use xlink:href="#m11c352dd29" x="541.919061" y="185.429572" style="fill: #0e8ea0; stroke: #faf9f6; stroke-width: 0.8" />
    </g>
   </g>
   <g id="PathCollection_15">
    <g clip-path="url(#p3016a1ec9e)">
     <use xlink:href="#m11c352dd29" x="579.725281" y="185.429572" style="fill: #0e8ea0; stroke: #faf9f6; stroke-width: 0.8" />
    </g>
   </g>
   <g id="PathCollection_16">
    <g clip-path="url(#p3016a1ec9e)">
     <use xlink:href="#m11c352dd29" x="651.137031" y="185.429572" style="fill: #0e8ea0; stroke: #faf9f6; stroke-width: 0.8" />
    </g>
   </g>
   <g id="PathCollection_17">
    <g clip-path="url(#p3016a1ec9e)">
     <use xlink:href="#m11c352dd29" x="722.548781" y="185.429572" style="fill: #0e8ea0; stroke: #faf9f6; stroke-width: 0.8" />
    </g>
   </g>
   <g id="PathCollection_18">
    <defs>
     <path id="mf729b8a010" d="M 0 -5.809475 
L -1.304308 -1.795226 
L -5.525139 -1.795227 
L -2.110415 0.685715 
L -3.414724 4.699964 
L -0 2.219022 
L 3.414724 4.699964 
L 2.110415 0.685715 
L 5.525139 -1.795227 
L 1.304308 -1.795226 
z
" style="stroke: #faf9f6; stroke-width: 0.8" />
    </defs>
    <g clip-path="url(#p3016a1ec9e)">
     <use xlink:href="#mf729b8a010" x="784.222564" y="185.429572" style="fill: #b5741a; stroke: #faf9f6; stroke-width: 0.8" />
    </g>
   </g>
   <g id="PathCollection_19">
    <g clip-path="url(#p3016a1ec9e)">
     <use xlink:href="#m11c352dd29" x="806.132987" y="185.429572" style="fill: #0e8ea0; stroke: #faf9f6; stroke-width: 0.8" />
    </g>
   </g>
   <g id="PathCollection_20">
    <g clip-path="url(#p3016a1ec9e)">
     <use xlink:href="#m11c352dd29" x="828.043411" y="185.429572" style="fill: #0e8ea0; stroke: #faf9f6; stroke-width: 0.8" />
    </g>
   </g>
   <g id="PathCollection_21">
    <g clip-path="url(#p3016a1ec9e)">
     <use xlink:href="#mf729b8a010" x="849.953834" y="185.429572" style="fill: #b5741a; stroke: #faf9f6; stroke-width: 0.8" />
    </g>
   </g>
   <g id="PathCollection_22">
    <g clip-path="url(#p3016a1ec9e)">
     <use xlink:href="#m11c352dd29" x="871.864257" y="185.429572" style="fill: #0e8ea0; stroke: #faf9f6; stroke-width: 0.8" />
    </g>
   </g>
  </g>
 </g>
 <defs>
  <clippath id="p3016a1ec9e">
   <rect x="17.357753" y="9.645141" width="898.32735" height="393.422298" />
  </clippath>
 </defs>
</svg></span><span class="fig-dark"><svg xmlns:xlink="http://www.w3.org/1999/xlink" width="922.885103pt" height="410.267439pt" viewbox="0 0 922.885103 410.267439" xmlns="http://www.w3.org/2000/svg" version="1.1">
 <metadata>
  <rdf xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:cc="http://creativecommons.org/ns#" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
   <work>
    <type rdf:resource="http://purl.org/dc/dcmitype/StillImage"></type>
    <date>2026-07-09T09:57:13.210429</date>
    <format>image/svg+xml</format>
    <creator>
     <agent>
      <title>Matplotlib v3.11.0, https://matplotlib.org/</title>
     </agent>
    </creator>
   </work>
  </rdf>
 </metadata>
 <defs>
  <style type="text/css">*{stroke-linejoin: round; stroke-linecap: butt}</style>
 </defs>
 <g id="figure_1">
  <g id="patch_1">
   <path d="M 0 410.267439 
L 922.885103 410.267439 
L 922.885103 0 
L 0 0 
z
" style="fill: #16181d" />
  </g>
  <g id="axes_1">
   <g id="patch_2">
    <path d="M 53.875125 192.126122 
L 168.644008 192.126122 
Q 168.644008 192.126122 168.644008 192.126122 
L 168.644008 178.733022 
Q 168.644008 178.733022 168.644008 178.733022 
L 53.875125 178.733022 
Q 53.875125 178.733022 53.875125 178.733022 
L 53.875125 192.126122 
Q 53.875125 192.126122 53.875125 192.126122 
z
" clip-path="url(#pc0e3938fb1)" style="fill: #8fd0d9; fill-opacity: 0.9" />
   </g>
   <g id="patch_3">
    <path d="M 168.644008 192.126122 
L 214.551562 192.126122 
Q 214.551562 192.126122 214.551562 192.126122 
L 214.551562 178.733022 
Q 214.551562 178.733022 214.551562 178.733022 
L 168.644008 178.733022 
Q 168.644008 178.733022 168.644008 178.733022 
L 168.644008 192.126122 
Q 168.644008 192.126122 168.644008 192.126122 
z
" clip-path="url(#pc0e3938fb1)" style="fill: #5ab0bb; fill-opacity: 0.9" />
   </g>
   <g id="patch_4">
    <path d="M 214.551562 192.126122 
L 316.800203 192.126122 
Q 316.800203 192.126122 316.800203 192.126122 
L 316.800203 178.733022 
Q 316.800203 178.733022 316.800203 178.733022 
L 214.551562 178.733022 
Q 214.551562 178.733022 214.551562 178.733022 
L 214.551562 192.126122 
Q 214.551562 192.126122 214.551562 192.126122 
z
" clip-path="url(#pc0e3938fb1)" style="fill: #2ba0af; fill-opacity: 0.9" />
   </g>
   <g id="patch_5">
    <path d="M 316.800203 192.126122 
L 419.048845 192.126122 
Q 419.048845 192.126122 419.048845 192.126122 
L 419.048845 178.733022 
Q 419.048845 178.733022 419.048845 178.733022 
L 316.800203 178.733022 
Q 316.800203 178.733022 316.800203 178.733022 
L 316.800203 192.126122 
Q 316.800203 192.126122 316.800203 192.126122 
z
" clip-path="url(#pc0e3938fb1)" style="fill: #0e8ea0; fill-opacity: 0.9" />
   </g>
   <g id="patch_6">
    <path d="M 419.048845 192.126122 
L 579.725281 192.126122 
Q 579.725281 192.126122 579.725281 192.126122 
L 579.725281 178.733022 
Q 579.725281 178.733022 579.725281 178.733022 
L 419.048845 178.733022 
Q 419.048845 178.733022 419.048845 178.733022 
L 419.048845 192.126122 
Q 419.048845 192.126122 419.048845 192.126122 
z
" clip-path="url(#pc0e3938fb1)" style="fill: #0b6d7a; fill-opacity: 0.9" />
   </g>
   <g id="patch_7">
    <path d="M 579.725281 192.126122 
L 740.401718 192.126122 
Q 740.401718 192.126122 740.401718 192.126122 
L 740.401718 178.733022 
Q 740.401718 178.733022 740.401718 178.733022 
L 579.725281 178.733022 
Q 579.725281 178.733022 579.725281 178.733022 
L 579.725281 192.126122 
Q 579.725281 192.126122 579.725281 192.126122 
z
" clip-path="url(#pc0e3938fb1)" style="fill: #b5741a; fill-opacity: 0.9" />
   </g>
   <g id="patch_8">
    <path d="M 740.401718 192.126122 
L 871.864257 192.126122 
Q 871.864257 192.126122 871.864257 192.126122 
L 871.864257 178.733022 
Q 871.864257 178.733022 871.864257 178.733022 
L 740.401718 178.733022 
Q 740.401718 178.733022 740.401718 178.733022 
L 740.401718 192.126122 
Q 740.401718 192.126122 740.401718 192.126122 
z
" clip-path="url(#pc0e3938fb1)" style="fill: #2f7d4f; fill-opacity: 0.9" />
   </g>
   <g id="text_1">
    <text style="font-weight: 700; font-size: 7.6px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #8fd0d9" x="111.259567" y="203.015972" transform="rotate(-0 111.259567 203.015972)">Old quantum theory</text>
   </g>
   <g id="text_2">
    <text style="font-weight: 700; font-size: 7.6px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #5ab0bb" x="191.597785" y="203.781909" transform="rotate(-0 191.597785 203.781909)">The formalism</text>
   </g>
   <g id="text_3">
    <text style="font-weight: 700; font-size: 7.6px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #2ba0af" x="265.675882" y="203.781909" transform="rotate(-0 265.675882 203.781909)">Foundations era</text>
   </g>
   <g id="text_4">
    <text style="font-weight: 700; font-size: 7.6px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #0e8ea0" x="367.924524" y="203.015972" transform="rotate(-0 367.924524 203.015972)">Birth of computing</text>
   </g>
   <g id="text_5">
    <text style="font-weight: 700; font-size: 7.6px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #0b6d7a" x="499.387063" y="203.015972" transform="rotate(-0 499.387063 203.015972)">Early experiments</text>
   </g>
   <g id="text_6">
    <text style="font-weight: 700; font-size: 7.6px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #b5741a" x="660.0635" y="203.015972" transform="rotate(-0 660.0635 203.015972)">Engineering race</text>
   </g>
   <g id="text_7">
    <text style="font-weight: 700; font-size: 7.6px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #2f7d4f" x="806.132987" y="203.781909" transform="rotate(-0 806.132987 203.781909)">Error-correction era</text>
   </g>
   <g id="line2d_1">
    <path d="M 53.875125 192.126122 
L 53.875125 194.637328 
" clip-path="url(#pc0e3938fb1)" style="fill: none; stroke: #9a9ea8; stroke-width: 0.7; stroke-linecap: square" />
   </g>
   <g id="text_8">
    <text style="font-size: 6.6px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #9a9ea8" x="53.875125" y="222.252636" transform="rotate(-0 53.875125 222.252636)">1900</text>
   </g>
   <g id="line2d_2">
    <path d="M 99.782678 192.126122 
L 99.782678 194.637328 
" clip-path="url(#pc0e3938fb1)" style="fill: none; stroke: #9a9ea8; stroke-width: 0.7; stroke-linecap: square" />
   </g>
   <g id="text_9">
    <text style="font-size: 6.6px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #9a9ea8" x="99.782678" y="222.252636" transform="rotate(-0 99.782678 222.252636)">1910</text>
   </g>
   <g id="line2d_3">
    <path d="M 145.690232 192.126122 
L 145.690232 194.637328 
" clip-path="url(#pc0e3938fb1)" style="fill: none; stroke: #9a9ea8; stroke-width: 0.7; stroke-linecap: square" />
   </g>
   <g id="text_10">
    <text style="font-size: 6.6px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #9a9ea8" x="145.690232" y="222.252636" transform="rotate(-0 145.690232 222.252636)">1920</text>
   </g>
   <g id="line2d_4">
    <path d="M 191.597785 192.126122 
L 191.597785 194.637328 
" clip-path="url(#pc0e3938fb1)" style="fill: none; stroke: #9a9ea8; stroke-width: 0.7; stroke-linecap: square" />
   </g>
   <g id="text_11">
    <text style="font-size: 6.6px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #9a9ea8" x="191.597785" y="222.252636" transform="rotate(-0 191.597785 222.252636)">1930</text>
   </g>
   <g id="line2d_5">
    <path d="M 225.912522 192.126122 
L 225.912522 194.637328 
" clip-path="url(#pc0e3938fb1)" style="fill: none; stroke: #9a9ea8; stroke-width: 0.7; stroke-linecap: square" />
   </g>
   <g id="text_12">
    <text style="font-size: 6.6px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #9a9ea8" x="225.912522" y="222.252636" transform="rotate(-0 225.912522 222.252636)">1940</text>
   </g>
   <g id="line2d_6">
    <path d="M 248.634442 192.126122 
L 248.634442 194.637328 
" clip-path="url(#pc0e3938fb1)" style="fill: none; stroke: #9a9ea8; stroke-width: 0.7; stroke-linecap: square" />
   </g>
   <g id="text_13">
    <text style="font-size: 6.6px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #9a9ea8" x="248.634442" y="222.252636" transform="rotate(-0 248.634442 222.252636)">1950</text>
   </g>
   <g id="line2d_7">
    <path d="M 271.356362 192.126122 
L 271.356362 194.637328 
" clip-path="url(#pc0e3938fb1)" style="fill: none; stroke: #9a9ea8; stroke-width: 0.7; stroke-linecap: square" />
   </g>
   <g id="text_14">
    <text style="font-size: 6.6px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #9a9ea8" x="271.356362" y="222.252636" transform="rotate(-0 271.356362 222.252636)">1960</text>
   </g>
   <g id="line2d_8">
    <path d="M 294.078283 192.126122 
L 294.078283 194.637328 
" clip-path="url(#pc0e3938fb1)" style="fill: none; stroke: #9a9ea8; stroke-width: 0.7; stroke-linecap: square" />
   </g>
   <g id="text_15">
    <text style="font-size: 6.6px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #9a9ea8" x="294.078283" y="222.252636" transform="rotate(-0 294.078283 222.252636)">1970</text>
   </g>
   <g id="line2d_9">
    <path d="M 316.800203 192.126122 
L 316.800203 194.637328 
" clip-path="url(#pc0e3938fb1)" style="fill: none; stroke: #9a9ea8; stroke-width: 0.7; stroke-linecap: square" />
   </g>
   <g id="text_16">
    <text style="font-size: 6.6px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #9a9ea8" x="316.800203" y="222.252636" transform="rotate(-0 316.800203 222.252636)">1980</text>
   </g>
   <g id="line2d_10">
    <path d="M 389.834947 192.126122 
L 389.834947 194.637328 
" clip-path="url(#pc0e3938fb1)" style="fill: none; stroke: #9a9ea8; stroke-width: 0.7; stroke-linecap: square" />
   </g>
   <g id="text_17">
    <text style="font-size: 6.6px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #9a9ea8" x="389.834947" y="222.252636" transform="rotate(-0 389.834947 222.252636)">1990</text>
   </g>
   <g id="line2d_11">
    <path d="M 475.758175 192.126122 
L 475.758175 194.637328 
" clip-path="url(#pc0e3938fb1)" style="fill: none; stroke: #9a9ea8; stroke-width: 0.7; stroke-linecap: square" />
   </g>
   <g id="text_18">
    <text style="font-size: 6.6px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #9a9ea8" x="475.758175" y="222.252636" transform="rotate(-0 475.758175 222.252636)">2000</text>
   </g>
   <g id="line2d_12">
    <path d="M 570.273726 192.126122 
L 570.273726 194.637328 
" clip-path="url(#pc0e3938fb1)" style="fill: none; stroke: #9a9ea8; stroke-width: 0.7; stroke-linecap: square" />
   </g>
   <g id="text_19">
    <text style="font-size: 6.6px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #9a9ea8" x="570.273726" y="222.252636" transform="rotate(-0 570.273726 222.252636)">2010</text>
   </g>
   <g id="line2d_13">
    <path d="M 740.401718 192.126122 
L 740.401718 194.637328 
" clip-path="url(#pc0e3938fb1)" style="fill: none; stroke: #9a9ea8; stroke-width: 0.7; stroke-linecap: square" />
   </g>
   <g id="text_20">
    <text style="font-size: 6.6px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #9a9ea8" x="740.401718" y="222.252636" transform="rotate(-0 740.401718 222.252636)">2020</text>
   </g>
   <g id="line2d_14">
    <path d="M 871.864257 192.126122 
L 871.864257 194.637328 
" clip-path="url(#pc0e3938fb1)" style="fill: none; stroke: #9a9ea8; stroke-width: 0.7; stroke-linecap: square" />
   </g>
   <g id="text_21">
    <text style="font-size: 6.6px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #9a9ea8" x="871.864257" y="222.252636" transform="rotate(-0 871.864257 222.252636)">2030</text>
   </g>
   <g id="text_22">
    <text style="font-weight: 700; font-size: 7.4px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #f3f1ec" x="53.875125" y="140.895483" transform="rotate(-0 53.875125 140.895483)">1900</text>
   </g>
   <g id="text_23">
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #f3f1ec" x="53.875125" y="129.406855" transform="rotate(-0 53.875125 129.406855)">Planck: energy quanta (h)</text>
   </g>
   <g id="text_24">
    <text style="font-weight: 700; font-size: 7.4px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #f3f1ec" x="76.828902" y="278.878203" transform="rotate(-0 76.828902 278.878203)">1905</text>
   </g>
   <g id="text_25">
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #f3f1ec" x="76.828902" y="288.953362" transform="rotate(-0 76.828902 288.953362)">Einstein: light quanta</text>
   </g>
   <g id="text_26">
    <text style="font-weight: 700; font-size: 7.4px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #f3f1ec" x="168.644008" y="115.783421" transform="rotate(-0 168.644008 115.783421)">1925</text>
   </g>
   <g id="text_27">
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; fill: #f3f1ec" transform="translate(121.798446 97.094794)">Heisenberg / Schrödinger:</text>
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; fill: #f3f1ec" transform="translate(131.920633 104.294794)">quantum mechanics</text>
   </g>
   <g id="text_28">
    <text style="font-weight: 700; font-size: 7.4px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #f3f1ec" x="214.551562" y="305.664402" transform="rotate(-0 214.551562 305.664402)">1935</text>
   </g>
   <g id="text_29">
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; fill: #f3f1ec" transform="translate(190.562062 315.739561)">EPR paradox;</text>
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; fill: #f3f1ec" transform="translate(173.622937 322.939561)">&#39;entanglement&#39; named</text>
   </g>
   <g id="text_30">
    <text style="font-weight: 700; font-size: 7.4px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #f3f1ec" x="280.445131" y="90.667891" transform="rotate(-0 280.445131 90.667891)">1964</text>
   </g>
   <g id="text_31">
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #f3f1ec" x="280.445131" y="79.880232" transform="rotate(-0 280.445131 79.880232)">Bell&#39;s theorem</text>
   </g>
   <g id="text_32">
    <text style="font-weight: 700; font-size: 7.4px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #f3f1ec" x="298.622667" y="332.450601" transform="rotate(-0 298.622667 332.450601)">1972</text>
   </g>
   <g id="text_33">
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; fill: #f3f1ec" transform="translate(275.160792 343.22326)">First Bell test</text>
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; fill: #f3f1ec" transform="translate(262.522542 349.999698)">(Freedman–Clauser)</text>
   </g>
   <g id="text_34">
    <text style="font-weight: 700; font-size: 7.4px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #f3f1ec" x="331.407152" y="65.559298" transform="rotate(-0 331.407152 65.559298)">1982</text>
   </g>
   <g id="text_35">
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #f3f1ec" x="331.407152" y="54.070671" transform="rotate(-0 331.407152 54.070671)">No-cloning theorem</text>
   </g>
   <g id="text_36">
    <text style="font-weight: 700; font-size: 7.4px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #f3f1ec" x="346.014101" y="359.2368" transform="rotate(-0 346.014101 359.2368)">1984</text>
   </g>
   <g id="text_37">
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #f3f1ec" x="346.014101" y="369.311959" transform="rotate(-0 346.014101 369.311959)">BB84 key distribution</text>
   </g>
   <g id="text_38">
    <text style="font-weight: 700; font-size: 7.4px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #f3f1ec" x="353.317575" y="140.895483" transform="rotate(-0 353.317575 140.895483)">1985</text>
   </g>
   <g id="text_39">
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #f3f1ec" x="353.317575" y="129.69148" transform="rotate(-0 353.317575 129.69148)">Deutsch: universal QC</text>
   </g>
   <g id="text_40">
    <text style="font-weight: 700; font-size: 7.4px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #f3f1ec" x="419.048845" y="278.874734" transform="rotate(-0 419.048845 278.874734)">1994</text>
   </g>
   <g id="text_41">
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #f3f1ec" x="419.048845" y="288.953362" transform="rotate(-0 419.048845 288.953362)">Shor&#39;s algorithm</text>
   </g>
   <g id="text_42">
    <text style="font-weight: 700; font-size: 7.4px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #f3f1ec" x="437.951955" y="115.779953" transform="rotate(-0 437.951955 115.779953)">1996</text>
   </g>
   <g id="text_43">
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; fill: #f3f1ec" transform="translate(402.839017 97.379419)">Grover; QEC codes;</text>
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; fill: #f3f1ec" transform="translate(404.621017 104.992294)">threshold theorem</text>
   </g>
   <g id="text_44">
    <text style="font-weight: 700; font-size: 7.4px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #f3f1ec" x="475.758175" y="305.664402" transform="rotate(-0 475.758175 305.664402)">2000</text>
   </g>
   <g id="text_45">
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #f3f1ec" x="475.758175" y="316.437061" transform="rotate(-0 475.758175 316.437061)">DiVincenzo criteria</text>
   </g>
   <g id="text_46">
    <text style="font-weight: 700; font-size: 7.4px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #f3f1ec" x="485.20973" y="90.67136" transform="rotate(-0 485.20973 90.67136)">2001</text>
   </g>
   <g id="text_47">
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #f3f1ec" x="485.20973" y="79.45667" transform="rotate(-0 485.20973 79.45667)">Shor factors 15 (NMR)</text>
   </g>
   <g id="text_48">
    <text style="font-weight: 700; font-size: 7.4px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #f3f1ec" x="541.919061" y="332.450601" transform="rotate(-0 541.919061 332.450601)">2007</text>
   </g>
   <g id="text_49">
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #f3f1ec" x="541.919061" y="342.52576" transform="rotate(-0 541.919061 342.52576)">Transmon qubit</text>
   </g>
   <g id="text_50">
    <text style="font-weight: 700; font-size: 7.4px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #f3f1ec" x="579.725281" y="65.559298" transform="rotate(-0 579.725281 65.559298)">2011</text>
   </g>
   <g id="text_51">
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #f3f1ec" x="579.725281" y="54.768171" transform="rotate(-0 579.725281 54.768171)">D-Wave One sold</text>
   </g>
   <g id="text_52">
    <text style="font-weight: 700; font-size: 7.4px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #f3f1ec" x="651.137031" y="359.2368" transform="rotate(-0 651.137031 359.2368)">2015</text>
   </g>
   <g id="text_53">
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; fill: #f3f1ec" transform="translate(626.406718 369.311959)">Loophole-free</text>
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; fill: #f3f1ec" transform="translate(634.519093 377.209459)">Bell tests</text>
   </g>
   <g id="text_54">
    <text style="font-weight: 700; font-size: 7.4px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #f3f1ec" x="722.548781" y="140.895483" transform="rotate(-0 722.548781 140.895483)">2019</text>
   </g>
   <g id="text_55">
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; fill: #f3f1ec" transform="translate(704.621906 122.143293)">Sycamore</text>
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; fill: #f3f1ec" transform="translate(700.688906 129.296043)">&#39;supremacy&#39;</text>
   </g>
   <g id="text_56">
    <text style="font-weight: 700; font-size: 7.4px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #f3f1ec" x="784.222564" y="278.878203" transform="rotate(-0 784.222564 278.878203)">2022</text>
   </g>
   <g id="text_57">
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; fill: #f3f1ec" transform="translate(754.851064 289.650862)">Nobel: Bell tests</text>
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; fill: #f3f1ec" transform="translate(737.243127 296.153362)">(Aspect/Clauser/Zeilinger)</text>
   </g>
   <g id="text_58">
    <text style="font-weight: 700; font-size: 7.4px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #f3f1ec" x="806.132987" y="115.783421" transform="rotate(-0 806.132987 115.783421)">2023</text>
   </g>
   <g id="text_59">
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; fill: #f3f1ec" transform="translate(776.450425 97.094794)">48 logical qubits</text>
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; fill: #f3f1ec" transform="translate(792.247675 104.564794)">(QuEra)</text>
   </g>
   <g id="text_60">
    <text style="font-weight: 700; font-size: 7.4px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #f3f1ec" x="828.043411" y="305.664402" transform="rotate(-0 828.043411 305.664402)">2024</text>
   </g>
   <g id="text_61">
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; fill: #f3f1ec" transform="translate(802.309598 316.437061)">Willow: below-</text>
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; fill: #f3f1ec" transform="translate(802.323098 323.224186)">threshold QEC</text>
   </g>
   <g id="text_62">
    <text style="font-weight: 700; font-size: 7.4px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #f3f1ec" x="849.953834" y="90.67136" transform="rotate(-0 849.953834 90.67136)">2025</text>
   </g>
   <g id="text_63">
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; fill: #f3f1ec" transform="translate(814.582146 71.982732)">Nobel: macroscopic</text>
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; fill: #f3f1ec" transform="translate(819.627771 79.182732)">quantum circuits</text>
   </g>
   <g id="text_64">
    <text style="font-weight: 700; font-size: 7.4px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: middle; fill: #f3f1ec" x="871.864257" y="332.450601" transform="rotate(-0 871.864257 332.450601)">2026</text>
   </g>
   <g id="text_65">
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; fill: #f3f1ec" transform="translate(842.181695 342.52576)">96 logical qubits</text>
    <text style="font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; fill: #f3f1ec" transform="translate(843.482757 349.99576)">(QuEra, Nature)</text>
   </g>
   <g id="text_66">
    <text style="font-weight: 700; font-size: 15px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #f3f1ec" x="17.357753" y="18.597656" transform="rotate(-0 17.357753 18.597656)">A century of quantum, 1900 → 2026</text>
   </g>
   <g id="text_67">
    <text style="font-size: 9px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: start; fill: #9a9ea8" x="17.357753" y="39.291643" transform="rotate(-0 17.357753 39.291643)">milestones from the §07 history cards, banded by era — ★ marks a physics Nobel</text>
   </g>
   <g id="text_68">
    <text style="font-style: italic; font-size: 7.2px; font-family: &#39;DejaVu Sans&#39;, &#39;Bitstream Vera Sans&#39;, &#39;Computer Modern Sans Serif&#39;, &#39;Lucida Grande&#39;, &#39;Verdana&#39;, &#39;Geneva&#39;, &#39;Lucid&#39;, &#39;Arial&#39;, &#39;Helvetica&#39;, &#39;Avant Garde&#39;, sans-serif; text-anchor: end; fill: #9a9ea8" x="915.685103" y="392.967064" transform="rotate(-0 915.685103 392.967064)">time axis compressed 1935–1980 so the modern era is legible</text>
   </g>
   <g id="line2d_15">
    <path d="M 53.875125 178.733022 
L 53.875125 143.576136 
" clip-path="url(#pc0e3938fb1)" style="fill: none; stroke: #9a9ea8; stroke-width: 0.6; stroke-linecap: square" />
   </g>
   <g id="line2d_16">
    <path d="M 76.828902 192.126122 
L 76.828902 270.810581 
" clip-path="url(#pc0e3938fb1)" style="fill: none; stroke: #9a9ea8; stroke-width: 0.6; stroke-linecap: square" />
   </g>
   <g id="line2d_17">
    <path d="M 168.644008 178.733022 
L 168.644008 118.464075 
" clip-path="url(#pc0e3938fb1)" style="fill: none; stroke: #9a9ea8; stroke-width: 0.6; stroke-linecap: square" />
   </g>
   <g id="line2d_18">
    <path d="M 214.551562 192.126122 
L 214.551562 297.59678 
" clip-path="url(#pc0e3938fb1)" style="fill: none; stroke: #9a9ea8; stroke-width: 0.6; stroke-linecap: square" />
   </g>
   <g id="line2d_19">
    <path d="M 280.445131 178.733022 
L 280.445131 93.352013 
" clip-path="url(#pc0e3938fb1)" style="fill: none; stroke: #9a9ea8; stroke-width: 0.6; stroke-linecap: square" />
   </g>
   <g id="line2d_20">
    <path d="M 298.622667 192.126122 
L 298.622667 324.382979 
" clip-path="url(#pc0e3938fb1)" style="fill: none; stroke: #9a9ea8; stroke-width: 0.6; stroke-linecap: square" />
   </g>
   <g id="line2d_21">
    <path d="M 331.407152 178.733022 
L 331.407152 68.239951 
" clip-path="url(#pc0e3938fb1)" style="fill: none; stroke: #9a9ea8; stroke-width: 0.6; stroke-linecap: square" />
   </g>
   <g id="line2d_22">
    <path d="M 346.014101 192.126122 
L 346.014101 351.169178 
" clip-path="url(#pc0e3938fb1)" style="fill: none; stroke: #9a9ea8; stroke-width: 0.6; stroke-linecap: square" />
   </g>
   <g id="line2d_23">
    <path d="M 353.317575 178.733022 
L 353.317575 143.576136 
" clip-path="url(#pc0e3938fb1)" style="fill: none; stroke: #9a9ea8; stroke-width: 0.6; stroke-linecap: square" />
   </g>
   <g id="line2d_24">
    <path d="M 419.048845 192.126122 
L 419.048845 270.810581 
" clip-path="url(#pc0e3938fb1)" style="fill: none; stroke: #9a9ea8; stroke-width: 0.6; stroke-linecap: square" />
   </g>
   <g id="line2d_25">
    <path d="M 437.951955 178.733022 
L 437.951955 118.464075 
" clip-path="url(#pc0e3938fb1)" style="fill: none; stroke: #9a9ea8; stroke-width: 0.6; stroke-linecap: square" />
   </g>
   <g id="line2d_26">
    <path d="M 475.758175 192.126122 
L 475.758175 297.59678 
" clip-path="url(#pc0e3938fb1)" style="fill: none; stroke: #9a9ea8; stroke-width: 0.6; stroke-linecap: square" />
   </g>
   <g id="line2d_27">
    <path d="M 485.20973 178.733022 
L 485.20973 93.352013 
" clip-path="url(#pc0e3938fb1)" style="fill: none; stroke: #9a9ea8; stroke-width: 0.6; stroke-linecap: square" />
   </g>
   <g id="line2d_28">
    <path d="M 541.919061 192.126122 
L 541.919061 324.382979 
" clip-path="url(#pc0e3938fb1)" style="fill: none; stroke: #9a9ea8; stroke-width: 0.6; stroke-linecap: square" />
   </g>
   <g id="line2d_29">
    <path d="M 579.725281 178.733022 
L 579.725281 68.239951 
" clip-path="url(#pc0e3938fb1)" style="fill: none; stroke: #9a9ea8; stroke-width: 0.6; stroke-linecap: square" />
   </g>
   <g id="line2d_30">
    <path d="M 651.137031 192.126122 
L 651.137031 351.169178 
" clip-path="url(#pc0e3938fb1)" style="fill: none; stroke: #9a9ea8; stroke-width: 0.6; stroke-linecap: square" />
   </g>
   <g id="line2d_31">
    <path d="M 722.548781 178.733022 
L 722.548781 143.576136 
" clip-path="url(#pc0e3938fb1)" style="fill: none; stroke: #9a9ea8; stroke-width: 0.6; stroke-linecap: square" />
   </g>
   <g id="line2d_32">
    <path d="M 784.222564 192.126122 
L 784.222564 270.810581 
" clip-path="url(#pc0e3938fb1)" style="fill: none; stroke: #9a9ea8; stroke-width: 0.6; stroke-linecap: square" />
   </g>
   <g id="line2d_33">
    <path d="M 806.132987 178.733022 
L 806.132987 118.464075 
" clip-path="url(#pc0e3938fb1)" style="fill: none; stroke: #9a9ea8; stroke-width: 0.6; stroke-linecap: square" />
   </g>
   <g id="line2d_34">
    <path d="M 828.043411 192.126122 
L 828.043411 297.59678 
" clip-path="url(#pc0e3938fb1)" style="fill: none; stroke: #9a9ea8; stroke-width: 0.6; stroke-linecap: square" />
   </g>
   <g id="line2d_35">
    <path d="M 849.953834 178.733022 
L 849.953834 93.352013 
" clip-path="url(#pc0e3938fb1)" style="fill: none; stroke: #9a9ea8; stroke-width: 0.6; stroke-linecap: square" />
   </g>
   <g id="line2d_36">
    <path d="M 871.864257 192.126122 
L 871.864257 324.382979 
" clip-path="url(#pc0e3938fb1)" style="fill: none; stroke: #9a9ea8; stroke-width: 0.6; stroke-linecap: square" />
   </g>
   <g id="PathCollection_1">
    <defs>
     <path id="m43c9c336b6" d="M 0 3.5 
C 0.928211 3.5 1.81853 3.131218 2.474874 2.474874 
C 3.131218 1.81853 3.5 0.928211 3.5 0 
C 3.5 -0.928211 3.131218 -1.81853 2.474874 -2.474874 
C 1.81853 -3.131218 0.928211 -3.5 0 -3.5 
C -0.928211 -3.5 -1.81853 -3.131218 -2.474874 -2.474874 
C -3.131218 -1.81853 -3.5 -0.928211 -3.5 0 
C -3.5 0.928211 -3.131218 1.81853 -2.474874 2.474874 
C -1.81853 3.131218 -0.928211 3.5 0 3.5 
z
" style="stroke: #16181d; stroke-width: 0.8" />
    </defs>
    <g clip-path="url(#pc0e3938fb1)">
     <use xlink:href="#m43c9c336b6" x="53.875125" y="185.429572" style="fill: #0e8ea0; stroke: #16181d; stroke-width: 0.8" />
    </g>
   </g>
   <g id="PathCollection_2">
    <g clip-path="url(#pc0e3938fb1)">
     <use xlink:href="#m43c9c336b6" x="76.828902" y="185.429572" style="fill: #0e8ea0; stroke: #16181d; stroke-width: 0.8" />
    </g>
   </g>
   <g id="PathCollection_3">
    <g clip-path="url(#pc0e3938fb1)">
     <use xlink:href="#m43c9c336b6" x="168.644008" y="185.429572" style="fill: #0e8ea0; stroke: #16181d; stroke-width: 0.8" />
    </g>
   </g>
   <g id="PathCollection_4">
    <g clip-path="url(#pc0e3938fb1)">
     <use xlink:href="#m43c9c336b6" x="214.551562" y="185.429572" style="fill: #0e8ea0; stroke: #16181d; stroke-width: 0.8" />
    </g>
   </g>
   <g id="PathCollection_5">
    <g clip-path="url(#pc0e3938fb1)">
     <use xlink:href="#m43c9c336b6" x="280.445131" y="185.429572" style="fill: #0e8ea0; stroke: #16181d; stroke-width: 0.8" />
    </g>
   </g>
   <g id="PathCollection_6">
    <g clip-path="url(#pc0e3938fb1)">
     <use xlink:href="#m43c9c336b6" x="298.622667" y="185.429572" style="fill: #0e8ea0; stroke: #16181d; stroke-width: 0.8" />
    </g>
   </g>
   <g id="PathCollection_7">
    <g clip-path="url(#pc0e3938fb1)">
     <use xlink:href="#m43c9c336b6" x="331.407152" y="185.429572" style="fill: #0e8ea0; stroke: #16181d; stroke-width: 0.8" />
    </g>
   </g>
   <g id="PathCollection_8">
    <g clip-path="url(#pc0e3938fb1)">
     <use xlink:href="#m43c9c336b6" x="346.014101" y="185.429572" style="fill: #0e8ea0; stroke: #16181d; stroke-width: 0.8" />
    </g>
   </g>
   <g id="PathCollection_9">
    <g clip-path="url(#pc0e3938fb1)">
     <use xlink:href="#m43c9c336b6" x="353.317575" y="185.429572" style="fill: #0e8ea0; stroke: #16181d; stroke-width: 0.8" />
    </g>
   </g>
   <g id="PathCollection_10">
    <g clip-path="url(#pc0e3938fb1)">
     <use xlink:href="#m43c9c336b6" x="419.048845" y="185.429572" style="fill: #0e8ea0; stroke: #16181d; stroke-width: 0.8" />
    </g>
   </g>
   <g id="PathCollection_11">
    <g clip-path="url(#pc0e3938fb1)">
     <use xlink:href="#m43c9c336b6" x="437.951955" y="185.429572" style="fill: #0e8ea0; stroke: #16181d; stroke-width: 0.8" />
    </g>
   </g>
   <g id="PathCollection_12">
    <g clip-path="url(#pc0e3938fb1)">
     <use xlink:href="#m43c9c336b6" x="475.758175" y="185.429572" style="fill: #0e8ea0; stroke: #16181d; stroke-width: 0.8" />
    </g>
   </g>
   <g id="PathCollection_13">
    <g clip-path="url(#pc0e3938fb1)">
     <use xlink:href="#m43c9c336b6" x="485.20973" y="185.429572" style="fill: #0e8ea0; stroke: #16181d; stroke-width: 0.8" />
    </g>
   </g>
   <g id="PathCollection_14">
    <g clip-path="url(#pc0e3938fb1)">
     <use xlink:href="#m43c9c336b6" x="541.919061" y="185.429572" style="fill: #0e8ea0; stroke: #16181d; stroke-width: 0.8" />
    </g>
   </g>
   <g id="PathCollection_15">
    <g clip-path="url(#pc0e3938fb1)">
     <use xlink:href="#m43c9c336b6" x="579.725281" y="185.429572" style="fill: #0e8ea0; stroke: #16181d; stroke-width: 0.8" />
    </g>
   </g>
   <g id="PathCollection_16">
    <g clip-path="url(#pc0e3938fb1)">
     <use xlink:href="#m43c9c336b6" x="651.137031" y="185.429572" style="fill: #0e8ea0; stroke: #16181d; stroke-width: 0.8" />
    </g>
   </g>
   <g id="PathCollection_17">
    <g clip-path="url(#pc0e3938fb1)">
     <use xlink:href="#m43c9c336b6" x="722.548781" y="185.429572" style="fill: #0e8ea0; stroke: #16181d; stroke-width: 0.8" />
    </g>
   </g>
   <g id="PathCollection_18">
    <defs>
     <path id="mac6d6f5b90" d="M 0 -5.809475 
L -1.304308 -1.795226 
L -5.525139 -1.795227 
L -2.110415 0.685715 
L -3.414724 4.699964 
L -0 2.219022 
L 3.414724 4.699964 
L 2.110415 0.685715 
L 5.525139 -1.795227 
L 1.304308 -1.795226 
z
" style="stroke: #16181d; stroke-width: 0.8" />
    </defs>
    <g clip-path="url(#pc0e3938fb1)">
     <use xlink:href="#mac6d6f5b90" x="784.222564" y="185.429572" style="fill: #b5741a; stroke: #16181d; stroke-width: 0.8" />
    </g>
   </g>
   <g id="PathCollection_19">
    <g clip-path="url(#pc0e3938fb1)">
     <use xlink:href="#m43c9c336b6" x="806.132987" y="185.429572" style="fill: #0e8ea0; stroke: #16181d; stroke-width: 0.8" />
    </g>
   </g>
   <g id="PathCollection_20">
    <g clip-path="url(#pc0e3938fb1)">
     <use xlink:href="#m43c9c336b6" x="828.043411" y="185.429572" style="fill: #0e8ea0; stroke: #16181d; stroke-width: 0.8" />
    </g>
   </g>
   <g id="PathCollection_21">
    <g clip-path="url(#pc0e3938fb1)">
     <use xlink:href="#mac6d6f5b90" x="849.953834" y="185.429572" style="fill: #b5741a; stroke: #16181d; stroke-width: 0.8" />
    </g>
   </g>
   <g id="PathCollection_22">
    <g clip-path="url(#pc0e3938fb1)">
     <use xlink:href="#m43c9c336b6" x="871.864257" y="185.429572" style="fill: #0e8ea0; stroke: #16181d; stroke-width: 0.8" />
    </g>
   </g>
  </g>
 </g>
 <defs>
  <clippath id="pc0e3938fb1">
   <rect x="17.357753" y="9.645141" width="898.32735" height="393.422298" />
  </clippath>
 </defs>
</svg></span>
<figcaption>The arc, 1900 → 2026, banded by era; Nobel Prizes starred. The ribbon's shape is the point: a quarter-century to find the rules, a long quiet middle, then a dense burst of hardware milestones after 2019 — with the Nobel stars trailing the frontier by decades every time.</figcaption>
</figure>
