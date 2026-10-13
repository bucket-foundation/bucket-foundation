import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const SRC = join(import.meta.dir, "../../../src");
const NEUTRAL = [
  "lib/research-os/contract.ts",
  "lib/research-os/use-ros-resource.ts",
  "lib/research-os/patents-design.ts",
  "components/research-os/views/link.tsx",
  "components/research-os/views/PatentsView.tsx",
  "components/research-os/views/PrimesView.tsx",
];
const BANNED: [string, RegExp][] = [
  ["next/*", /from\s+["']next(\/|["'])/],
  ["@/lib/research-os/db", /from\s+["']@\/lib\/research-os\/db["']/],
  ["supabase", /from\s+["']@supabase\//],
  ["localStorage", /\blocalStorage\b/],
];

describe("shared Research OS views and contract load outside Next", () => {
  for (const f of NEUTRAL)
    test(f, () => {
      const src = readFileSync(join(SRC, f), "utf8");
      expect(BANNED.filter(([, re]) => re.test(src)).map(([n]) => n)).toEqual([]);
    });
});
