export const DEFAULT_PRIVATE_TERMS = ["kruse", "jackkruse"];
export const DEFAULT_INTERNAL_HOSTS = ["agfarms.dev", "nucleus.agfarms.dev"];

const SECRET_PATTERNS = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/,
  /\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{20,}/,
  /\b[sr]k_(?:live|test)_[A-Za-z0-9]{16,}/,
  /\bgh[pousr]_[A-Za-z0-9]{30,}/,
  /\bgithub_pat_[A-Za-z0-9_]{30,}/,
  /\bxox[abprs]-[A-Za-z0-9-]{10,}/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\bAIza[0-9A-Za-z_-]{35}\b/,
  /\bfigd_[A-Za-z0-9_-]{20,}/,
  /\b0x[0-9a-fA-F]{64}\b/,
  /\b[A-Z][A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD|PASSWD|PWD|CREDENTIALS?)[A-Z0-9_]*\s*[=:]\s*["']?[^\s"']{4,}/,
  /\b(?:api[_-]?key|access[_-]?token|secret|password|passwd)\s*[=:]\s*["']?[^\s"']{8,}/i,
];

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const PHONE = /(?:\+\d{1,3}[\s.-]?)?(?:\(\d{3}\)\s?|\b\d{3}[\s.-])\d{3}[\s.-]\d{4}\b/;
const IPV4 = /\b(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}\b/;
const IPV6 = /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b|(?:^|[\s[(])::1\b/;
const LOCALHOST = /\blocalhost\b|\b0\.0\.0\.0:\d+/i;
const INTERNAL_TLD = /\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:internal|local|lan|corp|intranet|svc\.cluster\.local)\b/i;
const ABS_PATH = /(?:^|[\s"'`(=:/])(?:~\/|\/(?:home|Users|tmp|root|var|etc|opt|mnt|private)\/|[A-Za-z]:\\(?:Users|Windows)\\)/;

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function listFromEnv(name) {
  const raw = process.env[name];
  if (!raw) return [];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

export function leakOptions(overrides = {}) {
  return {
    privateTerms: [...DEFAULT_PRIVATE_TERMS, ...listFromEnv("WHATS_NEW_PRIVATE_TERMS"), ...(overrides.privateTerms ?? [])],
    internalHosts: [...DEFAULT_INTERNAL_HOSTS, ...listFromEnv("WHATS_NEW_INTERNAL_HOSTS"), ...(overrides.internalHosts ?? [])],
  };
}

export function leakHits(text, options = leakOptions()) {
  if (typeof text !== "string" || text.length === 0) return [];
  const hits = [];
  const add = (kind, re) => {
    const m = re.exec(text);
    if (m) hits.push({ kind, match: m[0].trim() });
  };
  for (const re of SECRET_PATTERNS) add("secret", re);
  for (const term of options.privateTerms) {
    add("private-corpus", new RegExp(`${escapeRegExp(term)}`, "i"));
  }
  add("email", EMAIL);
  add("phone", PHONE);
  add("ip", IPV4);
  add("ip", IPV6);
  add("localhost", LOCALHOST);
  add("internal-host", INTERNAL_TLD);
  for (const host of options.internalHosts) {
    add("internal-host", new RegExp(`(?:^|[^A-Za-z0-9.-])(?:[a-z0-9-]+\\.)*${escapeRegExp(host)}\\b`, "i"));
  }
  add("absolute-path", ABS_PATH);
  return hits;
}

function strings(value, path = "") {
  if (typeof value === "string") return [[path, value]];
  if (Array.isArray(value)) return value.flatMap((v, i) => strings(v, `${path}[${i}]`));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([k, v]) => strings(v, path ? `${path}.${k}` : k));
  }
  return [];
}

export function entryLeaks(entry, options = leakOptions()) {
  return strings(entry).flatMap(([field, text]) => leakHits(text, options).map((h) => ({ field, ...h })));
}

export function filterEntries(entries, options = leakOptions()) {
  const kept = [];
  const dropped = [];
  for (const entry of entries) {
    const hits = entryLeaks(entry, options);
    if (hits.length === 0) kept.push(entry);
    else dropped.push({ entry, hits });
  }
  return { kept, dropped };
}
