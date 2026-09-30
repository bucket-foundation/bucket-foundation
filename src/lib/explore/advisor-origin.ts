export type AdvisorOrigin = "bundle" | "review" | "sample";

export const ORIGIN_LABEL: Record<AdvisorOrigin, string> = {
  bundle: "source: local advisor bundle",
  review: "source: advisor review file",
  sample: "source: sample",
};
