# Sacred-History Corpus — Founder Decisions Log

> **build the past. build history. bucket is the new renaissance.**
>
> This is the **canonical, authoritative** record of locked decisions
> for the sacred-history corpus. `spec/OPEN-DECISIONS.md` is the
> reasoning/recommendation layer; **this file is what is binding.**
> Append-only. Each entry: date, decider, decision, rationale, what it
> unblocks.

---

## 2026-05-19 — Founder greenlight ("do what you can and must")

**Decider:** Gian (@gianyrox), founder / maintainer-of-last-resort
(`GOVERNANCE.md §5`). Conveyed to the Data pillar as
*"do what you can and must"* + explicit corpus-naming confirmation +
two-tier-gate adoption.

### D1 — Placement: SIBLING corpus (LOCKED)

The sacred-history corpus is a **sibling corpus** to the foundations
canon — peer to `longevity-canon`, **NOT an 8th `bucket-canon` branch.**

- **This placement is data-driven and revisitable. It is NOT a hard
  contract.** "Sibling" is the current best fit. If absorption later
  shows a sub-slice is genuinely foundations-tier (e.g. a reasoning
  structure already recognized in `canon-figures/08-tradition.md`), that
  sub-slice may be reclassified via a **logged decision in
  `TAXONOMY_NOTES.md`** (the same supersession discipline the canon uses).
- README + TAXONOMY.md updated to say "sibling now, reclassifiable as
  the data shows" rather than presenting a permanent contract.
- **Unblocks:** folder layout, seam rules, ingestion bead targets.

### D1a — Naming: `sacred-history-corpus` (LOCKED)

The gdrive tree and every internal reference is
**`gdrive:AGFarms/Nucleus/research/sacred-history-corpus/`**, NOT
`…-canon/`. "Canon" stays reserved for foundations-tier
(`MANIFESTO.md §3-4`). All path references across `README.md`,
`SOURCES.md`, `BEAD-MANIFEST.md`, `runners/`, and `spec/*` renamed from
`sacred-history-canon` → `sacred-history-corpus` on 2026-05-19.

### D2 — RIGHTS-POLICY.md ADOPTED as the operating default (LOCKED)

`spec/RIGHTS-POLICY.md` (the two-tier gate) is **adopted as the operating
default**. The written + founder-adopted policy **satisfies the P1
rights interlock (`bkt-sh-rights-policy`) FOR PUBLIC-DOMAIN / OPEN
SOURCES ONLY.**

- **Tier A (full-text allowed):** PD or openly-licensed (CC0 / CC-BY /
  CC-BY-SA / explicit free-use grant). Phase-1 live set qualifies.
- **Tier B (citation + locator only):** copyrighted / NC / unclear.
  **Stays metadata-only and stays gated.** This adoption does **NOT**
  remove the `LIVE_GUARD` for any Tier-B / NC / unclear source.
- The runner records this adoption inline (banner + per-source rights
  gate) so the policy is enforced in code, not just documented.
- **Unblocks:** live fetch of the PD/open Phase-1 sources ONLY.

### D3 — Phase 1 LIVE for PD/open sources only (LOCKED)

Go **LIVE** on Phase-1 PD/open sources only. One real, bounded,
idempotent **proof run** — NOT a full historical backfill:

| Source | Phase-1 live action |
|---|---|
| Sefaria | `/api/index` — structural TOC only, **NO text bodies** |
| SuttaCentral | `/api/menu` — structure only this slice (CC0) |
| Tanzil | `quran-data.js` metadata + verbatim Arabic editions (license file stored alongside; text never modified) |
| ctext | enumerate target works only — **respects rate-limit + no-bulk ToS**, no redistribution |
| Wikidata | one bounded SPARQL query, `LIMIT 500`, CC0 |

Copyrighted / NC / unclear sources remain metadata-only and gated.
All robots/ToS/rate-limits + `Retry-After` respected.

**Compute model:** local CPU/GPU/disk is the default and is treated as
**effectively uncapped** (founder's machine). Any network AI / Viatika
x402 metered call is **DISABLED ($0)** for now. The corpus AI-analysis
path assumes a **LOCAL model**; a clearly-marked, **default-OFF** hook
for an optional Viatika-capped network synthesis pass exists but is
**not called**.

- **Unblocks:** the Phase-1 live runner + the recurring timer.

### D4 — Story Protocol mint for AI correlations (UNCHANGED)

No auto-mint. Human-curated correlation minting deferred to Phase 2.
`story_protocol_ip_id: null` remains the default for all AI output.

---

## Operating consequences (in force as of 2026-05-19)

1. **Runner is LIVE for the 5 PD/open sources only.** `LIVE_GUARD`
   removed for the PD/open path; Tier-B / copyrighted / NC / unclear
   guards **retained**.
2. **Recurring systemd `--user` timer installed + enabled.** It does
   **NOT** self-disable — it re-checks for new editions/manuscripts/
   events forever (contrast `pursue-mirror.timer`, which self-disables).
3. **Bead infra `bkt-`:** 404 at session start, re-confirmed 404 twice
   during the session (the basis of the hard constraint), then
   **recovered to 200 before commit** (`/api/version` → v0.6.89 stable;
   `/issues` → 200). Per the explicit founder HARD CONSTRAINT ("do not
   retry filing"), **no beads were filed this session**. `BEAD-MANIFEST.md`
   is authoritative and now carries an "API RECOVERY OBSERVED" banner;
   file-order in its "FILE WHEN API RETURNS" section (P1 rights bead
   first). **Next agent/founder: API is live — file the manifest now.**
4. **No manuscript image mirroring** — provenance metadata only.
5. **Idempotent + resumable** at all times.
6. **`~/agfarms/viatika` and `~/jackkruse` are never modified.**
