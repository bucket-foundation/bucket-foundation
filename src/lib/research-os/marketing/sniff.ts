export const MARKETING_EXTENSIONS = ["csv", "tsv", "xlsx", "json", "jsonl", "parquet", "pdf"] as const;
export type MarketingExtension = (typeof MARKETING_EXTENSIONS)[number];

export const MAX_MARKETING_FILE_BYTES = 16 * 1024 * 1024;
export const MAX_MARKETING_TOTAL_BYTES = 64 * 1024 * 1024;
export const MAX_MARKETING_FILES = 8;
export const SNIFF_BYTES = 64 * 1024;

const SIGNATURES: Partial<Record<MarketingExtension, number[]>> = {
  xlsx: [0x50, 0x4b, 0x03, 0x04],
  pdf: [0x25, 0x50, 0x44, 0x46, 0x2d],
  parquet: [0x50, 0x41, 0x52, 0x31],
};

const MEDIA: Record<MarketingExtension, string[]> = {
  csv: ["text/csv", "text/plain", "application/vnd.ms-excel"],
  tsv: ["text/tab-separated-values", "text/plain"],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  json: ["application/json", "text/plain"],
  jsonl: ["application/jsonl", "application/x-ndjson", "text/plain"],
  parquet: ["application/vnd.apache.parquet", "application/octet-stream"],
  pdf: ["application/pdf"],
};

export function marketingExtension(filename: string): MarketingExtension | null {
  const base = filename.split(/[\\/]/).pop() ?? "";
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return null;
  const ext = base.slice(dot + 1).toLowerCase();
  return (MARKETING_EXTENSIONS as readonly string[]).includes(ext) ? (ext as MarketingExtension) : null;
}

export function mediaTypeFits(ext: MarketingExtension, mediaType: string): boolean {
  const bare = mediaType.split(";")[0].trim().toLowerCase();
  return !bare || bare === "application/octet-stream" || MEDIA[ext].includes(bare);
}

function startsWith(head: Uint8Array, sig: number[]): boolean {
  return head.length >= sig.length && sig.every((b, i) => head[i] === b);
}

export function magicFits(ext: MarketingExtension, head: Uint8Array): boolean {
  const sig = SIGNATURES[ext];
  if (sig) return startsWith(head, sig);
  const sample = head.subarray(0, SNIFF_BYTES);
  if (startsWith(sample, [0xff, 0xfe]) || startsWith(sample, [0xfe, 0xff])) return ext === "csv" || ext === "tsv";
  if (sample.includes(0)) return false;
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(sample, { stream: true });
    return true;
  } catch {
    return false;
  }
}
