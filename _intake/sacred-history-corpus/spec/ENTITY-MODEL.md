# Sacred-History Corpus — Entity Model

> The ontology for figures, entities, lineage/schism trees, and
> cross-tradition correlations.
>
> **The load-bearing design rule:** every correlation and every branch
> claim is a **CLAIM-WITH-EVIDENCE-AND-PROVENANCE** — contestable,
> cited, never a bare assertion. This is bucket 1.0's
> "theories-of-history-WITH-EVIDENCE" design (`HISTORY.md`) carried
> forward intact. In 2022 the unit was a *theory* you assembled from
> *evidence*; here the unit is a *claim* you back with *evidence +
> provenance*. The 13-frame evidence→theory pipeline that
> `HISTORY.md` records as deleted from the *UX* survives here as the
> *data contract*.

Status: **DRAFT.** Date: 2026-05-19. Pillar: Product. Schema style
follows `canon-figures/SCHEMA.md` (markdown-for-humans + JSON-for-
machines, same field discipline, no marketing voice, no anachronism,
disputes included not excluded).

---

## 0. Node types

| Node type | Folder | What it is |
|---|---|---|
| `tradition` | `traditions/<id>/tradition.json` | A religion / tradition container. |
| `text` | `traditions/<id>/texts/<id>/text.json` | An abstract work (FRBR work). |
| `witness` | `.../witnesses/<id>.json` | A manuscript / recension / critical base. |
| `translation` | `.../translations/<id>.json` | A rendering (FRBR expression), rights-gated. |
| `figure` | `figures/<id>.json` | A person/avatar: prophet, founder, reformer, avatar. |
| `entity` | `entities/<id>.json` | Non-person: deity, council, sect, order, school. |
| `lineage` | `traditions/<id>/branches/<id>.json` | A branch/schism node in a tradition tree. |
| `correlation` | `correlations/<id>.json` | A cross-tradition mapping. **Always a claim.** |
| `claim` | `.../claims/<id>.json` + embedded | The atom of contestability (see §5). |

`tradition`, `text`, `figure`, `entity` carry *descriptive* fields
**plus** an embedded `claims[]` array for every assertion that is not a
flat label. `lineage` and `correlation` are *themselves* claims —
their core relation IS the claim object.

## 1. Shared envelope (all node types)

```jsonc
{
  "id": "string",              // url-safe slug, globally unique within corpus
  "node_type": "figure",       // one of §0
  "label": "string",           // canonical English label (most-cited form)
  "aka": ["string"],           // alternate names / transliterations
  "traditions": ["judaism"],   // tradition id(s) this node belongs to / spans
  "wikidata": "Q302|null",     // anchor to Wikidata QID where one exists
  "added_in_pass": 1,
  "added_on": "2026-05-19",
  "rights": { /* see RIGHTS-POLICY.md; required on text/witness/translation */ },
  "claims": [ /* §5 claim objects; descriptive nodes embed contestable assertions here */ ]
}
```

## 2. `figure` — prophets / founders / avatars / reformers

```jsonc
{
  "id": "moses",
  "node_type": "figure",
  "label": "Moses",
  "aka": ["Moshe", "Musa", "Mūsā"],
  "traditions": ["judaism", "christianity", "islam"],
  "figure_class": "prophet",     // prophet|founder|avatar|reformer|sage|
                                 // patriarch|messiah-claimant|teacher|legendary
  "historicity": "contested",    // historical|contested|legendary|composite|mythic
  "lifespan": "traditionally 13th c. BCE; historicity debated",
  "era": "Late Bronze Age (per tradition)",
  "region": "Egypt / Sinai (per narrative)",
  "roles_by_tradition": {
    "judaism": "lawgiver, receiver of Torah",
    "islam": "rasul (messenger), recipient of the Tawrat"
  },
  "associated_texts": ["torah"],
  "associated_entities": ["yhwh"],
  "canon_xref": "canon-figures/08-tradition#moses|null",  // SEAM to canon
  "claims": [ /* historicity, dating, authorship attributions — §5 */ ]
}
```

`figure_class` deliberately includes `avatar` and `messiah-claimant`
so Vishnu's avatars, bodhisattvas, messianic figures, and founder-
prophets are all expressible. **Historicity is never asserted flat** —
the value here is a coarse tag; the *argument* lives in `claims[]`.

## 3. `entity` — deities / councils / sects / orders / schools

```jsonc
{
  "id": "council-of-nicaea-325",
  "node_type": "entity",
  "label": "First Council of Nicaea (325 CE)",
  "entity_class": "council",     // deity|council|sect|order|school|
                                 // institution|pantheon|denomination
  "traditions": ["christianity"],
  "active_period": "325 CE",
  "related_figures": ["constantine-i", "arius", "athanasius"],
  "related_texts": ["nicene-creed"],
  "produced": ["nicene-creed"],
  "timeline_events": ["ev-council-nicaea-325"],   // → TIMELINE-MODEL
  "claims": [ /* what it decided, disputed attendance/canon outcomes — §5 */ ]
}
```

## 4. `lineage` — branch / schism trees (per tradition)

A tradition's branch tree is a set of `lineage` nodes. **A branch
claim is never a bare edge.** Each split is a claim-with-evidence:
*who* split from *what*, *when*, *over what*, *attested by whom*.

```jsonc
{
  "id": "lin-great-schism-1054",
  "node_type": "lineage",
  "traditions": ["christianity"],
  "label": "East–West Schism (Catholic / Eastern Orthodox)",
  "parent_branch": "chalcedonian-christianity",
  "child_branches": ["roman-catholic", "eastern-orthodox"],
  "schism_type": "schism",       // schism|reform|founding|revival|
                                 // syncretism|reabsorption|disputed
  "approx_date": "1054 CE",
  "over": "papal primacy, filioque, ecclesiastical jurisdiction",
  "timeline_event": "ev-great-schism-1054",
  "claim": { /* REQUIRED single embedded claim — the split itself, §5 */ }
}
```

Rendering the tree is downstream (deferred). The data contract is
`parent_branch` / `child_branches` edges + each node's `claim`. A
contested split (e.g. exactly when Buddhism's schools diverged) carries
`schism_type: "disputed"` and multiple competing `claim` evidence
entries — never one canonized version.

## 5. `claim` — the atom (mirrors bucket 1.0 evidence→theory)

This is the most important object in the model. **Every contestable
assertion** — a dating, an authorship, a variant reading, a
historicity, a schism, a correlation — is a `claim`. A claim is the
2026 equivalent of a 2022 bucket "theory": an assertion that only
exists *with its evidence and provenance attached*.

```jsonc
{
  "id": "clm-moses-torah-authorship",
  "claim_type": "authorship",    // authorship|dating|historicity|
                                 // variant-reading|translation-meaning|
                                 // provenance|schism|attribution|
                                 // correlation|identification|canonicity
  "subject": "torah",            // node id the claim is about
  "predicate": "authored_by",
  "object": "moses",             // node id / literal / date-range
  "statement": "The Torah was authored by Moses.",
  "scope": "traditional attribution; contested by documentary hypothesis",

  "stance": "contested",         // asserted|contested|rejected|
                                 // majority-scholarly|traditional|fringe
  "confidence": 0.35,            // 0–1, the corpus's calibrated weight
                                 // (NOT truth — weight of cited support)
  "disputed": true,

  "evidence": [                  // ≥1 REQUIRED. No evidence ⇒ not a claim.
    {
      "kind": "primary",         // primary|manuscript|scholarly|
                                 // traditional|archaeological|linguistic|
                                 // ai-derived
      "locator": "Deut 31:9",    // verse/aya/sloka/shelfmark/page
      "source_node": "torah",
      "rights_tier": "A",        // from RIGHTS-POLICY; gates quotability
      "quote": null,             // only if rights allow (fair-use carve-out)
      "summary": "Internal attribution of writing to Moses.",
      "supports": true           // true=for, false=against (counter-evidence)
    }
  ],
  "provenance": {                // WHO is making this claim and from where
    "asserted_by": "documentary-hypothesis|tradition|ai-branch-analysis|<scholar>",
    "citations": [               // external scholarly anchors
      { "title": "...", "author": "...", "year": 1883,
        "doi_or_url": "...", "rights_tier": "B" }
    ],
    "derived_by": null,          // if ai-derived: model + run id (AI-BRANCH-ANALYSIS)
    "added_on": "2026-05-19"
  },
  "counter_claims": ["clm-torah-documentary-hypothesis"],  // contestation links
  "story_protocol_ip_id": null   // OPTIONAL mint id if registered (OPEN-DECISIONS D4)
}
```

### Claim invariants (enforced by ingestion + any consumer)

1. **No evidence ⇒ not a claim ⇒ rejected.** `evidence[]` must have
   ≥1 entry. This is the literal bucket 1.0 rule: a theory with no
   evidence was not publishable.
2. **Contestation is first-class.** `counter_claims[]` links opposing
   claims; the corpus stores *the disagreement*, never a verdict.
3. **`confidence` ≠ truth.** It is the corpus's weight of cited
   support, calibration documented, always shown with the evidence.
4. **Provenance is mandatory.** `asserted_by` must name a tradition,
   a scholarly position, a named scholar, or `ai-branch-analysis`
   (with `derived_by` model id). Anonymous assertions are rejected.
5. **Rights gate the quote.** `evidence[].quote` is null unless
   `RIGHTS-POLICY.md` Tier A or the per-claim fair-use carve-out
   applies.

## 6. `correlation` — cross-tradition mappings (ALWAYS a claim)

A correlation is a `claim` with `claim_type: "correlation"` and a
two-sided subject. Flood narratives, messiah/avatar/saoshyant
archetypes, dying-and-rising motifs, creation parallels, ethical
"golden rule" parallels — **every one is a contestable, cited claim,
never a stated equivalence.**

```jsonc
{
  "id": "corr-flood-gilgamesh-genesis",
  "node_type": "correlation",
  "claim_type": "correlation",
  "label": "Flood narrative parallel: Gilgamesh XI ↔ Genesis 6–9",
  "side_a": { "tradition": "mesopotamian", "node": "epic-of-gilgamesh-xi" },
  "side_b": { "tradition": "judaism", "node": "genesis-flood-pericope" },
  "correlation_kind": "motif-parallel", // motif-parallel|figure-mapping|
                                        // textual-borrowing|chronological|
                                        // structural|etymological|
                                        // shared-source-hypothesis
  "direction": "undirected",            // a→b | b→a | undirected | common-source
  "claim": { /* REQUIRED embedded §5 claim with evidence on BOTH sides */ },
  "confidence": 0.62,
  "stance": "majority-scholarly",
  "counter_claims": ["corr-flood-independent-origin"],
  "story_protocol_ip_id": null
}
```

Rule: a correlation's embedded `claim.evidence[]` must cite **at least
one locator on each side** (side_a and side_b) plus its scholarly
provenance. A correlation with evidence on only one side is rejected —
it is an assertion, not a mapping. AI-produced correlations enter here
with `provenance.asserted_by: "ai-branch-analysis"` and
`provenance.derived_by` set; they are claims like any other, never
promoted to fact (`AI-BRANCH-ANALYSIS.md`).

## 7. The seam to the canon (one direction, controlled)

Only `figure.canon_xref` and an analogous `structure_xref` may point
into `canon-figures/08-tradition.md` / `07-mind`. **No text, witness,
translation, lineage, timeline event, or correlation is ever canon.**
The seam is an id reference, not a merge — exactly the
longevity→biophysics cross-mirror pattern, run in reverse for figures
only.
