export const KINDS = ["production", "generation"] as const;
export const SOURCES = ["own", "third-party"] as const;
export const PRODUCTION_STATUSES = ["merged", "open"] as const;
export const GENERATION_STATES = ["candidate", "tested", "refuted", "proved"] as const;
export const IMAGE_MAX_PIXELS = 16_000_000;

const OWNER = "[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})";
const REPO = "[A-Za-z0-9._-]{1,100}";
const SEGMENT = "[A-Za-z0-9._~+@-]{1,200}";

export interface HostRule {
  reservedFirstSegments: readonly string[];
  paths: readonly RegExp[];
}

export const LINK_RULES: Readonly<Record<string, HostRule>> = {
  "github.com": {
    reservedFirstSegments: [
      "login", "logout", "session", "sessions", "join", "signup", "auth", "oauth", "redirect", "settings", "account", "orgs", "users", "apps",
      "marketplace", "notifications", "search", "enterprises", "sponsors", "topics", "features", "site", "about", "security", "contact",
      "pricing", "new", "explore", "codespaces", "collections", "trending", "password_reset", "sso", "raw", "gist",
    ],
    paths: [
      new RegExp(`^/${OWNER}/${REPO}/?$`),
      new RegExp(`^/${OWNER}/${REPO}/pull/\\d{1,9}(?:/(?:files|commits|checks))?$`),
      new RegExp(`^/${OWNER}/${REPO}/issues/\\d{1,9}$`),
      new RegExp(`^/${OWNER}/${REPO}/commit/[0-9a-f]{7,64}$`),
      new RegExp(`^/${OWNER}/${REPO}/(?:blob|tree)/${SEGMENT}(?:/${SEGMENT}){0,30}$`),
      new RegExp(`^/${OWNER}/${REPO}/releases(?:/tag/${SEGMENT}|/latest)?$`),
    ],
  },
};

export const LINK_HOSTS: readonly string[] = Object.keys(LINK_RULES);
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
  width: number;
  height: number;
}

interface Common {
  id: string;
  date: string;
  title: string;
  source: (typeof SOURCES)[number];
  category: Kind;
  at?: string;
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

const PRODUCTION_KEYS = ["id", "kind", "category", "date", "at", "title", "source", "summary", "plot_title", "image_alt", "discussion", "status", "links", "image"];
const GENERATION_KEYS = ["id", "kind", "category", "date", "at", "title", "source", "machine_generated", "tool", "run_id", "state", "claim", "score", "evidence", "parent"];

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
  if (v.length > max + 64) throw new Invalid(field, `must be ${max} characters or fewer`);
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

export function checkLink(value: unknown, field: string, rules: Readonly<Record<string, HostRule>> = LINK_RULES): string {
  const hosts = Object.keys(rules);
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
  if (url.search || value.includes("?")) throw new Invalid(field, "must not carry a query string");
  if (url.hash && !/^#[A-Za-z0-9_-]{1,80}$/.test(url.hash)) throw new Invalid(field, "must carry a plain fragment or none");
  const rule = rules[url.hostname];
  const first = url.pathname.split("/")[1]?.toLowerCase() ?? "";
  const segments = url.pathname.split("/");
  if (rule.reservedFirstSegments.includes(first) || segments.includes("..") || segments.includes(".") || url.pathname.includes("%")) {
    throw new Invalid(field, "must point at a repository, pull request, issue, commit, file or release");
  }
  if (!rule.paths.some((re) => re.test(url.pathname))) throw new Invalid(field, "must point at a repository, pull request, issue, commit, file or release");
  return url.href;
}

function validDate(body: Record<string, unknown>): string {
  const v = body.date;
  if (typeof v !== "string" || !DATE.test(v)) throw new Invalid("date", "must be YYYY-MM-DD");
  const parsed = new Date(`${v}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== v) throw new Invalid("date", "must be a calendar date");
  return v;
}

interface Size {
  width: number;
  height: number;
}

function pngSize(b: Buffer): Size | null {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const end = Buffer.from([0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82]);
  if (b.length < 45 || !b.subarray(0, 8).equals(signature) || !b.subarray(b.length - 12).equals(end)) return null;
  if (b.readUInt32BE(8) !== 13 || b.toString("latin1", 12, 16) !== "IHDR") return null;
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

function jpegSize(b: Buffer): Size | null {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8 || b[b.length - 2] !== 0xff || b[b.length - 1] !== 0xd9) return null;
  let at = 2;
  while (at + 9 < b.length) {
    if (b[at] !== 0xff) return null;
    const marker = b[at + 1];
    if (marker === 0xff) {
      at++;
      continue;
    }
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      at += 2;
      continue;
    }
    const length = b.readUInt16BE(at + 2);
    if (length < 2) return null;
    const frame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (frame) return { height: b.readUInt16BE(at + 5), width: b.readUInt16BE(at + 7) };
    if (marker === 0xda) return null;
    at += 2 + length;
  }
  return null;
}

function webpSize(b: Buffer): Size | null {
  if (b.length < 30 || b.toString("latin1", 0, 4) !== "RIFF" || b.toString("latin1", 8, 12) !== "WEBP") return null;
  if (b.readUInt32LE(4) + 8 !== b.length) return null;
  const chunk = b.toString("latin1", 12, 16);
  if (chunk === "VP8X") return { width: b.readUIntLE(24, 3) + 1, height: b.readUIntLE(27, 3) + 1 };
  if (chunk === "VP8L") {
    if (b[20] !== 0x2f) return null;
    const bits = b.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
  }
  if (chunk === "VP8 ") {
    if (b[23] !== 0x9d || b[24] !== 0x01 || b[25] !== 0x2a) return null;
    return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
  }
  return null;
}

export function imageSize(bytes: Buffer, type: string): Size | null {
  const size = type === "image/png" ? pngSize(bytes) : type === "image/jpeg" ? jpegSize(bytes) : type === "image/webp" ? webpSize(bytes) : null;
  if (!size || size.width < 1 || size.height < 1 || size.width * size.height > IMAGE_MAX_PIXELS) return null;
  return size;
}

function validImage(value: unknown): { input: ImageInput; meta: ImageMeta } {
  if (!isRecord(value)) throw new Invalid("image", "must be an object");
  knownKeys(value, ["filename", "content_type", "base64"], "image.");
  if (typeof value.filename !== "string" || !FILENAME.test(value.filename)) throw new Invalid("image.filename", "must be a plain file name");
  const content_type = oneOf(value, "content_type", IMAGE_TYPES);
  const base64 = value.base64;
  if (typeof base64 !== "string" || base64.length > Math.ceil(IMAGE_MAX_BYTES / 3) * 4) throw new Invalid("image.base64", `must decode to ${IMAGE_MAX_BYTES} bytes or fewer`);
  if (base64.length % 4 !== 0 || !BASE64.test(base64)) throw new Invalid("image.base64", "must be standard base64");
  const bytes = Buffer.from(base64, "base64");
  if (bytes.length > IMAGE_MAX_BYTES) throw new Invalid("image.base64", `must decode to ${IMAGE_MAX_BYTES} bytes or fewer`);
  const size = imageSize(bytes, content_type);
  if (!size) throw new Invalid("image.base64", "must be a whole PNG, JPEG or WebP of 16 megapixels or fewer that matches image.content_type");
  return { input: { filename: value.filename, content_type, base64 }, meta: { filename: value.filename, content_type, bytes: bytes.length, ...size } };
}

function common(body: Record<string, unknown>, kind: Kind): Common {
  if (typeof body.id !== "string" || !ID.test(body.id)) throw new Invalid("id", "must match [a-z0-9-]{3,80}");
  if (body.category !== undefined && body.category !== kind) throw new Invalid("category", "must equal kind when given");
  const base: Common = { id: body.id, date: validDate(body), title: text(body, "title", 120), source: oneOf(body, "source", SOURCES), category: kind };
  if (body.at !== undefined) base.at = validAt(body.at);
  return base;
}

export const AT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})$/;

export function validAt(value: unknown): string {
  if (typeof value !== "string" || value.length > 40 || !AT.test(value)) throw new Invalid("at", "must be an ISO 8601 time with a zone, such as 2026-10-01T14:05:00Z");
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) throw new Invalid("at", "must be a real time");
  const [y, mo, d] = value.slice(0, 10).split("-").map(Number);
  const local = new Date(Date.UTC(y, mo - 1, d));
  if (local.getUTCMonth() !== mo - 1 || local.getUTCDate() !== d) throw new Invalid("at", "must be a real time");
  return new Date(ms).toISOString();
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
  if (body.machine_generated !== undefined && body.machine_generated !== true) throw new Invalid("machine_generated", "is set by the server; send true or leave it out");
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
