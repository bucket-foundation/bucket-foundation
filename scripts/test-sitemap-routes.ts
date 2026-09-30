import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import sitemap from "../src/app/sitemap";
import { isProtectedPath } from "../src/lib/auth/paths";

const root = path.join(__dirname, "..");
const appDir = path.join(root, "src/app");
const INDEXNOW = fs.readFileSync(path.join(root, "src/app/api/indexnow/ping/route.ts"), "utf8");
const PAGE = /^page\.(tsx|ts|jsx|js)$/;

function children(dir: string): fs.Dirent[] {
  return fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory() && !e.name.startsWith("_") && !e.name.startsWith("@"));
}

function hasPage(dir: string): boolean {
  if (fs.readdirSync(dir).some((f) => PAGE.test(f))) return true;
  return children(dir).some((e) => /^\(.+\)$/.test(e.name) && hasPage(path.join(dir, e.name)));
}

function resolves(dir: string, segs: string[]): boolean {
  if (segs.length === 0) return hasPage(dir);
  const [head, ...rest] = segs;
  return children(dir).some((e) => {
    const next = path.join(dir, e.name);
    if (/^\(.+\)$/.test(e.name)) return resolves(next, segs);
    if (e.name === head) return resolves(next, rest);
    if (/^\[\[?\.\.\..+\]\]?$/.test(e.name)) return hasPage(next);
    if (/^\[[^.].*\]$/.test(e.name)) return resolves(next, rest);
    return false;
  });
}

async function redirectSources(): Promise<RegExp[]> {
  const config = fs.readFileSync(path.join(root, "next.config.mjs"), "utf8");
  const block = config.match(/async redirects\(\) \{([\s\S]*?)\n  \},/);
  assert.ok(block);
  const sources = Array.from(block[1].matchAll(/source: "([^"]+)"/g), (m) => m[1]);
  return sources.map((s) => new RegExp("^" + s.replace(/:[a-zA-Z]+\*?/g, "[^/]+") + "$"));
}

const urls = sitemap().map((e) => new URL(e.url).pathname.replace(/\/$/, "") || "/");

test("every sitemap url maps to a page file", () => {
  const missing = urls.filter((p) => !resolves(appDir, p.split("/").filter(Boolean)));
  assert.deepEqual(missing, []);
});

test("no sitemap url is a redirect source", async () => {
  const sources = await redirectSources();
  assert.deepEqual(urls.filter((p) => sources.some((r) => r.test(p))), []);
});

test("no sitemap url needs sign-in", () => {
  assert.deepEqual(urls.filter((p) => isProtectedPath(p)), []);
});

test("kruse stays out of the sitemap and indexnow", () => {
  assert.deepEqual(urls.filter((p) => p.startsWith("/kruse")), []);
  assert.doesNotMatch(INDEXNOW, /"\/kruse/);
});

test("indexnow top paths each map to a page and skip redirects", async () => {
  const block = INDEXNOW.match(/const top = \[([\s\S]*?)\];/);
  assert.ok(block);
  const paths = Array.from(block[1].matchAll(/"([^"]*)"/g), (m) => m[1] || "/");
  const sources = await redirectSources();
  assert.deepEqual(paths.filter((p) => !resolves(appDir, p.split("/").filter(Boolean)) || sources.some((r) => r.test(p))), []);
});

test("retired stub routes redirect from config", async () => {
  const sources = await redirectSources();
  for (const p of ["/canon/timeline", "/join", "/canon/concept/entropy", "/canon/author", "/canon/author/gianyrox"]) {
    assert.ok(sources.some((r) => r.test(p)), p);
  }
});
