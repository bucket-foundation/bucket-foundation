/**
 * Viatika metering seam.
 *
 * Per CLAUDE.md Strategic Priority #6 + Viatika Vendor Integration
 * Architecture: every metered AI/data endpoint across AGFarms ventures
 * routes through the Viatika vendor API. This file is the integration
 * point for grants-gateway.
 *
 * v0.1 ships a NoOp implementation so the server boots without any
 * Viatika credentials. When VIATIKA_API_URL + VIATIKA_API_KEY are set in
 * env, swap in HttpViatikaMeter.
 *
 * TODO(bkt-???, P3): implement HttpViatikaMeter against the Viatika
 * vendor API (policy check + budget debit). Read the public API docs at
 * the Viatika site; do NOT modify ~/agfarms/viatika source.
 */

import type { TierName } from "../types.js";

export interface MeterContext {
  tenant: string;
  product: string;
  tier: TierName;
  /** USD micros (1e-6). 0.005 USD == 5000 micros. */
  price_micros: number;
  /** Caller wallet, when available. */
  caller?: string;
  /** Free-form metadata for the vendor's audit log. */
  meta?: Record<string, string | number>;
}

export type MeterResult =
  | { ok: true; receipt_id?: string }
  | { ok: false; reason: "policy_denied" | "budget_exceeded" | "vendor_unavailable" | "misconfigured"; message: string };

export interface ViatikaMeter {
  /** Called BEFORE serving a paid response. Returning ok:false should 402/429. */
  meter(ctx: MeterContext): Promise<MeterResult>;
}

/** Default: do nothing. Used until Viatika credentials are wired up. */
export class NoOpMeter implements ViatikaMeter {
  async meter(_ctx: MeterContext): Promise<MeterResult> {
    return { ok: true, receipt_id: "noop" };
  }
}

/**
 * Stub for the eventual real implementation. Currently throws to make
 * accidental "I thought this was wired" usage loud.
 *
 * TODO(bkt-???, P3): implement against the Viatika public API.
 */
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
