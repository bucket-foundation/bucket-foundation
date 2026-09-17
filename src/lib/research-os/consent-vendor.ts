/**
 * Research OS, verified parental consent vendors (ros-32). One interface,
 * three implementations: PRIVO and k-ID throw until their credentials
 * exist (same posture as the roster sources), and the manual path records
 * a consent a staff member verified out of band. The choice between PRIVO
 * and k-ID stays the founder's (PLAN-REVISION-3.md item 2).
 */

export interface ConsentVendor {
  readonly name: "privo" | "kid" | "manual";
  /** Start a consent request; returns the vendor's reference and, for
   * hosted flows, the URL a guardian completes it at. */
  start(input: { learnerId: string; guardianContactHash: string | null }): Promise<{ vendorRef: string; url: string | null }>;
}

export class PrivoVendor implements ConsentVendor {
  readonly name = "privo" as const;
  async start(): Promise<{ vendorRef: string; url: string | null }> {
    throw new Error("PrivoVendor: not configured. Set PRIVO_CLIENT_ID and PRIVO_CLIENT_SECRET once the vendor is chosen.");
  }
}

export class KidVendor implements ConsentVendor {
  readonly name = "kid" as const;
  async start(): Promise<{ vendorRef: string; url: string | null }> {
    throw new Error("KidVendor: not configured. Set KID_API_KEY once the vendor is chosen.");
  }
}

/** Staff records a consent they verified themselves (a signed form, a call). */
export class ManualVendor implements ConsentVendor {
  readonly name = "manual" as const;
  async start(input: { learnerId: string }): Promise<{ vendorRef: string; url: string | null }> {
    return { vendorRef: `manual:${input.learnerId.slice(0, 8)}:${Date.now().toString(36)}`, url: null };
  }
}

export function vendorByName(name: string): ConsentVendor | null {
  if (name === "privo") return new PrivoVendor();
  if (name === "kid") return new KidVendor();
  if (name === "manual") return new ManualVendor();
  return null;
}
