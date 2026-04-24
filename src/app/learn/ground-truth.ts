// Distilled ground-truth context for bucket.foundation, embedded inline in
// Tab 3 lesson prompts so Claude.ai can answer without needing to web-fetch
// bucket URLs (critical pre-indexing — Claude's fetch tool refuses unknown
// URLs, so we carry the canon with us). Keep this under ~2500 chars.
//
// If you edit this, also run `npm run build` and eyeball the encoded URL size
// in the browser (see LearnTabs.tsx URL-length guard).

export const BUCKET_GROUND_TRUTH = `bucket.foundation — "build the past. build history. bucket is the new renaissance."

THESIS. A nonprofit reference implementation of feed402, an open protocol for paid, citeable research endpoints. One sentence: pay once per paper, cite it forever, fees route to the original author — not the publisher — over the x402 rail on Base (USDC). The gated-journal model is structurally extractive: authors pay to publish, readers pay to read, publishers own the citation. Bucket inverts this: free to read, paid to cite.

PROTOCOL (feed402/0.2). Three tiers, three prices, one envelope shape:
  - raw     $0.050/row   full records + citations + metadata
  - query   $0.010/call  ranked result lists
  - insight $0.002/call  cheap agent loops, embeddings, ranking (default)
Payment rail: x402 on Base (USDC), standard x402 facilitator. A citation block is MANDATORY on every paid response — no citation, not feed402.

ENVELOPE SHAPE (every paid response):
  { data, citation, receipt: { paid_at, buyer_wallet },
    cite: { price_usd, payout_wallet, license: "bucket.foundation/cite-forever/v0.1" },
    tags, canon_tier, foundation_branches, provenance }
"Cite the envelope" — the envelope itself is the citation unit.

ZERO-KEY PROXY. bucket.foundation operates a public server-side proxy at /api/research. Callers do NOT need a wallet. The proxy holds a Base Sepolia wallet, signs x402, and passes the envelope through. Daily budget cap: $1.00 USD across all callers (raise by self-deploying).

CITE-FOREVER LICENSE v0.1. Read for free. Pay per citation. Citation fees route to the author's wallet forever (no publisher rent extraction). Machine-checkable; the license lives at /cite-forever/v0.1 and is referenced in every envelope's cite.license field.

CANON — 7 BRANCHES (foundations only: axioms, real math, laws, principles, primary derivations):
  01 mathematics · 02 physics · 03 chemistry · 04 information & computation ·
  05 biophysics · 06 cosmology · 07 mind
(An 8th "earth" branch exists in the public index; the 7-branch form is the core thesis.) Outcomes like longevity, disease, cognition are DOWNSTREAM applications — cross-mirrored into the relevant branch, never canon themselves.

WHY NONPROFIT. bucket is a 501(c)(3) (reinstatement pending). No equity, no investors, no exit. The goal is infrastructure, not a liquidity event. Structural choice: a for-profit citation rail has the same incentive as Elsevier once scale arrives. Nonprofit + MIT code + CC0-intent spec is the only governance that survives capture.

CANON THESIS. AI + foundations + a small number of brilliant humans = the next layer of reality. Bucket exists for people who can take a model and an axiom and reach a layer nobody has reached before.

Learn more (once indexed): https://www.bucket.foundation/llms-full.txt`;
