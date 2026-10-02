import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { newDataKey } from "../src/crypto";
import { localRoutes } from "../src/local";
import { WorkQuizStore, workQuizRoutes } from "../src/work-quiz";
import { fermi } from "../src/daily-quiz";
import { NotesStore, notesRoutes } from "../src/notes";
import { HistoryStore, historyRoutes } from "../src/history";
import type { Pack } from "../src/pack/export";
import { startServe } from "../src/serve";
import { Store } from "../src/store";

type Page = {
  goto(url: string): Promise<unknown>;
  click(sel: string): Promise<void>;
  fill(sel: string, v: string): Promise<void>;
  waitForSelector(sel: string, o?: { timeout?: number }): Promise<unknown>;
  evaluate<T>(fn: () => T): Promise<T>;
  locator(sel: string): { count(): Promise<number> };
  waitForLoadState(s: string): Promise<void>;
  on(ev: string, fn: (x: { message?: string; type?: () => string; text?: () => string }) => void): void;
  route(glob: string, fn: (r: { request(): { url(): string }; continue(): Promise<void>; abort(): Promise<void> }) => unknown): Promise<void>;
};

export interface ViewResult {
  view: string;
  actions: string;
  pass: boolean;
  detail: string;
}

const DAY = "2026-09-30";

export async function learnOffline(): Promise<ViewResult[]> {
  const pkg = resolve(import.meta.dir, "..");
  const home = mkdtempSync(join(tmpdir(), "bkt-learn-offline-"));
  process.env.BKT_HOME = join(home, "data");
  process.env.BKT_OFFLINE = "1";
  const content = JSON.parse(readFileSync(join(pkg, "content/pack.json"), "utf8")) as Pack;
  const key = newDataKey();
  const store = new Store(join(home, "bkt.db"), key);
  store.importPack(content.version, content.items);
  const now = Date.now();
  content.items.filter((i) => i.branch === "02-physics").slice(0, 12).forEach((it, k) => store.gradeItem(it.id, (k % 3 === 0 ? 1 : 3) as 1 | 3, now - 10 * 86_400_000));
  const notes = new NotesStore(store, key);
  notes.save({ title: "Exclusion zone reading list", body: "## To read\n- **Ling** on association induction", pinned: true }, now);
  notes.save({ title: "Prime directions questions", body: "Which direction separates biophysics from chemistry?", pinned: false }, now - 3 * 86_400_000);
  const hist = new HistoryStore(store, key);
  hist.save(
    {
      productions: [{ id: "p1", kind: "production", status: "accepted", claim: "Exclusion-zone width grows with infrared exposure", target_node_id: "n1", related_node_id: null, node_id: "n9", notes: [], updated_at: "2026-09-12T10:00:00Z" }],
      nodes: { n1: { slug: "water", title: "Structured water", kind: "concept" }, n9: { slug: "ez", title: "Exclusion zone", kind: "claim" } },
    },
    now,
  );
  const wq = new WorkQuizStore(store, key);
  wq.setBeads(["Grip sphere on Learn", "Prerequisite path view", "Notes in bkt.db", "Work quiz from beads", "Canon circle"].map((title, i) => ({ id: `bkt-${300 + i}`, title, status: i < 3 ? "closed" : "open", priority: i % 3, createdAt: `2026-09-2${i}` })), now);
  wq.daily.put({ day: DAY, questions: [fermi({ id: "f1", prompt: "How many lines of chat did the day hold?", answer: 16000, explain: "About 16,000 lines." })] }, now);

  const serverRefused: string[] = [];
  const srv = startServe({
    routes: { ...localRoutes(store, { content }), ...workQuizRoutes(wq, { seed: () => "offline" }), ...notesRoutes(notes), ...historyRoutes(hist) },
    uiDir: process.env.BKT_UI_DIR ?? resolve(pkg, "../bkt-ui/dist"),
    onError: (e) => serverRefused.push(e.message),
  });
  const { chromium } = (await import(resolve(pkg, "../bkt-ui/node_modules/playwright/index.mjs"))) as { chromium: { launch(): Promise<{ newPage(): Promise<Page>; close(): Promise<void> }> } };
  const browser = await chromium.launch();
  const results: ViewResult[] = [];
  try {
    const page = await browser.newPage();
    const blocked: string[] = [];
    const errors: string[] = [];
    await page.route("**/*", (r) => {
      const host = new URL(r.request().url()).hostname;
      if (host === "127.0.0.1") return r.continue();
      blocked.push(r.request().url());
      return r.abort();
    });
    page.on("pageerror", (e) => errors.push(e.message ?? String(e)));
    page.on("console", (m) => m.type?.() === "error" && !m.text?.().includes("status of 404") && errors.push(m.text?.() ?? ""));
    await page.goto(srv.url);
    await page.waitForSelector(".side nav a");

    const tally = () => ({
      cards: store.db.query<{ n: string }, []>("select coalesce(group_concat(deck || card_id || updated_at), '') n from learn_cards").get()!.n,
      attempts: store.db.query<{ n: number }, []>("select count(*) n from attempts").get()!.n,
      work: store.db.query<{ n: number }, []>("select count(*) n from work_quiz_attempts").get()!.n,
      notes: store.db.query<{ n: number }, []>("select coalesce(max(updated_at), 0) n from notes").get()!.n,
    });
    const changed = async (what: keyof ReturnType<typeof tally>, before: ReturnType<typeof tally>) => {
      for (let i = 0; i < 50; i++) {
        if (tally()[what] !== before[what]) return;
        await Bun.sleep(100);
      }
      throw new Error(`the store's ${what} did not change`);
    };
    const views: [string, string, () => Promise<void>][] = [
      ["Learn", "open a deck, show the answer, grade it; learn cards change", async () => {
        await page.evaluate(() => (window.location.hash = "#/learn"));
        await page.waitForSelector(".grip");
        await page.waitForSelector(".deck");
        const before = tally();
        await page.click('a.deck[href="#/learn/03-chemistry"]');
        await page.waitForSelector(".card h2");
        await page.click("text=Show answer");
        await page.click(".card button.r3");
        await changed("cards", before);
      }],
      ["Path", "search entropy, open the first match, steps render", async () => {
        await page.evaluate(() => (window.location.hash = "#/path"));
        await page.fill(".search", "entropy");
        await page.click(".matches a >> nth=0");
        await page.waitForSelector(".steps-list, .path p");
      }],
      ["Quiz", "answer one question; an attempt is stored", async () => {
        await page.evaluate(() => (window.location.hash = "#/quiz"));
        await page.waitForSelector(".choice");
        const before = tally();
        await page.click(".choice >> nth=1");
        await page.waitForSelector(".after");
        await changed("attempts", before);
      }],
      ["Review", "show answer and grade a due card; learn cards change", async () => {
        await page.evaluate(() => (window.location.hash = "#/review"));
        await page.waitForSelector(".card .q");
        const before = tally();
        await page.click("text=Show answer");
        await page.click(".card button.r3");
        await changed("cards", before);
      }],
      ["Notes", "edit the seeded note, autosave, preview; the note is saved", async () => {
        await page.evaluate(() => (window.location.hash = "#/notes"));
        await page.waitForSelector(".editor");
        await page.waitForSelector("text=Exclusion zone reading list");
        const before = tally();
        await page.fill(".body-input", "Saved with the network denied.");
        await changed("notes", before);
        await page.click("text=Preview");
      }],
      ["History", "60-day activity chart shows the seeded study days", async () => {
        await page.evaluate(() => (window.location.hash = "#/history"));
        await page.waitForSelector(".activity");
        const active = await page.evaluate(() => [...document.querySelectorAll(".activity .day")].filter((d) => !d.querySelector(".none")).length);
        if (active < 2) throw new Error(`the activity chart shows ${active} active days, expected today and the seeded note three days back`);
      }],
      ["Work quiz", `open #/work/daily/${DAY}, answer the Fermi question; an attempt is stored`, async () => {
        await page.evaluate(() => (window.location.hash = "#/work/daily/2026-09-30"));
        await page.waitForSelector(".q");
        const before = tally();
        await page.fill(".search", "4000");
        await page.click(".toolbar button.primary");
        await page.waitForSelector(".after-block");
        await changed("work", before);
      }],
    ];
    for (const [view, actions, drive] of views) {
      const b0 = blocked.length;
      const e0 = errors.length;
      const s0 = serverRefused.length;
      let detail = "";
      try {
        await drive();
        const errs = await page.locator(".error, .banner[role=alert]").count();
        if (errs) detail = "error state shown";
      } catch (e) {
        const shown = await page.evaluate(() => document.querySelector("main")?.textContent?.slice(0, 160) ?? "");
        detail = `${(e as Error).message.split("\n")[0]}; page shows: ${shown}`;
      }
      const extra = [...blocked.slice(b0).map((u) => `blocked ${u}`), ...errors.slice(e0), ...serverRefused.slice(s0)];
      if (extra.length) detail = [detail, ...extra].filter(Boolean).join("; ");
      results.push({ view, actions, pass: detail === "", detail });
      console.log(`${detail === "" ? "ok" : "FAIL"} ${view}: ${actions}${detail ? ` (${detail})` : ""}`);
    }
  } finally {
    await browser.close();
    srv.stop();
    store.close();
    rmSync(home, { recursive: true, force: true });
  }
  return results;
}
