---
title: "Highly accurate protein structure prediction with AlphaFold"
authors:
  - "Jumper, John"
  - "Evans, Richard"
  - "Pritzel, Alexander"
  - "Green, Tim"
  - "Figurnov, Michael"
  - "Ronneberger, Olaf"
  - "Tunyasuvunakool, Kathryn"
  - "Bates, Russ"
  - "Žídek, Augustin"
  - "Potapenko, Anna"
  - "Bridgland, Alex"
  - "Meyer, Clemens"
  - "Kohl, Simon A. A."
  - "Ballard, Andrew J."
  - "Cowie, Andrew"
  - "Romera-Paredes, Bernardino"
  - "Nikolov, Stanislav"
  - "Jain, Rishub"
  - "Adler, Jonas"
  - "Back, Trevor"
  - "Petersen, Stig"
  - "Reiman, David"
  - "Clancy, Ellen"
  - "Zielinski, Michal"
  - "Steinegger, Martin"
  - "Pacholska, Michalina"
  - "Berghammer, Tamas"
  - "Bodenstein, Sebastian"
  - "Silver, David"
  - "Vinyals, Oriol"
  - "Senior, Andrew W."
  - "Kavukcuoglu, Koray"
  - "Kohli, Pushmeet"
  - "Hassabis, Demis"
year: 2021
venue: "Nature"
doi: "10.1038/s41586-021-03819-2"
url: "https://doi.org/10.1038/s41586-021-03819-2"
openalex_id: null
branch: "scientific-discovery-metascience"
tier: "canon"
why_it_matters: >
  The reference case for AI achieving expert-level performance on an unsolved scientific
  problem, protein structure prediction, the standing benchmark against which any claim of
  AI doing science gets measured, including Bucket's own hypothesis-engine ambitions.
key_claims:
  - "AlphaFold predicts protein three-dimensional structure from amino-acid sequence at an accuracy competitive with experimental methods, across the CASP14 blind-assessment benchmark, a decades-old unsolved problem."
  - "The system combines a deep-learning architecture trained on known structures with physical and geometric constraints, rather than pure pattern-matching on sequence alone."
  - "The result was validated on a blind, adversarial benchmark that withholds ground truth until after predictions are submitted, a methodological standard most AI-for-science claims outside biology do not meet."
research_questions_it_leaves_open:
  - "Whether AlphaFold's success generalizes to problems without a CASP-style blind benchmark and a comparably large structured training set, the condition most scientific domains lack."
  - "What AlphaFold's own internal representations reveal, or fail to reveal, about the physical and chemical principles of protein folding, a scientific-understanding question distinct from predictive accuracy."
how_it_bears_on_research_os: >
  Sets the evidentiary bar the hypothesis engine's own self-report and calibration record
  are built to approach for a much harder-to-benchmark domain: the engine's own
  target-blind check, whether a generator's proposal rate for non-consensus hypotheses
  holds steady against a run before it, is a scaled-down analog of CASP's blind
  assessment, applied to a domain with no single ground-truth structure to check against.
---

# Highly accurate protein structure prediction with AlphaFold

The reference case for AI achieving expert-level performance on an unsolved scientific problem, protein structure prediction, the standing benchmark against which any claim of AI doing science gets measured, including Bucket's own hypothesis-engine ambitions.

## Key Claims

- AlphaFold predicts protein three-dimensional structure from amino-acid sequence at an accuracy competitive with experimental methods, across the CASP14 blind-assessment benchmark, a decades-old unsolved problem.
- The system combines a deep-learning architecture trained on known structures with physical and geometric constraints, rather than pure pattern-matching on sequence alone.
- The result was validated on a blind, adversarial benchmark that withholds ground truth until after predictions are submitted, a methodological standard most AI-for-science claims outside biology do not meet.

## Research Questions It Leaves Open

- Whether AlphaFold's success generalizes to problems without a CASP-style blind benchmark and a comparably large structured training set, the condition most scientific domains lack.
- What AlphaFold's own internal representations reveal, or fail to reveal, about the physical and chemical principles of protein folding, a scientific-understanding question distinct from predictive accuracy.

## How It Bears on Research OS

Sets the evidentiary bar the hypothesis engine's own self-report and calibration record are built to approach for a much harder-to-benchmark domain: the engine's own target-blind check, whether a generator's proposal rate for non-consensus hypotheses holds steady against a run before it, is a scaled-down analog of CASP's blind assessment, applied to a domain with no single ground-truth structure to check against.
