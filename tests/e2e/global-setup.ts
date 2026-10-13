import type { FullConfig } from "@playwright/test";

const WARM = ["/explore?view=circle", "/api/canon/search?q=entropy&top_k=1"];
const WARM_TIMEOUT_MS = 170_000;

export default async function globalSetup(config: FullConfig): Promise<void> {
  const base = config.projects[0]?.use?.baseURL ?? process.env.E2E_BASE_URL ?? "http://localhost:3100";
  for (const path of WARM) {
    const started = Date.now();
    try {
      const res = await fetch(new URL(path, base), { signal: AbortSignal.timeout(WARM_TIMEOUT_MS) });
      await res.arrayBuffer();
      process.stdout.write(`warm ${path}: ${res.status} in ${Date.now() - started} ms\n`);
    } catch (e) {
      process.stdout.write(`warm ${path}: ${e instanceof Error ? e.message : String(e)} after ${Date.now() - started} ms\n`);
    }
  }
}
