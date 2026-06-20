/**
 * bucket.foundation — support / funding / contact config
 * ------------------------------------------------------
 * SINGLE SOURCE OF TRUTH for the contact email + every donation/funding link
 * surfaced on the site (the /support page, the founder-GPU-offline notice on
 * the affected research tools, footers, etc.). Change it here, it changes
 * everywhere. No secrets live here — a public payout address is public by
 * design; private keys never touch the client and never live in this file.
 *
 * Why a public crypto address is safe to commit: an EVM address is a public
 * destination, like a bank routing number. The signing key (BUCKET_WALLET_-
 * PRIVATE_KEY / X402_BUYER_PRIVATE_KEY) stays in Vercel env, never here.
 */

/** The one contact address the whole site uses. Override via env if needed. */
export const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_BUCKET_CONTACT_EMAIL ?? "gianyrox@gmail.com";

/**
 * Canonical Bucket payout / donation address — USDC on Base.
 * This is the SAME address research-atlas datasets cite-pay to
 * (src/lib/research-atlas.ts BUCKET_PAYOUT_WALLET), reused as the donation
 * destination so funds land in one place. Public by design.
 */
export const DONATE_USDC_BASE_ADDRESS =
  process.env.NEXT_PUBLIC_BUCKET_DONATE_ADDRESS ??
  "0xa91115B1AB8412f380Fd62446F523559F668b96B";

/** Network label shown next to the crypto address. */
export const DONATE_USDC_NETWORK = "Base (USDC)";

/**
 * GitHub Sponsors profile. The URL is correct, but Sponsors must be ACTIVATED
 * in the GitHub dashboard before the page resolves — surfaced with a clear
 * "activate in GitHub" TODO badge in the UI.
 */
export const GITHUB_SPONSORS_URL = "https://github.com/sponsors/gianyrox";
export const GITHUB_SPONSORS_ACTIVE = false; // TODO(founder): flip once Sponsors is enabled

export const GITHUB_ORG_URL = "https://github.com/bucket-foundation";

/** Prefilled mailto helpers (single config knob = CONTACT_EMAIL). */
export function mailto(subject: string, body?: string): string {
  const params = new URLSearchParams();
  if (subject) params.set("subject", subject);
  if (body) params.set("body", body);
  const qs = params.toString();
  return `mailto:${CONTACT_EMAIL}${qs ? `?${qs}` : ""}`;
}

/** The standard "fund cloud-GPU hosting" email CTA. */
export const FUND_MAILTO = mailto(
  "Funding bucket.foundation cloud-GPU hosting",
  "Hi — I'd like to help fund always-on cloud-GPU hosting for the bucket.foundation research tools.\n\n",
);

/** The standard "this tool is offline, reach out" email CTA. */
export const TOOL_OFFLINE_MAILTO = mailto(
  "bucket.foundation research tool — request access",
  "Hi — I tried a bucket.foundation research tool that runs on the founder's GPU and it was offline. I'd like access / to help fund always-on hosting.\n\n",
);

/** Whether a tool depends on the founder's personal laptop GPU (offline when the
 *  laptop is closed) vs. always-on Hetzner CPU. Drives the offline UI + badge. */
export type ToolHosting = "always-on" | "founder-gpu";
