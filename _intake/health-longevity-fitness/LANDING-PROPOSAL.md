# Landing Proposal — WHERE this corpus belongs in Bucket

> **STATUS: v1 — written 2026-06-27 AFTER Wave 1–3, once the map filled and its natural clusters
> emerged.** Per the operating contract, location was treated as a *deliverable discovered by
> research*, not a decision made upfront. This is a recommendation for the founder; nothing is moved
> until approved.
>
> **Inputs:** the populated `02-domains/` (181 graded claims, 9 domains), `01-people/` (151 cards +
> 136-edge graph), `05-labs/`, `06-evidence/CONFLICTS.md` (24), `03-movement-library/` + `media/`
> (294 assets), the 6 cross-cutting threads, and `00-map/CANON-BRIDGE-PROPOSAL.md`.

---

## 1. What the research revealed about the corpus's shape

After absorbing the field, the material does **not** cluster as one thing. It separated cleanly into
**three masses with different tiers, audiences, and update cadences**:

| Mass | What | Tier | Cadence | Volume |
|---|---|---|---|---|
| **(α) Bioenergetics foundations** | chemiosmosis, Krebs cycle, endosymbiosis, vent origin-of-life, mtDNA genome | **foundation** (laws/derivations) | rarely changes | ~6 figures + 1 concept node |
| **(β) Longevity/health science** | aging mechanisms (B), genetics/omics (C), metabolic (D), exercise (E), thermal (H), breath (G), sleep (I), biomarkers (L), people, labs, trials, conflicts, threads | **outcome** (applications/associations of foundations) | updates with literature | ~150 claims, 151 people, 24 labs |
| **(γ) Applied practice** | movement media library (F), practitioner protocols (J), what-to-track synthesis, safety flags | **applied/practical** (recipes, demos) | updates with practice | 53 movements, 15 protocols, 294 media assets |

This three-way split is the central finding. It maps directly onto Bucket's existing tier doctrine
(*foundations vs outcomes*) — and it means a single landing folder would mix tiers the canon contract
keeps separate. **The recommendation is therefore a SPLIT, not a single home.**

## 2. Recommendation — split landing (option γ from TAXONOMY_NOTES)

### (α) Bioenergetics → PROMOTE UP into `bucket-canon/05-biophysics/`
Per `CANON-BRIDGE-PROPOSAL.md` (high confidence):
- **Promote figures:** Hans Krebs (Krebs cycle; cross-branch `03-chemistry`), Jennifer Moyle
  (co-card with Mitchell — attribution parity), William Martin (co-card with Lane — parity).
- **Add a concept node:** *chemiosmosis / proton-motive force / redox bioenergetics* as the
  foundation principle the outcome layer `canon_link`s to. (Mitchell/Margulis/Lane/Wallace/
  Szent-Györgyi are already carded — the canon already commits to this spine; these close its gaps.)
- This gives `05-biophysics` a **rigorous, uncontested core** that anchors the contested
  Kruse/EZ-water/biophoton frontier already living there.

### (β) Longevity/health science → NEW outcome-tier vertical `longevity-fitness-canon/`
Mirror the **existing `longevity-canon/` pattern** exactly (it's already an outcome-tier sibling on
gdrive). This vertical holds the graded science layer, with:
- `CANON_INDEX.md` manifest, evidence-tiered (the `06-evidence/SCHEMA.md` grading carries over)
- **cross-mirror** into `bucket-canon/05-biophysics/sub-outcomes/` for any claim resting on a
  foundation (the `canon_link` fields already point there)
- the existing `longevity-canon/` likely **merges into or becomes a sub-branch of** this richer
  vertical (this corpus is a superset of what longevity-canon seeded). Flag for founder: dedupe.

### (γ) Applied practice → `longevity-fitness-canon/practice/` (sub-vertical, media-heavy)
The movement library + protocols + safety + what-to-track synthesis are a **different artifact type**
(demos, recipes, images, video) with a practical audience. They sit *under* the science vertical but
in their own `practice/` subtree because:
- they're media-heavy (gdrive mirror, not git — like the rest of bucket-canon)
- they update with practice/community, not literature
- they're the natural seed if Bucket ever surfaces a consumer "how to actually do this" layer
  (note: Bucket Academy already exists as a learning app — this could feed an `academy` health track)

## 3. Why not the alternatives
- **α-only (fold everything into 05-biophysics):** rejected — would bury 150 outcome claims + a media
  library inside a *foundations* branch, violating the canon contract that outcomes are downstream.
- **Single new vertical (no split):** rejected — mixes foundation-tier bioenergetics with outcome
  science with applied media; loses the promotion opportunity that gives 05-biophysics its rigorous core.
- **Standalone outside Bucket:** rejected — the whole value is the bridge UP to the biophysics canon
  and reuse of the feed402/citation infrastructure.

## 4. Migration plan (when approved)
1. **Promote α:** create the 3 cards + concept node in `canon-figures/05-biophysics.md` +
   `bucket-canon/05-biophysics/`. (Smallest, highest-leverage step — do first.)
2. **Stand up β:** `gdrive:AGFarms/Nucleus/research/longevity-fitness-canon/` with `README.md` +
   `CANON_INDEX.md`; migrate `02-domains/`, `01-people/`, `05-labs/`, `06-evidence/`, threads.
   Reconcile/merge the existing `longevity-canon/` into it.
3. **Stand up γ:** `longevity-fitness-canon/practice/`; migrate `03-movement-library/` + `04-protocols/`;
   mirror `media/` to gdrive (don't commit binaries to git, per Bucket convention).
4. **Wire cross-links:** every `canon_link` in the claim JSON resolves to a real
   `05-biophysics/sub-outcomes/` path.
5. **Keep this `_intake/` staging dir** as the working/expansion ground; promote stable material out,
   leave the frontier here. Re-runs stay idempotent.

## 5. Decision needed from founder
- [ ] Approve the **split** (α promote / β vertical / γ practice sub-vertical)?
- [ ] Approve promoting **Krebs / Moyle / Martin + chemiosmosis concept node** into `05-biophysics`?
- [ ] Reconcile existing **`longevity-canon/`** into the new `longevity-fitness-canon/` (merge) or keep separate?
- [ ] Should γ (practice) eventually feed a **Bucket Academy health track**?

*Until approved, everything stays in `_intake/health-longevity-fitness/`. This proposal is the map's
recommendation, not a move.*
