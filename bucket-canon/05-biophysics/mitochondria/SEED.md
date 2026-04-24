# Mitochondria — Seed Dossier

**Canon branch**: `05-biophysics/mitochondria/`
**Discipline**: foundation-tier. Mechanism, not clinical. Principles, not protocols.

## 1. What a mitochondrion is

A mitochondrion is a double-membrane-bound organelle present in nearly all eukaryotic cells, with its own circular genome (mtDNA), its own ribosomes, and its own replication machinery. It is the site of oxidative phosphorylation: electrons stripped from reduced carbon substrates (via the TCA cycle, β-oxidation, and entering substrates) are passed down the electron transport chain (ETC: complexes I–IV), and the free energy is transduced into a transmembrane proton electrochemical gradient (ΔμH⁺, "protonmotive force") across the inner mitochondrial membrane. That gradient drives ATP synthesis via F₁F₀-ATP synthase (complex V), and many other transport and signaling processes besides.

This is **chemiosmosis**, Peter Mitchell's 1961 principle (Nobel 1978). It is the foundational axiom of bioenergetics: energy in living systems is transduced via membrane-localized proton gradients, not via a hypothetical "high-energy intermediate". Every canonical derivation in cellular energetics flows from this.

## 2. Dual origin — endosymbiosis

Mitochondria are evolutionary chimeras. The consensus, first articulated rigorously by Lynn Margulis (1970), is that mitochondria derive from an **α-proteobacterial endosymbiont** captured by a host lineage ~1.5–2 Gya. The evidence is overwhelming:
- Double membrane (outer = host-derived, inner = bacterial-derived).
- Circular genome, bacterial-type 70S ribosomes, bacterial-type lipids (cardiolipin).
- Molecular phylogeny places mtDNA inside α-proteobacteria (Gray, Burger & Lang 1999).
- Most ancestral endosymbiont genes migrated to the nuclear genome; ~13 proteins (all ETC/ATP synthase core) are still mt-encoded in humans.

**Martin & Müller's 1998 hydrogen hypothesis** proposed that the original symbiosis was metabolic (H₂-producing bacterium + H₂-consuming archaeon), not predatory. **Lane & Martin 2010** argued that the energetic advantage of distributing bioenergetic membranes across many small genomes (one per mitochondrion) is what made eukaryotic genome complexity thermodynamically possible at all — eukaryotes can afford ~200,000× more energy per gene than prokaryotes. This reframes the mitochondrion not as an accessory but as the **enabling condition for eukaryotic life**.

## 3. Role beyond ATP

Treating mitochondria as "the powerhouse" is a 1950s pedagogy that understates them by an order of magnitude. Canonical non-ATP roles, each with foundation-tier literature:

- **Ca²⁺ buffering.** The inner membrane holds a ~–180 mV potential. The mitochondrial calcium uniporter (MCU) lets the matrix sink cytosolic Ca²⁺ spikes on sub-second timescales, shaping neuronal, cardiac, and secretory signaling.
- **Apoptosis.** Cytochrome c released from the intermembrane space triggers the apoptosome (Apaf-1 / caspase-9). Mitochondrial outer-membrane permeabilization (MOMP) is the commit point of the intrinsic cell-death pathway.
- **ROS as signal.** Complex I and III leak superoxide at defined sites; at physiological levels this is a redox signal (HIF stabilization, insulin signaling, T-cell activation — Sena & Chandel 2012; Murphy 2009). It is not "damage" by default.
- **Retrograde signaling.** Matrix-to-nucleus signaling (Liu & Butow 2006) lets the mitochondrion report its own state (ΔΨm, NAD⁺/NADH, mtDNA copy number, unfolded-protein stress) and rewrite nuclear transcription accordingly. The organelle is not a silent worker; it negotiates.
- **Biogenesis and dynamics.** PGC-1α (Wu et al. 1999) is the master regulator of mitochondrial biogenesis. Fission/fusion machinery (Drp1, Mfn1/2, Opa1 — Chan 2006; Youle & van der Bliek 2012) continuously remodels the network; mitochondria are a reticulum, not a bag of beans.
- **Heat.** UCP1 in brown adipose tissue dissipates ΔμH⁺ as heat; thermogenesis is a deliberate uncoupling, not a failure mode.
- **Bioelectric coupling.** The inner-membrane potential is the largest transmembrane field in the cell (~30 MV/m). How it couples to whole-cell and tissue-level bioelectric fields (cross-ref Becker, Ling, Pollack in `05-biophysics/becker/`) is an open, largely under-mapped foundation question.

## 4. mtDNA, heteroplasmy, human origins

mtDNA is maternally inherited, haploid, and non-recombining in humans. That makes it the clean molecular clock Cann, Stoneking & Wilson (1987) used to place the most recent common matrilineal ancestor ("Mitochondrial Eve") in Africa ~150–200 kya. Ingman et al. (2000) extended this with full-genome sequences. Doug Wallace's body of work (1999, 2005, 2010) laid out the **mitochondrial paradigm** for metabolic and degenerative disease, aging, and cancer — the claim that bioenergetic capacity and mt-nuclear coevolution are causal, not downstream, in a large class of conditions. This is a foundation frame, not a clinical protocol; the clinical applications belong downstream (outcome-tier, `sub-outcomes/longevity/`).

## 5. Why mitochondria belong in Bucket canon

Mitochondria are the junction of four foundation branches:
- **Physics**: membrane thermodynamics, proton electrochemistry, rotational catalysis (ATP synthase is a literal molecular motor, Boyer/Walker Nobel 1997).
- **Chemistry**: redox enzymology, heme/copper chemistry at cytochrome c oxidase (Yoshikawa, Tsukihara, Wikström).
- **Information**: the organelle encodes, inherits, and negotiates with a second genome; retrograde signaling is an information channel.
- **Biophysics**: chemiosmosis is the master bioenergetic principle; everything in cellular metabolism downstream of glucose and O₂ routes through it.

This is why the dossier belongs in canon and not in the longevity outcome folder. Longevity, disease, cognition, and mitochondrial medicine are all downstream. The axiom is chemiosmosis; the substrate is the endosymbiont; the rest is application.

## 6. What is *not* here

- Kruse, Peat, Dinkov, Loh, and the broader "mitochondriac" commentariat — these belong in `research-landscape/biophysics/` (future bead), not canon.
- Clinical protocols (MitoQ, SS-31, urolithin A, NAD⁺ boosters, methylene blue) — these are outcome-tier and belong under `sub-outcomes/longevity/`, cross-mirrored only if they cite a canon axiom.
- Deuterium-depleted water clinical claims — the isotope-effect primary literature is included with a `contested` flag; clinical promotion is not.
- ELF electromagnetic-field biology — the Blank/Goodman and Pall entries are included with a `contested` flag for transparency; mechanism is unsettled.

## 7. Reading order for a new contributor

1. Mitchell 1961 (*Nature* 191:144) — the axiom.
2. Margulis 1970 (book, landscape-adjacent) + Gray, Burger, Lang 1999 — the origin.
3. Lane & Martin 2010 — why it matters for eukaryotic complexity.
4. Wallace 2005 — the mitochondrial paradigm.
5. Chandel 2014 — signaling organelle reframe.
6. Yoshikawa 1998 + Boyer 1993 + Walker 2006 — the enzymology.

Everything else in `primary-papers.md` is elaboration on these.
