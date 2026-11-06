import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { KEY, HOST, payload, sitemapUrls } from "./indexnow.mjs";

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
