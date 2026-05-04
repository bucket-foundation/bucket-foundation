# Letter of Inquiry — Alfred P. Sloan Foundation
## Exploratory Grantmaking in Technology

**To:** digitaltechnology@sloan.org
**From:** Gianangelo Dichio, Founding Maintainer, bucket.foundation
**Date:** 2026-05-04
**Requested:** $50,000 – $250,000 exploratory, 12 months
**Project:** bucket.foundation — a pay-once, cite-forever protocol and reference implementation for primary research

---

Dear Sloan Digital Technology Program,

I am writing on behalf of bucket.foundation, an open-source research-infrastructure project, to propose an exploratory grant in the $50K–$250K range to harden a working reference implementation of a new patronage layer for primary scientific literature. We believe Sloan's prior work on Critical Digital Infrastructure — the Ford-Sloan partnership that named and funded the maintenance of the open-source code our research economy silently runs on — is the most direct precedent for what bucket is attempting one layer up: the maintenance, and where necessary the construction, of the *citation* infrastructure that the research community silently depends on.

**The problem.** The current research-access economy charges twice for every paper. Authors pay publishers to typeset what they already wrote; readers pay publishers, again, to read it. Citation — the act that gives a paper its scientific value — produces no payment to the author at all. Independent researchers, well-funded private labs operating outside academia, and the rapidly growing population of AI agents performing literature review cannot participate in this system at scale: they cannot afford per-paper paywalls, and they cannot cite what they cannot read. The infrastructure that would let a paper be **paid for once and cited forever** does not exist.

**What bucket is.** bucket.foundation is an open protocol (`PROTOCOL.md`, CC0-in-intent) and an MIT-licensed reference site (`github.com/gianyrox/bucket-foundation`) that defines a content-addressed "bucket" — a folder containing a paper, a sidecar JSON manifest with provenance and citation metadata, and an HTTP 402 payment receipt. A bucket is bought once, over the x402 micropayment protocol on an Ethereum L2 (Base). Once written, the bucket is durable, mirrorable, and citeable forever at zero marginal payment cost. Each citation routes a small fee — default ≥80% of net receipts — directly to the original author's wallet, not to a publisher. The protocol is deliberately boring: HTTP, JSON, SHA-256, signatures. There is no token, no equity, no exit. The Foundation runs *a* bucket; it is not *the* bucket. If, in three years, three other buckets exist running stronger canons under the same protocol, we will consider the project to have succeeded.

**Why now.** Three things have aligned in the last 18 months that did not exist in any prior funding window: (1) frontier AI models capable of reading primary literature reliably and refusing to fabricate when refused well; (2) a credible HTTP 402 payment rail (x402 on Base) that makes per-paper, per-citation micropayments cheap and durable; and (3) visible cracking of the publisher economy — open-access mandates, editorial-board exoduses from Elsevier titles, the Sci-Hub precedent. The substrate window is open now and will not be open in five years.

**Concrete state of the work, as of May 2026.** We are not asking Sloan to fund a slide deck. The reference site is running; the protocol spec is at draft v0.1 with a defined sidecar schema across seven foundation branches (mathematics, physics, chemistry, information & computation, biophysics, cosmology, mind). A pass-1 contributor index (`canon-figures/`) covers ~76 canon-tier figures across ten branches and is the mechanism by which citation fees route back to identified human authors. A working x402 research gateway (`x402-research-gateway`, MIT, authored by the same maintainer) exposes seven live paid endpoints across PubMed, Semantic Scholar, OpenAlex, ClinicalTrials, PubChem, and a curated longevity corpus of 17,211 indexed rows — proving the supply side of the protocol on Base Sepolia today. A zero-key, budget-capped agent proxy at `bucket.foundation/api/research` lets any LLM query the canon without holding a wallet, returning a feed402-compliant `{ data, citation, receipt }` envelope. The Story Protocol IP-NFT mint path for canon-tier artifacts shipped in a prior version and is being revived. The code is MIT, the protocol is CC0-in-intent, and there is no scenario under which a future bucket.foundation board can re-license this work into enclosure.

**Use of funds (12-month exploratory).** The grant would underwrite four concrete deliverables: (a) hardening the protocol from draft v0.1 to v1.0, including a federation/mirroring spec and a public test-vector suite; (b) running the reference bucket as durable, mirrored, and bandwidth-subsidized infrastructure for at least the first 1,000 canon-tier artifacts across the seven branches; (c) maintainer time for editorial review of canon submissions and curation of the contributor index; (d) a small re-grant pool to mirror operators in developing regions to ensure no single jurisdiction is the network's single point of failure. A detailed budget is available on request; we anticipate roughly 60% personnel, 20% infrastructure (Walrus storage, Hetzner hosting, x402 gas), 10% editorial, 10% mirror subsidies and travel.

**Governance and conflict-of-interest disclosure.** bucket.foundation is operated as a nonprofit. There is no equity, no investor, and no exit. As of this writing, the project is held in the founder's personal capacity (`gianyrox/bucket-foundation` on GitHub) pending formal nonprofit reinstatement; the 1023 reinstatement packet is drafted and Hack Club Bank is in process as fiscal sponsor for the interim. This is disclosed in `GOVERNANCE.md` in the public repo. We are happy to route Sloan disbursement through HCB or to wait for the determination letter, whichever Sloan prefers.

**The ask.** A 12-month exploratory grant in the $50K–$250K range, with a mid-year check-in. We are willing to scope the deliverables more tightly toward whichever of the four work-streams above Sloan's program officers find most aligned with the Foundation's current Digital Technology priorities. We would welcome a 30-minute call at the program officer's convenience.

Bucket exists for the small number of people who can do genius work with AI — who can take a model and an axiom and reach a layer of reality nobody has reached before. The Foundation's role is to make sure the substrate they need is there when they reach for it, and to make sure the people who wrote the foundations get paid when their work is cited. We would be honored to do this work with Sloan's support.

Sincerely,

Gianangelo Dichio
Founding Maintainer, bucket.foundation
gianyrox@gmail.com · github.com/gianyrox/bucket-foundation
