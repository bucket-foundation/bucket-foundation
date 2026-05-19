# Sacred-History Corpus — Timeline Model

> The data contract for the "sacred timeline of events."
>
> **Data only. No UI.** The timeline VISUALIZATION is explicitly
> deferred to a downstream search/visualization tool. This document
> specifies the *schema the tool will consume* so it can render the
> timeline later — it specifies nothing about how it looks.

Status: **DRAFT.** Date: 2026-05-19. Pillar: Product. Relation model
is **Wikidata-aligned** so the corpus can join to / be enriched from
Wikidata without re-inventing temporal predicates.

---

## 1. Scope

The timeline holds **events**: composition/redaction events, councils,
schisms, revelations-as-narrated, translations, manuscript
production/discovery, founder lifespans, destruction/exile events —
any datable point or span relevant to one or more traditions.

An event is **not** a claim by itself, but **every event's date and
every event's relation to other events is claim-backed** — same
discipline as `ENTITY-MODEL.md`. A disputed date is not a single fuzzy
number; it is competing dating claims surfaced together.

## 2. Event object

```jsonc
{
  "id": "ev-council-nicaea-325",
  "node_type": "timeline_event",
  "label": "First Council of Nicaea",
  "event_class": "council",      // composition|redaction|canonization|
                                 // council|schism|reform|founding|
                                 // revelation-narrated|translation|
                                 // manuscript-production|manuscript-discovery|
                                 // destruction|exile|migration|life-event|
                                 // legendary
  "traditions": ["christianity"],

  "date": {
    "value": "+0325-00-00",      // ISO-8601-ish; Wikidata P585 (point in time)
    "precision": "year",         // day|month|year|decade|century|millennium
    "calendar": "julian",        // julian|gregorian|hebrew|hijri|
                                 // proleptic-julian|relative|unknown
    "earliest": "+0325-05-20",   // range bound (Wikidata P1319 earliest date)
    "latest":   "+0325-08-25",   // range bound (Wikidata P1326 latest date)
    "is_range": false,
    "is_relative": false,        // true ⇒ dated only relative to other events
    "disputed": false,
    "uncertainty_note": null
  },

  "dating_claims": [             // ≥1 if date.disputed OR date.precision coarse
    "clm-nicaea-325-date"        // → ENTITY-MODEL §5 claim ids
  ],

  "source_citations": [          // REQUIRED ≥1 — no uncited events
    { "kind": "scholarly", "title": "...", "author": "...",
      "year": 2006, "doi_or_url": "...", "rights_tier": "B" },
    { "kind": "primary", "source_node": "nicene-creed",
      "locator": "preamble", "rights_tier": "A" }
  ],

  "relations": {                 // Wikidata-aligned temporal/mereological edges
    "P585_point_in_time": "+0325",
    "P155_follows":   ["ev-council-antioch-325"],   // immediately preceding
    "P156_followed_by": ["ev-council-constantinople-381"], // immediately following
    "P361_part_of":   ["ev-arian-controversy"],     // part of larger event/period
    "P527_has_part":  []                            // inverse of P361 (optional)
  },

  "related_figures":  ["constantine-i", "arius", "athanasius"],
  "related_entities": ["council-of-nicaea-325"],
  "related_texts":    ["nicene-creed"],

  "added_in_pass": 1,
  "added_on": "2026-05-19"
}
```

## 3. Field rules (the data contract)

| Field | Rule |
|---|---|
| `id` | `ev-` prefix, url-safe, globally unique in corpus. |
| `event_class` | Closed vocabulary above. New classes go through `TAXONOMY_NOTES.md` rename log, not ad hoc. |
| `date.value` | Single point. Use `date.earliest`/`latest` for spans. Negative years for BCE. `precision` is mandatory and honest (a "c.6th century BCE" event is `precision: "century"`, **not** a false `year`). |
| `date.calendar` | Mandatory. Hebrew/Hijri dates are stored in their own calendar **plus** a proleptic-Julian/Gregorian conversion in `earliest`/`latest`; the conversion itself is a `dating_claim` if contested. |
| `date.disputed` | `true` ⇒ `dating_claims[]` must list ≥2 competing claims (`ENTITY-MODEL §5`). The corpus stores the disagreement; it never picks the date. |
| `date.is_relative` | `true` ⇒ the event is positioned only via `P155/P156/P361` edges (e.g. "after the Babylonian exile, before the return") with no absolute value. |
| `source_citations` | ≥1 mandatory. An uncited event is rejected, mirroring the `ENTITY-MODEL` claim invariant. |
| `relations.P155/P156` | **Immediate** predecessor/successor only (Wikidata semantics). Loose "around the same time" is *not* P155/P156 — model it as shared `P361_part_of`. |
| `relations.P361_part_of` | Used for eras/periods/controversies that contain sub-events. Periods are themselves `timeline_event` nodes with `event_class` like `legendary` or a coarse-precision range. |
| cross-tradition | An event may carry multiple `traditions[]` (e.g. a conquest narrated by two traditions). Each tradition's *account* of the event is a separate `claim` in `ENTITY-MODEL`, linked via `dating_claims`/related nodes; the event node stays single and tradition-neutral in its label. |

## 4. Wikidata alignment (explicit)

| This model | Wikidata property | Meaning |
|---|---|---|
| `relations.P585_point_in_time` | **P585** | point in time |
| `relations.P155_follows` | **P155** | immediately follows |
| `relations.P156_followed_by` | **P156** | immediately followed by |
| `relations.P361_part_of` | **P361** | part of |
| `relations.P527_has_part` | **P527** | has part (inverse P361) |
| `date.earliest` | **P1319** | earliest date |
| `date.latest` | **P1326** | latest date |
| envelope `wikidata` (per `ENTITY-MODEL §1`) | item QID | join key for enrichment |

Alignment lets a downstream tool federate the timeline with Wikidata's
event graph and lets the corpus pull (cited) candidate dates from
Wikidata as *claims* — never as ground truth.

## 5. Out of scope (deferred to downstream tool)

- Any rendering: tracks, swimlanes, zoom, scrubbing, era bands, color.
- Conflict *resolution* between competing `dating_claims` — the tool
  may *display* the spread; the corpus never collapses it.
- Layout, pagination, search ranking, faceting — all consumer concerns.

The corpus's only job is to emit correct, cited, uncertainty-honest
event nodes with Wikidata-aligned edges. Everything visual is the
search tool's job, on a later bead.
