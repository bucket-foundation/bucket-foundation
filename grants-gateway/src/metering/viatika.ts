import type { TierName } from "../types.js";

export interface MeterContext {
  tenant: string;
  product: string;
  tier: TierName;
  price_micros: number;
  caller?: string;
  meta?: Record<string, string | number>;
}

export type MeterResult =
  | { ok: true; receipt_id?: string }
  | { ok: false; reason: "policy_denied" | "budget_exceeded" | "vendor_unavailable" | "misconfigured"; message: string };

export interface ViatikaMeter {
  meter(ctx: MeterContext): Promise<MeterResult>;
}

export class NoOpMeter implements ViatikaMeter {
  async meter(_ctx: MeterContext): Promise<MeterResult> {
    return { ok: true, receipt_id: "noop" };
  }
}

export class HttpViatikaMeter implements ViatikaMeter {
  constructor(
    private readonly cfg: {
      apiUrl: string;
      apiKey: string;
      tenantId: string;
      product: string;
    },
  ) {}

  async meter(_ctx: MeterContext): Promise<MeterResult> {
    return {
      ok: false,
      reason: "misconfigured",
      message: "HttpViatikaMeter is not yet implemented (bkt-???, P3). Use NoOpMeter or wire the API.",
    };
  }
}

export function meterFromEnv(): ViatikaMeter {
  const apiUrl = process.env.VIATIKA_API_URL;
  const apiKey = process.env.VIATIKA_API_KEY;
  const tenantId = process.env.VIATIKA_TENANT_ID;
  const product = process.env.VIATIKA_PRODUCT ?? "grants-gateway";
  if (!apiUrl || !apiKey || !tenantId) return new NoOpMeter();
  return new HttpViatikaMeter({ apiUrl, apiKey, tenantId, product });
}
