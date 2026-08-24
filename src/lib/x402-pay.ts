/**
 * src/lib/x402-pay.ts, SERVER-SIDE ONLY x402 settlement.
 * -------------------------------------------------------
 *
 * This module is the *only* place a payment key is ever touched, and it never
 * leaves the server. It is imported lazily by /api/research and ONLY on the
 * branch where `BUCKET_WALLET_PRIVATE_KEY` is set (the "funded wallet" path).
 *
 * THE CALLER NEVER SEES, SIGNS, OR RELAYS ANYTHING FROM THIS FILE.
 * The output (an X-PAYMENT header) is sent server→gateway only.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ FOUNDER ACTION REQUIRED to make this do real settlement:            │
 * │                                                                     │
 * │ 1. Fund a Base wallet with USDC (the gateway is on base-sepolia      │
 * │    today; mainnet later). ~$2 of test USDC covers thousands of       │
 * │    insight-tier calls at $0.002 each.                                │
 * │ 2. Put the private key in a SECRET, never in git:                    │
 * │      • Vercel:  Project → Settings → Environment Variables →         │
 * │                 BUCKET_WALLET_PRIVATE_KEY (Production, encrypted)    │
 * │      • K3s:     kubectl -n inst-bucket-foundation create secret      │
 * │                 generic bucket-x402-wallet                           │
 * │                 --from-literal=BUCKET_WALLET_PRIVATE_KEY=0x...        │
 * │                 and reference it in the deployment env.              │
 * │ 3. Implement the viem signing below (marked TODO). Reference impl:   │
 * │    https://github.com/gianyrox/feed402/blob/main/agent.ts            │
 * │ 4. Until steps 1-3 are done this returns null, which makes           │
 * │    /api/research transparently serve the zero-key canon fallback.    │
 * │    Nothing breaks; the caller still gets real, citeable data.        │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * Invariant: this function returning `null` MUST be a safe, complete state, 
 * /api/research treats null as "no server settlement available → serve canon".
 * It must never throw in a way that surfaces a payment challenge to a caller.
 */

/**
 * Produce an X-PAYMENT header value for an upstream x402-gated request, signed
 * by the SERVER's funded wallet. Returns null when no funded wallet is
 * configured (the default, zero-key state).
 *
 * @param _resourceUrl the upstream gateway URL being paid for
 * @param _priceUsd     the tier price (the server's own outlay)
 */
export async function signX402ServerSide(
  _resourceUrl: string,
  _priceUsd: number,
): Promise<string | null> {
  const pk = process.env.BUCKET_WALLET_PRIVATE_KEY;
  if (!pk) {
    // Zero-key state: no server wallet. Caller-safe by construction.
    return null;
  }

  // TODO(founder + bkt-1 follow-up): real server-side x402 signing.
  //
  //   import { privateKeyToAccount } from "viem/accounts";
  //   import { createWalletClient, http } from "viem";
  //   import { baseSepolia } from "viem/chains";
  //
  //   1. GET _resourceUrl once → receive 402 + x402 challenge (server-side).
  //   2. account = privateKeyToAccount(pk as `0x${string}`)
  //   3. Build + sign the x402 payment per the challenge `accepts[0]`
  //      (scheme "exact", USDC on base-sepolia, amount from the challenge).
  //   4. Return the base64 X-PAYMENT header string.
  //
  // This stays server-side end to end. The challenge is consumed HERE and is
  // never returned to /api/research's caller. Keep it that way.
  //
  // Until implemented, fail SAFE (serve canon) rather than expose a challenge:
  console.warn(
    "[x402-pay] BUCKET_WALLET_PRIVATE_KEY is set but server-side signing " +
      "is not yet implemented — serving zero-key canon fallback. " +
      "See FOUNDER ACTION in src/lib/x402-pay.ts.",
  );
  return null;
}
