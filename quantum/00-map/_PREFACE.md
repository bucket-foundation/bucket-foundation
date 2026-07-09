# Preface

## What this is

*The Quantum Atlas* maps the whole of quantum — the physics that makes it possible, the machines built to exploit that physics, the algorithms that run on them, the adjacent technologies that ride alongside, and every industry now placing a bet. It is written to be two things at once: a map you can stand over and orient yourself with, and a textbook you can read from the postulates upward.

The field it covers is loud. Much of the noise comes from vendors with a valuation to defend, governments with a budget to justify, and analysts with a forecast to sell. So the atlas is built on one discipline that runs through every page: every claim is graded, and the grade travels with the claim. A century-old textbook result and a launch-day press release both appear here, and the manual always says which is which. Where two credible sources disagree — "fault tolerance by 2029" against "not before 2040" — the disagreement is kept as a first-class object, written down in full, with a note on what experiment or event would settle it. The atlas never silently picks a side.

## How to read it

Start with the Map. `00-map/00-IDEAL-STATE-MAP.md` lays the entire territory on a single page, from the superposition postulate up through the machines and out into twenty-plus industries. Every entry on that page is a node with a stable ID, so it doubles as the atlas's index — the coordinate system the chapters hang from.

From there the book runs in eight chapters, in the order the physics builds:

1. **Foundations** — the twenty-six ideas that make any of this possible, from the state vector to entanglement to decoherence.
2. **Hardware** — the eight-or-nine competing bets on what a qubit should be made of, and the fridges, lasers, and foundries beneath them.
3. **The stack and algorithms** — how a noisy physical qubit becomes a useful answer: error correction, compilers, Shor and Grover, benchmarks.
4. **Adjacent technologies** — the quantum tech already commercial: key distribution, sensing, metrology, imaging.
5. **Industries** — where quantum actually lands in the economy, industry by industry, with the walls between "early" and "mature" drawn honestly.
6. **Ecosystem and geopolitics** — the money, the national programs, the standards bodies, the export controls, the talent race.
7. **History** — the full timeline, 1900 to today, told as the road that leads to the map.
8. **The honest frontier** — the open problems, named out loud, with who disagrees and what would resolve each one.

The appendices hold the machinery: the grading method, the conflict register, an evidence index of recent preprints, a glossary, and the node reference index that keys every citation anchor back to the map.

Read it front to back as a textbook and the chapters build on each other in sequence. Jump in as a map and each node stands on its own, cross-linked to the physics it depends on and the industry it serves.

## How the grading works

Every claim carries an evidence tier, strongest to weakest. **T1** is established physics — textbook, reproduced for decades, like superposition or the Bell violation. **T2** is a peer-reviewed result, published and refereed. **T3** is a preprint or conference talk, real work not yet through review. **T4** is a vendor claim — a company announcing its own numbers, not independently checked. **T5** is an analyst forecast or a national-program dollar figure, the softest anchor in the book. **T6** is speculative: plausible, unproven, the room-temperature-qubit and killer-app timelines. The rule that does most of the work: a vendor announcing its own benchmark stays T4 until an independent group reproduces it, and never gets promoted to peer-reviewed T2 on the strength of a blog post. A press release and a *Nature* paper never weigh the same here. "Quantum advantage" claims are treated as contested by default and carry a note on whether a classical method later caught up.

## Who it's for

**The physicist** can read Chapter 1 as a compact restatement of the foundations, then use the map to see how each postulate becomes load-bearing for a machine downstream — which physics a given qubit actually exploits, and where the open questions in measurement and interpretation still sit.

**The builder and the investor** can start at Chapters 2, 5, and 6, where the coordinates are qubit counts, fidelities, roadmaps, and budgets. The grading is the tool that matters most here: it separates the demonstrated from the announced, and it charges honestly for the classical counterattack before crediting any speedup.

**The newcomer** can read straight through. The chapters are ordered so that each one earns the next, and nothing assumes you arrived already knowing the vocabulary. The frontier chapter at the end is the honest reward — the field's real open problems, stated plainly.

## A note on honesty

The atlas tries to do one thing well: state what is settled, what is contested, and what is marketing, and always say which is which. Settled physics is marked settled. A live disagreement is written down as a disagreement, with both sides intact. A vendor's timeline is called a vendor's timeline. This is the whole method, and it is why the grades and the conflict register are load-bearing rather than decorative. The goal is a map you can trust because it never hides where it is unsure.
