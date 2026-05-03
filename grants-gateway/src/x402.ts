/**
 * x402 payment middleware — STUB.
 *
 * Mirrors the pattern in feed402/server.ts: presence of an `x-payment`
 * header is treated as a valid payment. Production swaps this for a real
 * facilitator signature check (see FEED402_FACILITATOR_URL in .env.example).
 */

import type { Context } from "hono";
import type { ErrorBody, TierName, TierSpec } from "./types.js";

export function traceId(): string {
  return `tr_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function verifyPayment(c: Context): { ok: true; tx: string } | { ok: false } {
  const header = c.req.header("x-payment");
  if (!header) return { ok: false };
  return { ok: true, tx: `stub:${header.slice(0, 16)}` };
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
