# bucket v5 — Voiceover Script

**Total target:** ~90 seconds at 80 words/min (~120 words).
**Voice:** Declarative. Carved. Zero filler. Match `MANIFESTO.md`.
**Arc:** 8 stone cards, timed to the card cuts in `gen_stone_cards.py`.

---

## 00 — Cold open (3s)

> Primary research. Paid for once. Cited forever.

*(6 words. Beat. Let the stone land.)*

---

## 01 — build the past (8s)

> The first slogan was build the past.
> Recover the foundations. Axioms. Real math. Primary derivations.
> The work nobody else will do.

*(20 words. ~7s at carved pace.)*

---

## 02 — build history (8s)

> The second slogan was build history.
> A small number of humans, with the right tool, build the next layer of reality.
> That is the verb. That is what bucket does.

*(30 words. ~9s.)*

---

## 03 — bucket is the new renaissance (10s)

> The Renaissance was a substrate change.
> Foundations came back. Tools arrived. Patronage routed value to the makers.
> Five hundred years later, the substrate is changing again. Bucket is the patronage layer.

*(32 words. ~10s.)*

---

## 04 — Claude, always researching (12s)

> Every minute, agents read the canon.
> Claude reads a paper. Derives a missing step. Cites a foundation nobody has read in forty years.
> The author who wrote that foundation should earn every time it is cited.
> Today they earn nothing. That is the failure point.

*(46 words. ~14s — trim "every minute" line if over.)*

---

## 05 — the feed402 stack (12s)

> feed402 is the protocol. x402 is the rail. Base is the chain. USDC is the unit.
> Five-tenths of a cent per citation. Wallet-signed. Verifier-checked. Routed to the author.
> Open source. CC-zero spec. No middleman.

*(38 words. ~11s.)*

---

## 06 — cite forever (10s)

> Dual-written to Ethereum Attestation Service and Arweave.
> The citation is permanent. The payout is permanent. The author is permanent.
> Paid for once. Cited forever.

*(26 words. ~8s.)*

---

## 07 — outro (7s)

> bucket dot foundation.
> Build the past. Build history.
> Bucket is the new renaissance.

*(13 words. ~5s. Hold on the final card.)*

---

## Totals

- **Words:** ~211
- **Target runtime:** ~88 seconds at carved pace (slower than 80 wpm because of the stone-card beats)
- **Natural pauses:** 1–2 sec between cards, not counted in word math

---

## ElevenLabs settings (recommended)

| Setting | Value |
|---|---|
| Voice | **Adam** (default male, gravelly, declarative) |
| Model | `eleven_multilingual_v2` |
| Stability | **0.45** |
| Similarity boost | **0.80** |
| Style | **0.25** |
| Speaker boost | on |
| Output format | `mp3_44100_128` |

**Why these values:** low-mid stability (0.45) preserves the declarative inflection without monotony; high similarity (0.80) keeps Adam's timbre carved; low style (0.25) avoids theatrical reads — this is a manifesto, not a movie trailer.

---

## `gen_vo.sh` stub

See `./gen_vo.sh` in this directory. Reads `$ELEVENLABS_API_KEY` from env, strips markdown, POSTs the text to ElevenLabs, writes `vo.mp3`. No key in this session — script is a stub, safe to run once `$ELEVENLABS_API_KEY` is exported.
