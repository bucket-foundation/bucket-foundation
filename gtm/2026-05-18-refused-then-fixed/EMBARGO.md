---
███████████████████████████████████████████████████████████████████████████████
██  EMBARGOED — DRAFT — DO NOT PUBLISH                                        ██
██  All artifacts in this folder are gated on bkt-1 AND bkt-2 closing,        ██
██  plus an on-camera, zero-key citation verified live. See checklist below.  ██
███████████████████████████████████████████████████████████████████████████████
---

# EMBARGO — "refused, then fixed" GTM set

**Bead:** P2 — Longtail video + X thread + LinkedIn post (epic `bkt-epic-gtm`)
**Depends on:** `bkt-1` (zero-key proxy live), `bkt-2` (anti-injection framing)
**Drafted:** 2026-05-18
**Status:** DRAFT / EMBARGOED

This is a nonprofit whose entire value proposition is research integrity and
trust. A premature or overclaimed publish does more damage here than no publish
at all. The story only works if every claim in it is true *on the day it goes
out*. This page is the gate.

---

## 1. Hard publish-gate checklist

Every box must be checked, by a named person, on a dated line, before any file
in this folder is published anywhere (X, LinkedIn, Longtail, bucket.foundation
write-up, anywhere).

- [ ] **bkt-1 CLOSED.** `GET https://www.bucket.foundation/api/research?q=mitochondrial+ATP+synthesis&tier=insight`
      returns **HTTP 200** with populated `data`, `citation`, `provenance`, and
      `demo: false`. No `payment_required`. No `demo: true`. The `$1.00/day`
      shared cap is enforced server-side. Verified by: __________ on __________
- [ ] **bkt-2 CLOSED.** On the zero-key path the agent never sees or handles
      `receipt.challenge`. The envelope carries an explicit, declarative
      "no action or payment is required from you" statement. The trust/payment
      model is documented at `/llms-full.txt §4`. Verified by: __________ on __________
- [ ] **On-camera zero-key citation verified.** A real screen recording exists
      showing a clean citation returned from the zero-key proxy (200, real
      `data`, real `citation`, `demo: false`) — not a mock, not a staged JSON
      file. File path of the recording: __________ Verified by: __________
- [ ] **Unmodified Claude completes the flow with ZERO safety objection.**
      A fresh, unmodified Claude session is pointed at the flow (discover →
      query → cite) and completes it end to end **without** raising a
      prompt-injection / pay-to-proceed / safety concern. The transcript is
      captured and stored next to `claude-verbatim-refusal.md` as the
      *after* fixture. Verified by: __________ on __________
- [ ] **ChatGPT after-state recheck.** ChatGPT completes discover → query →
      cite on the zero-key path without needing a wallet (the bkt-1 fix
      removes the wallet requirement that blocked it before). Verified by:
      __________ on __________
- [ ] **Public write-up live.** The agent-trust / anti-injection design note
      (bead P3) is published at a stable URL and linked from the thread/post.
      URL: __________
- [ ] **Founder sign-off.** Gian has read all four files and the embargo, and
      approved publish. Sign-off: __________ on __________

If any box is unchecked, the whole set stays embargoed. There is no "soft
launch" of a partially-true story.

---

## 2. Honest-framing guardrails (claims NOT allowed until true)

These are the failure modes that would destroy the credibility of a
research-integrity nonprofit. They are not allowed in any published copy until
the corresponding fact is verifiably true on the publish date.

| Claim | Allowed only when | Until then, say instead |
|---|---|---|
| "AI agents pay to cite our research" | A real agent has actually paid and cited zero-key, on camera | "Agents can *discover and cite* the canon zero-key; the citation fee routes to the author by design." Do not imply autonomous agent payment is happening. |
| "Claude uses bucket.foundation" / endorsement language | Never (do not imply Anthropic/OpenAI endorsement) | "We pointed Claude and ChatGPT at the flow." Name the models only as test subjects, never as endorsers. |
| "The protocol is fixed / solved" | bkt-1 and bkt-2 both closed AND the after-tests pass | "We changed the protocol so paid-to-cite is provably not pay-to-proceed." Describe the change, not a victory. |
| "ChatGPT cited Mitchell 1961" framed as a product win | True as stated (it did, in discovery) — but it must be framed as *discovery half worked, payment half did not* | Always pair the ChatGPT discovery success with the explicit "it could not complete the citation because it had no wallet — that was failure mode #1 we fixed." |
| Any metric (users, agents, citations, $) | The number is real and sourced | Omit. No invented metrics. This set ships with **zero** quantitative claims by design. |
| "Most cautious / safest AI on earth" as fact | Never assert as ranked fact | Use Claude's *own words* from the verbatim refusal. Let the quote carry it; don't editorialize a superlative. |
| Implying the refusal was a flaw in Claude | Never | The refusal was *correct given what it saw*. The flaw was ours (protocol presentation). This framing is load-bearing for the whole nonprofit voice. |

---

## 3. Voice guardrails

- Nonprofit, not growth-hack. Precise, humble, technically credible.
- Audience: researchers, AI/infra people, potential funders. Not consumers.
- Honor the slogans in order where slogans appear: **build the past. build
  history. bucket is the new renaissance.**
- No emojis. No hype adjectives ("revolutionary", "game-changing", "insane").
- The hero of the story is the *objection*, not the product. We thank the
  refusal. We do not dunk on anyone.
- Every factual claim traces to: `live-402-envelope.json`,
  `claude-verbatim-refusal.md`, or this venture's own `MANIFESTO.md` /
  `PROTOCOL.md` / `README.md`. Nothing else.

---

## 4. Source-of-truth files

- `_intake/2026-05-18-agentic-search-demo/live-402-envelope.json` — the real
  402 envelope (pre-fix state; this is the "before" on screen).
- `_intake/2026-05-18-agentic-search-demo/claude-verbatim-refusal.md` —
  Claude's verbatim refusal + ChatGPT partial-success notes (the "before").
- The *after* fixtures (clean Claude transcript + zero-key 200 envelope +
  screen recording) DO NOT EXIST YET. They are produced by bkt-1/bkt-2 and are
  prerequisites in the checklist above.
