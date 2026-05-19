# scripts/

One-shot and test scripts for bucket.foundation. All scripts read env from
`.env.local` (or the shell). Never commit real keys.

## Permanence layer (EAS + Arweave/Irys)

See `docs/PERMANENCE_LAYER.md` for the design. Three touch-points:

### 1. Register the EAS schema (one-shot, costs gas)

```bash
# Needs a funded key on the target chain (Base Sepolia faucet is fine)
export BUCKET_WALLET_PRIVATE_KEY=0x...
export EAS_CHAIN=base-sepolia   # or "base" for mainnet
npx tsx scripts/register-eas-schema.ts
```

Output: the schema UID. Paste it into `.env.local` as `EAS_SCHEMA_UID`.

### 2. End-to-end dual-write test

```bash
# Requires EAS_SCHEMA_UID set + wallet funded + @irys/sdk installed
npm i @irys/sdk
npx tsx scripts/test-permanence.ts
```

Prints the Arweave tx id + Irys gateway URL and the EAS attestation UID +
Base Sepolia easscan URL.

### 3. Flip the flag in prod

```bash
# In Vercel env:
BUCKET_PERMANENCE_ENABLED=true
```

Once on, every 200 from `/api/research` is dual-written before return.
Failures are logged; they never break the caller's 200 path.

## Canon-intake pipeline (bkt-epic-canon-intake)

Stands up the curated primary-research layer (`bucket-canon/<branch>/<concept>/
primary-papers.yaml`) that `/api/research` serves as canon. Convergent,
idempotent, re-runnable, quality-gated. Engineering owns this PLUMBING; the
data pillar owns each folder's `queries.txt` seed list + `RUBRIC.md`.

### Source path (decided — read before changing)

**Source = FREE zero-key bibliographic-metadata APIs** (OpenAlex + Crossref +
PubMed + arXiv, polite-pool, `mailto=`), via the existing
`tools/canon-pipeline/resolvers.py`. The pipeline does **NOT** route through
the `x402-research-gateway`: that gateway is fully x402-paywalled
(`defaultPrice` set, every route priced, Base-Sepolia settlement enforced
server-side) and would require a funded wallet to sign an x402 challenge —
the exact agent-pays-to-proceed anti-pattern this project rejects.
Citation-only canon needs only DOI + citation_count + venue + authors +
concepts, all of which the free metadata APIs return with no key and no
payment. The gateway's own `RESEARCH-INDEX.md` documents these same APIs as
the free upstreams it proxies, so we hit them directly and route around the
paywall.

### Invoke

```bash
# Convergent run over EVERY bucket-canon/<branch>/<concept>/ with a queries.txt
bash scripts/canon-intake-runner.sh                 # default min-score 30
bash scripts/canon-intake-runner.sh --min-score 40  # tighter quality gate

# One folder only
python3 tools/canon-pipeline/intake.py bucket-canon/01-mathematics/godel

# One-line status (branch coverage = the audit headline metric)
bash scripts/canon-intake-status.sh

# Run unattended (systemd --user, hourly, self-disables on a clean pass)
bash scripts/systemd/install-canon-intake.sh
```

Convergence contract: keyed by DOI; re-run never duplicates; higher
`canon_score` wins on collision and the displaced record is archived to
`_archive/<YYYY-MM>/` (never deleted); a transient API failure never drops a
previously-good record (fail-safe); a fully-converged tree re-runs to
byte-identical output (true no-op). Quality gate (`intake.py:gate_record`,
the single tightening point for the data pillar's RUBRIC): requires a DOI,
authors, non-retracted, and `canon_score >= floor`.

Tests: `tools/canon-pipeline/tests/test_intake.py` (offline convergence
contract), `scripts/test-canon-allbranch-index.ts` (all-branch index wiring
regression — pins that `canon-primary.ts` serves every branch, not just
biophysics), `scripts/audit-research-beforeafter.ts` (vertical-slice proof
through the real prod GET handler).

## Other scripts

- `mint-kruse-token.ts` / `revoke-kruse-token.ts` / `test-kruse-token.ts` — Kruse Index private preview tokens
- `test-research-route.ts` — smoke test for `/api/research`
- `simpleMintAndRegister*.ts` — Story Protocol IP NFT mint
- `registerDerivative*.ts` — Story Protocol derivative registration
- `utils/createSpgNftCollection.ts` — one-shot SPG NFT collection creation
