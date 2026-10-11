#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..");
const PLAYERS = path.join(ROOT, "research-landscape/market/edtech-players.jsonl");
const SITES = path.join(ROOT, "scripts/research-maps/official-sites.json");
const OUT_DIR = path.join(ROOT, "public/research/maps/logos");
const MANIFEST = path.join(OUT_DIR, "manifest.json");
const USER_AGENT = "Mozilla/5.0 (compatible; BucketFoundationLogoFetch/1.0; +https://www.bucket.foundation)";
const INTERVAL_MS = 1000;
const TIMEOUT_MS = 15000;
const EXT = { "image/svg+xml": "svg", "image/png": "png" };
const CONVERT = ["image/webp", "image/avif"];
const MAX_SIDE = 512;

let lastRequest = 0;

async function politeFetch(url, accept) {
  const wait = lastRequest + INTERVAL_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequest = Date.now();
  return fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { "user-agent": USER_AGENT, accept, "accept-language": "en" },
  });
}

function attr(tag, name) {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return m ? (m[1] ?? m[2] ?? m[3] ?? "").replace(/&amp;/g, "&").trim() : "";
}

const STOPWORDS = ["the", "and", "for", "open", "learning", "academy", "research", "education"];
const SECOND_LEVEL = ["co", "ac", "com", "org", "edu"];

export function nameTokens(name, site) {
  const labels = new URL(site).hostname.split(".");
  const host = SECOND_LEVEL.includes(labels.at(-2)) && labels.length > 2 ? labels.at(-3) : labels.at(-2);
  const first = name.toLowerCase().replace(/[^a-z0-9 ]/g, "").split(/\s+/).find((w) => w.length > 3 && !STOPWORDS.includes(w)) ?? "";
  return [...new Set([host.toLowerCase().replace(/[^a-z0-9]/g, ""), first])].filter((t) => t.length > 2);
}

function resolve(href, base) {
  try {
    const u = new URL(href, base);
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : null;
  } catch {
    return null;
  }
}

export function logoCandidates(html, pageUrl, tokens) {
  const out = [];
  const push = (href, kind) => {
    const url = href && !href.startsWith("data:") ? resolve(href, pageUrl) : null;
    if (url && !out.some((c) => c.url === url)) out.push({ url, kind });
  };
  const head = html.match(/<header[\s\S]*?<\/header>/i)?.[0] ?? html.match(/<nav[\s\S]*?<\/nav>/i)?.[0] ?? "";
  const imgs = (block) => block.match(/<img\b[^>]*>/gi) ?? [];
  const source = (tag) => attr(tag, "src") || attr(tag, "data-src");
  const basename = (href) => decodeURIComponent(href.split(/[?#]/)[0].split("/").pop() ?? "").toLowerCase();
  const flat = (text) => text.toLowerCase().replace(/[^a-z0-9]/g, "");
  const own = (tag) => tokens.some((t) => flat(`${attr(tag, "alt")} ${basename(source(tag))}`).includes(t));
  const generic = (tag) => /^(site|main|brand|header|nav)?[-_]?logo[-_a-z0-9]*\.(svg|png|webp)$/.test(basename(source(tag))) && /^(|logo|home|homepage)$/.test(flat(attr(tag, "alt")));
  const marked = (tag) => `${attr(tag, "alt")} ${basename(source(tag))} ${attr(tag, "class")} ${attr(tag, "id")}`.toLowerCase().includes("logo");
  for (const tag of imgs(head)) {
    if ((own(tag) && marked(tag)) || generic(tag)) push(source(tag), "site-logo");
  }
  for (const tag of imgs(html)) {
    if (own(tag) && marked(tag)) push(source(tag), "site-logo");
  }
  for (const m of html.matchAll(/"logo"\s*:\s*(?:"([^"]+)"|\{[^}]*?"url"\s*:\s*"([^"]+)")/g)) {
    const href = (m[1] ?? m[2]).replace(/\\\//g, "/");
    if (/\.(svg|png)(\?|$)/i.test(href)) push(href, "site-logo");
  }
  const links = html.match(/<link\b[^>]*>/gi) ?? [];
  for (const tag of links) {
    const rel = attr(tag, "rel").toLowerCase();
    const href = attr(tag, "href");
    if (rel.includes("icon") && !rel.includes("apple") && (attr(tag, "type").toLowerCase() === "image/svg+xml" || /\.svg(\?|$)/i.test(href))) push(href, "svg-icon");
  }
  for (const tag of links) {
    if (attr(tag, "rel").toLowerCase().includes("apple-touch-icon")) push(attr(tag, "href"), "apple-touch-icon");
  }
  for (const tag of links) {
    const rel = attr(tag, "rel").toLowerCase();
    const side = Number(attr(tag, "sizes").split("x")[0]);
    if (rel.includes("icon") && !rel.includes("apple") && side >= 96) push(attr(tag, "href"), "png-icon");
  }
  push("/apple-touch-icon.png", "apple-touch-icon");
  return out;
}

async function inspect(bytes, ext) {
  const image = sharp(bytes, ext === "svg" ? { density: 192 } : {});
  const meta = await image.metadata();
  if (!meta.width || !meta.height || meta.width < 40 || meta.height < 16) return null;
  const { data, info } = await sharp(bytes, ext === "svg" ? { density: 192 } : {})
    .resize(64, 64, { fit: "inside" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let opaque = 0;
  let bright = 0;
  let sum = 0;
  let min = 255;
  let max = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 32) continue;
    const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    opaque += 1;
    if (lum > 225) bright += 1;
    sum += lum;
    min = Math.min(min, lum);
    max = Math.max(max, lum);
  }
  const total = info.width * info.height;
  if (opaque < total * 0.01) return null;
  const transparent = opaque < total * 0.97;
  if (!transparent && max - min < 8) return null;
  const mean = sum / opaque;
  return { width: meta.width, height: meta.height, tone: transparent && (mean > 205 || bright / opaque > 0.4) ? "light" : "dark" };
}

export async function normalise(bytes, ext) {
  if (ext === "svg") return bytes;
  const meta = await sharp(bytes).metadata();
  if (meta.format === "png" && Math.max(meta.width ?? 0, meta.height ?? 0) <= MAX_SIDE) return bytes;
  return sharp(bytes).resize(MAX_SIDE, MAX_SIDE, { fit: "inside", withoutEnlargement: true }).png({ compressionLevel: 9 }).toBuffer();
}

async function fetchLogo(site, name) {
  let html = "";
  let pageUrl = site;
  let pageNote = "";
  try {
    const res = await politeFetch(site, "text/html,application/xhtml+xml");
    pageUrl = res.url || site;
    if (res.ok) html = await res.text();
    else pageNote = `page ${res.status}`;
  } catch (err) {
    pageNote = `page ${err.name}`;
  }
  const tried = [];
  for (const candidate of logoCandidates(html, pageUrl, nameTokens(name, site)).slice(0, 6)) {
    try {
      const res = await politeFetch(candidate.url, "image/svg+xml,image/png,image/*;q=0.5");
      const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
      const ext = EXT[type] ?? (CONVERT.includes(type) ? "png" : undefined);
      if (!res.ok || !ext) {
        tried.push(`${candidate.kind} ${res.status} ${type}`);
        continue;
      }
      const bytes = await normalise(Buffer.from(await res.arrayBuffer()), ext).catch(() => Buffer.alloc(0));
      const info = await inspect(bytes, ext).catch(() => null);
      if (!info) {
        tried.push(`${candidate.kind} unusable`);
        continue;
      }
      return { bytes, ext, kind: candidate.kind, source_url: res.url || candidate.url, page_url: pageUrl, source_type: type, ...info, tone: /white/i.test(candidate.url) ? "light" : info.tone };
    } catch (err) {
      tried.push(`${candidate.kind} ${err.name}`);
    }
  }
  return { missing: [pageNote, ...tried].filter(Boolean).join("; ") || "no candidate" };
}

async function main() {
  const force = process.argv.includes("--force");
  const retry = process.argv.includes("--retry-missing");
  const recheck = process.argv.includes("--recheck-site-logos");
  const only = process.argv.filter((a) => !a.startsWith("--")).slice(2);
  const sites = JSON.parse(fs.readFileSync(SITES, "utf8"));
  const players = fs.readFileSync(PLAYERS, "utf8").trim().split("\n").map((l) => JSON.parse(l));
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, "utf8")) : { logos: {} };
  const save = () => {
    manifest.logos = Object.fromEntries(Object.entries(manifest.logos).sort(([a], [b]) => a.localeCompare(b)));
    fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1) + "\n");
  };
  const rejects = process.argv.filter((a) => a.startsWith("--reject=")).map((a) => a.slice(9).split(":"));
  for (const [id, reason] of rejects) {
    const prior = manifest.logos[id];
    if (prior?.file && fs.existsSync(path.join(OUT_DIR, prior.file))) fs.rmSync(path.join(OUT_DIR, prior.file));
    manifest.logos[id] = { site: sites[id], missing: `rejected on review: ${reason}`, review: true, rejected_url: prior?.source_url };
  }
  if (process.argv.includes("--retone")) {
    for (const entry of Object.values(manifest.logos)) {
      if (!entry.file) continue;
      const info = await inspect(fs.readFileSync(path.join(OUT_DIR, entry.file)), entry.file.split(".").pop());
      if (info) entry.tone = /white/i.test(entry.source_url) ? "light" : info.tone;
    }
  }
  if (rejects.length || process.argv.includes("--retone")) {
    save();
    return;
  }
  const bySite = new Map();
  for (const player of players) {
    if (only.length && !only.includes(player.id)) continue;
    const prior = manifest.logos[player.id];
    if (prior?.review) continue;
    if (prior && !force && !((retry || only.length) && prior.missing) && !(recheck && prior.kind === "site-logo")) continue;
    if (prior?.file && fs.existsSync(path.join(OUT_DIR, prior.file))) fs.rmSync(path.join(OUT_DIR, prior.file));
    const site = sites[player.id];
    if (!site) {
      manifest.logos[player.id] = { missing: "no official site listed" };
      continue;
    }
    if (!bySite.has(site)) bySite.set(site, await fetchLogo(site, player.name));
    const found = bySite.get(site);
    if (found.missing) {
      manifest.logos[player.id] = { site, missing: found.missing };
    } else {
      const file = `${player.id}.${found.ext}`;
      fs.writeFileSync(path.join(OUT_DIR, file), found.bytes);
      manifest.logos[player.id] = { file, site, source_url: found.source_url, page_url: found.page_url, kind: found.kind, source_type: found.source_type, width: found.width, height: found.height, tone: found.tone };
    }
    manifest.fetched = new Date().toISOString().slice(0, 10);
    save();
    console.log(player.id, found.missing ? `MISSING ${found.missing}` : `${found.kind} ${found.width}x${found.height} ${found.tone}`);
  }
  const entries = Object.values(manifest.logos);
  console.log(`found ${entries.filter((e) => e.file).length} of ${players.length}`);
}

if (process.argv[1] === new URL(import.meta.url).pathname) main();
