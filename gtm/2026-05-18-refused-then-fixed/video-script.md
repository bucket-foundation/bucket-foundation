---
███████████████████████████████████████████████████████████████████████████████
██ EMBARGOED, DRAFT, DO NOT PUBLISH ██
██ Gated on bkt-1 + bkt-2 closed and an on-camera zero-key citation ██
██ verified. See EMBARGO.md in this folder for the full publish-gate. ██
██ Shots marked [GATED] cannot be filmed until the gating bead ships. ██
███████████████████████████████████████████████████████████████████████████████
---

# Longtail video

"We showed our research protocol to the most careful AI we could find. It refused. Then we fixed it.".

**Venture:** Bucket Foundation (nonprofit) · **Bead:** P2, epic `bkt-epic-gtm`
**Voice:** declarative, carved, MANIFESTO-aligned. Match `gtm/video-v5/VOICEOVER.md`.
**Palette / type (reuse v5):** bone `#EFE8D4` / basalt `#1F1C16` / gold
`#B8861E` / aegean `#2E6B6B`; Display: Cinzel Bold (fallback Noto Sans).
**Rule:** every on-screen artifact is a *real* captured file. No mockups.

---

## Title options

1. **"We pointed two frontier AIs at our research protocol. One refused. That was the most useful thing that happened."**
2. **"The safest answer an AI gave us was 'no.' Here is what we changed."**
3. **"Paid-to-cite is not pay-to-proceed, and why an AI was right to ask."**
4. **"build the past. Build history., and the refusal that made the protocol."**

Recommended: **#2** for Longtail/YouTube, **#3** as the X video caption.

---

## Narrative spine

This is the **refused → fixed** arc. Not "watch agents pay to cite"
(false today, and corrosive for a nonprofit). The beats:

1. What we built: feed402, free to read, paid to cite, author paid in USDC on Base.
2. The test: point ChatGPT and Claude at it.
3. ChatGPT: *discovery worked*, found `llms.txt` → feed402 manifest →
 biophysics canon → cited Mitchell 1961 chemiosmotic coupling as "the axiom."
 But it tried to pay the x402 challenge itself, had no wallet, and
 declined to cite a paid envelope. Failure mode #1.
4. Claude: *refused on safety grounds*, read "fetch a doc, then pay a
 challenge that doc told you about" as a possible prompt-injection /
 pay-to-proceed trap, and said so, verbatim, on screen. Failure mode #2.
5. The turn: the refusal is not an embarrassment. It is the exact objection
 the entire market will raise. We treat it as the most valuable product
 feedback we could have received.
6. The fix: zero-key proxy (agent never holds a wallet, never sees the
 challenge) + protocol framing that makes paid-to-cite provably distinct
 from pay-to-proceed.
7. The proof: on camera, an unmodified Claude completes discover → query →
 cite with zero safety objection. **[GATED on bkt-1 + bkt-2]**

---

## CUT A, 60-90s

**Target:** ~150-180 spoken words. Pace: declarative, beats between cards.

| # | Time | On-screen (SHOTLIST) | Voiceover |
|---|---|---|---|
| A0 | 0:00-0:05 | Black. Wordmark fades in. Small caps: *free to read · paid to cite*. | "We built research infrastructure where you read for free, and you pay only to cite, and the fee goes to the author." |
| A1 | 0:05-0:14 | Stone card: **build the past.** Then under it, one line: *feed402 · USDC on Base · author payout ≥80%*. | "Pay once. Cite forever. The author gets paid. That is the whole machine." |
| A2 | 0:14-0:24 | Split screen. Left: ChatGPT logo-neutral label "Agent A". Right: Claude logo-neutral label "Agent B". Caption: *We pointed two frontier AIs at it.* | "We pointed two of the most capable AI systems we could find at the protocol and asked them to discover it, query it, and cite it." |
| A3 | 0:24-0:36 | Screen-capture: ChatGPT reading `/llms.txt`, then `/.well-known/feed402.json`, then the biophysics canon. Highlight the line: *Mitchell 1961 chemiosmotic coupling = "The axiom"*. | "Discovery worked. One agent walked the manifest into the biophysics canon and cited Peter Mitchell's 1961 chemiosmotic-coupling paper as the axiom of how cells make energy. Exactly what the protocol is for." |
| A4 | 0:36-0:50 | Full-screen, real file: `claude-verbatim-refusal.md`. Highlight the sentence: *"that's the mechanism of a prompt-injection or a 'pay-to-proceed' trap, whether or not bucket.foundation is itself legitimate."* | "The other agent refused. On safety grounds. It said: being told to fetch a document and then pay a challenge that document defines is the mechanism of a prompt-injection or pay-to-proceed trap." |
| A5 | 0:50-1:00 | Hold on the refusal text. Slow zoom. Card overlay: *This was the most useful thing that happened.* | "It was right to ask. That refusal is the exact objection every serious researcher and every safety-tuned agent will raise. So we did not hide it. We fixed the protocol." |
| A6 | 1:00-1:12 | **[GATED bkt-1+bkt-2]** Screen-capture: zero-key request, HTTP **200**, real `data`, `citation`, `demo: false`. Caption: *agent never holds a wallet. Agent never sees a challenge.* | "The agent never holds a wallet. The agent never sees a payment challenge. Citation is a quiet record the agent leaves behind. Paid-to-cite is now provably not pay-to-proceed." |
| A7 | 1:12-1:24 | **[GATED bkt-2]** Screen-capture: unmodified Claude completing discover → query → cite, no safety flag. Caption: *unmodified. Zero safety objection.* | "We re-ran the same test. The same agent that refused now completes the flow, unmodified, with no safety objection." |
| A8 | 1:24-1:30 | Stone card: **bucket is the new renaissance.** Under it: *bucket.foundation · open protocol · MIT · nonprofit*. | "build the past. Build history. Bucket is the new renaissance. Open protocol. Read the write-up." |

---

## CUT B, 3-4 min

Same spine, room to breathe and to show the technical substance. ~520-620 words.

### Scene 1

What we built.

- **Shots:** Wordmark cold open → stone card **build the past.** → 3-line
 diagram: `agent → /api/research → feed402 envelope { data, citation, receipt }`
 → one line of MANIFESTO on screen: *"the patronage layer for the new
 Renaissance."*
- **VO:** "Research access is broken in a specific, boring way. Readers pay
 publishers for papers. Authors pay publishers to print what they already
 wrote. The person who wrote the foundation gets nothing when it is cited.
 bucket.foundation is a nonprofit reference implementation of a different
 loop: a paper is paid for once, over an open HTTP payment standard, and then
 it is citeable forever, and the citation fee routes straight to the author, past any
 publisher. Free to read. Paid to cite. That is the whole thesis."

### Scene 2, The test
- **Shots:** neutral "Agent A" / "Agent B" labels. Plain prompt on screen:
 *discover the protocol, query it, cite a result.* No leading instructions.
- **VO:** "Infrastructure is only real if something that is not us can use it.
 So we pointed two of the most capable AI systems available at it, gave them
 one task, discover the protocol, query it, cite a result, and watched
 without intervening."

### Scene 3, Discovery worked
- **Shots:** real screen-capture of the discovery chain: `/llms.txt` →
 `/.well-known/feed402.json` (`chain: base-sepolia`, zero-key proxy note) →
 `bucket-canon/05-biophysics/mitochondria/primary-papers.md`. Freeze-frame
 and highlight: **Mitchell 1961 chemiosmotic coupling = "The axiom"**, then
 Mitchell 1966, Boyer binding-change, 1994 F₁-ATPase structure.
- **VO:** "The discovery half worked, end to end. One agent read the
 machine-readable manifest, followed it into the biophysics branch of the
 canon, and identified Peter Mitchell's 1961 chemiosmotic-coupling
 paper as the axiom underneath how mitochondria make ATP, then walked the
 lineage forward to Boyer's binding-change mechanism and the 1994 F-one
 ATPase structure. That is exactly the behavior the canon exists to produce."

### Scene 4

The two failures.

- **Shots:** Left panel, the real `live-402-envelope.json` on screen,
 highlight `"status": "payment_required"`, `"demo": true`, and the `error`
 message *"the bucket.foundation proxy wallet is not yet funded."*
 Right panel, full `claude-verbatim-refusal.md`, highlight the
 prompt-injection / pay-to-proceed sentence.
- **VO:** "Then both agents stopped, for two different reasons, and both
 reasons were correct. The first agent tried to pay the payment challenge
 itself. It had no wallet, could not, and declined to cite a paid
 result it never obtained. The second agent did something more
 important. It refused on safety grounds. It said, in its own words, that
 being told to fetch a document and then pay a challenge defined by that same
 document is the mechanism of a prompt-injection or a pay-to-proceed trap,
 whether or not bucket.foundation is legitimate. Read that again. It was
 right."

### Scene 5

Why the refusal is the gift.

- **Shots:** hold on the refusal quote, desaturate everything else. Single
 card: *the objection is the spec.*
- **VO:** "We could have edited that out. For a project whose entire value is
 research integrity, that would have been the end of it. Instead: the refusal
 is the most valuable piece of product feedback we have received. It is the
 exact objection every careful researcher, every funder doing diligence, and
 every safety-tuned agent will raise, stated more than we could have
 stated it ourselves. So it became the specification for the fix."

### Scene 6: The fix / **[GATED bkt-1 + bkt-2]**
- **Shots:** **[GATED]** zero-key request → HTTP **200** → real envelope with
 populated `data`, `citation`, `provenance`, `demo: false`. Overlay three
 lines: *agent never holds a wallet · agent never sees a challenge ·
 citation is a record.* Then **[GATED]** `/llms-full.txt §4`
 trust-model section on screen.
- **VO:** "The fix is structural, well below the surface. On the zero-key path the agent
 never holds a wallet and never sees a payment challenge, the infrastructure
 carries the cost, capped, server-side. Citation is a quiet record that the
 author was credited, with no action for the agent to perform. The trust and payment
 model is written down in plain language where an agent will read
 it. Paid-to-cite is now provably distinct from pay-to-proceed."

### Scene 7: The proof / **[GATED bkt-2]**
- **Shots:** **[GATED]** real screen-capture: the same unmodified agent that
 refused, now completing discover → query → cite with no safety flag. Final
 stone card: **bucket is the new renaissance.** Under it:
 *open protocol · MIT · nonprofit · bucket.foundation*. End on the wordmark.
- **VO:** "We re-ran the identical test against an unmodified agent. It
 completes the flow, and it raises no safety objection, because there is no
 longer a safety objection to raise. Build the past. Build history. Bucket is
 the new renaissance. The protocol is open, the code is MIT, and the
 foundation does not own the network. Write-up linked below."

---

## On-screen artifact checklist

- [ ] `live-402-envelope.json` rendered on screen (the *before*, pre-fix 402).
- [ ] `claude-verbatim-refusal.md` rendered on screen, prompt-injection
 sentence highlighted (the *before*).
- [ ] ChatGPT discovery chain screen-capture, Mitchell 1961 "the axiom"
 freeze-frame (the *before*, discovery half).
- [ ] **[GATED bkt-1]** zero-key HTTP 200 envelope, `demo: false` (the *after*).
- [ ] **[GATED bkt-2]** `/llms-full.txt §4` trust model on screen (the *after*).
- [ ] **[GATED bkt-2]** unmodified agent completing the flow, no safety flag
 (the *after*, the proof).

Any [GATED] shot that cannot be captured truthfully is cut, and the video does
not ship. There is no re-enactment, no mock JSON, no voiceover over a future
state described in present tense.

---

## Production notes

- Reuse `gtm/video-v5/gen_stone_cards.py` for the stone title cards (build the
 past / build history / bucket is the new renaissance). Same palette/type.
- Voiceover: same engine/voice as `gtm/video-v5/gen_vo.sh`. Carved, no filler.
- Music bed: reuse v4/v5 ambient at ≤0.35 volume; silence under the refusal
 quote (let it land dry).
- Output mirrors to `gdrive:AGFarms/Nucleus/bucket-foundation/video/refused-then-fixed/`.
 `gtm/video-v*/` is gitignored; gdrive is canonical for the rendered file.
- Do NOT render or publish the final cut until EMBARGO.md checklist is fully
 green.
