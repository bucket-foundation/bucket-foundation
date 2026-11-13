import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Page } from "@playwright/test";

const CORPUS = join(process.cwd(), "../apple/Shared/Corpus");

export async function mockCorpus(page: Page): Promise<void> {
  await page.route("**/academy-app/corpus/*.json", (route) => {
    const name = new URL(route.request().url()).pathname.split("/").pop()!;
    try {
      return route.fulfill({ contentType: "application/json", body: readFileSync(join(CORPUS, name), "utf8") });
    } catch {
      return route.fulfill({ status: 404, body: "{}" });
    }
  });
}
