# Enforce "how it is made" per direction

Spec: brand/_directions/src/made.json (medium, motion, accents per direction). Each direction must differ from the others in production method and visual language, not only color.

Scope for your directions: every file in brand/_directions/pages/<id>/*.html and screens/<id>-{search,search-empty,search-loading}.html. Generators that made them (edit the generator, then regenerate): src/gen_pages.py (d1-d3), src/pages456.py (d4-d6), src/search_gen.py. Edit only the branches for your directions; another agent edits the others at the same time, so change shared code only additively and keyed by direction id.

Apply all of these per page, from the spec:
- Medium: illustrations and decorative graphics produced the spec's way (Swiss hand-set grid SVG; Kamon compass-and-ruler circle constructions with faint construction lines; Memphis SVG pattern tiles; Constructivism halftone photomontage using ../../img/<id>-hero.jpg and ../../3d/ stills cut with clip-path plus a CSS/SVG halftone filter; Girih tiling generated in JS; Bauhaus Blender stills from ../../3d/ plus primitive-only 2D).
- Motion: one shared per-direction CSS/JS motion layer included in every page implementing the spec's animation style for page entry, button press and card transitions, with prefers-reduced-motion respected.
- Accents and interaction: button shape, dividers, focus ring, cursor and hover, illustration and photo treatment, icon fill, texture, type behaviour, layout structure exactly as the spec says. Sound cues: a tiny WebAudio click per spec on button press, muted by default behind a visible sound toggle.
- Keep tokens, 4px rhythm, AA contrast (recompute), no horizontal scroll at 390, all images 200 over http://127.0.0.1:8777.
Re-shoot thumbnails (pages/<id>/thumbs/<page>-{1440,390}.png at 1440x900 and 390x844; screens/thumbs/<id>-<screen>.png at 1440x900) and view a sample at 2x device scale for defects. No code comments, no commits. Report under 80 words.
