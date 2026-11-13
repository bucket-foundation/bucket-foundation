import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const APP = path.join(__dirname, "../app");
const OWNED = ["app/globals.css", "app/site.module.css", "app/site.tsx", "app/tile.tsx", "app/legal.tsx", "app/signup.tsx", "app/search.tsx", "app/(site)/app", "app/(site)/word", "app/(site)/learn", "app/(site)/join", "app/(site)/live", "app/(site)/s", "app/(site)/compare", "app/(site)/archive", "app/(site)/research", "app/(site)/photon", "app/(site)/privacy", "app/(site)/terms", "app/(site)/support", "app/(intl)"];
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
