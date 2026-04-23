/**
 * Mint a Kruse-Index access token.
 *
 * Usage:
 *   BKT_KRUSE_TOKEN_SECRET=... npx ts-node scripts/mint-kruse-token.ts <recipient> [ttl_days]
 *
 * Example:
 *   BKT_KRUSE_TOKEN_SECRET=... npx ts-node scripts/mint-kruse-token.ts kruse 90
 *
 * Prints a single line: the signed JWT. Drop it into a magic-link URL:
 *   https://bucket.foundation/kruse?t=<TOKEN>
 */

import { mintToken } from "../src/lib/kruse-token";

async function main(): Promise<void> {
  const [recipient, ttlDaysArg] = process.argv.slice(2);
  if (!recipient) {
    console.error("Usage: mint-kruse-token <recipient> [ttl_days]");
    process.exit(2);
  }
  const ttlDays = ttlDaysArg ? parseInt(ttlDaysArg, 10) : 90;
  if (!Number.isFinite(ttlDays) || ttlDays <= 0) {
    console.error("ttl_days must be a positive integer");
    process.exit(2);
  }
  const token = await mintToken(recipient, ttlDays * 24 * 60 * 60);
  process.stdout.write(token + "\n");
}

void main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
