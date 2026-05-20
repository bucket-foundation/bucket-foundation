---
███████████████████████████████████████████████████████████████████████████████
██  EMBARGOED — DRAFT — DO NOT PUBLISH                                        ██
██  Gated on bkt-1 + bkt-2 closed, on-camera zero-key citation verified,      ██
██  and an unmodified agent completing the flow with zero safety objection.   ██
██  See EMBARGO.md. Posts 7–9 reference the fix and CANNOT be posted true     ██
██  until the gating beads ship.                                             ██
███████████████████████████████████████████████████████████████████████████████
---

# X thread — "refused, then fixed"

**Voice:** nonprofit. Precise, humble, technically credible. No hype, no
emojis, no dunking. Audience: AI/infra people, researchers, funders.
**Links:** https://bucket.foundation · public write-up URL (bead P3 — fill in
when live; do not post the thread until that URL exists).

> Note: each post is ≤280 chars. Verify char counts at publish time; X limits
> change. The em-dashes and the Mitchell line are load-bearing — do not trim
> them for length, trim elsewhere.

---

**1/ (hook)**
We built research infrastructure where you read for free and pay only to cite —
and the citation fee goes to the author, not a publisher.

Then we pointed two frontier AI systems at it.

One refused. That refusal was the most useful thing that happened.

---

**2/**
The setup: bucket.foundation is a nonprofit reference implementation of
feed402. A paper is paid for once, over an open HTTP payment standard on Base.
After that it is citeable forever, and the fee routes to the author.

Free to read. Paid to cite.

---

**3/**
We gave two agents one task: discover the protocol, query it, cite a result.
No hand-holding. We wanted to know if something that is not us could use it.

The discovery half worked beautifully.

---

**4/**
One agent read our machine-readable manifest, followed it into the biophysics
canon, and cited Peter Mitchell's 1961 chemiosmotic-coupling paper as "the
axiom" of how mitochondria make ATP — then walked it forward to Boyer and the
1994 F1-ATPase structure.

Exactly what the canon is for.

---

**5/**
The other agent refused. On safety grounds.

Its own words: being told to fetch a document and then pay a challenge that
the same document defines is "the mechanism of a prompt-injection or a
'pay-to-proceed' trap, whether or not bucket.foundation is itself legitimate."

---

**6/**
It was right.

That is the exact objection every careful researcher and every safety-tuned
agent should raise about any "fetch this, then pay" flow. We had built a real
thing that, from the outside, looked like a trap.

For a research-integrity nonprofit, that is not a small problem.

---

**7/**
So we treated the refusal as the spec, and changed the protocol.

On the zero-key path: the agent never holds a wallet. The agent never sees a
payment challenge. The infrastructure carries the cost, capped, server-side.
Citation is a record, not an action.

---

**8/**
We wrote the trust and payment model down in plain language where an agent
will actually read it (/llms-full.txt §4), keeping paid-to-cite provably
distinct from pay-to-proceed.

Then we re-ran the identical test against an unmodified agent.

---

**9/**
It completes the flow now — discover, query, cite — and raises no safety
objection, because there is no longer one to raise.

We did not get the agent to trust us. We removed the reason not to.

---

**10/ (close)**
build the past. build history. bucket is the new renaissance.

Open protocol. MIT. Nonprofit — no equity, no token, no exit.

The full technical write-up, including the verbatim refusal and the fix:
https://www.bucket.foundation/protocol/agent-trust · https://bucket.foundation

---

## Publish notes

- Do NOT post 7–10 unless EMBARGO.md is fully green. Posts 1–6 describe a
  *before* state and a problem; 7–10 describe a *fixed* state and must be
  literally true on the day of posting.
- If for any reason the fix is not done but there is pressure to post: the
  thread can stand at 1–6 ONLY if it ends honestly at post 6 with "we are
  fixing this; write-up to follow." It must NOT imply the fix already shipped.
  This degraded variant still requires founder sign-off.
- Quote post 5 should screenshot the *real* `claude-verbatim-refusal.md`
  excerpt, not paraphrase. The quote is the credibility.
- No metrics anywhere. This thread ships with zero quantitative claims by
  design (see EMBARGO.md §2).
