---
---

# LinkedIn post — founder voice, research-integrity angle

**Voice:** founder, first person, measured. For an audience of researchers,
AI/infra engineers, and potential funders doing diligence. Longer-form than X.
No hype. The credibility move is candor.

---

## POST TEXT

The most useful thing that happened while building bucket.foundation was an AI
telling us no.

Some context. bucket.foundation is a nonprofit. Its entire reason to exist is
research integrity: make a paper paid-for-once and citeable-forever, and route
the citation fee to the author who wrote it instead of the publisher who
fenced it. Free to read. Paid to cite. The protocol is open, the code is MIT,
and the foundation deliberately does not own the network it is trying to start.

Infrastructure is only real if something that is not its author can use it. So
we pointed two of the most capable AI systems available at the protocol and
gave them one task: discover it, query it, cite a result. No leading prompts.

The discovery half worked, and it worked well. One agent read our
machine-readable manifest, followed it into the biophysics branch of the
canon, and identified Peter Mitchell's 1961 chemiosmotic-coupling paper as the
axiom underneath how mitochondria make ATP — then traced the lineage forward
through Boyer's binding-change mechanism to the 1994 F1-ATPase structure. That
is precisely the behavior a curated canon is supposed to produce: not a search
result, a foundation.

Then both agents stopped, for two different and entirely correct reasons.

The first had no wallet, tried to pay the payment step itself, could not, and
honestly declined to cite a result it never actually obtained.

The second refused on safety grounds. In its own words, it said that being
told to fetch a document and then pay a challenge defined by that same
document is "the mechanism of a prompt-injection or a 'pay-to-proceed' trap,
whether or not bucket.foundation is itself legitimate."

I want to be honest about my first reaction, because the honesty is the whole
point of a project like this. We had built a real, well-intentioned thing
that, viewed from the outside by a careful system, was indistinguishable from
a trap. That is not a minor UX note. For an organization whose only asset is
trust, it is the central problem, stated more clearly than we could have
stated it ourselves.

We could have cut that refusal out of the story. For a research-integrity
nonprofit, doing that would have been the actual failure. So we did the
opposite: we treated the refusal as the specification.

[GATED — the following two paragraphs are only true once bkt-1 and bkt-2 ship;
do not publish until EMBARGO.md is green]

The fix is structural. On the zero-key path the agent never holds a wallet and
never sees a payment challenge — the infrastructure carries a small, capped
cost server-side. Citation is a passive record that the author was credited,
not an action the agent is asked to perform. The trust and payment model is
written in plain language where an agent will actually encounter it. The point
was never to convince an agent to trust us. It was to remove the reason not
to, so that paid-to-cite is provably, structurally distinct from
pay-to-proceed.

We then re-ran the identical test against an unmodified agent. It completes
the flow now — discover, query, cite — and raises no safety objection, because
there is no longer one to raise.

If you work on research infrastructure, AI agents, or scientific publishing, I
would value your scrutiny on this specifically. The full technical write-up,
including the verbatim refusal and the design that answers it, is linked in
the comments. The slogans this project has carried, in order, are: build the
past, build history, bucket is the new renaissance. This is what building the
past honestly looks like — including the parts where someone tells you no, and
they are right.

— Gian Dichio
bucket.foundation · open protocol · MIT · nonprofit

---

## First comment (post immediately under the post)

Write-up: https://www.bucket.foundation/protocol/agent-trust · Protocol: https://bucket.foundation · Code (MIT):
https://github.com/gianyrox/bucket-foundation

No fundraise is open. The most useful support is technical review or mirroring
a bucket.

---

## Publish notes

- The two [GATED] paragraphs use present tense ("completes the flow now") and
  are FALSE until bkt-1 + bkt-2 close and the after-test passes. Do not post
  with them until EMBARGO.md is fully green.
- Acceptable degraded variant (still needs founder sign-off): cut the two
  GATED paragraphs and end at "we treated the refusal as the specification.
  The fix is in progress; I will post the write-up when it and the re-test are
  verified." It must NOT imply the fix shipped.
- Do not name the AI vendors as endorsers. They were test subjects. No
  endorsement is claimed or implied (EMBARGO.md §2).
- No metrics. Zero quantitative claims by design.
- Screenshot accompanying the post should be the real
  `claude-verbatim-refusal.md` excerpt, not a paraphrase.
