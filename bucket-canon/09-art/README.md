# 09-art — Canon Branch

## Scope

The art canon holds **theoretical and material foundations** of art-making and
art-perception: aesthetic theory, theories of perception, color and form law,
craft and architectural treatises, design principles, and music theory.

It does **NOT** hold:

- Celebrated works (no catalogues of "great paintings")
- Biographies of artists
- Art-historical narrative (that belongs in 08-deep-history)
- Performance pedagogy or style guides
- Criticism of individual works or shows

The test for inclusion is the same applied to Euclid in 01-mathematics: is
this text a primary statement of a law, principle, or mechanism that
downstream art-making or art-analysis must contend with? If yes, it is
candidate canon. If the text is a record of taste, reception, or personal
sensibility — even a celebrated one — it belongs in the landscape, not the
canon.

## Promotion rule

Material enters `09-art/` only when one of the following holds:

1. It is a **primary theoretical text** by the originator of the framework
   (e.g. Kant on judgment, Rameau on harmony, Alberti on perspective).
2. It is a **recognized academic edition-of-record** of a primary text
   (e.g. Guyer & Matthews 2000 for the third *Kritik*).
3. It is a **peer-reviewed or discipline-standard monograph** advancing a
   named foundational framework (e.g. Lerdahl & Jackendoff's generative
   theory of tonal music).

Landscape-tier writing (reviews, commentary, essays, interviews, manifestos
without mechanism) does not promote to canon without one of the three
conditions above being satisfied by the text itself, not by its author's
reputation.

## Why music theory lives here, not in its own branch

Music theory is a mixed object: part acoustic physics (Pythagorean ratios,
Helmholtz resonance, consonance from partials), part compositional grammar
(species counterpoint, functional harmony, Schenkerian reduction,
Lerdahl-Jackendoff generative rules). The physics half cross-refs into
`02-physics/acoustics`; the grammar half is an art-making theory on the same
footing as aesthetic theory or color theory. Splitting music into its own
branch would duplicate the acoustics cross-ref and separate grammar from its
sibling theories of form. Keeping it in `09-art/music-theory/` with an
explicit cross-ref to acoustics is the cleaner carving. Helmholtz (1863) is
the linchpin — it is mirrored as a reference from both sides.

## Subfolders

- `aesthetic-theory/` — philosophy of art and beauty (primary texts)
- `perception/` — perceptual and cognitive foundations of seeing art
- `color-form/` — color theory and form theory (primary laws)
- `craft-foundations/` — treatises on painting, architecture, proportion
- `design/` — design theory (Bauhaus lineage through Tufte, Alexander, Norman)
- `music-theory/` — theoretical music writing, Aristoxenus → Lerdahl

## Status

Absorption stage. Seeds committed; PD mirrors to gdrive deferred to a
follow-up bead. `CANON_INDEX.md` is authoritative — a file not listed there
is not canon.
