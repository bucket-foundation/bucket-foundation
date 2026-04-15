# bucket is the new renaissance

> A manifesto. Not a roadmap, not a spec, not a pitch. Read this if you want to know why this project exists. Read `PROTOCOL.md` if you want to know how it works.

> **The first slogan was *build history*.** That came before *bucket is the new renaissance*, and it is still load-bearing. The renaissance is the **thesis**. *Build history* is the **verb**. Everything below is the thesis. The verb lives in [`canon-figures/`](./canon-figures/) — the contributor index of the figures who built the foundations the canon is made of. If the manifesto is what bucket is *for*, the contributor index is what bucket is *doing*.

---

## 1. The first Renaissance was a substrate change

The Renaissance was not a movement of ideas. It was a substrate change.

Three things moved at once:

1. **The foundations came back.** Greek, Roman, Arabic, Persian, and Indian mathematics, physics, anatomy, and philosophy — texts that had been locked inside monasteries, courts, or single libraries — were copied, translated, and circulated. The recovery of *foundations* (axioms, principles, primary derivations) is the part everyone forgets and the part that mattered most.
2. **A small number of brilliant humans had the new tool.** Printing presses, lenses, accurate clocks, double-entry accounting, sea-worthy hulls. The tools were not evenly distributed. A few hundred people across northern Italy and the Low Countries had access to them, and that was enough.
3. **Patronage routed value back to the makers.** Not perfectly, not fairly, but for the first time at scale: a Medici could pay a Galileo, a Fugger could pay a Dürer, a printer could pay a translator, and the work survived the lifetime of the patron.

Take any one of those away and the Renaissance does not happen. Foundations without tools is monastic copying. Tools without foundations is craft without acceleration. Foundations and tools without patronage is genius dying in poverty.

## 2. The substrate is changing again, right now

Five hundred years later, the same three things are moving at once.

1. **The foundations are back, again.** Every primary derivation in mathematics, physics, chemistry, biophysics, information theory, cosmology, and cognitive science is, in principle, accessible. PubMed, arXiv, OpenAlex, PubChem, the SEP, Wikipedia, Wiktionary, and a long tail of preprint servers and institutional repositories together hold the largest body of foundations in human history. The bottleneck is not existence. The bottleneck is *retrieval, durability, and citeability*.
2. **A small number of brilliant humans have the new tool.** Frontier AI models can read a textbook in seconds, derive a missing step, search ten thousand papers, and surface the one page that matters. Not every human can use this well. Most cannot. A small number can — and the gap between what they can do and what the median researcher can do is widening, not narrowing.
3. **The patronage layer is broken.** Authors pay publishers. Readers pay publishers. The publishers extract rent from a process they did not create. The author who *wrote the foundation* gets nothing when their work is cited. This is the failure point. The first Renaissance had broken patronage too — it took the printing press plus the rise of the bourgeoisie a century to fix it. We do not have a century.

## 3. What bucket is

bucket.foundation is the **patronage layer** for the new Renaissance.

It is not a publisher. It is not a journal. It is not a search engine. It is not an AI lab. It is the *durable substrate* that lets foundations survive their own circulation, and it is the *payment rail* that lets value flow to the people who produced the foundations.

Concretely:

- A **bucket** is a content-addressed folder containing a paper, a manifest, and an HTTP 402 payment receipt.
- The **canon** is the small set of buckets that have been judged to contain *foundations* — axioms, real math, rules, laws, principles, primary derivations — across seven branches: mathematics, physics, chemistry, information & computation, biophysics, cosmology, mind.
- The **protocol** is the open specification (CC0-in-intent) that lets anyone implement a bucket. There is no permission to ask. No node is authoritative.
- The **payout** is the on-chain receipt that routes citation fees back to the original author at a default rate of ≥80% of net receipts.

That is the whole machine. The novelty is not in any single piece. It is in the convention that holds them together and the license that makes the convention impossible to enclose.

## 4. The canon is small on purpose

The canon will look small to anyone expecting a library. That is intentional.

The first Renaissance had a small canon too. Euclid. Archimedes. Galen. Ptolemy. Vitruvius. Aristotle. A few dozen authors and a few hundred works carried more weight than every contemporary pamphlet combined, because they were *foundations* — axioms and primary derivations from which everything downstream could be re-derived if it was lost.

bucket's canon holds only foundations. Outcomes — longevity, disease, cognition, climate, political reform — are *applications* of foundations. They live downstream of the canon, in the product layer. They are not less important. They are downstream.

This is the discipline that will get bucket called "elitist" by people who don't understand what a foundation is. Take the criticism. Keep the canon small.

## 5. Who bucket is for

bucket exists for the small number of people who can do **genius work with AI**. The people who can take a model and an axiom and reach a layer of reality nobody has reached before.

That is not most researchers. That is not most engineers. That is not most users of any AI product on the market today. It is a small number of people, and they are **already at work**, and they need three things that nothing in the current research economy provides:

1. **A canon they can trust.** Not a search index. Not a recommender. A small, conservative, human-curated set of foundations they can build on without re-verifying every citation.
2. **A payment rail that does not punish them for citing well.** The current incentives push toward citing the cheapest paywalled article, not the one with the strongest foundations. bucket inverts this: cite the foundation, pay the foundation's author, move on.
3. **A substrate that survives them.** A bucket lives on as long as one mirror exists. The protocol is open, the code is MIT, the spec is CC0-in-intent. The work cannot be locked back up by any single party — including bucket.foundation itself.

If you are one of those people, bucket is for you. If you are building for those people, bucket is for you. If you are funding those people, bucket is for you.

If you are not — if you want the next viral consumer app, the next billion-dollar enterprise SaaS, the next AI agent that books your flights — bucket is *not* for you, and there is no apology for that. The next Renaissance is not built by the median user. It was not built by the median user the first time, and it will not be built by the median user this time. It is built by a small number of brilliant humans with the right tools and the right substrate. bucket is the substrate.

## 6. What bucket is not

bucket is not:

- **A publisher.** Publishers are the rent-seekers we are routing around.
- **A journal.** Journals introduce gatekeeping. The canon is curated, but the canon is not the bucket; anyone can run a bucket without permission.
- **A token.** There is no equity, no governance token, no membership NFT, no shareholder. There is no exit.
- **An AI company.** bucket consumes AI; it does not build AI. The frontier labs build the tools. We build the substrate the tools sit on.
- **A foundation that grows its own indispensability.** If bucket succeeds, in five years it will be visibly *less central* to the network than it is today. Other buckets will exist. Other canons will exist. The protocol will outlive any single host.
- **Neutral.** bucket has a thesis, and the thesis is in this document. We are not pretending to be a neutral commons. We are pretending to be a *honest commons with a known direction*.

## 7. The bet

The bet behind bucket is straightforward and falsifiable:

> **AI + foundations + a small number of brilliant humans = the next layer of reality.**

Each term is necessary:

- Without **AI**, the brilliant humans are bandwidth-limited to whatever they can read and remember in a lifetime. We have already seen what that ceiling looks like.
- Without **foundations**, the AI hallucinates plausible-sounding nonsense and the brilliant humans cannot tell the difference. We have already seen what that floor looks like.
- Without **brilliant humans**, the AI generates content with no taste, no hierarchy, no judgment about what matters. We have already seen what that flood looks like.

Take any one term away and the bet fails. Hold all three and the next ten years produce more new foundations than the previous fifty.

If we are wrong, bucket survives as a useful library and a small payment rail. If we are right, bucket is the substrate that let the next Renaissance happen on schedule instead of a century late.

## 8. Why now

A few reasons that all point in the same direction:

- **The frontier models are good enough.** Not perfect — good enough to read primary literature, derive missing steps, and refuse to bullshit when refused well. The 2026 model class is the first one this is reliably true of.
- **HTTP 402 finally has a credible implementation.** x402 over Base L2 makes per-paper, per-citation micropayments cheap and durable. Before this, the entire payment side of the substrate was theoretical.
- **The publisher economy is visibly cracking.** Sci-Hub, the open-access mandates, the public outrage over $40 paywalls on publicly funded research, the exodus of editorial boards from Elsevier titles — these are leading indicators of an economic regime change. We do not need to overthrow it. We need to be ready when it cracks the rest of the way.
- **Independent research is exploding.** More PhDs, more autodidacts, more well-funded private labs operating outside the academic system, more independent researchers funded by Twitter and Substack. They all need a substrate that does not require institutional affiliation. There is no such substrate today.
- **The brilliant humans are already at work.** They are not waiting for permission. They are not waiting for a grant cycle. They are reading, deriving, building. The substrate they need is the substrate that does not exist yet.

The window to build the substrate is the window before any one party — a frontier lab, a publisher consortium, a national government — captures the rails. That window is open right now. It will not be open in five years.

## 9. Three rules for everyone who works on bucket

1. **Foundations only in the canon.** When in doubt, leave it out. The canon is small on purpose. Outcomes are downstream applications, not canon. Curate like a librarian, not like a publisher.
2. **The protocol is older than the Foundation.** If a decision benefits the reference bucket but degrades the protocol, the decision is wrong. We are stewards of the protocol; we are not owners of it.
3. **The Foundation is a temporary coordinator.** If, three years from now, three other buckets exist that hold equal or stronger canons under the same protocol, bucket.foundation has succeeded. If it is still the only or the largest bucket, it has failed. The goal is to *spawn the network*, not to *be the network*.

---

## A closing note to the brilliant humans

If you are one of the small number of people who can take a model and an axiom and reach a layer of reality nobody has reached before, bucket is for you. The substrate exists because of you. The canon exists for you. The payment rail exists so you can pay the people whose foundations you build on, and so you can be paid when others build on yours.

Use it. Improve it. Fork it. Run your own bucket. Cite the foundations. Pay the authors. Push the canon out across the seven branches.

The first Renaissance happened because a few hundred people in a few cities had the right tools, the right foundations, and a working patronage layer at the same time. The second Renaissance is happening because the same three things are aligning again, on a planet of eight billion people, with an AI that fits in your pocket.

We are not asking you to wait for permission. We are asking you to start.

— the founding maintainer
2026-04-14
