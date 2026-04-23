# Kruse Foundation Pitch — Consolidated Brief

**Status**: in-flight, no code shipped yet, no email sent yet
**Owner**: Gian (founder) + bkt-nuc
**Home instance**: `bucket-foundation` (not yet certified — see `../CLAUDE.md` Known Infra Gaps)
**Time log**: `../TIMELOG.md`

---

## The offer (locked 2026-04-17)

| Layer | What | Price | Delivery |
|---|---|---|---|
| Gift | Private preview of the Kruse Index (460-article hybrid retrieval we built on his corpus) | free | tokenized URL at `kruse.bucket.foundation/?t=<token>` |
| Service | We host + maintain the Kruse Index indefinitely | paid ongoing | monthly retainer OR metered via feed402 |
| Service | We build + maintain additional AI tooling on jackkruse.com (chatbot, member-only Q&A, article recs, auto-indexing of new posts) | paid ongoing | monthly retainer |
| Data | Verified fishing catches + geophysical context (K-index, Schumann, lunar, solar position) from DerbyFish BHRV | paid per query | feed402 endpoint, x402 over Base |

**Framing**: collaboration, not sales. We respect his corpus enough to have already built a useful thing on it; we want to maintain it for him and for his community.

## Access model (locked)

- **Option B**: Tokenized URL `kruse.bucket.foundation/?t=<HS256_SIGNED_TOKEN>`
- Zero friction for recipient (1 click, no signup)
- Revocable/rotatable server-side
- One unique token per recipient = telemetry signal ("Kruse clicked" vs. "Kruse forwarded")

## What's already built vs. what needs building

### ✅ Built (as of 2026-04-17)

- `~/jackkruse/` — 460 articles scraped, FTS5 + MiniLM-L6-v2 + RRF hybrid retrieval, local server on `:8765/search`
- Bucket Foundation Next.js app scaffold (`src/app`, contexts, providers)
- Bucket strategic docs (`MANIFESTO.md`, `PROTOCOL.md`, `GOVERNANCE.md`, `HISTORY.md`, `canon-figures/`)
- feed402 SPEC v0.0.1 (`~/freelance/viatika-x402-data-standard/SPEC.md`) — citation envelope, three tiers, VDS extension already carves out `derbyfish.bhrv.v2`

### 🚧 To build (see `../TIMELOG.md` forward plan)

**Bucket side (~14.5 hrs)**:
1. Deploy bucket-foundation Nucleus instance (TLS cert) — **unblocks bead filing**
2. `/kruse` route in Next.js app with private tokenized access
3. `kruse.bucket.foundation` domain alias
4. feed402 wrapper around Kruse Index server
5. `.well-known/feed402.json` manifest
6. Final email draft

**DerbyFish side (~15.5 hrs, cross-venture)**:
7. Magnetometer + DeviceMotion capture in BHRV (expo-sensors)
8. iOS/Android permission updates
9. Schema migration for sensor + geophysical columns
10. Rust backend enrichment job (NOAA SWPC + USGS geomag + HeartMath Schumann + lunar + solar)
11. feed402 endpoint wrapping verified catches
12. Fix the `STATION_ID` placeholder

---

## Email draft (v4 — honest version, pending artifacts)

**Subject**: An index of your work, built on your corpus, before we release it

Dr. Kruse,

Gianangelo here. Long-time reader of your work on magnetism, light, mitochondria, and quantum biology.

I run a small venture studio (AG Farms) and a nonprofit-in-formation called **Bucket Foundation** (bucket.foundation). Bucket's mission is simple: make primary research paid-for-once and citeable-forever, with citation fees routed to authors, not publishers. Our canon holds only foundations — axioms, rules, laws, principles — across seven branches (mathematics, physics, chemistry, information, biophysics, cosmology, mind). Your work is one of the partial sources we've leaned on in the biophysics branch.

Over the last few days I built something I'd like you to see before anyone else does:

**The Kruse Index** — a private search interface over your complete public corpus (460 articles from jackkruse.com). Three retrieval modes: keyword (FTS5), semantic (MiniLM-L6-v2 embeddings), hybrid (RRF fusion). The index knows, for example, that "why do I wake up at 3am" and "nocturnal cortisol" and "leptin disruption" are the same neighborhood, and pulls the three articles where you tied them together.

It's private. No public release. I want your permission before it goes anywhere.

**Take a look**: [kruse.bucket.foundation/?t=XXXXXXXX] *(single-use, yours only)*

**Here's what I'd like to propose:**

1. **We host and maintain the Index for you, indefinitely.** Free to you, forever, if you want it. If you'd rather we run it as a private tool for your members / your subscribers, we can build that — a chatbot on jackkruse.com, member-only Q&A, auto-indexing of every new article. Our AI services on ongoing retainer.
2. **A data channel for you that I think you'll find interesting.** I run DerbyFish, a fishing platform with a verified-catch protocol. We capture location + time + video at the point of catch, and we're now joining each verified catch to NOAA SWPC K-index, USGS geomag, HeartMath GCI Schumann resonance, lunar phase, and solar position. That gives us a growing dataset of *"fish were caught here, at this time, under these geophysical conditions."* I think your audience would have opinions on what this dataset reveals. I'd love to show you samples.
3. **No ask for attribution, no ask for promotion.** If you want to use the Index privately and say nothing publicly, that's fine. If you want to talk about it, also fine. The reason I built it is that your corpus deserved better retrieval than WordPress search.

Two things I want to say plainly:
- **The scrape is public content only.** Everything I indexed is already on jackkruse.com and Google-indexed. I did not touch your members-only or paid content.
- **Nothing ships publicly without your blessing.** The whole thing is behind a private token. Your call on what happens next.

Happy to hop on a call, or just receive a reply with "keep going" / "stop" / "change this."

With respect,
Gianangelo Dichio
AG Farms · Bucket Foundation
gianyrox@gmail.com

---

## Open questions for founder

Filing blocked on:
1. **Founder confirms signature line** — above uses `Gianangelo Dichio · AG Farms · Bucket Foundation · gianyrox@gmail.com`. Change if wrong.
2. **Export `NUCLEUS_ADMIN_USER` and `NUCLEUS_ADMIN_PASSWORD` in the shell** so beads can file against the Nucleus instance. Or tell me where they live and I'll source.
3. **Approve engineering dispatch for bkt-002 / bkt-003 / bkt-005** in a git worktree (isolated, won't touch master) — I'll run those in parallel as soon as you say "go on engineering."

## Review / revision log

- v1 (this session): generic vendor pitch, "verified fishing data collection of magnetic field" — ❌ not backed by code
- v2 (this session): added open-source + community framing — ❌ founder rejected, wants pre-open-source
- v3 (this session): private access, Kruse Index preview, $service offer — ✅ direction locked
- v4 (this file): honest about what DerbyFish captures today + what we're adding — ⏳ awaiting artifacts + founder review
