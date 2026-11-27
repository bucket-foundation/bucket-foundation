import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const APP = path.join(__dirname, "../app");
const OWNED = ["app/globals.css", "app/site.module.css", "app/site.tsx", "app/tile.tsx", "app/legal.tsx", "app/signup.tsx", "app/search.tsx", "app/(site)/app", "app/(site)/word", "app/(site)/learn", "app/(site)/join", "app/(site)/beta", "app/(site)/live", "app/(site)/s", "app/(site)/compare", "app/(site)/archive", "app/(site)/research", "app/(site)/photon", "app/(site)/privacy", "app/(site)/terms", "app/(site)/support", "app/(site)/teachers", "app/(intl)"];
const ALLOWED = ["/og/", "api/"];
const HEX = /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b(?![-\w])/g;

function files(p: string): string[] {
  if (!statSync(p).isDirectory()) return [p];
  return readdirSync(p).flatMap((f) => files(path.join(p, f)));
}

test("owned app files use pl tokens instead of hex literals", () => {
  const hits: string[] = [];
  for (const root of OWNED) {
    for (const f of files(path.join(APP, "..", root))) {
      if (!/\.(tsx?|css)$/.test(f) || /\.test\./.test(f) || ALLOWED.some((a) => f.includes(a))) continue;
      const src = readFileSync(f, "utf8").replace(/href="#[^"]*"|href=\{`#[^`]*`\}/g, "");
      for (const m of src.match(HEX) ?? []) hits.push(`${path.relative(APP, f)} ${m}`);
    }
  }
  assert.deepEqual(hits, []);
});

const BRANDED = ["app/(site)/play", "app/(site)/app", "app/(site)/learn"];
const SHARED_ROOM = [`${path.sep}room${path.sep}`, `${path.sep}tv${path.sep}`];
const SCALE_RADIUS = /border-radius:(6|8|10|12|14|16|18|20|22|24|999)px/g;
const RAW_FONT = /font-family:"?(Fredoka|Space Mono)"?/g;

test("play and learn css take radii and fonts from pl tokens", () => {
  const hits: string[] = [];
  for (const root of BRANDED) {
    for (const f of files(path.join(APP, "..", root))) {
      if (!f.endsWith(".css") || SHARED_ROOM.some((r) => f.includes(r))) continue;
      const src = readFileSync(f, "utf8");
      for (const m of [...(src.match(SCALE_RADIUS) ?? []), ...(src.match(RAW_FONT) ?? [])]) hits.push(`${path.relative(APP, f)} ${m}`);
    }
  }
  assert.deepEqual(hits, []);
});
