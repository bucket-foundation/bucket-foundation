import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { BATCH, KEY, HOST, collectUrls, payload, payloads, sitemapUrls } from "./indexnow.mjs";

const PUBLIC = join(dirname(fileURLToPath(import.meta.url)), "../public");

test("sitemap urls come out of every loc tag", () => {
  const xml = `<urlset><url><loc>https://www.polingual.com/</loc></url><url><loc> https://www.polingual.com/word/night?a=1&amp;b=2 </loc></url></urlset>`;
  assert.deepEqual(sitemapUrls(xml), ["https://www.polingual.com/", "https://www.polingual.com/word/night?a=1&b=2"]);
});

test("payload keeps own-host urls once and points at the key file", () => {
  const body = payload(["https://www.polingual.com/a", "https://www.polingual.com/a", "https://evil.example/b"]);
  assert.deepEqual(body.urlList, ["https://www.polingual.com/a"]);
  assert.equal(body.host, HOST);
  assert.equal(body.keyLocation, `https://${HOST}/${KEY}.txt`);
});

test("the published key file matches the script key", () => {
  assert.equal(readFileSync(join(PUBLIC, `${KEY}.txt`), "utf8").trim(), KEY);
});

test("payloads split own-host urls into batches of 10k", () => {
  const urls = Array.from({ length: 25_001 }, (_, i) => `https://www.polingual.com/es/word/w${i}`);
  const batches = payloads([...urls, urls[0], "https://evil.example/x"]);
  assert.deepEqual(batches.map((b) => b.urlList.length), [10_000, 10_000, 5_001]);
  assert.equal(BATCH, 10_000);
  assert.equal(new Set(batches.flatMap((b) => b.urlList)).size, 25_001);
});

test("collectUrls follows a sitemap index into each child sitemap", async () => {
  const files = {
    "https://www.polingual.com/sitemap.xml": `<sitemapindex><sitemap><loc>https://www.polingual.com/sitemap/0.xml</loc></sitemap><sitemap><loc>https://www.polingual.com/sitemap/1.xml</loc></sitemap></sitemapindex>`,
    "https://www.polingual.com/sitemap/0.xml": `<urlset><url><loc>https://www.polingual.com/a</loc></url></urlset>`,
    "https://www.polingual.com/sitemap/1.xml": `<urlset><url><loc>https://www.polingual.com/b</loc></url></urlset>`,
  };
  const urls = await collectUrls("https://www.polingual.com/sitemap.xml", async (u) => files[u]);
  assert.deepEqual(urls, ["https://www.polingual.com/a", "https://www.polingual.com/b"]);
});
