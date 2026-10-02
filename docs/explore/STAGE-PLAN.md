# Plan v3.1: Explorer stage

Beads: close .21, .22 and .23 as superseded by .25, .26 and .28. New beads, labelled needs-founder and source-agent: .30 mode ports, .31 DNA loci and base pairs, .32 links resolver and network, .33 accessibility, mobile and URL state. local/explorer-all rebases onto origin/dev first. There is one existing e2e spec, tests/e2e/canon-explorer-click.spec.ts. The new one is tests/e2e/explore-stage.spec.ts.

## Record and time

Beads .25.

Edge = { to, kind: cites|shares-token|advises|same-branch|locus-of|bonds|residue, reason, weight }
StageRecord = { id, type, theta, r, t: number|null, profile, links: Edge[] }
- /api/explore/search keeps links: string[] and adds a new edges: Edge[] field, so old clients keep working.
- There is one time table, src/lib/explore/time.ts. solvability-space.ts re-exports ERAS, eraOf and timeCoord through a shim.
- Time rules:
  - Elements use discovery year, and prehistoric elements get 0.
  - Genes use position along the chromosomes, in order. The slider label reads "position".
  - Undated items get t = null and sit on an undated rim.

## A mapper and a form for every mode
Mappers go in src/lib/stage/mappers/ and forms in src/lib/stage/forms.ts.
- globe: sphere.
- helix: path on the cylinder.
- DNA: helicoid.
- atom and particle: shells.
- molecule: ball-and-stick.
- reaction: two structures joined along t.
- protein: see below.
- earth: sphere with landmask.
- graph: force layout.
- map: disc, from project(star).
- timeline: cylinder unrolled flat.
Every shipped hit type has a mapper: excerpt, advisor, work, paper, text, talk, canon-file and you. Every form uses one bounding radius, so camera distance never changes.
Protein: 3Dmol mounts as a sibling layer in the same Stage container, and the three camera pose is copied in every frame through setView. The residue records are also in three, which gives protein the same selection, picking and glTF path as every other mode.

## Stage and morph

Beads .26.

- One Canvas and one camera. OrbitControls live outside the mode switch.
- Home lock comes from homeCamera: a locked bird's-eye view. Orbiting unlocks it, and a Home button re-locks it.
- One InstancedMesh, picked by instanceId.
- When the item count changes, records are keyed by id: shared records lerp, leaving records shrink to 0, entering records grow from 0. The buffer is sized to the larger set.
- Surfaces use a fixed u-v grid with morph targets.
- Reduced motion snaps between forms.

## Surfaces

Beads .27 and .31.

- smoothedRadius moves to surface.ts and runs in a worker above 2k records.
- helicoid(u, s): the vector from the axis (s=0) to the strand (s=1), swept along the whole length for both strands as one ribbon.
- Loci sit at (u, 1). Base pairs are rungs across s.

## Selection and URL

Beads .28 and .33.

One reducer: { active, set, range }. One select() handles every input:
- click sets active
- shift-click adds to the set
- range is t0 <= t <= t1, from the slider or a drag along the time axis
Keyboard:
- Tab into the stage
- arrows step to the nearest neighbour by (theta, t)
- Enter selects
- Esc clears
Screen reader: an offscreen listbox mirror and an aria-live region.
URL: ?q&mode&sel&t0&t1.

## Links and network

Beads .32.

network.ts neighbors(id, depth=1) returns { node, edge }[]. /api/explore/item?ids= resolves linked ids that are not in the current hits.

## Layout

Beads .28.

- The stage is full-bleed.
- SearchDock is split out of CanonGlobeMount. In full layout it sits under the search box. In compact layout it sits top-right and expands to a left nav or closes.
- The per-mode controls (DnaPanel, pickers, you text) go in the left nav's Mode section.
- DropZone covers the whole stage, with a dock button as well.
- RightNav shows the profile registry by type, then all links grouped by kind, then the network. SourcePanel becomes the paper, talk and text profile.
- Mobile: the right nav becomes a bottom sheet and the dock an icon.

## Performance
- Draw cap of 5k instances by score.
- Labels only near the camera.
- A coarser surface grid when zoomed out.
- The worker builds the surfaces.
- The network is capped at 200 edges.

## glTF

Beads .29.

- Bake the instanced mesh before export.
- Exclude the genome and the you node.
- Apply the same advisor privacy filter as the public search.
- LICENSE.txt lists the licence of each source.

## PRs
1. .25 Record, edges field and time shims, behind STAGE_V2.
   - test-stage-record
   - test-explore-search: links unchanged
   - test-research-os-solvability-space
   - golden atlas snapshot of place()
   - e2e: canon-explorer-click
2. .30 Mappers and forms.
   - test-stage-forms: one bounding radius, circle equals the cylinder slice, earth matches the projections
3. .26 Stage, picking, morph, home lock, reduced motion.
   - test-stage-morph
   - e2e: explore-stage.spec, camera distance kept across switches
4. .26 Time slider.
   - test-stage-time
5. .28 Selection and URL.
   - test-stage-selection: click, multi, range and keyboard give one target; URL round-trip
6. .32 network.ts and the item API.
   - test-stage-network
   - test-explore-item-api
7. .28 RightNav and profiles.
   - test-stage-profiles: every type has a profile, all edges shown
8. .28 Layout and panel moves.
   - e2e: dock collapse, DNA panel and drop zone
9. .27 Cylinder surface.
   - test-stage-surface: matches the old smoothedRadius
10. .31 Helicoid, loci and base pairs.
    - test-stage-helicoid
11. .26 SolvabilitySpace and CanonGlobe on Stage, behind the flag.
    - golden atlas snapshot
    - test-canon-explorer-projections
    - e2e: canon-explorer-click
12. .33 Accessibility and mobile.
    - test-stage-a11y
    - e2e: keyboard
13. .29 glTF export.
    - test-stage-gltf: baked mesh, you and genome absent, privacy filter applied

## Risks
- The flag lives through PR 11 and is removed after one clean dev deploy.
- 3Dmol can drift from the three camera: copy the pose every frame.
- Edge payload size: cap edges per hit.
- Bundle size (.11): lazy-load forms and 3Dmol.

## Critic round 3 additions
- The atlas snapshot is numeric: place, timeCoord and smoothedRadius outputs on the atlas fixture. No screenshot gate.
- ERAS values never change. ERA_BANDS moves only for explore.
- A contract test pins /api/explore/search: links stays string[] with the same ids, and edges is added.

## Critic v3.1 additions
- glTF export excludes every uploaded item: genome loci, the you node, uploaded papers (paper:upload/*) and uploaded structures.
- /explore switches from SceneHost to Stage in PR 3. SceneHost stays only as the adapter for modes not yet ported, and is removed once PR 2 forms cover every mode.
- /api/explore/item applies the advisor privacy filter, caps ids at 50, and has a test.
- Frame contract in src/lib/explore/frame.ts: y vertical, x horizontal, z is time running back-left to front-right; homeCamera is the locked bird's-eye view. Every form uses it.
- STAGE_V2 gates the Stage render path and the edges field; the shims and time table ship unflagged because the numeric snapshot proves no change.

## Founder additions

Design points 9 to 12, 2026-09-30.
- sizes.ts gives an estimated real size per record type (log scale). Records with no form get an outer sphere of that size. fields.ts draws field lines for magnetic and electric fields where a type has one. Reuse existing renderers and physics libraries.
- ObservationCircle: the advisor and prime-directions radar, with spokes as prime components and a polygon of standardized scores, for any record. It is shared with the advisor page.
- ObservationCard: the What's New production card layout for any record. A card rail scrolls through cards in rank order, separate from time.
- Slice view: the axis is locked with no rotation, scroll steps through slices in order, and selecting a slice opens it as the ObservationCircle.

## Founder correction: merge into canon search
- The target route is /canon/search. Stage, StageShell, SearchDock and RightNav mount there first. /explore becomes a redirect to /canon/search that keeps q, mode and sel.
- Order change: canon search moves onto Stage as soon as Stage exists (the old PR 11 or 13 becomes PR 4), still behind STAGE_V2 until canon-explorer-click.spec and the parity checks pass. After that, every later PR lands in /canon/search.
- The explore code in src/lib/explore and the api routes stay as the data layer. Their UI moves into the canon search components.
- Common shape: src/lib/stage/shape.ts defines the one circle, sphere and cylinder at STAGE_RADIUS. Every form is a fill inside it, and the shape never changes across modes.
