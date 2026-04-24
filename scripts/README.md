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

## Other scripts

- `mint-kruse-token.ts` / `revoke-kruse-token.ts` / `test-kruse-token.ts` — Kruse Index private preview tokens
- `test-research-route.ts` — smoke test for `/api/research`
- `simpleMintAndRegister*.ts` — Story Protocol IP NFT mint
- `registerDerivative*.ts` — Story Protocol derivative registration
- `utils/createSpgNftCollection.ts` — one-shot SPG NFT collection creation
