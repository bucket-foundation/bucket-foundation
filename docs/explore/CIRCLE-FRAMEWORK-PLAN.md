# Plan v4: Explorer circle-chart framework, restart

Spec: the design field of bkt-0sj7. /canon/search is not touched in any PR. #462 restores it.

## Data contract
New file src/lib/explore/space.ts.

Dataset {
  schema: "bucket.explore-space/1", id, label,
  fields: { key, kind: number|category|tokens|time }[],
  components: { index, angle_deg, variance_ratio, top_terms, bottom_terms }[],
  mean: number[],
  sweep?: { field, bins: { label, from, to }[] },
  obs: { id, title, scores: number[], t?, meta, links }[],
}

- Scores follow the same shape as bucket.prime-directions/1 from tools/prime-directions export.py.
- Adapters: fromPrimeDirections() and fromAdvisorReview() reuse the parsers in src/lib/research-os/advisor-review.ts.
- smooth(obs, k, bandwidth) generalises smoothedRadius from solvability-space.ts. It fills sparse and token data into a continuous r(theta, u).
- bandAverage(u) gives the averages per sweep bin.

## Where the SVD runs
- Canon: scripts/canon-explorer/embed.py writes src/data/explore/canon.space.json.
- Advisors: advisors.py already fits the SVD. A new to_space() in export.py writes the space file, and the bkt desktop app imports it.
- Local corpora: `prime_directions run --space` writes .data/explore/*.space.json (gitignored), served by src/app/api/explore/space/route.ts.
- Dropped files: a 2-component power iteration in a worker, capped at 2k rows.

## Center component
SpaceView.tsx takes one `view` prop.
1. CircleChart.tsx, in SVG. Spokes are components, each observation is a polygon, and the average is a dashed polygon. It lifts radar() and smoothLoop() from advisor_page.html and Spokes from bkt-ui Primes.tsx. Scroll steps through the sweep.
2. SliceStack.tsx. The camera is locked, slices run left to right and back to front inside a transparent cylinder, scroll moves one slice, and a click opens the CircleChart. From SliceCircle and the SolvabilitySpace slices.
3. Cylinder surface: surfaceOf() from SolvabilitySpace, fed by smooth().
4. Sphere and sphere through time: spherePoint and the sphere guide from SolvabilitySpace, with the time slider from SolvabilityAtlas.
5. Helix and helicoid: the SolvabilitySpace helix and helixAngle. The helicoid is a two-strand ruled surface.
6. 3D polar: new polar.ts, with (r, polar angle, charge) mapped to (score norm, component angle, sign), and t animated.

Geometry moves from solvability-space.ts into src/lib/explore/geometry.ts, with re-exports so the atlas golden stays byte-identical.

## Shell reuse
The planner proposed a `center` prop on CanonGlobeMount. The founder said canon search must not change, so /explore does not edit CanonGlobeMount. Instead it takes a copy: src/app/explore/ExploreShell.tsx is forked from CanonGlobeMount at the #462 state, with the same search box, filters, sorts, view switch and right-nav Drawer. The globe in the center is replaced by SpaceView. The canon search files stay byte-identical, and a test pins them to the #462 hashes.

## PRs
Each PR has a unit test run through scripts/run-tests.mjs.
1. The contract, adapters, smooth() and CircleChart on /explore, using the sample prime and advisor fixtures. It is reviewable in a browser on day one. Test: test-explore-space.ts, covering the adapter round trip, the constant-data average and the vertex count.
2. ExploreShell, forked from canon search, with SpaceView in the center. Tests:
   - the canon search files match the #462 hashes
   - e2e explore-shell.spec.ts
3. Geometry move and SliceStack with scroll and click. Tests:
   - the solvability golden is unchanged
   - e2e: scroll moves one slice, click opens the circle
4. Cylinder, sphere and sphere through time. Test: surface vertices against smoothedRadius.
5. Canon space export in embed.py, after #462 merges. Tests:
   - canon-embeddings test
   - pytest on the file shape
6. `--space` for prime-directions and the local-corpus API route. Tests:
   - pytest on people-synthetic
   - a route unit test
7. Helix and helicoid. Test: angle and pitch.
8. 3D polar through time. Test: the mapping.
9. Retire the old modes/*. Test: e2e that /explore query parameters still work.

# v4.1: answers to critic round 1

## One reference basis
This answers H1. Every data set projects onto one reference basis: the prime directions fitted on the OpenAlex topic taxonomy (reference.py, #400).
- Canon, advisors, the local corpora and dropped files are all projected. None fits its own SVD, which puts a mixed result set (excerpts, advisors and papers together) on one set of spokes.
- A per-data-set basis stays available as a secondary view: `basis=own`, labelled as such.
- Canon projects through the reference TF-IDF vocabulary, so top_terms are defined. The MiniLM embeddings stay out of the projection.
- The basis file ships as src/data/explore/reference-basis.json, holding the vocabulary, the loadings for 12 components and a sign convention.

## Sign and order
The components keep the reference order. Each component's sign is fixed so that its largest-magnitude top-term loading is positive. This is computed once in reference.py and stored. The same data projected twice gives identical polygons, and a test checks it.

## Dropped files
No SVD in the browser. A worker tokenizes the file and projects it onto the shipped basis with a dot product. Caps: 2k rows, 5 MB, and all 12 components, so there are always 3 or more spokes.

## /api/explore/space
This answers H2.
- An allow-list of data set ids from tools/prime-directions/corpora.json with `publish: true`. The private Kruse corpus is excluded.
- Ids are resolved to fixed paths, never joined from input, so no path traversal is possible.
- The route answers 404 unless NODE_ENV is development and BUCKET_LOCAL_SPACE=1, so a server build fails closed.
- meta and links pass through scrubEmails and a field allow-list.

## Point 6
charge is the signed score on a component: positive and negative render on opposite hemispheres. "Experiments through time" has no data source today, so it is its own bead, waiting on the founder naming one. PR 8 builds the renderer against a synthetic fixture.

## Shell
ExploreShell forks only the orchestration of CanonGlobeMount: state, layout and the center slot. It imports the existing leaf components unchanged: the filters, the sort controls, Drawer, CanonSearchPanel pieces and the search client.

The guard is scripts/test-canon-untouched.ts. It computes the transitive import set of src/app/canon/search/page.tsx, which covers canon-search.ts, canon-globe/*, the search route and CanonGlobeMount, and asserts a zero diff against origin/dev. It runs in CI on every Explorer PR.

## PR 1 placement
/explore?view=circle renders the new center while the existing modes keep working. A "sample data" badge stays up until PR 5 or PR 6 feeds real data.

## Added tests
- smooth(): angular wrap-around, sparse slices, a constant-data average.
- The contract rejects a bad schema, capped sizes and NaN.
- The sign convention is deterministic.
- The privacy of /api/explore/space: allow-list, traversal and the production guard.
- A keyboard walk: scroll and arrow keys step slices, Enter opens the circle.
- A visual baseline screenshot of CircleChart on a fixed fixture.

# v4.1 critic round 2 additions
- Coverage: each observation stores the share of its tokens that are in the vocabulary. Below 0.3 it shows a "low coverage" label, and the data set stat reports the mean coverage.
- Advisors are re-projected from their OpenAlex topics and works text onto the 12-component reference basis. The bundle's 4 components stay available under basis=own.
- test-canon-untouched asserts that the PR diff (git diff origin/dev...HEAD) touches no file in the canon search import set.
- Non-text data (genome, structure, molecule) is placed by its own numeric fields through basis=own until a reference basis exists for it. Each such data set gets its own bead.
- reference-basis.json loads lazily. A projection test checks a hand-computed dot product.
