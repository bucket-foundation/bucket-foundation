import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const KEY = "c5c490c47aa48749e7c24a1908acda40";
export const HOST = "www.polingual.com";
export const ENDPOINT = "https://api.indexnow.org/indexnow";

export function sitemapUrls(xml) {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, "&"));
}

export const BATCH = 10000;

export function isSitemapIndex(xml) {
  return /<sitemapindex[\s>]/.test(xml);
}

export function payloads(urls, host = HOST, key = KEY, size = BATCH) {
  const own = [...new Set(urls.filter((u) => new URL(u).host === host))];
  const out = [];
  for (let i = 0; i < own.length; i += size) out.push({ host, key, keyLocation: `https://${host}/${key}.txt`, urlList: own.slice(i, i + size) });
  return out;
}

export function payload(urls, host = HOST, key = KEY) {
  return payloads(urls, host, key)[0] ?? { host, key, keyLocation: `https://${host}/${key}.txt`, urlList: [] };
}

export async function loadSitemap(source) {
  if (/^https?:\/\//.test(source)) {
    const r = await fetch(source);
    if (!r.ok) throw new Error(`sitemap ${source} returned ${r.status}`);
    return r.text();
  }
  return readFileSync(source, "utf8");
}

export async function collectUrls(source, load = loadSitemap) {
  const xml = await load(source);
  if (!isSitemapIndex(xml)) return sitemapUrls(xml);
  const children = sitemapUrls(xml);
  const lists = [];
  for (const child of children) lists.push(sitemapUrls(await load(child)));
  return lists.flat();
}

export async function submit(body, endpoint = ENDPOINT) {
  const r = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json; charset=utf-8" }, body: JSON.stringify(body) });
  return r.status;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const source = args.find((a) => !a.startsWith("--")) ?? `https://${HOST}/sitemap.xml`;
  const batches = payloads(await collectUrls(source));
  const total = batches.reduce((n, b) => n + b.urlList.length, 0);
  if (!args.includes("--submit")) {
    console.log(`dry run: ${total} URLs in ${batches.length} batches of up to ${BATCH} for ${HOST}; pass --submit to POST to ${ENDPOINT}`);
  } else {
    for (const [i, body] of batches.entries()) {
      const status = await submit(body);
      console.log(`IndexNow answered ${status} for batch ${i + 1} of ${batches.length}, ${body.urlList.length} URLs`);
      if (status >= 400) process.exit(1);
    }
  }
}
