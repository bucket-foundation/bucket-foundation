import { describe, expect, mock, test } from "bun:test";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import primes from "./fixtures/primes.json";

const GOLDEN = join(import.meta.dir, "golden");
const UPDATE = process.env.UPDATE_GOLDEN === "1";

let dbState: "configured" | "unconfigured" | "failing" = "configured";
mock.module("@/lib/research-os/db", () => ({
  configured: () => dbState !== "unconfigured",
  graphService: () => ({}),
}));
mock.module("@/lib/research-os/primes-report", () => ({
  loadPrimesReport: async () => {
    if (dbState === "failing") throw new Error("down");
    return primes;
  },
}));

function golden(name: string, el: ReactElement) {
  const html = renderToStaticMarkup(el);
  const digest = `${createHash("sha256").update(html).digest("hex")} ${html.length}\n`;
  const file = join(GOLDEN, `${name}.sha256`);
  if (!UPDATE && !existsSync(file)) throw new Error(`no golden for ${name}; run with UPDATE_GOLDEN=1 on the pre-change code`);
  if (UPDATE) {
    mkdirSync(GOLDEN, { recursive: true });
    writeFileSync(file, digest);
  }
  if (readFileSync(file, "utf8") !== digest) writeFileSync(join(GOLDEN, `${name}.actual.html`), html);
  expect(digest).toBe(readFileSync(file, "utf8"));
}

describe("web Research OS pages render as before", () => {
  test("solvability", async () => {
    const Page = (await import("@/app/research-os/(app)/solvability/page")).default;
    golden("solvability", Page());
  });

  test("software", async () => {
    const Page = (await import("@/app/research-os/(app)/software/page")).default;
    golden("software", Page());
  });

  test("patents", async () => {
    const Page = (await import("@/app/research-os/(app)/patents/page")).default;
    golden("patents", Page());
  });

  test("primes with a report, unconfigured and failing", async () => {
    const Page = (await import("@/app/research-os/(app)/primes/page")).default;
    const err = console.error;
    console.error = () => {};
    try {
      dbState = "configured";
      golden("primes", await Page());
      dbState = "unconfigured";
      golden("primes-unconfigured", await Page());
      dbState = "failing";
      golden("primes-failing", await Page());
    } finally {
      console.error = err;
      dbState = "configured";
    }
  });
});
