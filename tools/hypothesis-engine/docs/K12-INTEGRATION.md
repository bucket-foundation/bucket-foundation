K-12 Integration
=================

`hte.corpus.education_atlas` reads the sibling `bucket-foundation/
education-atlas` repo's sample tables, its two synthesis docs, and this
repo's own local education content mirror, so a K-12 education question
arriving through Bucket's education work can run through the same engine
loop `hte.corpus.quantum_history` and `hte.corpus.fixtures` already feed.
The full mapping, kind, tier, slot, ground truth, and stemma, lives in
`hte/corpus/education_atlas.py`'s own module docstring; below are the
campaign shape and the command line.

## From a K-12 question to a campaign

A question such as "did pandemic-era school closures move learning
poverty in Sub-Saharan Africa" becomes a campaign the same way a
quantum-history question does, corpus, period, and hypothesis population,
each read off the education-atlas sample rather than off a prose chapter.

**Corpus.** `hte.corpus.education_atlas.load()` returns one `Corpus`: a
`Source` per (dataset, country) pair (World Bank, UNESCO UIS, OWID,
PISA), a shared `Source` for the problem-profile ground truth, and one
per ingested doc; an `EvidenceItem` per observation row and per
severity-flagged problem row; a `GroundTruthEvent` per flagged problem
row; and every doc paragraph as its own textual `EvidenceItem`.
`countries`, `levels`, and `years` narrow the quantitative slice; the
qualitative docs load in full regardless.

**Period.** `hte.timeline.auto_resolution` picks the finest resolution-
ladder rung giving 8 to 40 bins over the corpus's own ground-truth span.
The sample's observed span (2010 to 2024, 15 years) already lands inside
that window at the ladder's finest rung, so a campaign against this
corpus bins by calendar year rather than by decade or century, one bin
per school year the sample covers.

**Hypotheses.** A placement fills five concept slots plus the numeric
time bin: ACTOR (a country's own polity), ACTION (`improved`/`worsened`/
`stagnant`), OBJECT (an indicator), PLACE (the same country, its place
concept rather than its polity), and MECHANISM (a named cause, funding,
teacher supply, curriculum, language of instruction, conflict, pandemic
closure, measurement change, or `OTHER`). `hte.generate.enumerate_
placements`'s combinatorial sweep and `hte.generate.from_evidence`'s
evidence-driven generators both read this population the same way they
read the quantum-history one: a hypothesis such as "pandemic closure
worsened learning poverty in Kenya in 2020" is one placement at one
address, scored by `hte.belief.score` against every `EvidenceItem` `hte.
link.link_evidence` matches to it. A sequence hypothesis pairs two such
placements under an Allen relation, "funding shortfall in Chad's primary
level before its completion-rate decline," the same way a quantum-history
sequence pairs two milestones.

## What the engine outputs

A campaign run against this corpus produces the same four artifacts a
quantum-history run does, populated from education data instead of
physics history:

- **A timeline of hypotheses with opinions.** `hte.export.timeline_
  views` groups the surviving population by time bin, event, and pair,
  each entry carrying its address, its slots, its projected posterior
  `P(h) = b + a*u`, and its Elo rank; `hte.export.write_views` renders
  that as `timeline.json` and `TIMELINE.md` under the run directory.
  Reading it for a K-12 question means finding the bin for the year in
  question and the country's own PLACE concept, then reading which
  MECHANISM hypothesis at that address carries the highest posterior.
- **Gap nodes naming the missing data.** `hte.unknowns.GapNode` names an
  unread document, an unfilled country-year cell, or an unresolved
  MECHANISM as a first-class node a caller can price with `value_of_
  information`/`active_priority`; for this corpus a gap node's natural
  reading is a country-indicator-year cell the sample never observed
  (the 2010-2024 sample is not complete for every country x indicator x
  year triple) or a MECHANISM this module's own paragraph-scan left at
  `OTHER`. `hte.runner.run_campaign` does not populate this queue on its
  own yet, the same gap README.md's own module map names for every
  corpus this package ships; a caller wanting gap nodes against this
  corpus constructs them by hand from `corpus.evidence`'s own `mechanism
  is None` and `OTHER` reads, and from the country-indicator-year cells
  `hte.corpus.education_atlas`'s own filtered read never produced.
- **Self-report.** `hte.roles.self_report` writes `self-report.json`:
  this run's own assumptions, which slot vocabularies it judged
  incomplete given how thin their evidence coverage is, a missing-mass
  estimate, a calibration summary, and the target-blind check (did the
  generator's proposal rate for the five non-consensus K-12 actors hold
  steady against the run before it). Against this corpus, a self-report
  should flag MECHANISM as the thin vocabulary: most observation rows
  carry `OTHER` there unless a doc paragraph named a cause for that
  country, so a self-report reading a low MECHANISM coverage rate is
  reading this module's own documented limit, a property of the corpus
  rather than a defect in the run.

## Running a campaign

`hte/cli.py` and `hte/runner.py` each keep their own `_CORPUS_LOADERS`
dict, a fixed map from a `--corpus` name to a zero-argument loader
function; `"education-atlas": education_atlas.load` is registered in
both (`bkt-hte-corpus-registration`), alongside `"quantum-history"`,
`"fixtures"`, and `"production"` (`RESEARCH-OS-INTEGRATION.md`).
`hte.corpus.education_atlas.load` matches the loader signature both
dicts expect (every one of its own parameters carries a default, so
`education_atlas.load()` alone resolves a sample directory from
`EDUCATION_ATLAS_SAMPLE_DIR` or the sibling-clone convention and returns
a `Corpus`); its own vocabulary (`hte/data/vocab-education-seed.json`)
loads automatically inside `load()`, no separate wiring needed. A K-12
campaign runs exactly like a quantum-history one:

```bash
cd tools/hypothesis-engine
python3 -m hte.cli campaign run --corpus education-atlas --seeds 3
python3 -m hte.cli calibrate --corpus education-atlas --fit
python3 -m hte.cli views runs/default/<timestamp>/
```

`education-atlas`'s own ground truth sets `discovery_year == year` for
every flagged problem row (this module's own docstring), the same shape
quantum-history ships; `hte.calibrate.choose_holdout_mode` reads this as
k-fold (`hte.calibrate.holdout_kfold`) rather than discovery-date holdout,
so `calibrate --fit` above runs that mode automatically.

The adapter and its corpus are also callable and tested on their own,
with no campaign wiring involved:

```bash
cd tools/hypothesis-engine
python3 -c "from hte.corpus import education_atlas as ea; c = ea.load(); print(len(c.sources), len(c.evidence), len(c.ground_truth))"
python3 -m pytest -q tests/test_corpus_education_atlas.py
```

## Research OS hooks

`bucket-mcp` (`mcp-server/bucket-mcp.py`) already exposes `canon_search`/
`canon_get_claim`/`canon_list_branches`/`canon_list_bridges`/`canon_get_
bridge` (the local canon), and `bucket_research`/`bucket_cite` (the paid
research rail). A `hypothesize` tool would sit beside those, wired to
`hte.runner.run_campaign` the same way `bucket_research` wires to
bucket.foundation's own research API, without touching `bucket-mcp.py`
itself, this section names the seam, it does not cut it.

**Request**, matching `TOOLS`' own `inputSchema` shape in `bucket-mcp.
py`:

```json
{
  "name": "hypothesize",
  "description": "Run a hypothesis-engine campaign over a named corpus and return its ranked timeline.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "corpus": {"type": "string", "enum": ["quantum-history", "fixtures", "education-atlas"], "default": "education-atlas"},
      "query": {"type": "string", "description": "the question motivating this campaign, carried through for the self-report only"},
      "countries": {"type": "array", "items": {"type": "string"}, "description": "education-atlas only: ISO3 country codes"},
      "years": {"type": "array", "items": {"type": "integer"}, "minItems": 2, "maxItems": 2, "default": [2000, 2024]},
      "seeds": {"type": "integer", "default": 3}
    },
    "required": ["corpus"]
  }
}
```

**Response**, the same fields `hte.runner.RunArtifacts` and its
`timeline.json` already carry, reshaped for a tool result rather than a
run directory on disk:

```json
{
  "ok": true,
  "run_dir": "runs/default/2026-09-09T12-00-00Z",
  "counts": {"n_sources": 84, "n_evidence": 4655, "n_survivors": 40},
  "timeline": {
    "bins": [
      {
        "bin_label": "2020",
        "hypotheses": [
          {
            "hypothesis_id": "h-af3c",
            "slots": {"ACTOR": "polity-ken", "ACTION": "worsened", "OBJECT": "se-lpv-prim", "PLACE": "country-ken", "MECHANISM": "pandemic-closure"},
            "posterior": 0.71,
            "elo": 1532.4
          }
        ]
      }
    ]
  },
  "self_report": {
    "missing_mass_estimate": 0.18,
    "calibration_summary": "...",
    "target_blind_steady": true
  },
  "gap_nodes": [
    {"id": "gap-ken-uis-2022", "kind": "unfilled-country-year-cell", "description": "no UIS out-of-school observation for Kenya, 2022"}
  ]
}
```

A 402 challenge, an unresolved corpus name, or a campaign that raised
before a run directory existed all return `{"ok": false, "error": "..."}`,
the same failure shape `bucket_research`/`bucket_cite` already return.
