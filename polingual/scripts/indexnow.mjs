import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const KEY = "c5c490c47aa48749e7c24a1908acda40";
export const HOST = "www.polingual.com";
export const ENDPOINT = "https://api.indexnow.org/indexnow";

export function sitemapUrls(xml) {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, "&"));
}

export function payload(urls, host = HOST, key = KEY) {
  const own = urls.filter((u) => new URL(u).host === host);
  return { host, key, keyLocation: `https://${host}/${key}.txt`, urlList: [...new Set(own)].slice(0, 10000) };
}

export async function loadSitemap(source) {
  if (/^https?:\/\//.test(source)) {
    const r = await fetch(source);
    if (!r.ok) throw new Error(`sitemap ${source} returned ${r.status}`);
    return r.text();
  }
  return readFileSync(source, "utf8");
}

export async function submit(body, endpoint = ENDPOINT) {
  const r = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json; charset=utf-8" }, body: JSON.stringify(body) });
  return r.status;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const source = args.find((a) => !a.startsWith("--")) ?? `https://${HOST}/sitemap.xml`;
  const body = payload(sitemapUrls(await loadSitemap(source)));
  if (!args.includes("--submit")) {
    console.log(`dry run: ${body.urlList.length} URLs for ${body.host}; pass --submit to POST to ${ENDPOINT}`);
  } else {
    const status = await submit(body);
    console.log(`IndexNow answered ${status} for ${body.urlList.length} URLs`);
    if (status >= 400) process.exit(1);
  }
}
