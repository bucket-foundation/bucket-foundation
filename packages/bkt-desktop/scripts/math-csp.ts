import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { newDataKey } from "../../bkt/src/crypto";
import { fermi } from "../../bkt/src/daily-quiz";
import { localRoutes } from "../../bkt/src/local";
import type { Pack } from "../../bkt/src/pack/export";
import { startServe } from "../../bkt/src/serve";
import { Store } from "../../bkt/src/store";
import { WorkQuizStore, workQuizRoutes } from "../../bkt/src/work-quiz";

type Box = { x: number; y: number; width: number; height: number };
type Page = {
  goto(url: string): Promise<{ headers(): Record<string, string> } | null>;
  setContent(html: string): Promise<void>;
  addInitScript(fn: () => void): Promise<void>;
  waitForSelector(sel: string, o?: { timeout?: number }): Promise<unknown>;
  waitForFunction(fn: () => unknown): Promise<unknown>;
  evaluate<T, A>(fn: (arg: A) => T | Promise<T>, arg: A): Promise<T>;
  screenshot(o: { clip: Box }): Promise<Buffer>;
  on(ev: string, fn: (x: { message?: string; type?: () => string; text?: () => string }) => void): void;
};
type Browser = { newPage(o?: { viewport: { width: number; height: number }; deviceScaleFactor: number }): Promise<Page>; close(): Promise<void> };

export const PAGE_CSP = [
  "default-src 'none'",
  "script-src 'self' 'sha256-<hash>'",
  "connect-src 'self'",
  "worker-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
].join("; ");

export const EXPRESSIONS = {
  fraction: "$\\frac{a+b}{c}$",
  root: "$\\sqrt{x^2+1}$",
  sum: "$$\\sum_{i=1}^{n} i^2$$",
  aligned: "$$\\begin{aligned}a&=b\\\\ c &= \\frac{d}{e}\\end{aligned}$$",
};

export const MAX_DIFF = 0.01;
const DAY = "2026-09-30";
const BASELINE = resolve(import.meta.dir, "math-csp.png");

export interface MathCspResult {
  csp: string;
  violations: string[];
  errors: string[];
  expressions: number;
  styled: number;
  unstyled: number;
  fractionGap: number;
  rootHeight: number;
  sumHeight: number;
  alignedRows: number;
  shot: Buffer;
}

export async function mathCsp(): Promise<MathCspResult> {
  const pkg = resolve(import.meta.dir, "..");
  const home = mkdtempSync(join(tmpdir(), "bkt-math-csp-"));
  process.env.BKT_HOME = join(home, "data");
  process.env.BKT_OFFLINE = "1";
  const key = newDataKey();
  const store = new Store(":memory:", key);
  const wq = new WorkQuizStore(store, key);
  wq.daily.put(
    {
      day: DAY,
      questions: [fermi({ id: "m1", prompt: `${EXPRESSIONS.fraction} ${EXPRESSIONS.root}`, lines: [EXPRESSIONS.sum, EXPRESSIONS.aligned], answer: 10, explain: "Ten." })],
    },
    Date.now(),
  );
  const content: Pack = { version: "math-csp", source: "math-csp", items: [] };
  const srv = startServe({
    routes: { ...localRoutes(store, { content }), ...workQuizRoutes(wq, { seed: () => "math-csp" }) },
    uiDir: process.env.BKT_UI_DIR ?? resolve(pkg, "../bkt-ui/dist"),
  });
  const { chromium } = (await import(resolve(pkg, "../bkt-ui/node_modules/playwright/index.mjs"))) as { chromium: { launch(): Promise<Browser> } };
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 1 });
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message ?? String(e)));
    page.on("console", (m) => m.type?.() === "error" && !m.text?.().includes("status of 404") && errors.push(m.text?.() ?? ""));
    await page.addInitScript(() => {
      const seen: string[] = [];
      (window as unknown as { __cspViolations: string[] }).__cspViolations = seen;
      document.addEventListener("securitypolicyviolation", (e) => seen.push(`${e.violatedDirective} ${e.blockedURI}`));
    });
    const csp = (await page.goto(srv.url))?.headers()["content-security-policy"] ?? "";
    await page.waitForSelector(".side nav a", { timeout: 15_000 }).catch((e: Error) => {
      throw new Error(`the window did not load: ${e.message.split("\n")[0]}; ${errors.join(" | ")}`);
    });
    await page.evaluate((day) => {
      window.location.hash = `#/work/daily/${day}`;
    }, DAY);
    await page.waitForSelector(".lines .katex");
    await page.waitForFunction(() => document.fonts.status === "loaded");
    const measured = await page.evaluate(() => {
      const math = [...document.querySelectorAll<HTMLElement>(".q .katex, .lines .katex")];
      const carriers = math.flatMap((m) => [...m.querySelectorAll<HTMLElement>(".katex-html [style]")]);
      const rect = (el: Element | null | undefined) => el?.getBoundingClientRect() ?? new DOMRect();
      const frac = math[0]?.querySelector(".mfrac");
      const parts = frac ? [...frac.querySelectorAll(".vlist-r:first-child > .vlist > span")].map((s) => rect(s.lastElementChild)) : [];
      const tops = parts.map((r) => r.top).sort((a, b) => a - b);
      const rows = [...(math[3]?.querySelectorAll(".col-align-r > .vlist-t > .vlist-r:first-child > .vlist > span") ?? [])].map((s) => Math.round(rect(s.lastElementChild).top));
      const boxes = math.map((m) => rect(m.querySelector(".katex-html")));
      const pad = 12;
      const left = Math.min(...boxes.map((b) => b.left)) - pad;
      const top = Math.min(...boxes.map((b) => b.top)) - pad;
      return {
        violations: (window as unknown as { __cspViolations: string[] }).__cspViolations,
        expressions: math.length,
        styled: carriers.filter((el) => el.style.length > 0).length,
        unstyled: carriers.filter((el) => el.style.length === 0).length,
        fractionGap: tops.length > 1 ? tops[tops.length - 1] - tops[0] : 0,
        rootHeight: rect(math[1]?.querySelector(".sqrt svg")).height,
        sumHeight: boxes[2]?.height ?? 0,
        alignedRows: new Set(rows).size,
        clip: { x: Math.max(0, Math.floor(left)), y: Math.max(0, Math.floor(top)), width: Math.ceil(Math.max(...boxes.map((b) => b.right)) + pad - left), height: Math.ceil(Math.max(...boxes.map((b) => b.bottom)) + pad - top) },
      };
    }, null);
    const { clip, ...rest } = measured;
    const shot = await page.screenshot({ clip });
    return { csp, errors, shot, ...rest };
  } finally {
    await browser.close();
    srv.stop();
    store.close();
    rmSync(home, { recursive: true, force: true });
  }
}

export async function pixelDiff(a: Buffer, b: Buffer): Promise<number> {
  const pkg = resolve(import.meta.dir, "..");
  const { chromium } = (await import(resolve(pkg, "../bkt-ui/node_modules/playwright/index.mjs"))) as { chromium: { launch(): Promise<Browser> } };
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent("<!doctype html><title>diff</title>");
    return await page.evaluate(
      async ([left, right]) => {
        const load = async (b64: string) => {
          const img = new Image();
          img.src = `data:image/png;base64,${b64}`;
          await img.decode();
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(img, 0, 0);
          return ctx.getImageData(0, 0, canvas.width, canvas.height);
        };
        const [x, y] = [await load(left), await load(right)];
        if (x.width !== y.width || x.height !== y.height) return 1;
        let differing = 0;
        for (let i = 0; i < x.data.length; i += 4) {
          const d = Math.max(Math.abs(x.data[i] - y.data[i]), Math.abs(x.data[i + 1] - y.data[i + 1]), Math.abs(x.data[i + 2] - y.data[i + 2]));
          if (d > 32) differing += 1;
        }
        return differing / (x.width * x.height);
      },
      [a.toString("base64"), b.toString("base64")],
    );
  } finally {
    await browser.close();
  }
}

export function normaliseCsp(csp: string): string {
  return csp.replace(/'sha256-[A-Za-z0-9+/=]+'/, "'sha256-<hash>'");
}

export async function failures(r: MathCspResult, baseline: Buffer | null): Promise<string[]> {
  const out: string[] = [];
  if (normaliseCsp(r.csp) !== PAGE_CSP) out.push(`page CSP changed: ${r.csp}`);
  if (r.violations.length) out.push(`CSP violations: ${[...new Set(r.violations)].join(", ")} (${r.violations.length})`);
  if (r.errors.length) out.push(`page errors: ${r.errors.slice(0, 3).join(" | ")}`);
  if (r.expressions !== 4) out.push(`expected 4 rendered expressions, found ${r.expressions}`);
  if (r.unstyled > 0 || r.styled === 0) out.push(`${r.unstyled} KaTeX nodes lost their style, ${r.styled} kept it`);
  if (r.fractionGap < 8) out.push(`the fraction numerator sits ${r.fractionGap}px above the denominator`);
  if (r.rootHeight < 12) out.push(`the root sign is ${r.rootHeight}px tall`);
  if (r.sumHeight < 40) out.push(`the sum with limits is ${r.sumHeight}px tall`);
  if (r.alignedRows < 2) out.push(`the aligned block shows ${r.alignedRows} row`);
  if (baseline === null) out.push(`no stored screenshot at ${BASELINE}; run with --update`);
  else {
    const diff = await pixelDiff(r.shot, baseline);
    if (diff > MAX_DIFF) out.push(`screenshot differs from the stored one in ${(diff * 100).toFixed(2)} percent of pixels`);
  }
  return out;
}

if (import.meta.main) {
  const result = await mathCsp();
  const update = process.argv.includes("--update");
  const out = process.argv.find((a) => a.startsWith("--out="))?.slice(6);
  if (out) writeFileSync(out, result.shot);
  if (update) writeFileSync(BASELINE, result.shot);
  const { shot, ...summary } = result;
  console.log(JSON.stringify({ ...summary, shotBytes: shot.length }));
  const failed = await failures(result, existsSync(BASELINE) ? readFileSync(BASELINE) : null);
  if (failed.length) {
    console.error(failed.join("\n"));
    process.exit(1);
  }
  console.log("math renders with zero CSP violations in the served window");
  console.log("stored screenshot matches within 1 percent of pixels");
  console.log("page CSP is unchanged");
  process.exit(0);
}
