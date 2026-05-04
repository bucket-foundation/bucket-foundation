/**
 * x402 payment middleware.
 *
 * Two modes, selected via FEED402_VERIFY_MODE:
 *   - "stub"        → presence of any non-empty `x-payment` header is treated
 *                     as valid. Local dev / demos only.
 *   - "facilitator" → POST the payment header to an x402 facilitator's
 *                     /verify endpoint and trust its verdict. Production.
 *
 * Mirrors the production pattern in `~/agfarms/kruse/server.ts` (the
 * AGFarms reference feed402 merchant). The two invariants the facilitator
 * MUST establish for feed402 compliance are:
 *
 *   1. The signature resolves to a real on-chain payment to the merchant
 *      wallet (`expectedRecipient`) on the configured chain.
 *   2. The amount paid is ≥ the tier's listed `price_usd`.
 *
 * If the facilitator API shape differs from `{valid, tx, reason}`, adjust
 * the response parsing — but do NOT relax invariants 1+2.
 */

import type { Context } from "hono";
import type { ErrorBody, TierName, TierSpec } from "./types.js";

export type VerifyMode = "stub" | "facilitator";

export interface VerifyConfig {
  mode: VerifyMode;
  facilitatorUrl: string;
  recipient: `0x${string}`;
  chain: string;
}

export function traceId(): string {
  return `tr_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function verifyConfigFromEnv(): VerifyConfig {
  return {
    mode: (process.env.FEED402_VERIFY_MODE ?? "stub") as VerifyMode,
    facilitatorUrl: process.env.FEED402_FACILITATOR_URL ?? "https://facilitator.x402.rs",
    recipient:
      (process.env.FEED402_WALLET as `0x${string}`) ??
      "0x0000000000000000000000000000000000000000",
    chain: process.env.FEED402_CHAIN ?? "base-sepolia",
  };
}

export async function verifyPayment(
  c: Context,
  tier: TierName,
  spec: TierSpec,
  cfg: VerifyConfig,
): Promise<{ ok: true; tx: string } | { ok: false; reason?: string }> {
  const header = c.req.header("x-payment");
  if (!header) return { ok: false };

  if (cfg.mode === "stub") {
    return { ok: true, tx: `stub:${header.slice(0, 16)}` };
  }

  // Facilitator mode — production.
  try {
    const res = await fetch(`${cfg.facilitatorUrl}/verify`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        paymentHeader: header,
        expectedRecipient: cfg.recipient,
        expectedAmountUsd: spec.price_usd,
        chain: cfg.chain,
      }),
    });
    if (!res.ok) return { ok: false, reason: `facilitator ${res.status}` };
    const body = (await res.json()) as { valid?: boolean; tx?: string; reason?: string };
    if (!body.valid || !body.tx) {
      return { ok: false, reason: body.reason ?? "not valid" };
    }
    return { ok: true, tx: body.tx };
  } catch (err) {
    return { ok: false, reason: `facilitator error: ${(err as Error).message}` };
  }
}

export function x402Challenge(
  c: Context,
  tier: TierName,
  spec: TierSpec,
  chain: string,
  wallet: `0x${string}`,
) {
  c.header(
    "x-payment-required",
    JSON.stringify({
      chain,
      wallet,
      price_usd: spec.price_usd,
      unit: spec.unit,
      tier,
    }),
  );
  return c.json<ErrorBody>(
    {
      error: { code: "payment_required", message: "x402 payment required" },
      trace_id: traceId(),
    },
    402,
  );
}
