import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ACADEMY = join(import.meta.dir, "../../../src/lib/academy");
const FILES = ["engine.ts", "fsrs.ts", "mastery.ts"];
const BANNED: [string, RegExp][] = [
  ["next/*", /from\s+["']next(\/|["'])/],
  ["react-dom", /["']react-dom/],
  ["window", /\bwindow\b/],
  ["document", /\bdocument\b/],
  ["localStorage", /\blocalStorage\b/],
  ["use client", /["']use client["']/],
];

describe("academy engine stays runtime neutral", () => {
  for (const f of FILES)
    test(`${f} uses no browser or Next API`, () => {
      const src = readFileSync(join(ACADEMY, f), "utf8");
      expect(BANNED.filter(([, re]) => re.test(src)).map(([name]) => name)).toEqual([]);
    });

  test("engine, fsrs and mastery build for bun", async () => {
    const out = await Bun.build({ entrypoints: FILES.map((f) => join(ACADEMY, f)), target: "bun", external: [] });
    expect(out.logs.filter((l) => l.level === "error")).toEqual([]);
    expect(out.success).toBe(true);
  });
});
