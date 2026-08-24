// src/lib/meter.ts
// Stub for the Viatika vendor meter. Real wiring is a future bead.
// Viatika is a third-party vendor, we are a customer of their API.
// 1 credit = $0.001 USD on the Viatika ledger.

export interface MeterResult {
  ok: boolean;
  balanceUsd: number;
  reason?: string;
}

/**
 * Reserve and charge `costUsd` against `userId`'s Viatika credit balance.
 *
 * TODO(bkt-q7k+1): replace stub with real call to Viatika vendor API
 * POST https://api.viatika.ai/v1/meter
 * Authorization: Bearer ${process.env.VIATIKA_API_KEY}
 * Body: { user_id, cost_usd, sku: "bucket.chat", policy_ctx: {...} }
 *
 * For now this is permissive (always ok) so the chat surface can ship
 * behind NEXT_PUBLIC_CHAT_ENABLED=true without a Viatika account.
 */
export async function meterUsage(
  userId: string,
  costUsd: number,
): Promise<MeterResult> {
  if (!userId) {
    return { ok: false, balanceUsd: 0, reason: "no_user" };
  }
  if (costUsd < 0) {
    return { ok: false, balanceUsd: 0, reason: "negative_cost" };
  }
  // TODO(bkt-q7k+1): real Viatika call
  return { ok: true, balanceUsd: 999.0 };
}
