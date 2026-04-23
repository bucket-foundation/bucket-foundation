/**
 * Revoke all previously-minted Kruse Index tokens by bumping the version.
 *
 * Tokens carry a `v` claim. Verification fails unless `v` matches the server's
 * current BKT_KRUSE_TOKEN_VERSION. Bumping the version therefore invalidates
 * every outstanding token at once.
 *
 * This script does NOT write to disk (production source of truth is the
 * Vercel project's Environment Variables). It prints the next integer so you
 * can paste it into Vercel and redeploy.
 *
 * Usage:
 *   BKT_KRUSE_TOKEN_VERSION=3 npx ts-node scripts/revoke-kruse-token.ts
 *   # prints: 4
 *
 * Then:
 *   1. Update BKT_KRUSE_TOKEN_VERSION in Vercel (Settings -> Environment Variables)
 *   2. Redeploy
 *   3. Mint a replacement token for any recipient who still needs access
 */

function main(): void {
  const raw = process.env.BKT_KRUSE_TOKEN_VERSION ?? "1";
  const current = parseInt(raw, 10);
  const next = Number.isFinite(current) && current > 0 ? current + 1 : 2;
  console.error(`Current BKT_KRUSE_TOKEN_VERSION: ${current}`);
  console.error(`Set BKT_KRUSE_TOKEN_VERSION to: ${next}`);
  console.error(`Then redeploy. All prior tokens stop verifying immediately.`);
  process.stdout.write(next + "\n");
}

main();
