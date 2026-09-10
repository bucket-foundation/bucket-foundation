# Research OS for K-12: Sky-Blue Transfer Task Bank

**Status:** draft, bead `ros-08` · **Date:** 2026-09-10 · Reads against `learning/research-os/LEARNER-STATE-MODEL.md` section 4 (transfer-task construction rule), `src/lib/research-os/EVIDENCE-SCHEMA.md` (`itemId`, `held`), `src/lib/research-os/probe.ts`, `supabase/seed/research-os-sky-blue.json` (22 nodes, 28 edges, target `why-the-sky-is-blue`), and `_intake/research-os-k12-literature/educational-methods/barnett-ceci-2002-far-transfer-taxonomy.md`.

Forty-four items, two per node, for every node in the sky-blue seed path (`supabase/seed/research-os-sky-blue.json`). Every item is a problem the learner has not seen in the seed path's own node summaries and never a re-skin of the seed path's own capstone question, "why is the sky blue," except the capstone node's own items, which transfer the full explanation to a different sky rather than restating this one. Every item is answerable using only the claims already present in the seed path's own nodes plus ordinary physical reasoning a grades-3-to-5 or early-secondary learner already has; none requires outside content the graph does not carry.

## The scoring rubric

Reused unchanged from `LEARNER-STATE-MODEL.md` section 4's own definition of the Internalization gate: an item is scored pass or fail by the automated grader (`gradeExplanation`, the same Check-tool call `onCheckResult` uses for Understanding, reused per that section's own instruction), then a teacher approves or returns the same attempt. A human rater cross-scoring a sampled subset, per `PREREGISTRATION-DRAFT.md`'s inter-rater procedure, applies four dimensions to a learner's free-text answer:

1. States the causal or logical mechanism connecting the required node's claim to the scenario, rather than restating the claim alone or naming a keyword from it.
2. Uses at least one of the combined node's own claims (the multi-hop requirement below), not only the target node's.
3. Reaches the correct qualitative or quantitative conclusion for the specific, unseen surface scenario the item describes, rather than a generic conclusion that would fit any scattering question.
4. Does not reproduce the documented misconception named for that item (below), or, if the answer's reasoning path touches the misconception, explicitly corrects it rather than assuming it.

A rater marking an answer as failing dimension 4 (matching the documented misconception) flags it with that misconception's own label rather than a generic "incorrect," so the teacher review queue and any later audit of `RESEARCH-QUESTIONS.md` Q3's misclassification-rate question can distinguish "wrong for a known, recurring reason" from "wrong in a way not seen before," the second case being the stronger signal that the item itself, not only the learner, needs review.

## The construction rule

Every item in this bank, and any later item extending the bank to another corpus, follows the same eight-step build so the bank scales without re-deriving the method per node.

1. Read the target node's own `summary` field (`supabase/seed/research-os-sky-blue.json`, or the equivalent field on whatever corpus the node comes from) as the one claim this item must require the learner to apply in an unfamiliar context, beyond simple recall.
2. Walk the node's `prerequisite` and `derives_from` edges (one or two hops back) to find one or two ancestor or sibling nodes whose own claims, combined with the target node's, produce a conclusion neither node states alone. This is the multi-hop requirement `LEARNER-STATE-MODEL.md` section 4 names directly: an item that only needs the target node's own summary is not a transfer item, since the learner could pattern-match it to that node's own lesson text without connecting it to anything else in the graph.
3. Choose a surface scenario that does not appear in either combined node's own summary or provenance text, and is not the seed path's own capstone question. A near-transfer item (Barnett and Ceci 2002's taxonomy, `_intake/research-os-k12-literature/educational-methods/barnett-ceci-2002-far-transfer-taxonomy.md`) varies only the physical object or setting while keeping the same underlying mechanism (a laser in smoke instead of a laser in fog); a farther-transfer item varies the functional context, the numeric substitution, or the domain the mechanism gets applied to (a wave-speed relationship applied to a rope instead of to light).
4. Write two items per node, one nearer and one farther on Barnett and Ceci's own dimensions, so the two items are not the same reasoning behind two different nouns.
5. Name a documented misconception the target node's content commonly produces, drawn from a standing per-node misconception log (a short, reusable list a curriculum reviewer maintains once and every item generator call reuses, rather than a fresh guess invented per item, matching `LEARNER-STATE-MODEL.md` section 4's own "reusing that model instead of generating a fresh guess" instruction). This is the item's distractor source: not a multiple-choice wrong option, since transfer items in this codebase are free-text and automatically graded, but a named wrong-answer pattern the grader and the human rater both check the learner's free text against under rubric dimension 4 above.
6. Tag the item with the Bloom-revised cognitive process it targets, per `LEARNER-STATE-MODEL.md` section 2's own mapping of Internalization to Apply, reaching into Analyze for a multi-hop item, so a pilot can report Internalization pass rates by cognitive process instead of as one undifferentiated number, the gap `LEARNER-STATE-MODEL.md` section 4 names under "Bloom targeting."
7. Assign a stable item id (`ros08-transfer-<node-slug>-a` or `-b`) before the item enters the sealed, held-out pool this bank is. Once served to a learner, that id is marked consumed and never re-served to that same learner, even across sessions, the exposure-control property `LEARNER-STATE-MODEL.md` section 4 names as unenforced by any table this codebase ships today; `src/lib/research-os/EVIDENCE-SCHEMA.md`'s `itemId` field is where a served attempt records which item this was.
8. Before the item is added to the live pool, confirm by hand that it is answerable using only the combined nodes' own claims plus ordinary reasoning appropriate to the seed path's grade band, and that it does not smuggle in outside content the graph does not carry. Every item below was checked against this step at draft time; a reviewer should re-check step 8 again before any item is served to a real learner.

## The bank

Each entry names the node, the node or nodes its two items require in combination (the multi-hop pair), the Bloom-revised process each item targets, the Barnett-and-Ceci transfer distance each item reaches, and the documented misconception the distractor model targets, followed by the two item prompts themselves.

### 1. Light travels in straight lines

Requires: `light-travels-in-straight-lines` plus `light-can-scatter-off-small-things`. Bloom: Apply. Misconception targeted: that light "spreads out and fades" on its own over distance in clean air, rather than staying a straight, undiminished path until it meets something.

1. `ros08-transfer-light-travels-in-straight-lines-a`, near transfer (setting varies: bar haze instead of the seed path's own no-scenario summary). A laser pointer's beam is invisible in clean air but becomes a visible line for a photographer in a smoky room. Using what you know about how light normally travels and what changes when it meets small particles, explain why the beam becomes visible only in the smoky air.
2. `ros08-transfer-light-travels-in-straight-lines-b`, farther transfer (setting varies again, functional framing shifts to a safety device). A lighthouse beam sweeps in a narrow, sharp-edged cone across calm night air, but on a foggy night the same beam looks like a wide, glowing wedge instead. Explain what happens to the individual rays of light in the fog that does not happen in clear air, and why the beam's edge stops looking sharp.

### 2. Sunlight looks white

Requires: `sunlight-looks-white` plus `white-light-splits-into-colors`. Bloom: Apply. Misconception targeted: that "white" light is colorless, a blank slate, rather than a mixture that already contains every visible color.

1. `ros08-transfer-sunlight-looks-white-a`, near transfer. A projector shines a plain white square of light onto a screen. A classmate claims the light must be "colorless," since it looks nothing like a rainbow. Using what a prism does to sunlight, explain whether the classmate is right.
2. `ros08-transfer-sunlight-looks-white-b`, farther transfer (functional context shifts to explaining an absence rather than a presence). A rainbow appears in the spray of a garden hose on a sunny afternoon but never appears in the same spray on a heavily overcast day, even though the water droplets are identical both times. Explain what "sunlight looks white" means about its makeup, and why that makeup is the reason the rainbow needs the Sun.

### 3. Air is made of tiny particles

Requires: `air-is-made-of-tiny-particles` plus `light-can-scatter-off-small-things`. Bloom: Apply. Misconception targeted: that "air" and "empty space" are the same thing for light, since both look equally clear to the eye.

1. `ros08-transfer-air-is-made-of-tiny-particles-a`, near transfer. A laser beam passes through a sealed vacuum chamber completely invisibly, while the same laser is faintly visible in a chamber filled with ordinary room air at the same pressure. Explain the difference using what air is made of.
2. `ros08-transfer-air-is-made-of-tiny-particles-b`, farther transfer (the scenario now asks the learner to predict rather than only explain). A photographer sets up two sealed glass jars in bright sunlight, one holding ordinary air and one pumped down to a vacuum, and shines the same narrow beam through each. Predict which jar shows a visible beam path when photographed from the side, and explain the physical reason using what fills each jar.

### 4. White light splits into colors

Requires: `white-light-splits-into-colors` plus `each-color-is-a-wavelength`. Bloom: Apply. Misconception targeted: that a prism or a raindrop "creates" color out of colorless light, rather than sorting colors already present.

1. `ros08-transfer-white-light-splits-into-colors-a`, near transfer. A soap bubble floating in sunlight shows shifting bands of color across its surface even though the soap film itself has no color of its own. Using what happens when white light splits, explain where those colors come from.
2. `ros08-transfer-white-light-splits-into-colors-b`, farther transfer (the scenario now requires reasoning about an absence of splitting). An oil slick on a wet road shows rainbow colors in ordinary daylight but shows no colors at all when the only light source is a sodium streetlight, which emits light concentrated in one narrow color band rather than the Sun's full mixture. Explain why splitting depends on what the light source already contains.

### 5. Each color is a wavelength

Requires: `each-color-is-a-wavelength` plus `waves-have-wavelength-and-frequency`. Bloom: Apply, reaching into Analyze. Misconception targeted: treating "red" and "blue" as arbitrary labels rather than as names for specific, measurably different wavelengths.

1. `ros08-transfer-each-color-is-a-wavelength-a`, near transfer. A physics demonstration shows that red laser light bends less when it passes through a prism than blue laser light does, using two lasers of the same brightness and the same prism. Using what determines a color and what a wavelength is, explain why the two lasers bend by different amounts.
2. `ros08-transfer-each-color-is-a-wavelength-b`, farther transfer (domain shifts from a laser to a natural-object comparison). A red apple and a red laser pointer look the same color to the eye, but a spectrometer shows the laser's light sits at one exact wavelength while the apple reflects a wide range of wavelengths that the eye averages into "red." Using what it means for a color to be a wavelength, explain why the laser counts as "one color" in a stricter sense than the apple does.

### 6. Light can scatter off small things

Requires: `light-can-scatter-off-small-things` plus `air-is-made-of-tiny-particles`. Bloom: Apply. Misconception targeted: that scattering only happens with visibly cloudy or colored substances, rather than with any particle small enough relative to the light.

1. `ros08-transfer-light-can-scatter-off-small-things-a`, near transfer. A single drop of milk stirred into a large, clear glass of water turns the water a faint, hazy, slightly bluish white, well before the water looks anything like milk itself. Explain, using what happens when light meets small things, why even one drop changes the water's appearance.
2. `ros08-transfer-light-can-scatter-off-small-things-b`, farther transfer (setting shifts to an everyday indoor scene with a size contrast). A narrow beam of afternoon sunlight through a dusty attic window looks like a solid, glowing shaft of light, while the same sunlight through a freshly cleaned, dust-free window is invisible in the air of the room. Using what determines whether scattering happens at all, explain the difference between the two windows.

### 7. Waves have wavelength and frequency

Requires: `waves-have-wavelength-and-frequency` plus `each-color-is-a-wavelength`. Bloom: Apply, reaching into Analyze. Misconception targeted: treating wavelength and frequency as two unrelated properties rather than as inversely linked for a wave moving at a fixed speed.

1. `ros08-transfer-waves-have-wavelength-and-frequency-a`, near transfer (domain shifts from light to a musical instrument). A guitar's low string vibrates slowly and produces a long sound wave; its high string vibrates and produces a short sound wave. Using what wavelength and frequency mean for a wave, explain which visible-light color, red or blue, is the closer analogy to the low string's wave, and why.
2. `ros08-transfer-waves-have-wavelength-and-frequency-b`, farther transfer (domain shifts to radio, a wave family the seed path has not yet introduced by name at this node). A radio tuned to a station near 88 on the FM dial uses a longer wave than a radio tuned to a station near 108. Using the relationship between wavelength and frequency, explain whether 88's wave is relatively more like red light's wave or blue light's wave, even though radio waves and visible light differ enormously in their absolute wavelengths.

### 8. Visible light is part of the electromagnetic spectrum

Requires: `visible-light-is-part-of-em-spectrum` plus `waves-have-wavelength-and-frequency`. Bloom: Apply. Misconception targeted: treating X-rays, radio waves, and visible light as different kinds of things rather than as the same kind of wave at different wavelengths.

1. `ros08-transfer-visible-light-is-part-of-em-spectrum-a`, near transfer. A dentist's X-ray machine and a classroom light bulb both emit something scientists classify as the same basic kind of wave, yet an X-ray passes through skin and a light bulb's light does not. Using what the electromagnetic spectrum is, explain what X-rays and visible light have in common and what differs between them.
2. `ros08-transfer-visible-light-is-part-of-em-spectrum-b`, farther transfer (functional context shifts to an everyday invisible device). A TV remote control changes the channel using a beam nobody in the room can see. Using what you know about the electromagnetic spectrum, explain why that invisible beam can carry a signal the same way visible light carries an image to your eye.

### 9. Blue and violet have the shortest visible wavelengths

Requires: `blue-violet-have-shortest-visible-wavelengths` plus `visible-light-is-part-of-em-spectrum`. Bloom: Apply, reaching into Analyze. Misconception targeted: assuming violet is the "most extreme" color humans can perceive in every sense, rather than one boundary of a visible range with invisible wavelengths just past it.

1. `ros08-transfer-blue-violet-have-shortest-visible-wavelengths-a`, near transfer. A black-light poster glows brightly under a black light but looks dull under an ordinary lamp. Using where blue and violet sit in the visible range, explain why a wavelength just past violet is called "ultraviolet" rather than "an extreme violet."
2. `ros08-transfer-blue-violet-have-shortest-visible-wavelengths-b`, farther transfer (functional context shifts to a technology-design tradeoff). A camera sensor designer notices that capturing accurate violet tones is harder than capturing accurate red tones with the same basic sensor design. Using where violet sits among the visible wavelengths, explain what makes the violet end of the spectrum different from the red end in a way that could make it harder to capture.

### 10. Light travels as a wave

Requires: `light-as-a-wave` plus `light-can-scatter-off-small-things` and `blue-violet-have-shortest-visible-wavelengths`. Bloom: Analyze. Misconception targeted: assuming every wave scatters off every small object the same way regardless of the wave's own wavelength, since "scattering" sounds like a single fixed behavior rather than a relationship between two sizes.

1. `ros08-transfer-light-as-a-wave-a`, near transfer (domain shifts to sound, a familiar wave, contrasted with light). Sound bends around a corner, so a person can hear someone talking in the next room, but light does not bend around that same corner enough to let them see into the room. Using what it means for light to travel as a wave, and what light meets when it scatters, explain why light and sound behave so differently at the same corner despite both being waves.
2. `ros08-transfer-light-as-a-wave-b`, farther transfer (a multi-hop quantitative prediction). A scientist explains that how strongly a wave scatters off an object depends on how the wave's own wavelength compares to the object's size. Using this idea together with what you know about light as a wave, predict whether a long-wavelength radio wave or a short-wavelength blue-light wave would scatter more strongly off a small raindrop of a fixed size, and explain your reasoning.

### 11. Air molecules are much smaller than light's wavelength

Requires: `air-molecules-are-much-smaller-than-light-wavelengths` plus `light-as-a-wave`. Bloom: Analyze. Misconception targeted: assuming that because both an air molecule and a light wave are "too small to see," they must be roughly the same size as each other.

1. `ros08-transfer-air-molecules-are-much-smaller-than-light-wavelengths-a`, near transfer (the learner builds their own scale analogy). A science museum exhibit compares a grain of sand to a football stadium to help visitors picture a large size difference. Using the actual size difference between an air molecule and a wavelength of visible light, build a similar comparison of your own that shows roughly how much smaller a molecule is than the light wave passing it, and explain why that size gap matters for scattering.
2. `ros08-transfer-air-molecules-are-much-smaller-than-light-wavelengths-b`, farther transfer (directly confronts the documented misconception). A classmate claims that since both an air molecule and a light wave are "too small to see with the naked eye," they must be roughly the same size. Using the actual numbers for molecule size and light wavelength, correct the classmate's claim and explain why the size relationship between the two, not just both being invisible, is what determines how they interact.

### 12. Tyndall's experiments on scattering by small particles

Requires: `tyndall-scattering-by-small-particles` plus `air-molecules-are-much-smaller-than-light-wavelengths`. Bloom: Apply, reaching into Analyze. Misconception targeted: treating "the light scattered sideways" and "the light that passes straight through" as if they must look the same color, since both come from the same source beam.

1. `ros08-transfer-tyndall-scattering-by-small-particles-a`, near transfer. In a classroom demonstration, a bright beam is shone through a tank of water with a few drops of milk stirred in. Viewed from the side, the beam looks bluish; viewed from where it exits the far end of the tank, the transmitted light looks slightly reddish-orange instead. Using Tyndall's finding about scattering by small particles, explain why the side-view light and the straight-through light end up looking like different colors.
2. `ros08-transfer-tyndall-scattering-by-small-particles-b`, farther transfer (adds Tyndall's polarization finding, not only his color finding). Tyndall found that light scattered by small particles comes out polarized as well as bluish. A student wearing polarized sunglasses at the beach notices that tilting their head changes how bright the blue sky looks through the glasses. Using Tyndall's finding, explain why polarization would make the sky's brightness through the sunglasses change with the angle of the student's head.

### 13. Scattering strength depends on particle size versus wavelength

Requires: `scattering-strength-depends-on-particle-size-vs-wavelength` plus `tyndall-scattering-by-small-particles`. Bloom: Analyze. Misconception targeted: assuming particle size does not matter as long as the particles are "small," rather than that scattering's wavelength preference itself depends on exactly how small relative to the wavelength.

1. `ros08-transfer-scattering-strength-depends-on-particle-size-vs-wavelength-a`, near transfer. Skim milk, which has smaller fat droplets than whole milk, looks faintly bluish-white, while whole milk looks more purely, evenly white. Using how scattering strength depends on particle size relative to wavelength, explain why the smaller droplets in skim milk produce more of a blue tint.
2. `ros08-transfer-scattering-strength-depends-on-particle-size-vs-wavelength-b`, farther transfer (a controlled prediction task). A chemist prepares two clear liquids with the same suspended substance, one with fine particles and one with noticeably coarser particles, both lit by the same white light from the side. Predict which liquid shows a stronger blue tint when viewed from the side, and explain your reasoning using the size-versus-wavelength relationship.

### 14. Rayleigh's 1871 papers on the light from the sky

Requires: `rayleigh-1871-sky-color-papers` plus `scattering-strength-depends-on-particle-size-vs-wavelength` and `tyndall-scattering-by-small-particles`. Bloom: Analyze. Misconception targeted: treating a later mathematical paper as repeating an earlier experimental finding, rather than putting it on a footing the experiment alone could not provide.

1. `ros08-transfer-rayleigh-1871-sky-color-papers-a`, near transfer (a direct historical-reasoning task, nature-of-science framing). A classmate says Tyndall's experiments already proved why the sky is blue, so Rayleigh's later papers added nothing new. Using what Rayleigh's 1871 papers did with Tyndall's observation, explain what Rayleigh added that Tyndall's experiments alone did not provide.
2. `ros08-transfer-rayleigh-1871-sky-color-papers-b`, farther transfer (source-evaluation task, applying the primary-source concept to a new, unrelated claim). A textbook states, in one unreferenced sentence, "the sky is blue because of Rayleigh scattering." Using what you know about Rayleigh's 1871 papers as a primary source, explain what kind of evidence or derivation you would look for in the original papers to check whether the textbook's one-sentence claim is well supported.

### 15. Rayleigh scattering law

Requires: `rayleigh-scattering-law` plus `rayleigh-1871-sky-color-papers`. Bloom: Apply. Misconception targeted: believing the law says all colors scatter equally, only in different directions, rather than that scattering strength itself depends steeply on wavelength.

1. `ros08-transfer-rayleigh-scattering-law-a`, near transfer (a design-decision application). An engineer designing a runway warning light for hazy weather has to choose between a red light and a blue light, wanting the beam to stay sharp rather than turn into a diffuse glow. Using the Rayleigh scattering law, which color should the engineer choose, and why.
2. `ros08-transfer-rayleigh-scattering-law-b`, farther transfer (directly confronts the documented misconception). A classmate claims that the Rayleigh scattering law only says light scatters in every direction equally, with color having nothing to do with it. Using what the law states about wavelength, correct this claim.

### 16. The lambda^-4 law

Requires: `lambda-minus-4-law` plus `rayleigh-scattering-law`. Bloom: Apply, reaching into Analyze. Misconception targeted: treating the lambda^-4 relationship as a rough rule of thumb ("shorter wavelengths scatter somewhat more") instead of a specific and calculable ratio.

1. `ros08-transfer-lambda-minus-4-law-a`, near transfer, new numbers (green light at about 530 nm versus red light at about 700 nm, rather than the seed path's own blue-versus-red worked comparison). Using the lambda^-4 law, estimate roughly how many times more strongly green light scatters than red light off the same small particle, and show your calculation.
2. `ros08-transfer-lambda-minus-4-law-b`, farther transfer (the inverse problem, solving for a wavelength rather than for a ratio). A designer wants a scattering ratio of about four times between two colors of light off the same small dust, using the lambda^-4 law. If one color is red light at about 700 nm, estimate the approximate wavelength of the second color that would give roughly a four-times scattering ratio, and explain your reasoning. An estimate within a reasonable range counts as correct; no single exact answer is required.

### 17. Blue scatters far more than red

Requires: `blue-scatters-more-than-red` plus `lambda-minus-4-law` and `blue-violet-have-shortest-visible-wavelengths`. Bloom: Apply, reaching into Analyze. Misconception targeted: assuming that because blue scatters more, blue is always the better choice for a light meant to be seen from far away, ignoring that heavy scattering can mean the beam itself loses reach and definition.

1. `ros08-transfer-blue-scatters-more-than-red-a`, near transfer. Fog lights on older cars are traditionally yellow or amber rather than blue or white. Using the fact that blue light scatters far more strongly than red or yellow light off small fog droplets, explain why an amber fog light produces a more usable beam than a blue one would in thick fog.
2. `ros08-transfer-blue-scatters-more-than-red-b`, farther transfer (a tradeoff-reasoning task that directly confronts the documented misconception). A rescue team is choosing a laser color, blue-green or red, meant to be visible from far away through hazy or smoky air. Using what you know about how much more strongly blue light scatters compared to red, explain the tradeoff a heavily scattering color creates between being easy to notice nearby and staying strong enough to reach a distant observer at all.

### 18. Why the sky reads as blue and not violet

Requires: `sky-is-blue-not-violet` plus `blue-scatters-more-than-red`. Bloom: Analyze. Misconception targeted: assuming the color that scatters the most (violet) must automatically be the color observed, ignoring the source, absorption, and eye-sensitivity factors that also matter.

1. `ros08-transfer-sky-is-blue-not-violet-a`, near transfer (a parallel question about a different color, using the same three-factor structure). If blue and violet both scatter more than red, and green sits between blue and red in wavelength, a classmate asks why the sky is never described as green instead. Using the three reasons the sky reads as blue instead of violet, explain what role each of the three factors would play in a similar explanation of why the sky does not read as green either.
2. `ros08-transfer-sky-is-blue-not-violet-b`, farther transfer (a hypothetical-observer task, applying the same three-factor structure to a different eye). An imagined visitor whose eyes are most sensitive to green light, rather than blue as human eyes are, looks at Earth's daytime sky. Using the three-factor explanation for why humans see blue instead of violet, predict what color that visitor would most likely report the sky as, and explain your reasoning using each of the three factors.

### 19. Why the sky is blue

Requires: `why-the-sky-is-blue` plus `sky-is-blue-not-violet`, `blue-scatters-more-than-red`, `tyndall-scattering-by-small-particles`, and `rayleigh-scattering-law` (the node's own `cites` edges). Bloom: Analyze. Misconception targeted: treating "why the sky is blue" as a fact about Earth, rather than as the output of a general mechanism (particle size relative to wavelength, source spectrum, absorption, eye sensitivity) that changes its answer under different conditions. As the capstone node, both items transfer the full explanation to a different sky rather than restating this one.

1. `ros08-transfer-why-the-sky-is-blue-a`, far transfer (domain shifts to another planet). Photographs from NASA's Mars rovers show a Martian daytime sky that looks tan or butterscotch instead of blue, because the dust particles suspended in Mars's thin atmosphere are much larger, relative to light's wavelength, than Earth's air molecules are. Using the full explanation for why Earth's sky is blue, explain why particles that are larger relative to the light's wavelength would produce a sky color that does not follow the same strong blue-favoring pattern Earth's molecule-sized scattering does.
2. `ros08-transfer-why-the-sky-is-blue-b`, far transfer (domain shifts to a different time of day rather than a different planet, testing whether the learner can identify what is absent rather than only what is present). A student asks why the night sky is black instead of some scattered color, given that starlight and moonlight also pass through Earth's atmosphere at night the same way sunlight does during the day. Using the full explanation for why the daytime sky is blue, explain what is missing at night that is present during the day, and why that missing ingredient breaks the chain of reasoning that makes the daytime sky blue.

### 20. Waves and the wave equation

Requires: `canon-waves` (the Academy `waves` atom, `y(x,t)` and `v = f * lambda`, `learning/app/corpus/02-physics.json`) plus `waves-have-wavelength-and-frequency`. Bloom: Apply, reaching into Analyze. Misconception targeted: believing the material a wave travels through physically moves along with the wave, rather than staying in place while the pattern itself propagates.

1. `ros08-transfer-canon-waves-a`, near transfer (domain shifts entirely away from light, to a rope, the canon atom's own intuition example reused as a distinct quantitative scenario rather than restated). Two students shake a long rope at different rates: one shakes it slowly, producing a long, lazy wave shape; the other shakes it, producing a tight, closely spaced wave shape, and the wave travels down the same rope at the same speed both times. Using the relationship between a wave's speed, frequency, and wavelength, explain why the faster shake must produce a shorter wavelength if the propagation speed stays fixed.
2. `ros08-transfer-canon-waves-b`, farther transfer (a prediction task crossing into a different medium, requiring the learner to hold speed variable rather than fixed). A sound engineer wants a musical note to keep the same pitch, meaning the same frequency, while the sound crosses from air into a denser material where sound travels faster. Using the wave relationship v equals f times lambda, explain what must happen to the note's wavelength as it crosses into the denser, faster medium if its frequency stays the same.

### 21. Electromagnetic waves

Requires: `canon-em-waves` (the Academy `em-waves` atom, Maxwell's self-sustaining E and B fields, `c` approximately 3.0 times 10^8 m/s) plus `visible-light-is-part-of-em-spectrum`. Bloom: Analyze. Misconception targeted: assuming light needs some physical substance to travel through the way sound needs air, since every other everyday wave a learner has met does.

1. `ros08-transfer-canon-em-waves-a`, near transfer (a historical-misconception-correction task using the atom's own self-sustaining-ripple idea). Some early scientists proposed an invisible substance, called "ether," filling all of space, believing light needed some material medium to travel through the way sound needs air. Using what makes an electromagnetic wave self-sustaining, explain why light does not need a material medium the way sound does.
2. `ros08-transfer-canon-em-waves-b`, farther transfer (applies the mechanism to a novel astronomical scenario). An astronomer detects light from a star across the vacuum of space, with no air or any other substance between the star and the telescope. Using the idea of a changing electric field recreating a magnetic field and a changing magnetic field recreating an electric field in turn, explain what physically "ripples" across that empty space to carry the star's light to the telescope.

### 22. Wave optics

Requires: `canon-wave-optics` (the Academy `wave-optics` atom, `d sin(theta) = m * lambda`) plus `each-color-is-a-wavelength`. Bloom: Analyze. Misconception targeted: confusing interference-based color separation (fringes at angles set by wavelength) with prism-style dispersion (bending set by wavelength), treating every rainbow-like effect as the same mechanism.

1. `ros08-transfer-canon-wave-optics-a`, near transfer (a familiar object reframed through the interference lens rather than the dispersion lens already used at node 4). A pair of closely spaced scratches on a CD's shiny surface, tilted under a lamp, produces a shifting rainbow pattern that behaves like a double-slit pattern rather than a simple prism-style spread. Using the idea that bright fringes appear where the path difference between two light paths equals a whole number of wavelengths, explain why different colors would show their brightest fringe at slightly different angles for the same scratch spacing.
2. `ros08-transfer-canon-wave-optics-b`, farther transfer (a direct quantitative prediction crossing two colors through the same fixed apparatus). A student shines red laser light and then blue laser light, one at a time, through the same pair of closely spaced slits and measures the spacing between the bright fringes on a screen behind the slits. Using the double-slit fringe relationship, predict which laser produces more spaced fringes, and explain your reasoning using each laser's own wavelength.

## What this bank does not cover

The three canon-bridge nodes' items (20 through 22) are grounded in `learning/app/corpus/02-physics.json`'s own lesson text for the `waves`, `em-waves`, and `wave-optics` atoms, read directly for this pass rather than assumed from the bridge node's own routing-only summary; a reviewer should re-check those three atoms' current lesson text before these six items ship, since `LEARNER-STATE-MODEL.md` section 1 states a canon bridge node is "routing-only," meaning its lesson content can change on the Academy side without this file being touched. No item in this bank has been run against a real learner, a real Check-tool grading call, or a real teacher reviewer; every documented misconception named above is this pass's own best-effort guess at a common error rather than a finding from logged learner data, and each should be revised against real Phase 1 attempt data once it exists, per this file's own construction-rule step 5.
