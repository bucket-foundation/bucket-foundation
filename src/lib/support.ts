export const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_BUCKET_CONTACT_EMAIL ?? "gianyrox@gmail.com";

export const DONATE_USDC_BASE_ADDRESS =
  process.env.NEXT_PUBLIC_BUCKET_DONATE_ADDRESS ??
  "0xa91115B1AB8412f380Fd62446F523559F668b96B";

export const DONATE_USDC_NETWORK = "Base (USDC)";

export const GITHUB_SPONSORS_URL = "https://github.com/sponsors/gianyrox";
export const GITHUB_SPONSORS_ACTIVE = false;

export const GITHUB_ORG_URL = "https://github.com/bucket-foundation";

export function mailto(subject: string, body?: string): string {
  const params = new URLSearchParams();
  if (subject) params.set("subject", subject);
  if (body) params.set("body", body);
  const qs = params.toString();
  return `mailto:${CONTACT_EMAIL}${qs ? `?${qs}` : ""}`;
}

export const FUND_MAILTO = mailto(
  "Funding bucket.foundation cloud-GPU hosting",
  "Hi — I'd like to help fund always-on cloud-GPU hosting for the bucket.foundation research tools.\n\n",
);

export const TOOL_OFFLINE_MAILTO = mailto(
  "bucket.foundation research tool — request access",
  "Hi — I tried a bucket.foundation research tool that runs on the founder's GPU and it was offline. I'd like access / to help fund always-on hosting.\n\n",
);

export type ToolHosting = "always-on" | "founder-gpu";
