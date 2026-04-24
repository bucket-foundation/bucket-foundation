# Melanin (seed dossier)

**Bead**: `bkt-research-04`. Sibling to `radiosynthesis/`, `becker/`, `bioelectric-lineage/`. Canon subfolder under `05-biophysics/`.

## Why melanin warrants a canon subfolder

Melanin is the most widely distributed pigment in biology (fungi, plants, invertebrates, vertebrates — including deep CNS structures) and one of the very few endogenous biomolecules that behaves as an **amorphous organic semiconductor**. Its physics sits at the intersection of four foundation-tier threads already indexed in canon: bioelectric signaling (→ `becker/`, `bioelectric-lineage/`), radiation-coupled energy capture (→ `radiosynthesis/`), redox/antioxidant chemistry (→ `03-chemistry/`), and CNS architecture (→ `07-mind/`). Any biophysics canon that omits melanin leaves a hole directly under the Becker and Dadachova threads.

Canon scope here is **mechanism, not clinical**. Pigmentation disorders, melanoma, cosmetic sunscreen, and longevity extrapolations are downstream and live in sub-outcomes, not here.

## Structural classes (mechanism-tier)

- **Eumelanin** — black/brown indolic polymer from tyrosine → DOPA → dopaquinone → 5,6-dihydroxyindole (DHI) and DHI-2-carboxylic acid (DHICA) monomers. The canonical semiconductor; the McGinness–Meredith–Mostert line studies this.
- **Pheomelanin** — red/yellow benzothiazine polymer, cysteine-incorporated. Distinct redox signature; generates more ROS under UV than eumelanin.
- **Neuromelanin** — pigment of substantia nigra pars compacta and locus coeruleus. Composite: eumelanin/pheomelanin core, lipid component, and iron-binding shell. Not a degradation product; a structured heterogeneous pigment (Zecca, Zucca line).
- **Allomelanin** — nitrogen-free melanins (e.g., 1,8-dihydroxynaphthalene / DHN in fungi). The pigment of Chernobyl-adapted fungi in the radiosynthesis line.

## Biophysical significance (four mechanism claims)

1. **Amorphous semiconduction.** McGinness, Corry & Proctor 1974 reported amorphous-semiconductor switching in synthetic melanin — the first demonstration of a biological amorphous semiconductor. Meredith & Sarna 2006 and Mostert et al. 2012 refined the picture: conduction is hybrid **electronic + ionic (protonic)**, strongly hydration-dependent. Melanin is not a simple semiconductor; it is a coupled electron/proton conductor whose conductivity rises with water content.
2. **Radical sink / redox buffer.** Stable free radicals are detectable in melanin by EPR. Sarna & Swartz, Liu & Simon, and Ito & Wakamatsu characterized its redox behavior: melanin reversibly accepts and donates electrons, quenches reactive oxygen species, and chelates transition metals (Fe, Cu, Zn).
3. **Photoprotection.** Kollias & Baqer and Meredith & Riesz 2004 measured extraordinarily low radiative relaxation quantum yields (~10⁻⁴ to 10⁻³) for synthetic eumelanin — i.e., absorbed UV energy is almost entirely dissipated non-radiatively as heat. This is the mechanistic basis of photoprotection, independent of "sunscreen" framings.
4. **Ionizing-radiation coupling.** Dadachova et al. 2007 showed melanized fungi grow faster under ionizing radiation; Turick et al. 2011 traced the electron-transfer mechanism. Cross-referenced in `radiosynthesis/`.

## Contested / flagged

**Solís-Herrera "human photosynthesis" hypothesis** — proposes melanin performs water-splitting analogous to PSII, generating O₂ and metabolically usable electrons/H⁺ in humans. Published primarily in open-access venues; has **not** achieved independent replication in mainstream biophysics journals. Retained in canon with explicit `contested` flag for transparency: the underlying question (can eumelanin photolyze water under physiological conditions?) is a legitimate biophysics question; the broad clinical claims associated with the hypothesis are not canon-tier.

## Structure

```
05-biophysics/melanin/
  CANON_INDEX.md        (manifest)
  SEED.md               (this file)
  queries.txt           (DOI pipeline input — bead 01)
  primary-papers.md     (annotated primary bibliography by sub-theme)
  lineage.md            (figures network + canon-figures/ cross-refs)
```

## Cross-references

- `05-biophysics/radiosynthesis/` — melanin as the radiation-capture substrate
- `05-biophysics/becker/` — Becker cited melanin electronics in *Cross Currents*; melanin sits inside the bioelectric lineage he opened
- `05-biophysics/bioelectric-lineage/` — melanin as one substrate in the broader lineage
- `03-chemistry/` — redox / radical-sink chemistry
- `07-mind/` — neuromelanin and CNS architecture (substantia nigra)
- `06-cosmology/` — ionizing-radiation background coupling via radiosynthesis
- `canon-figures/05-biophysics.md` — figure cards (Solís-Herrera added pass-2)
