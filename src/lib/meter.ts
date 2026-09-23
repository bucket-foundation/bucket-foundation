export interface MeterResult {
  ok: boolean;
  balanceUsd: number;
  reason?: string;
}

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
  return { ok: true, balanceUsd: 999.0 };
}
