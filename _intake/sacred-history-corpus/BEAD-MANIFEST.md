# Sacred-History Corpus — Bead Manifest (staged, NOT filed)

> **⚠️ API RECOVERY OBSERVED (2026-05-19, late in session).** The `bkt-`
> instance API was **404** at session start and re-confirmed 404 twice
> during this session (the premise of the hard constraint). It then
> **recovered to 200** before commit: `GET /api/version` →
> `{"version":"0.6.89","git_sha":"3ca4930d",...}` (stable across 3
> retries), `GET /issues` → 200. Per the explicit founder HARD CONSTRAINT
> ("do not retry filing"), **no beads were filed in this session** — the
> constraint was given as a directive, not merely a consequence of the
> 404. **ACTION FOR NEXT AGENT / FOUNDER:** the API is now live; file the
> manifest immediately per the "FILE WHEN API RETURNS" file-order below
> (P1 `bkt-sh-rights-policy` first). This is the only blocker remaining.

**Status:** the `bucket-foundation` instance API was **404** at session
start, re-confirmed 404 twice during this session (`GET .../api/version`
→ 404), then **recovered to 200** before commit (see warning above). Per
HARD CONSTRAINT these beads were **NOT filed and filing was NOT retried**
this session. This manifest is **authoritative** for sacred-history work
and is ready to file the instant the founder/next agent acts on the
recovery. The PD/open Phase-1 proof run is **already LIVE** under
the founder-adopted `RIGHTS-POLICY.md` (`DECISIONS.md`). File the moment
the `bkt-` instance API is back, per the "FILE WHEN API RETURNS" section
below (P1 rights bead first), via the canonical command (instance
preferred, org-dispatch fallback):

```bash
# instance (preferred, once API is back)
curl -s -u "$NUCLEUS_ADMIN_USER:$NUCLEUS_ADMIN_PASSWORD" \
  -X POST https://bucket-foundation.nucleus.agfarms.dev/issues \
  -H "Content-Type: application/json" \
  -d '{"title":"...","description":"...","issue_type":"epic|task","priority":N}'

# fallback (org dispatch)
curl -s -u "$NUCLEUS_ADMIN_USER:$NUCLEUS_ADMIN_PASSWORD" \
  -X POST https://nucleus.agfarms.dev/api/portfolio/dispatch \
  -H "Content-Type: application/json" \
  -d '{"instance_id":"bucket-foundation","title":"...","description":"...","priority":N,"issue_type":"task"}'
```

Priority scale: 1 = highest, 3 = normal, 4 = backlog.

---

## EPIC

### `bkt-epic-sacred-history`
- **type:** epic
- **priority:** 2
- **title:** Sacred-History Corpus — ongoing rights-aware index of all religions / sacred texts / manuscripts / sacred-historical timeline / entity-branch-correlation graph
- **description:** Ongoing-forever, bounded, rights-aware sibling corpus to
  `bucket-canon` (peer of `longevity-canon`, NOT an 8th canon branch). Index
  the world's sacred texts + translations + manuscript locations + the
  sacred/historical timeline + the people/avatars/entities/correlations/
  branches graph. Honors **build the past / build history**. gdrive target
  `gdrive:AGFarms/Nucleus/research/sacred-history-corpus/` (naming
  founder-locked to `-corpus` 2026-05-19; see `DECISIONS.md`). First
  slice scaffolded under `_intake/sacred-history-corpus/` (README +
  SOURCES + runner + systemd templates). Phase 1 is **LIVE for PD/open
  sources only**; copyrighted/NC = metadata-only, gated. No mass
  downloads; recurring systemd `--user` timer pattern (does NOT
  self-disable). Child beads below.

---

## CHILD BEADS

### `bkt-sh-taxonomy`
- **type:** task · **priority:** 2 · **parent:** `bkt-epic-sacred-history`
- **title:** Sacred-History taxonomy + relationship-to-canon contract
- **description:** Define the corpus taxonomy (tradition → corpus → work →
  edition → manuscript-witness; plus timeline + entity-graph schemas). Write
  the contract that it is a SIBLING corpus, the cross-mirror rule into
  `bucket-canon/07-mind` (future, gated), and a `TAXONOMY_NOTES.md` working
  log mirroring the bucket-canon pattern. Deliverable: `TAXONOMY.md`.

### `bkt-sh-rights-policy`
- **type:** task · **priority:** 1 · **parent:** `bkt-epic-sacred-history`
- **title:** Rights & licensing policy for sacred-text ingestion (gate before any live fetch)
- **description:** Codify the per-source rights gate from `SOURCES.md` into a
  machine-checkable policy (`rights.json`): full-text-allowed vs metadata-only,
  per-item license-field reading (Sefaria/GRETIL/OpenITI), NC handling
  (CBETA/84000/Baháʼí → metadata-only), manuscript-image exclusion. This bead
  MUST close before `LIVE_GUARD` is removed from any runner. Highest priority.

### `bkt-sh-ingest-open-tier` — **EXECUTED LIVE 2026-05-19 (file as in_progress)**
- **type:** task · **priority:** 2 · **parent:** `bkt-epic-sacred-history`
- **title:** Per-tradition ingestion runners — open/PD tier (Sefaria, SuttaCentral, Tanzil, ctext, Wikidata)
- **description:** **DONE (proof run):** runner promoted to LIVE for the 5
  clean/open sources, each ToS-respecting. One bounded idempotent live
  Phase-1 run executed 2026-05-19: Sefaria index (~6592 titles, structure
  only, NO text bodies), SuttaCentral menu (206 nodes, CC0), Tanzil
  verbatim Arabic uthmani+simple (~2.6 MB, unmodified, license file
  stored), ctext structure-only (title+subsections, fulltext dropped,
  no-bulk ToS respected, 8s throttle), Wikidata bounded SPARQL (~74
  events, CC0). Total ~6.77 MB / 15 files. Recurring systemd `--user`
  timer installed + enabled (does NOT self-disable). **Remaining:**
  expand the ctext canonical-URN map, add SuttaCentral pinned shallow
  bilara-data clone, Sefaria/per-item body tier (→ moves to
  `bkt-sh-ingest-pertext-tier`). Gated on `bkt-sh-rights-policy` for any
  Tier-B extension.

### `bkt-sh-ingest-pertext-tier`
- **type:** task · **priority:** 3 · **parent:** `bkt-epic-sacred-history`
- **title:** Per-tradition ingestion — per-item-license tier (Sefaria full texts, GRETIL, OpenITI, STEP, Quranic Arabic Corpus)
- **description:** Add runners that read the per-item license field at fetch
  time and store full text only when PD/CC, else metadata-only. Covers
  per-text Sefaria bodies, GRETIL Hindu/Buddhist, OpenITI, STEP Bible
  (CC-BY), Quranic Arabic Corpus. Depends on `bkt-sh-rights-policy`.

### `bkt-sh-manuscript-provenance`
- **type:** task · **priority:** 3 · **parent:** `bkt-epic-sacred-history`
- **title:** Manuscript-provenance index (Wikidata P195/P276 + DigiVatLib/BL/e-codices/DSS/IA/Trismegistos)
- **description:** Build the manuscript-witness provenance graph: shelfmark,
  holding collection (Wikidata P195), location (P276), inventory no. (P217),
  IIIF manifest URL. Metadata + IIIF URLs only — NO manuscript image mirror.
  Reuse `agf-archive` for IA-held PD facsimiles.

### `bkt-sh-timeline-graph`
- **type:** task · **priority:** 3 · **parent:** `bkt-epic-sacred-history`
- **title:** Sacred/historical timeline event graph (Wikidata SPARQL)
- **description:** Expand the first-slice bounded SPARQL into the full
  sacred-historical timeline: events with P585/P580-P582, sequence chains via
  P155/P156, containment via P361, typed by P31. Recurring re-query to absorb
  new events. Output: a citeable timeline graph (JSON-LD).

### `bkt-sh-entity-branch-graph`
- **type:** task · **priority:** 3 · **parent:** `bkt-epic-sacred-history`
- **title:** Entity / avatar / correlation / branch graph across traditions
- **description:** Build the cross-tradition graph: prophets, avatars,
  founders, deities, schools/branches, and their correlations (e.g. shared
  flood narratives, axial-age figures, prophet lineages). Nodes from Wikidata
  + scripture indexes; edges = typed correlations with citations. This is the
  "people-avatars-entities-correlations-branches" payload.

### `bkt-sh-ai-branch-analysis`
- **type:** task · **priority:** 3 · **parent:** `bkt-epic-sacred-history`
- **title:** AI branch-analysis engine (cross-tradition correlation surfacing)
- **description:** Engine that proposes (human-reviewed, never auto-canon)
  correlations/branches across the entity + timeline + text graphs —
  parallels, divergences, transmission chains. Mirrors the `_intake` →
  reviewed → canon discipline used for the foundations canon; AI proposes,
  human promotes. No auto-promotion to gdrive canon.

### `bkt-sh-gdrive-canon-wiring`
- **type:** task · **priority:** 2 · **parent:** `bkt-epic-sacred-history`
- **title:** Wire reviewed artifacts → gdrive:sacred-history-corpus (idempotent)
- **description:** Build the `_intake` → `gdrive:AGFarms/Nucleus/research/
  sacred-history-corpus/` promotion pipeline under the Canon folder contract:
  `CANON_INDEX.md` manifest, idempotent convergence, `_archive/<YYYY-MM>/`
  for superseded editions, no PII/raw-scrape/draft commentary. Sibling of the
  queued `bkt-epic-canon-intake` wiring.

### `bkt-sh-story-mint-hook`
- **type:** task · **priority:** 4 · **parent:** `bkt-epic-sacred-history`
- **title:** Story Protocol citeable-mint hook for sacred-history artifacts
- **description:** Optional hook to mint reviewed, canon-tier sacred-history
  artifacts as Story Protocol IP NFTs (citeable-forever), reusing the
  existing bucket-foundation Story/Walrus wiring. PD source texts are not
  mintable as IP; mint applies to *derived* indexes/dossiers/correlation
  graphs authored by Bucket. Lowest priority; backlog until canon wiring
  proven.

---

## FILE WHEN API RETURNS

**Re-confirmed 2026-05-19:** `GET https://bucket-foundation.nucleus.agfarms.dev/api/version`
→ **404**. Per HARD CONSTRAINT, beads are **NOT filed** and **filing is
NOT retried**. This manifest is **authoritative**: it is the source of
truth for sacred-history work until the `bkt-` instance API returns.

When (and only when) the `bkt-` instance API is back, file in this exact
order. **The P1 rights bead is filed FIRST and must close before any
Tier-B / copyrighted live fetch** — note that the PD/open Phase-1 fetch
is already live under the founder-adopted `RIGHTS-POLICY.md`
(`DECISIONS.md` D2), which satisfies the P1 interlock **for PD/open
sources only**; the bead, once filed, formalizes and extends that gate to
the per-item / Tier-B tiers.

**File-order (strict):**

1. **`bkt-sh-rights-policy`** *(P1 — FIRST, before all others)*. On close,
   record: "RIGHTS-POLICY.md adopted 2026-05-19; satisfies P1 interlock
   for PD/open only; Tier-B (`TIER_B_GUARD=1`) remains gated."
2. `bkt-epic-sacred-history` (epic) — capture returned id as `$EPIC`.
   *(If the instance requires the epic before children, file the epic
   first but keep `bkt-sh-rights-policy` as the first CHILD filed and
   immediately closed-as-satisfied-for-PD/open.)*
3. The remaining 9 child beads, each with `parent_id=$EPIC` if the
   instance schema supports it (else note the parent in the description,
   as done above), in manifest order:
   `bkt-sh-taxonomy`, `bkt-sh-ingest-open-tier`,
   `bkt-sh-ingest-pertext-tier`, `bkt-sh-manuscript-provenance`,
   `bkt-sh-timeline-graph`, `bkt-sh-entity-branch-graph`,
   `bkt-sh-ai-branch-analysis`, `bkt-sh-gdrive-canon-wiring`,
   `bkt-sh-story-mint-hook`.
4. Mark `bkt-sh-ingest-open-tier` **in_progress** (the PD/open Phase-1
   proof run executed live 2026-05-19 — Sefaria/SuttaCentral/Tanzil/
   ctext-structure/Wikidata; ~6.77 MB; recurring timer installed).
5. `bd remember "sacred-history corpus: naming locked to -corpus;
   RIGHTS-POLICY adopted (PD/open P1 satisfied); Phase-1 LIVE proof run
   done; recurring systemd timer installed (does NOT self-disable);
   Tier-B stays gated; network AI/Viatika x402 = \$0 (local model)"`.
