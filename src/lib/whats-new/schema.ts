export const KINDS = ["production", "generation"] as const;
export const SOURCES = ["own", "third-party"] as const;
export const PRODUCTION_STATUSES = ["merged", "open"] as const;
export const GENERATION_STATES = ["candidate", "tested", "refuted", "proved"] as const;
export const LINK_HOSTS: readonly string[] = ["github.com"];
export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export const IMAGE_MAX_BYTES = 3 * 1024 * 1024;
export const DISCUSSION_MAX_WORDS = 99;

export type Kind = (typeof KINDS)[number];

export interface LinkInput {
  label: string;
  href: string;
}

export interface ImageInput {
  filename: string;
  content_type: (typeof IMAGE_TYPES)[number];
  base64: string;
}

export interface ImageMeta {
  filename: string;
  content_type: string;
  bytes: number;
}

interface Common {
  id: string;
  date: string;
  title: string;
  source: (typeof SOURCES)[number];
  category: Kind;
}

export interface ProductionEntry extends Common {
  kind: "production";
  summary: string;
  plot_title: string;
  image_alt: string;
  discussion?: string;
  status: (typeof PRODUCTION_STATUSES)[number];
  links: LinkInput[];
  image?: ImageMeta;
}

export interface GenerationEntry extends Common {
  kind: "generation";
  machine_generated: true;
  tool: string;
  run_id: string;
  state: (typeof GENERATION_STATES)[number];
  claim?: string;
  score?: { value: number; meaning: string };
  evidence?: string[];
  parent?: string;
}

export type EntryFields = ProductionEntry | GenerationEntry;

export type ParseResult =
  | { ok: true; entry: EntryFields; image: ImageInput | null }
  | { ok: false; field: string; error: string };

class Invalid extends Error {
  constructor(
    public field: string,
    public reason: string,
  ) {
    super(reason);
    Object.setPrototypeOf(this, Invalid.prototype);
  }
}

export const ID = /^[a-z0-9-]{3,80}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const FILENAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/;
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;
const SENTENCE_BREAK = /[.!?]\s+\S/;

const PRODUCTION_KEYS = ["id", "kind", "category", "date", "title", "source", "summary", "plot_title", "image_alt", "discussion", "status", "links", "image"];
const GENERATION_KEYS = ["id", "kind", "category", "date", "title", "source", "machine_generated", "tool", "run_id", "state", "claim", "score", "evidence", "parent"];

function hasControl(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function text(body: Record<string, unknown>, field: string, max: number): string {
  const v = body[field];
  if (typeof v !== "string") throw new Invalid(field, "must be a string");
  const s = v.trim();
  if (s.length === 0) throw new Invalid(field, "must not be empty");
  if (s.length > max) throw new Invalid(field, `must be ${max} characters or fewer`);
  if (hasControl(s)) throw new Invalid(field, "must be one line of plain text");
  return s;
}

function optionalText(body: Record<string, unknown>, field: string, max: number): string | undefined {
  return body[field] === undefined ? undefined : text(body, field, max);
}

function oneOf<T extends string>(body: Record<string, unknown>, field: string, allowed: readonly T[]): T {
  const v = body[field];
  if (typeof v !== "string" || !allowed.includes(v as T)) throw new Invalid(field, `must be one of ${allowed.join(", ")}`);
  return v as T;
}

function knownKeys(body: Record<string, unknown>, allowed: string[], prefix = ""): void {
  for (const key of Object.keys(body)) {
    if (!allowed.includes(key)) throw new Invalid(prefix + key.slice(0, 40).replace(/[^A-Za-z0-9_.-]/g, "?"), "is not a known field");
  }
}

export function checkLink(value: unknown, field: string, hosts: readonly string[] = LINK_HOSTS): string {
  if (typeof value !== "string" || value.length > 500 || hasControl(value) || value !== value.trim()) throw new Invalid(field, "must be an https URL");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Invalid(field, "must be an https URL");
  }
  if (url.protocol !== "https:") throw new Invalid(field, "must be an https URL");
  if (url.username || url.password) throw new Invalid(field, "must not carry a user or password");
  if (url.port || !hosts.includes(url.hostname)) throw new Invalid(field, `host must be one of ${hosts.join(", ")}`);
  return url.href;
}

function validDate(body: Record<string, unknown>): string {
  const v = body.date;
  if (typeof v !== "string" || !DATE.test(v)) throw new Invalid("date", "must be YYYY-MM-DD");
  const parsed = new Date(`${v}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== v) throw new Invalid("date", "must be a calendar date");
  return v;
}

function magicMatches(bytes: Buffer, type: string): boolean {
  if (type === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (type === "image/jpeg") return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  return bytes.length > 12 && bytes.toString("latin1", 0, 4) === "RIFF" && bytes.toString("latin1", 8, 12) === "WEBP";
}

function validImage(value: unknown): { input: ImageInput; meta: ImageMeta } {
  if (!isRecord(value)) throw new Invalid("image", "must be an object");
  knownKeys(value, ["filename", "content_type", "base64"], "image.");
  if (typeof value.filename !== "string" || !FILENAME.test(value.filename)) throw new Invalid("image.filename", "must be a plain file name");
  const content_type = oneOf(value, "content_type", IMAGE_TYPES);
  const base64 = value.base64;
  if (typeof base64 !== "string" || base64.length % 4 !== 0 || !BASE64.test(base64)) throw new Invalid("image.base64", "must be standard base64");
  if (base64.length > Math.ceil(IMAGE_MAX_BYTES / 3) * 4) throw new Invalid("image.base64", `must decode to ${IMAGE_MAX_BYTES} bytes or fewer`);
  const bytes = Buffer.from(base64, "base64");
  if (bytes.length > IMAGE_MAX_BYTES) throw new Invalid("image.base64", `must decode to ${IMAGE_MAX_BYTES} bytes or fewer`);
  if (!magicMatches(bytes, content_type)) throw new Invalid("image.base64", "does not match image.content_type");
  return { input: { filename: value.filename, content_type, base64 }, meta: { filename: value.filename, content_type, bytes: bytes.length } };
}

function common(body: Record<string, unknown>, kind: Kind): Common {
  if (typeof body.id !== "string" || !ID.test(body.id)) throw new Invalid("id", "must match [a-z0-9-]{3,80}");
  if (body.category !== undefined && body.category !== kind) throw new Invalid("category", "must equal kind when given");
  return { id: body.id, date: validDate(body), title: text(body, "title", 120), source: oneOf(body, "source", SOURCES), category: kind };
}

function production(body: Record<string, unknown>): { entry: ProductionEntry; image: ImageInput | null } {
  knownKeys(body, PRODUCTION_KEYS);
  const base = common(body, "production");
  const discussion = optionalText(body, "discussion", 1200);
  if (discussion !== undefined && discussion.split(/\s+/).length > DISCUSSION_MAX_WORDS) throw new Invalid("discussion", "must be under 100 words");
  if (!Array.isArray(body.links) || body.links.length < 1 || body.links.length > 8) throw new Invalid("links", "must hold one to eight links");
  const links = body.links.map((raw, i) => {
    if (!isRecord(raw)) throw new Invalid(`links[${i}]`, "must be an object");
    knownKeys(raw, ["label", "href"], `links[${i}].`);
    try {
      return { label: text(raw, "label", 60), href: checkLink(raw.href, `links[${i}].href`) };
    } catch (err) {
      if (err instanceof Invalid && err.field === "label") throw new Invalid(`links[${i}].label`, err.reason);
      throw err;
    }
  });
  const image = body.image === undefined ? null : validImage(body.image);
  const entry: ProductionEntry = {
    ...base,
    kind: "production",
    summary: text(body, "summary", 600),
    plot_title: text(body, "plot_title", 200),
    image_alt: text(body, "image_alt", 300),
    status: oneOf(body, "status", PRODUCTION_STATUSES),
    links,
  };
  if (discussion !== undefined) entry.discussion = discussion;
  if (image) entry.image = image.meta;
  return { entry, image: image?.input ?? null };
}

function generation(body: Record<string, unknown>): GenerationEntry {
  knownKeys(body, GENERATION_KEYS);
  const base = common(body, "generation");
  if (body.machine_generated !== undefined && body.machine_generated !== true) throw new Invalid("machine_generated", "must be true when given");
  const entry: GenerationEntry = {
    ...base,
    kind: "generation",
    machine_generated: true,
    tool: text(body, "tool", 120),
    run_id: text(body, "run_id", 120),
    state: body.state === undefined ? "candidate" : oneOf(body, "state", GENERATION_STATES),
  };
  const claim = optionalText(body, "claim", 400);
  if (claim !== undefined) {
    if (SENTENCE_BREAK.test(claim)) throw new Invalid("claim", "must be one sentence");
    entry.claim = claim;
  }
  if (body.score !== undefined) {
    if (!isRecord(body.score)) throw new Invalid("score", "must be an object");
    knownKeys(body.score, ["value", "meaning"], "score.");
    const value = body.score.value;
    if (typeof value !== "number" || !Number.isFinite(value)) throw new Invalid("score.value", "must be a finite number");
    try {
      entry.score = { value, meaning: text(body.score, "meaning", 300) };
    } catch (err) {
      if (err instanceof Invalid) throw new Invalid("score.meaning", err.reason);
      throw err;
    }
  }
  if (body.evidence !== undefined) {
    if (!Array.isArray(body.evidence) || body.evidence.length > 8) throw new Invalid("evidence", "must hold eight links or fewer");
    entry.evidence = body.evidence.map((raw, i) => checkLink(raw, `evidence[${i}]`));
  }
  if (body.parent !== undefined) {
    if (typeof body.parent !== "string" || !ID.test(body.parent)) throw new Invalid("parent", "must be a production id");
    entry.parent = body.parent;
  }
  return entry;
}

export function parseEntryBody(body: unknown): ParseResult {
  try {
    if (!isRecord(body)) throw new Invalid("body", "must be a JSON object");
    const kind = oneOf(body, "kind", KINDS);
    if (kind === "generation") return { ok: true, entry: generation(body), image: null };
    return { ok: true, ...production(body) };
  } catch (err) {
    if (err instanceof Invalid) return { ok: false, field: err.field, error: `${err.field} ${err.reason}` };
    throw err;
  }
}
